import test from 'node:test';
import assert from 'node:assert/strict';
import { observeSession } from '../../src/features/authentication/session.js';

function setup() {
  let callback;
  let resolve;
  let unsubscribed = false;
  const promise = new Promise((done) => { resolve = done; });
  const auth = {
    getSession: () => promise,
    onAuthStateChange: (handler) => { callback = handler; return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }; },
  };
  return { auth, resolve: (value) => resolve(value), event: (...args) => callback(...args), unsubscribed: () => unsubscribed };
}
test('new auth events win over stale initial session reads', async () => {
  const fake = setup();
  const sessions = [];
  const stop = observeSession(fake.auth, (session) => sessions.push(session), assert.fail);
  fake.event('SIGNED_OUT', null);
  fake.resolve({ data: { session: { user: { id: 'old' } } }, error: null });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sessions, [null]);
  stop();
  assert.equal(fake.unsubscribed(), true);
});
test('unmounted observers do not publish a restored session', async () => {
  const fake = setup();
  const stop = observeSession(fake.auth, assert.fail, assert.fail);
  stop();
  fake.resolve({ data: { session: null }, error: null });
  await new Promise((resolve) => setImmediate(resolve));
});
test('storage failure is exposed instead of leaving the launch screen stuck', async () => {
  const fake = setup();
  let error;
  observeSession(fake.auth, assert.fail, (value) => { error = value; });
  fake.resolve({ data: { session: null }, error: new Error('Cannot read storage') });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(error.message, /storage/);
});
