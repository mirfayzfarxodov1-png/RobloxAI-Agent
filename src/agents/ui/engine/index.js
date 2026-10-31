/**
 * QURUVCHI UI ENGINE — PUBLIC API
 * Keeps UI Agent implementation untouched; all orchestration lives here.
 */
import { improveBlueprint, getUIAgentInfo } from '../agent.js';
import { analyzeUIRequest, analyzeUIArtifact, getUIAnalyzerInfo } from './analyzer.js';
import { buildUIEngineBlueprint, getUIBlueprintInfo } from './blueprint.js';
import { validateUIEngineResult, getUIValidatorInfo } from './validator.js';

export function inspectUIRequest(input = {}) { return analyzeUIRequest(input); }
export function buildUIBlueprintPackage(input = {}) { return buildUIEngineBlueprint(input); }
export function validateUIResult(input = {}) { return validateUIEngineResult(input); }
export function runUIEngine(input = {}) {
  const blueprint = buildUIEngineBlueprint(input);
  if (!blueprint.success) return { success: false, status: blueprint.status, blueprint, validation: validateUIEngineResult(blueprint) };
  const validation = validateUIEngineResult(blueprint.project);
  return { success: validation.ok, status: validation.status, blueprint, validation, project: blueprint.project, studio: blueprint.studio };
}
export function improveUIThroughEngine(blueprint, instructions = {}) {
  const before = analyzeUIArtifact({ blueprint });
  const improved = improveBlueprint(blueprint, instructions);
  const after = analyzeUIArtifact({ blueprint: improved });
  return { success: after.ok, before, after, blueprint: improved, runtimeExecuted: false };
}
export function runUIEngineDiagnostics() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), status: ok ? 'passed' : 'failed', ...(detail ? { detail } : {}) });
  for (const [name, fn] of [['analyzer', inspectUIRequest], ['blueprint', buildUIBlueprintPackage], ['runner', runUIEngine], ['validator', validateUIResult], ['artifact-analysis', analyzeUIArtifact], ['improver', improveUIThroughEngine]]) add(name, typeof fn === 'function');
  try { const result = inspectUIRequest({ prompt: '' }); add('invalid-input-guard', result?.ok === false && result?.status === 'missing-prompt'); } catch (error) { add('invalid-input-guard', false, String(error.message).slice(0, 300)); }
  try { const result = validateUIResult({}); add('safe-validation', Boolean(result && typeof result.ok === 'boolean' && Array.isArray(result.issues))); } catch (error) { add('safe-validation', false, String(error.message).slice(0, 300)); }
  const failed = checks.filter(item => !item.ok).length;
  return { name: 'Quruvchi UI Engine', version: '1.1.0', ok: failed === 0, status: failed ? 'degraded' : 'healthy', summary: { total: checks.length, passed: checks.length - failed, failed }, checks, execution: { studioMutated: false, playtestPerformed: false }, timestamp: new Date().toISOString() };
}

export function getUIEngineInfo() { return { name: 'Quruvchi UI Engine', version: '1.1.0', sourceAgent: getUIAgentInfo(), modules: { analyzer: getUIAnalyzerInfo(), blueprint: getUIBlueprintInfo(), validator: getUIValidatorInfo() }, preservesOriginalAgent: true }; }
export const UIEngine = Object.freeze({ inspect: inspectUIRequest, build: buildUIBlueprintPackage, run: runUIEngine, validate: validateUIResult, analyzeArtifact: analyzeUIArtifact, improve: improveUIThroughEngine, diagnostics: runUIEngineDiagnostics, getInfo: getUIEngineInfo });
export default UIEngine;
