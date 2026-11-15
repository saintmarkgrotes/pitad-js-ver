import test from 'node:test';
import assert from 'node:assert/strict';
import { createChunkedStorage } from '../../src/services/chunkedStorage.js';

function setup() {
  const values = new Map();
  const backend = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { assert.ok(Buffer.byteLength(value) < 2048); values.set(key, Buffer.from(value).toString('utf8')); },
    async removeItem(key) { values.delete(key); },
  };
  return { values, backend, storage: createChunkedStorage(backend) };
}
test('large Unicode sessions round-trip within native value limits', async () => {
  const { storage } = setup();
  const value = JSON.stringify({ token: 'abc'.repeat(4000), name: 'ランナー🏃'.repeat(500) });
  assert.equal(await storage.getItem('session'), null);
  await storage.setItem('session', value);
  assert.equal(await storage.getItem('session'), value);
});
test('replacement and logout remove old session chunks', async () => {
  const { storage, values } = setup();
  await storage.setItem('session', 'a'.repeat(3000));
  await storage.setItem('session', 'new');
  assert.equal(values.size, 2);
  assert.equal(await storage.getItem('session'), 'new');
  await storage.removeItem('session');
  assert.equal(values.size, 0);
});
test('failed write preserves the last committed session', async () => {
  const { storage, backend } = setup();
  await storage.setItem('session', 'previous');
  const write = backend.setItem;
  backend.setItem = async (key, value) => { if (key.endsWith('.1')) throw new Error('Storage full'); await write(key, value); };
  await assert.rejects(storage.setItem('session', 'b'.repeat(1000)), /Storage full/);
  assert.equal(await storage.getItem('session'), 'previous');
});
test('missing chunks never return a partial session', async () => {
  const { storage, values } = setup();
  await storage.setItem('session', 'hello');
  const chunk = [...values.keys()].find((key) => key.endsWith('.0'));
  values.delete(chunk);
  await assert.rejects(storage.getItem('session'), /incomplete/);
});
test('failed manifest commit preserves the previous session', async () => {
  const { storage, backend } = setup();
  await storage.setItem('session', 'previous');
  const write = backend.setItem;
  backend.setItem = async (key, value) => { if (key.endsWith('.manifest')) throw new Error('Interrupted'); await write(key, value); };
  await assert.rejects(storage.setItem('session', 'new'), /Interrupted/);
  assert.equal(await storage.getItem('session'), 'previous');
});
test('concurrent writes and logout are serialized', async () => {
  const { storage, values } = setup();
  await Promise.all([storage.setItem('session', 'a'.repeat(5000)), storage.setItem('session', 'b'.repeat(2000))]);
  assert.equal(await storage.getItem('session'), 'b'.repeat(2000));
  await Promise.all([storage.setItem('session', 'new'), storage.removeItem('session')]);
  assert.equal(values.size, 0);
});
test('new login can replace corrupt session metadata', async () => {
  const { storage, values } = setup();
  values.set('session.manifest', '{corrupt');
  await assert.rejects(storage.getItem('session'));
  await storage.setItem('session', 'fresh');
  assert.equal(await storage.getItem('session'), 'fresh');
});
