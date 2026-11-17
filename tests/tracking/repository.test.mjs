import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createRun } from '../../src/features/tracking/engine.js';
import { start, straight } from './fixtures.mjs';
import { harness } from './sqliteHarness.mjs';

const run = () => createRun({ id: 'r1', userId: 'alice', now: start });

test('SQLite migration, owner-scoped reads, duplicate batches, and finished history', async () => {
  const { repository: repo, db } = harness();
  try {
    await repo.create(run());
    await repo.ingest(straight(40), start + 40000);
    await repo.ingest(straight(40), start + 40000);
    assert.equal((await repo.points('r1', 'alice')).length, 21);
    assert.equal(await repo.get('r1', 'bob'), null);
    assert.deepEqual(await repo.points('r1', 'bob'), []);
    assert.deepEqual(await repo.list('bob'), []);
    await assert.rejects(repo.transition('r1', 'bob', 'finish', start + 41000), /not found/);
    await repo.transition('r1', 'alice', 'finish', start + 41000);
    assert.equal(await repo.active(), null);
    await repo.rename('r1', 'alice', 'Morning run');
    assert.equal((await repo.list('alice'))[0].title, 'Morning run');
    await assert.rejects(repo.rename('r1', 'bob', 'stolen'), /Finish/);
  } finally { db.close(); }
});
test('simultaneous starts cannot create two unfinished recordings', async () => {
  const { repository: repo, db } = harness();
  try {
    const results = await Promise.allSettled([repo.create(run()), repo.create({ ...run(), id: 'r2' })]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(db.prepare('SELECT count(*) AS count FROM local_runs').get().count, 1);
  } finally { db.close(); }
});
test('a failed point write rolls back both GPS points and metrics', async () => {
  const { repository: repo, adapter, db } = harness();
  try {
    await repo.create(run());
    const write = adapter.runAsync;
    adapter.runAsync = async (sql, ...params) => {
      if (sql.includes('INSERT INTO local_points') && params[1] === 3) throw new Error('Disk full');
      return write(sql, ...params);
    };
    await assert.rejects(repo.ingest(straight(10), start + 10000), /Disk full/);
    assert.equal((await repo.active()).distance, 0);
    assert.equal((await repo.points('r1', 'alice')).length, 0);
    adapter.runAsync = write;
    await repo.ingest(straight(10), start + 10000);
    assert.ok((await repo.active()).distance > 29);
  } finally { db.close(); }
});
test('unfinished recording and points survive a database close and reopen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pitad-sqlite-test-'));
  const path = join(directory, 'recording.db');
  try {
    let instance = harness(path);
    await instance.repository.create(run());
    await instance.repository.ingest(straight(60), start + 60000);
    instance.db.close();
    instance = harness(path);
    try {
      const recovered = await instance.repository.active();
      assert.equal(recovered.id, 'r1'); assert.ok(recovered.distance > 179);
      assert.equal((await instance.repository.points('r1', 'alice')).length, 31);
    } finally { instance.db.close(); }
  } finally {
    const target = resolve(directory);
    const withinTemp = relative(resolve(tmpdir()), target);
    assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp) && withinTemp.startsWith('pitad-sqlite-test-'));
    await rm(target, { recursive: true });
  }
});
test('sensor interruption freezes active time at the last saved fix', async () => {
  const { repository: repo, db } = harness();
  try {
    await repo.create(run());
    await repo.ingest(straight(10), start + 10000);
    await repo.interrupt('GPS stopped');
    const paused = await repo.active();
    assert.equal(paused.status, 'paused'); assert.equal(paused.activeMs, 10000);
    assert.equal(paused.error, 'GPS stopped');
    assert.equal((await repo.points('r1', 'alice')).length, 6);
  } finally { db.close(); }
});
