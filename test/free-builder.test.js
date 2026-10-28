import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFreeProject } from '../src/free-builder.js';

test('API-free builder chooses an obby starter for Uzbek parkur requests', () => {
  const project = buildFreeProject('Menga 24 bosqichli parkur va checkpoint yarat');
  assert.equal(project.kind, 'obby');
  assert.match(project.source, /Checkpoint/);
  assert.equal(project.path, 'ServerScriptService/QuruvchiFreeBuilder/FreeGame.server.lua');
  assert.ok(project.source.length > 1000);
});

test('API-free builder chooses simulator and tycoon starter templates', () => {
  assert.equal(buildFreeProject('Tanga yig‘adigan simulator yarat').kind, 'simulator');
  assert.equal(buildFreeProject('4 ta plotli tycoon yarat').kind, 'tycoon');
});

test('every free template includes a copyable server-side Luau source', () => {
  for (const prompt of ['ochiq dunyo yarat', 'obby yarat', 'simulator yarat', 'tycoon yarat']) {
    const project = buildFreeProject(prompt);
    assert.equal(project.path, 'ServerScriptService/QuruvchiFreeBuilder/FreeGame.server.lua');
    assert.match(project.source, /QuruvchiFreeWorld/);
    assert.match(project.summary, /./);
  }
});
