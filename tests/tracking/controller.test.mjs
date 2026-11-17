import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackingController } from '../../src/features/tracking/controller.js';
import { harness } from './sqliteHarness.mjs';
import { start, straight } from './fixtures.mjs';

function setup() {
  const { repository, db } = harness();
  let clock = start;
  let running = false;
  const calls = [];
  const location = {
    async prepare() { calls.push('prepare'); },
    async start() { calls.push('start'); running = true; },
    async stop() { calls.push('stop'); running = false; },
    async isRunning() { return running; },
  };
  const service = createTrackingController({ repository, location, now: () => clock, newId: () => 'r1' });
  return { service, repository, location, calls, db, tick: (seconds) => { clock = start + seconds * 1000; }, killed: () => { running = false; } };
}
test('permission failure creates no run and never starts sensors', async () => {
  const h = setup();
  try {
    h.location.prepare = async () => { throw new Error('Denied'); };
    await assert.rejects(h.service.start('alice', 'background'), /Denied/);
    assert.equal(await h.repository.active(), null);
    assert.equal(h.calls.includes('start'), false);
  } finally { h.db.close(); }
});
test('sensor startup failure preserves a resumable paused run', async () => {
  const h = setup();
  try {
    h.location.start = async () => { throw new Error('Native failure'); };
    await assert.rejects(h.service.start('alice', 'background'), /GPS did not start/);
    assert.equal((await h.repository.active()).status, 'paused');
    assert.ok(h.calls.includes('stop'));
  } finally { h.db.close(); }
});
test('pause persists before stopping sensors and delayed batches are discarded', async () => {
  const h = setup();
  try {
    await h.service.start('alice', 'background');
    h.tick(10);
    h.location.stop = async () => {
      assert.equal((await h.repository.active()).status, 'paused');
      await h.repository.ingest(straight(10), start + 10000);
    };
    await h.service.pause('alice');
    assert.equal((await h.repository.active()).distance, 0);
  } finally { h.db.close(); }
});
test('foreground-only mode pauses on background while background mode continues', async () => {
  for (const mode of ['foreground', 'background']) {
    const h = setup();
    try {
      await h.service.start('alice', mode); h.tick(12);
      await h.service.backgrounded();
      assert.equal((await h.repository.active()).status, mode === 'foreground' ? 'paused' : 'recording');
    } finally { h.db.close(); }
  }
});
test('restart without a running task pauses at the last saved fix, not hours later', async () => {
  const h = setup();
  try {
    await h.service.start('alice', 'background');
    await h.repository.ingest(straight(10), start + 10000);
    h.killed(); h.tick(3600);
    const recovered = await h.service.recover('alice');
    assert.equal(recovered.status, 'paused'); assert.equal(recovered.activeMs, 10000);
    await h.service.resume('alice');
    assert.equal((await h.repository.active()).anchor, null);
  } finally { h.db.close(); }
});
test('account changes stop sensors without exposing the previous runner’s data', async () => {
  const h = setup();
  try {
    await h.service.start('alice', 'background');
    assert.equal(await h.service.recover('bob'), null);
    assert.equal((await h.repository.active()).status, 'paused');
    await assert.rejects(h.service.resume('bob'), /belongs/);
  } finally { h.db.close(); }
});
test('stop failure keeps a saved paused run that can be finished after retry', async () => {
  const h = setup();
  try {
    await h.service.start('alice', 'background'); h.tick(10);
    const stop = h.location.stop;
    h.location.stop = async () => { throw new Error('Native failure'); };
    await assert.rejects(h.service.finish('alice'), /GPS could not stop/);
    assert.equal((await h.repository.active()).status, 'paused');
    h.location.stop = stop;
    const finished = await h.service.finish('alice');
    assert.equal(finished.status, 'finished'); assert.equal(await h.repository.active(), null);
  } finally { h.db.close(); }
});
