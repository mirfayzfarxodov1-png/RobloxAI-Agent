import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFreeProject } from '../src/free-builder.js';

test('API-free builder chooses an obby starter for Uzbek parkur requests', () => {
  const project = buildFreeProject('Menga 24 bosqichli parkur va checkpoint yarat');
  assert.equal(project.kind, 'obby');
  assert.equal(project.level, 1);
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
    assert.ok(project.features.length >= 1);
  }
});

test('follow-up upgrades keep the previous game type and advance through bounded stages', () => {
  const history = [
    { role: 'user', content: [{ type: 'text', text: 'Menga obby yarat' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Generated starter' }] }
  ];
  const second = buildFreeProject('Endi uni yaxshila', history);
  assert.equal(second.kind, 'obby');
  assert.equal(second.level, 2);
  assert.match(second.source, /FallResetPlane/);

  const nextHistory = [...history, { role: 'user', content: [{ type: 'text', text: 'Endi uni yaxshila' }] }];
  const third = buildFreeProject('Yana professional qil', nextHistory);
  assert.equal(third.kind, 'obby');
  assert.equal(third.level, 3);
  assert.match(third.source, /Wins/);
});

test('upgrade stage is capped and unrelated prompts still select a new game type', () => {
  const history = Array.from({ length: 8 }, (_, index) => ({
    role: 'user',
    content: [{ type: 'text', text: index === 0 ? 'Simulator yarat' : 'Yana yaxshila' }]
  }));
  assert.equal(buildFreeProject('Yana yaxshila', history).level, 4);
  assert.equal(buildFreeProject('Tycoon yarat', history).kind, 'tycoon');
});


test('API-free builder preserves explicit game titles instead of replacing them with a generic template name', () => {
  const project = buildFreeProject('Menga Steal an Legacy o‘yini yarat');
  assert.equal(project.name, 'Steal an Legacy');
  assert.match(project.source, /Project title: Steal an Legacy/);
  const history = [{ role: 'user', content: [{ type: 'text', text: 'Menga Steal an Legacy o‘yini yarat' }] }];
  const upgraded = buildFreeProject('Endi uni yaxshila', history);
  assert.equal(upgraded.name, 'Steal an Legacy');
});
