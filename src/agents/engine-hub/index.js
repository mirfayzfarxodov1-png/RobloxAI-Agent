/**
 * QURuvchi MULTI-AGENT ENGINE HUB
 * Cross-agent adapter. Existing specialist agent source files are never modified.
 * It does not execute generated Luau, install tools, mutate Studio, or claim Play-test success.
 */
import { buildFreeProject } from '../../free-builder.js';
import { runWorldEngine, runWorldEngineDiagnostics } from '../world/engine/index.js';
import { runUIEngine, runUIEngineDiagnostics } from '../ui/engine/index.js';
import { buildGameplayPlan, getGameplayAgentInfo, runGameplayEngineDiagnostics } from '../gameplay/engine/index.js';
import { runToolScoutEngine, runToolScoutEngineDiagnostics } from '../tool-scout/engine/index.js';
import { runQAEngine, runQAEngineDiagnostics } from '../qa/engine/index.js';

const clean = (value, max = 30000) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const list = value => Array.isArray(value) ? value : [];

function makeProjectFiles(world, ui, gameplay) {
  const files = [];
  const worldSource = world?.artifact?.output?.luau || world?.blueprint?.output?.luau;
  if (worldSource) files.push({ path: 'ServerScriptService/QuruvchiWorld/World.server.lua', content: worldSource, agent: 'World Engine' });
  for (const script of list(ui?.project?.scripts)) files.push({ path: script.path || script.name, content: script.source || '', agent: 'UI Engine' });
  if (gameplay?.source) files.push({ path: gameplay.scriptPath || 'ServerScriptService/Quruvchi/Gameplay.server.lua', content: gameplay.source, agent: 'Gameplay Engine' });
  return files;
}

export async function runMultiAgentEngine(input = {}) {
  const prompt = clean(input.prompt);
  if (!prompt) return { success: false, status: 'missing-prompt', error: 'A project prompt is required.' };
  const options = input.options || {};
  const reports = {};
  const run = async (name, fn) => {
    try { reports[name] = await fn(); }
    catch (error) { reports[name] = { success: false, status: 'engine-error', error: clean(error.message, 1000) }; }
  };
  await run('world', () => runWorldEngine({ prompt, ...(options.world || {}) }));
  await run('ui', () => runUIEngine({ prompt, gameName: options.gameName, theme: options.theme, ...(options.ui || {}) }));

  let template = null;
  try { template = buildFreeProject(prompt); } catch {}
  const projectContext = {
    ...(template || {}), name: clean(options.gameName || template?.name || 'Quruvchi Project', 100),
    kind: options.kind || template?.kind || 'custom', prompt,
    features: list(options.features).length ? list(options.features) : list(template?.features),
    source: typeof options.gameplaySource === 'string' ? options.gameplaySource : (template?.source || ''),
    scriptPath: options.gameplayPath || template?.path || 'ServerScriptService/Quruvchi/Gameplay.server.lua'
  };
  await run('gameplay', () => buildGameplayPlan(projectContext));
  await run('toolScout', () => runToolScoutEngine({ query: prompt, prompt, agent: 'Gameplay Agent', tools: list(options.tools), knownTools: list(options.knownTools), requests: list(options.toolRequests), freeOnly: options.freeOnly !== false }));
  const files = makeProjectFiles(reports.world, reports.ui, reports.gameplay);
  await run('qa', () => runQAEngine({ name: projectContext.name, files, requirements: list(options.requirements), features: projectContext.features, studioEvidence: input.studioEvidence === true, playtestEvidence: input.playtestEvidence }));

  const engines = Object.entries(reports).map(([name, report]) => ({ name, ok: report?.success === true || report?.ok === true || report?.validation?.ok === true || report?.analysis?.ok === true, status: report?.status || 'unknown' }));
  const failed = engines.filter(item => !item.ok);
  return {
    success: failed.length === 0, status: failed.length ? 'needs-review' : 'ready-for-studio-review',
    project: { name: projectContext.name, prompt }, agents: reports,
    summary: { engines: engines.length, passed: engines.length - failed.length, failed: failed.length, generatedFiles: files.length },
    engineStatus: engines,
    execution: { luauExecuted: false, studioMutated: false, toolsInstalled: false, playtestPerformed: input.playtestEvidence?.passed === true, manualStudioReviewRequired: true },
    gameplayAgent: getGameplayAgentInfo()
  };
}
export function runMultiAgentEngineDiagnostics() {
  const engines = [
    ['world', runWorldEngineDiagnostics],
    ['ui', runUIEngineDiagnostics],
    ['gameplay', runGameplayEngineDiagnostics],
    ['toolScout', runToolScoutEngineDiagnostics],
    ['qa', runQAEngineDiagnostics]
  ];
  const results = engines.map(([name, diagnose]) => {
    try { return { name, ...diagnose() }; }
    catch (error) { return { name, ok: false, status: 'failed', error: clean(error?.message || error, 1000) }; }
  });
  const failed = results.filter(item => item.ok !== true).length;
  return { name: 'Quruvchi Multi-Agent Engine Hub', version: '1.1.0', ok: failed === 0, status: failed ? 'degraded' : 'healthy', summary: { engines: results.length, passed: results.length - failed, failed }, engines: results, execution: { studioMutated: false, luauExecuted: false, playtestPerformed: false }, timestamp: new Date().toISOString() };
}
export function getMultiAgentEngineInfo() { return { name: 'Quruvchi Multi-Agent Engine Hub', version: '1.1.0', agents: ['World Engine','UI Engine','Gameplay Engine','Tool Scout Engine','QA Engine'], capabilities: ['parallel-safe specialist health checks','cross-agent status aggregation','bounded project handoff','static QA handoff'], integration: 'adapter-only', changesOriginalAgentFiles: false, executesLuau: false, mutatesStudio: false, requiresStudioPlaytest: true }; }
export default Object.freeze({ run: runMultiAgentEngine, diagnostics: runMultiAgentEngineDiagnostics, getInfo: getMultiAgentEngineInfo });
