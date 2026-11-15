import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';

test('foundation migration enforces owner isolation in PostgreSQL', async (t) => {
  const db = new PGlite();
  try {
    // Stand in for the schema and roles Supabase creates, not for the policies.
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${alice}', '{"display_name":"Alice"}');
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/202611160001_foundation.sql', import.meta.url), 'utf8'));
    await db.exec(`insert into auth.users values ('${bob}', '{"display_name":"Bob","is_admin":true}');`);

    const asUser = async (id) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    };
    await asUser(alice);
    await t.test('existing users are backfilled and other profiles stay hidden', async () => {
      const { rows } = await db.query('select * from public.profiles');
      assert.equal(rows.length, 1);
      assert.equal(rows[0].display_name, 'Alice');
      assert.equal(rows[0].is_private, true);
    });
    await t.test('owner can edit preferences but cannot change identity', async () => {
      await db.exec("update public.profiles set username='alice_run', distance_unit='mi', is_private=false");
      assert.equal((await db.query('select distance_unit from public.profiles')).rows[0].distance_unit, 'mi');
      await assert.rejects(db.exec(`update public.profiles set id='${bob}'`), /permission denied/);
      assert.equal((await db.query(`update public.profiles set display_name='Hacked' where id='${bob}' returning id`)).rows.length, 0);
    });
    await t.test('goals reject foreign ownership, reassignment, invalid values, and duplicates', async () => {
      await db.exec("insert into public.user_goals(period, distance_meters) values ('week', 25000)");
      await assert.rejects(db.exec(`insert into public.user_goals(user_id, period, distance_meters) values ('${bob}', 'month', 10000)`), /row-level security/);
      await assert.rejects(db.exec(`update public.user_goals set user_id='${bob}'`), /row-level security/);
      await assert.rejects(db.exec("insert into public.user_goals(period, distance_meters) values ('month', -1)"), /check constraint/);
      await assert.rejects(db.exec("insert into public.user_goals(period, distance_meters) values ('week', 5000)"), /unique constraint/);
    });
    await t.test('device tokens are private and cannot be assigned to another user', async () => {
      await db.exec("insert into public.user_devices(platform, push_token) values ('ios', 'alice-token')");
      await assert.rejects(db.exec(`insert into public.user_devices(user_id, platform) values ('${bob}', 'android')`), /row-level security/);
    });
    await asUser(bob);
    await t.test('new-user trigger creates profile; second account cannot read or delete first account data', async () => {
      assert.equal((await db.query('select display_name from public.profiles')).rows[0].display_name, 'Bob');
      for (const table of ['user_goals', 'user_devices']) {
        assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0);
        assert.equal((await db.query(`delete from public.${table} returning id`)).rows.length, 0);
      }
      await assert.rejects(db.exec("update public.profiles set username='alice_run'"), /unique constraint/);
    });
    await db.exec('reset role; set role anon');
    await t.test('anonymous users cannot access any foundation table', async () => {
      for (const table of ['profiles', 'user_goals', 'user_devices']) {
        await assert.rejects(db.exec(`select * from public.${table}`), /permission denied/);
      }
    });
    await db.exec('reset role');
    await t.test('account deletion cascades to profile, goals, and devices', async () => {
      await db.exec(`delete from auth.users where id='${alice}'`);
      assert.equal((await db.query(`select * from public.profiles where id='${alice}'`)).rows.length, 0);
      assert.equal((await db.query('select * from public.user_goals')).rows.length, 0);
      assert.equal((await db.query('select * from public.user_devices')).rows.length, 0);
    });
  } finally { await db.close(); }
});
