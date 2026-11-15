import test from 'node:test';
import assert from 'node:assert/strict';
import { codeSchema, emailSchema, loginSchema, profileSchema, registerSchema } from '../../src/validation/auth.js';

test('email is normalized; invalid addresses are rejected', () => {
  assert.equal(emailSchema.parse(' Runner@Example.com '), 'runner@example.com');
  assert.equal(emailSchema.safeParse('runner').success, false);
});
test('registration preserves password whitespace and requires a match', () => {
  const input = { displayName: ' Runner ', email: 'runner@example.com', password: ' long passphrase ', confirmPassword: ' long passphrase ' };
  assert.equal(registerSchema.parse(input).password, input.password);
  assert.equal(registerSchema.parse(input).displayName, 'Runner');
  assert.equal(registerSchema.safeParse({ ...input, confirmPassword: 'different' }).success, false);
  assert.equal(registerSchema.safeParse({ ...input, password: 'short', confirmPassword: 'short' }).success, false);
});
test('login accepts existing passwords without imposing the new signup policy', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@example.com', password: 'legacy' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'a@example.com', password: '' }).success, false);
});
test('codes and usernames reject malformed values', () => {
  assert.equal(codeSchema.safeParse('123456').success, true);
  assert.equal(codeSchema.safeParse('abc123').success, false);
  const profile = { display_name: 'Runner', username: 'runner_1', distance_unit: 'km', is_private: true };
  assert.equal(profileSchema.safeParse(profile).success, true);
  assert.equal(profileSchema.safeParse({ ...profile, username: 'with spaces' }).success, false);
  assert.equal(profileSchema.safeParse({ ...profile, distance_unit: 'meters' }).success, false);
});
