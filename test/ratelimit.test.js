import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeLimit, resetLimitsForTests } from '../src/ratelimit.js';

test('login throttling allows normal retries before applying a temporary cooldown', () => {
  resetLimitsForTests();
  for (let i = 0; i < 30; i++) {
    assert.equal(consumeLimit('loginIp', 'shared-localhost-ip', 1_000).allowed, true);
  }
  const blocked = consumeLimit('loginIp', 'shared-localhost-ip', 1_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.limit, 30);
  assert.equal(blocked.retryAfter, 600);
  assert.equal(consumeLimit('loginIp', 'different-ip', 1_000).allowed, true);
});

test('login-name and registration thresholds are less likely to lock out ordinary users', () => {
  resetLimitsForTests();
  for (let i = 0; i < 12; i++) assert.equal(consumeLimit('loginName', 'user-one', 5_000).allowed, true);
  assert.equal(consumeLimit('loginName', 'user-one', 5_000).allowed, false);
  resetLimitsForTests();
  for (let i = 0; i < 15; i++) assert.equal(consumeLimit('registerIp', 'home-network', 9_000).allowed, true);
  const blocked = consumeLimit('registerIp', 'home-network', 9_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 1800);
});
