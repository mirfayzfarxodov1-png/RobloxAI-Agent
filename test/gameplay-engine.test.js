import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeLuauSource,
  buildGameplayBlueprint,
  buildGameplayPlan,
  getGameplayAgentInfo,
  validateGameplayArtifact
} from '../src/agents/gameplay/engine/index.js';

test('analyzer returns metrics and detects shared global state', () => {
  const result = analyzeLuauSource({
    path: 'ServerScriptService/Game.server.lua',
    source: 'local Players = game:GetService("Players")\n_G.coins = 1'
  });
  assert.equal(result.metrics.lines, 2);
  assert.ok(result.issues.some(item => item.id === 'global-state'));
  assert.equal(result.ok, false);
});

test('blueprint maps requested gameplay features to modules', () => {
  const result = buildGameplayBlueprint(
    { kind: 'simulator_pet', name: 'Pet World' },
    [{ id: 'pets' }, { id: 'currency' }]
  );
  assert.ok(result.modules.includes('PetService'));
  assert.ok(result.modules.includes('CurrencyService'));
  assert.equal(result.remoteContract.serverOwnsRewards, true);
  assert.equal(result.persistence.enabled, true); // Currency state requires persistence.
});

test('validator includes failed legacy checks', () => {
  const result = validateGameplayArtifact({
    path: 'ServerScriptService/Main.server.lua',
    source: 'local Players = game:GetService("Players")',
    legacyChecks: [{ name: 'Pet inventory', ok: false }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(item => item.id === 'legacy-pet-inventory'));
});

test('facade preserves V2 fields and adds an engine blueprint', () => {
  const plan = buildGameplayPlan({ kind: 'world', source: '', path: '' });
  assert.equal(typeof plan.ok, 'boolean');
  assert.equal(typeof plan.source, 'string');
  assert.equal(plan.engine.version, '2.0.0');
  assert.ok(plan.engine.blueprint.layers.length >= 5);
});

test('agent info keeps V2 version and reports the new engine', () => {
  const info = getGameplayAgentInfo();
  assert.equal(info.version, '2.0.0');
  assert.equal(info.engineVersion, '2.0.0');
  assert.ok(info.engineModules.includes('analyzer.js'));
});
