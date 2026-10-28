import test from 'node:test';
import assert from 'node:assert/strict';
import { buildV2Plan, V2_CAPABILITIES } from '../src/v2.js';

test('V2 plan contains a complete phased architecture and QA checks', () => {
  const result = buildV2Plan({ title:'Steal an Egg', idea:'Tycoon with bases, egg stealing, pets and upgrades' });
  assert.equal(result.plan.title, 'Steal an Egg');
  assert.equal(result.plan.phases.length, 8);
  assert.ok(result.plan.features.some(item => item.includes('Base')));
  assert.ok(result.qaChecklist.length >= 6);
  assert.match(result.markdown, /QA|Play-test|Audit/i);
});

test('V2 capability registry documents all ten requested areas', () => {
  assert.equal(V2_CAPABILITIES.length, 10);
  assert.ok(V2_CAPABILITIES.every(item => item.id && item.name && item.status && item.description));
});

test('V2 plan rejects empty or too-short ideas', () => {
  assert.throws(() => buildV2Plan({ idea:'hi' }), /kamida 8 ta belgi/i);
});
