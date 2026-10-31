import test from 'node:test';
import assert from 'node:assert/strict';

test('World Engine exposes analysis, blueprint and validation APIs', async () => {
  const engine = await import('../src/agents/world/engine/index.js');
  assert.equal(typeof engine.inspectWorldRequest, 'function');
  assert.equal(typeof engine.buildWorldBlueprint, 'function');
  assert.equal(typeof engine.validateWorldResult, 'function');
  assert.equal(typeof engine.runWorldEngine, 'function');
  assert.equal(engine.getWorldEngineInfo().preservesOriginalAgent, true);
});

test('UI Engine exposes analysis, blueprint and validation APIs', async () => {
  const engine = await import('../src/agents/ui/engine/index.js');
  assert.equal(typeof engine.inspectUIRequest, 'function');
  assert.equal(typeof engine.buildUIBlueprintPackage, 'function');
  assert.equal(typeof engine.validateUIResult, 'function');
  assert.equal(engine.getUIEngineInfo().preservesOriginalAgent, true);
});

test('QA Engine distinguishes static audit from Play-test evidence', async () => {
  const engine = await import('../src/agents/qa/engine/index.js');
  const result = engine.validateQAResult({ report: { issues: [], score: 100 } });
  assert.equal(result.ok, true);
  assert.equal(result.claims.staticAuditPassed, true);
  assert.equal(result.claims.studioPlaytestPassed, false);
  assert.equal(engine.getQAEngineInfo().preservesOriginalAgent, true);
});

test('Tool Scout Engine keeps installation approval-gated', async () => {
  const engine = await import('../src/agents/tool-scout/engine/index.js');
  assert.equal(typeof engine.buildToolPlan, 'function');
  assert.equal(typeof engine.validateToolPlan, 'function');
  const plan = engine.buildToolPlan({ query: 'Roblox UI tools', agent: 'Gameplay Agent', tools: [] });
  assert.equal(plan.success, true);
  assert.equal(plan.installationPlan.length, 0);
  assert.equal(engine.getToolScoutEngineInfo().preservesOriginalAgent, true);
});

test('Multi-Agent Engine Hub reports manual Studio verification boundaries', async () => {
  const hub = await import('../src/agents/engine-hub/index.js');
  const info = hub.getMultiAgentEngineInfo();
  assert.equal(info.changesOriginalAgentFiles, false);
  assert.equal(info.executesLuau, false);
});


test('All specialist engines expose passing self-diagnostics', async () => {
  const cases = [
    ['world', '../src/agents/world/engine/index.js', 'runWorldEngineDiagnostics'],
    ['ui', '../src/agents/ui/engine/index.js', 'runUIEngineDiagnostics'],
    ['gameplay', '../src/agents/gameplay/engine/index.js', 'runGameplayEngineDiagnostics'],
    ['tool-scout', '../src/agents/tool-scout/engine/index.js', 'runToolScoutEngineDiagnostics'],
    ['qa', '../src/agents/qa/engine/index.js', 'runQAEngineDiagnostics']
  ];
  for (const [name, path, method] of cases) {
    const engine = await import(path);
    assert.equal(typeof engine[method], 'function', name + ' diagnostics API');
    const report = engine[method]();
    assert.equal(report.ok, true, name + ' diagnostics should pass: ' + JSON.stringify(report.checks));
    assert.equal(report.summary.failed, 0, name + ' diagnostics failures');
  }
});

test('Multi-Agent Engine Hub aggregates specialist diagnostics without Studio execution', async () => {
  const hub = await import('../src/agents/engine-hub/index.js');
  const report = hub.runMultiAgentEngineDiagnostics();
  assert.equal(report.ok, true);
  assert.equal(report.summary.engines, 5);
  assert.equal(report.execution.studioMutated, false);
  assert.equal(report.execution.luauExecuted, false);
  assert.equal(report.execution.playtestPerformed, false);
});
