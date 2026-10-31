import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFreeProject } from '../src/free-builder.js';

test('API-free builder chooses an obby starter for Uzbek parkur requests', () => {
  const project = buildFreeProject('Menga 30 bosqichli obby, checkpoint, timer, mukofot, leaderboard va mobilga mos UI yarat');
  assert.equal(project.kind, 'obby');
  assert.equal(project.level, 1);
  assert.match(project.source, /STAGE_COUNT = 30/);
  assert.match(project.source, /Checkpoint/);
  assert.match(project.source, /BestTime/);
  assert.match(project.source, /QuruvchiObbyHUD/);
  assert.match(project.source, /Coins/);
  assert.match(project.source, /100 Coins/);
  assert.equal(project.path, 'ServerScriptService/QuruvchiAgents/GameplayAgent/FreeGame.server.lua');
  assert.ok(project.source.length > 1000);
});

test('API-free builder chooses simulator and tycoon starter templates', () => {
  assert.equal(buildFreeProject('Tanga yig‘adigan simulator yarat').kind, 'simulator');
  assert.equal(buildFreeProject('4 ta plotli tycoon yarat').kind, 'tycoon');
});

test('every free template includes a copyable server-side Luau source', () => {
  for (const prompt of ['ochiq dunyo yarat', 'obby yarat', 'simulator yarat', 'tycoon yarat']) {
    const project = buildFreeProject(prompt);
    assert.equal(project.path, 'ServerScriptService/QuruvchiAgents/GameplayAgent/FreeGame.server.lua');
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

test('Quruvchi MAX adapts game size and adds requested feature packs', () => {
  const obby = buildFreeProject('Menga 45 bosqichli obby yarat');
  assert.match(obby.source, /local STAGE_COUNT = 45/);

  const simulator = buildFreeProject('Menga 75 ta coinli simulator, do‘kon va vazifalar yarat');
  assert.equal(simulator.kind, 'simulator');
  assert.match(simulator.source, /for i = 1, 75 do/);
  assert.match(simulator.source, /MaxUpgradeShop/);
  assert.match(simulator.source, /MaxMissionBoard/);
  assert.match(simulator.summary, /do‘kon/);
  assert.match(simulator.summary, /vazifalar paneli/);

  const tycoon = buildFreeProject('12 ta plotli tycoon yarat');
  assert.match(tycoon.source, /for i = 1, 12 do/);

  const saved = buildFreeProject('Collectible simulator yarat va progressni saqlashni qo‘sh');
  assert.match(saved.source, /QuruvchiMAX_PlayerData_v1/);
  assert.match(saved.source, /UpdateAsync/);
});

test('Quruvchi MAX returns editable Workspace scene trees, not code alone', () => {
  const obby = buildFreeProject('Menga 12 bosqichli obby yarat');
  assert.equal(obby.sceneTree.className, 'Folder');
  assert.equal(obby.sceneTree.name, 'QuruvchiFreeWorld');
  assert.ok(obby.sceneTree.children.some(node => node.name === 'StartSpawn'));
  assert.ok(obby.sceneTree.children.some(node => node.name === 'JumpPlatform12'));
  assert.ok(obby.sceneTree.children.some(node => node.name === 'FinishPlatform'));

  const simulator = buildFreeProject('Menga 15 ta coinli simulator yarat');
  assert.ok(simulator.sceneTree.children.find(node => node.name === 'Collectibles').children.some(node => node.name === 'Collectible_15'));
  const tycoon = buildFreeProject('4 ta plotli tycoon yarat');
  assert.ok(tycoon.sceneTree.children.some(node => node.name === 'Plot_4'));
  assert.ok(tycoon.sceneTree.children.some(node => node.name === 'ClaimPad_1'));
});

test('World and UI agents produce a wide world plus working in-game panels', async () => {
  const { buildGameUi } = await import('../src/agents/ui/agent.js');
  const { auditGeneratedProject } = await import('../src/agents/qa/agent.js');
  const { scoutTools } = await import('../src/agents/tool-scout/agent.js');
  const project = buildFreeProject('Menga 30 bosqichli obby yarat');
  assert.ok(project.sceneTree.children.some(node => node.name === 'StageMarker3'));
  assert.ok(project.sceneTree.children.some(node => node.name === 'SideRailLeft'));
  assert.ok(project.sceneTree.children.some(node => node.name === 'JumpPlatform30' && node.properties.Position.Vector3[2] > 0));
  assert.equal(project.uiTree.name, 'QuruvchiMAXUI');
  assert.match(project.uiSource,/GetAttribute\("PanelKey"\)/);
  const actions = project.uiTree.children[0].children.find(node => node.name === 'Actions');
  assert.deepEqual(actions.children.filter(node => node.className === 'TextButton').map(node => node.name), ['ShopButton','InventoryButton','QuestsButton','HelpButton']);
  const audit = auditGeneratedProject(project);
  assert.equal(audit.ok, true);
  assert.ok(Array.isArray(audit.agents));
  assert.ok(audit.agents.includes('QA Agent'));
  assert.ok(scoutTools(['add UI']).recommendations.some(tool => tool.cost === 'free'));
});


test('specialist agents validate actual generated source and adapt safely to bad inputs', async () => {
  const { buildGameplayPlan } = await import('../src/agents/gameplay/agent.js');
  const { buildWorldScene } = await import('../src/agents/world/agent.js');
  const { auditGeneratedProject } = await import('../src/agents/qa/agent.js');
  const { scoutTools } = await import('../src/agents/tool-scout/agent.js');

  for (const prompt of ['Menga 12 bosqichli obby yarat','15 ta coinli simulator yarat','4 ta plotli tycoon yarat','Ochiq dunyo yarat']) {
    const project = buildFreeProject(prompt);
    const gameplay = buildGameplayPlan(project);
    assert.equal(gameplay.ok, true, prompt + ': ' + gameplay.missing.join(', '));
    assert.equal(gameplay.source, project.source);
    assert.ok(gameplay.checks.length >= 3);
    project.gameplayPlan = gameplay;
    const audit = auditGeneratedProject(project);
    assert.equal(audit.ok, true, prompt + ': ' + audit.errors.join(', '));
  }

  const fallback = buildWorldScene({kind:'not-a-game',title:'Bad\nTitle',counts:{stages:999,collectibles:-1,plots:500}});
  assert.equal(fallback.attributes.GameKind,'world');
  assert.equal(fallback.attributes.ProjectTitle,'Bad Title');
  assert.ok(fallback.children.length < 30);

  const ranked = scoutTools(['mountain terrain']);
  assert.equal(ranked.recommendations[0].id,'terrain');
  assert.ok(ranked.recommendations.every(item=>item.cost==='free'||item.cost==='verify each item'));
  const broken = buildGameplayPlan({kind:'obby',path:'Workspace/bad.lua',source:'print("hello")'});
  assert.equal(broken.ok,false);
  assert.ok(Array.isArray(broken.missing));
  assert.ok(broken.missing.length > 0);
});


test('World Agent builds theme-aware worlds and adds optional systems from the full prompt', async () => {
  const { buildWorldScene } = await import('../src/agents/world/agent.js');
  const space = buildWorldScene({kind:'world',title:'Cosmic Frontier',prompt:'Build a space adventure with portals, buildings, NPC and roads'});
  assert.equal(space.attributes.WorldTheme,'space');
  const childNames = space.children.map(child=>child.name);
  assert.ok(childNames.includes('WorldZones'));
  assert.ok(childNames.includes('WorldProps'));
  assert.ok(childNames.includes('WorldRoutes'));
  assert.ok(childNames.includes('WorldPortals'));
  assert.ok(childNames.includes('WorldBuildings'));
  assert.ok(childNames.includes('InteractionPoints'));
  assert.ok(space.children.find(child=>child.name==='WorldZones').children.length>=4);

  const forest = buildWorldScene({kind:'obby',title:'Forest Obby',prompt:'forest parkour with trees'});
  assert.equal(forest.attributes.WorldTheme,'forest');
  assert.ok(forest.children.some(child=>child.name==='ThemeDressing'));
  assert.ok(forest.children.some(child=>child.name==='Checkpoint5'));
});

test('local Luau generator applies requested theme colors and materials', () => {
  const space = buildFreeProject('Kosmosdagi space adventure yarat');
  assert.match(space.source, /theme: Metal/);
  assert.match(space.source, /Color3.fromRGB\(27, 31, 55\)/);
  const forest = buildFreeProject('Forest world yarat');
  assert.match(forest.source, /theme: Grass/);
});

test('local generator implements portal travel and NPC interactions when requested', () => {
  const project = buildFreeProject('Fantasy world with 3 teleport portals, NPC, quests and coins');
  assert.match(project.source, /PortalPad_/);
  assert.match(project.source, /character:PivotTo/);
  assert.match(project.source, /QuestNPC_/);
  assert.match(project.source, /prompt.Triggered:Connect/);
  assert.match(project.summary, /qo‘shimcha tizim|vazifalar paneli/);
});

test('Free Builder UI exports are linked and produce a plugin-ready hierarchy', async () => {
  const ui = await import('../src/agents/ui/agent.js');
  assert.equal(typeof ui.buildGameUi, 'function');
  assert.equal(typeof ui.UI_CONTROLLER_SOURCE, 'string');
  assert.ok(ui.UI_CONTROLLER_SOURCE.includes('GetAttribute("PanelKey")'));

  const tree = ui.buildGameUi('Integration Test', 'obby');
  assert.equal(tree.className, 'ScreenGui');
  assert.equal(tree.name, 'QuruvchiMAXUI');
  const mainPanel = tree.children.find(node => node.name === 'MainPanel');
  assert.ok(mainPanel);
  const actions = mainPanel.children.find(node => node.name === 'Actions');
  assert.ok(actions);
  const buttons = actions.children.filter(node => node.className === 'TextButton');
  assert.deepEqual(buttons.map(node => node.name), [
    'ShopButton', 'InventoryButton', 'QuestsButton', 'HelpButton'
  ]);
  assert.deepEqual(buttons.map(node => node.attributes?.PanelKey), [
    'Shop', 'Inventory', 'Quests', 'Help'
  ]);

  const project = buildFreeProject('Menga 12 bosqichli obby yarat');
  assert.equal(project.uiTree.name, 'QuruvchiMAXUI');
  assert.equal(project.uiSource, ui.UI_CONTROLLER_SOURCE);
});
