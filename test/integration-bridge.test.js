import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudioCommandPlan, executeStudioCommandPlan } from '../src/integration/studio-bridge.js';

function fixture() {
  return {
    project: {
      name: 'Bridge Test',
      path: 'ServerScriptService/QuruvchiAgents/GameplayAgent/FreeGame.server.lua',
      sceneTree: { name: 'QuruvchiFreeWorld', className: 'Folder', children: [] },
      uiTree: { name: 'QuruvchiMAXUI', className: 'ScreenGui', children: [] },
      uiSource: 'local Players = game:GetService("Players")\n' + '-- UI controller'
    },
    gameplayPlan: { ok: true, source: 'local Players = game:GetService("Players")\n' + '-- Gameplay server source' }
  };
}

test('builds plugin-compatible World, UI, Gameplay and QA command plan', () => {
  const { project, gameplayPlan } = fixture();
  const commands = buildStudioCommandPlan(project, gameplayPlan);
  assert.deepEqual(commands.map(item => item.name), [
    'create_tree', 'create_tree', 'create_script', 'create_script', 'audit_project', 'get_logs'
  ]);
  assert.equal(commands[0].input.parent, 'Workspace');
  assert.equal(commands[1].input.parent, 'StarterGui');
  assert.equal(commands[2].input.className, 'LocalScript');
  assert.equal(commands[3].input.className, 'Script');
  assert.equal(commands[3].input.path, project.path);
  assert.equal(commands[4].input.maxNodes, 8000);
  assert.equal(commands[5].input.onlyErrors, true);
});

test('rejects an unsuccessful Gameplay Agent result before any plugin command', () => {
  const { project, gameplayPlan } = fixture();
  assert.throws(() => buildStudioCommandPlan(project, { ...gameplayPlan, ok: false }), /tekshiruvdan o‘tmagan/);
});

test('rejects unsafe gameplay script paths and oversized source', () => {
  const { project, gameplayPlan } = fixture();
  assert.throws(() => buildStudioCommandPlan({ ...project, path: 'Workspace/Bad.server.lua' }, gameplayPlan), /ServerScriptService/);
  assert.throws(() => buildStudioCommandPlan(project, { ...gameplayPlan, source: 'x'.repeat(100001) }), /limitidan oshdi/);
});

test('executes plugin commands sequentially and reports acknowledgements', async () => {
  const { project, gameplayPlan } = fixture();
  const commands = buildStudioCommandPlan(project, gameplayPlan);
  const order = [];
  const results = await executeStudioCommandPlan({
    userId: 42,
    commands,
    sendCommand: async (userId, name, input) => {
      order.push(name);
      assert.equal(userId, 42);
      assert.ok(input);
      return { ok: true, output: name + ' accepted' };
    }
  });
  assert.deepEqual(order, commands.map(item => item.name));
  assert.equal(results.length, 6);
  assert.ok(results.every(item => item.ok));
});

test('stops dispatching after cancellation and keeps failed plugin acknowledgements', async () => {
  const { project, gameplayPlan } = fixture();
  const commands = buildStudioCommandPlan(project, gameplayPlan);
  const controller = new AbortController();
  let calls = 0;
  const results = await executeStudioCommandPlan({
    userId: 1,
    commands,
    signal: controller.signal,
    sendCommand: async () => {
      calls += 1;
      controller.abort();
      return { ok: false, output: 'plugin refused' };
    }
  });
  assert.equal(calls, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].output, 'plugin refused');
});
