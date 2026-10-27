import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tools } from '../src/tools.js';

const plugin = await readFile(new URL('../plugin/Quruvchi.lua', import.meta.url), 'utf8');

test('audit_project is exposed to the agent and implemented by the Studio plugin', () => {
  const auditTool = tools.find((tool) => tool.name === 'audit_project');
  assert.ok(auditTool, 'audit_project schema should be registered');
  assert.equal(auditTool.input_schema.properties.maxNodes.maximum, 10000);
  assert.match(plugin, /local function auditProject\(input\)/);
  assert.match(plugin, /audit_project=auditProject/);
  assert.match(plugin, /auditButton\.Activated:Connect/);
});

test('plugin panel has one activity log title and stable audit layout order', () => {
  assert.equal((plugin.match(/local logTitle=/g) || []).length, 1);
  assert.match(plugin, /local quickTools3=.*LayoutOrder=8/);
  assert.match(plugin, /Text="FAOLIYAT JURNALI  ·  LOGS".*LayoutOrder=9/);
  assert.match(plugin, /logFrame\.LayoutOrder=10/);
});

test('audit reports are bounded and clearly marked as static diagnostics', () => {
  assert.match(plugin, /maxNodes = math\.clamp\(tonumber\(input\.maxNodes\) or 8000, 100, 10000\)/);
  assert.match(plugin, /audit_truncated/);
  assert.match(tools.find((tool) => tool.name === 'audit_project').description, /Play-test o‘rnini bosmaydi/);
});
