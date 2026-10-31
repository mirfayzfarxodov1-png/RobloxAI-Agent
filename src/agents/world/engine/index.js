/**
 * QURUVCHI WORLD ENGINE — PUBLIC API
 * Adapter layer around the original World Agent. Original agent source is untouched.
 */
import { generateWorldProject, improveWorld, getWorldAgentInfo } from '../agent.js';
import { analyzeWorldRequest, analyzeWorldArtifact, getWorldAnalyzerInfo } from './analyzer.js';
import { buildWorldEngineBlueprint, createWorldBlueprintTemplate, getWorldBlueprintInfo } from './blueprint.js';
import { validateWorldEngineResult, getWorldValidatorInfo } from './validator.js';

export function inspectWorldRequest(input = {}) { return analyzeWorldRequest(input); }
export function buildWorldBlueprint(input = {}) { return buildWorldEngineBlueprint(input); }
export function validateWorldResult(input = {}) { return validateWorldEngineResult(input); }

export function runWorldEngine(input = {}) {
  const blueprint = buildWorldEngineBlueprint(input);
  if (!blueprint.success) return { success: false, status: blueprint.status, blueprint, validation: validateWorldEngineResult(blueprint) };
  const validation = validateWorldEngineResult(blueprint);
  return { success: blueprint.success && validation.ok, status: validation.status, blueprint, validation, artifact: blueprint.nativeResult, studio: blueprint.studio };
}

export function improveWorldThroughEngine(world, instructions = {}) {
  const before = analyzeWorldArtifact({ world });
  const improved = improveWorld(world, instructions);
  const after = analyzeWorldArtifact({ world: improved });
  return { success: after.ok, before, after, world: improved, runtimeExecuted: false };
}

export function runWorldEngineDiagnostics() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), status: ok ? 'passed' : 'failed', ...(detail ? { detail } : {}) });
  for (const [name, fn] of [['analyzer', inspectWorldRequest], ['blueprint', buildWorldBlueprint], ['runner', runWorldEngine], ['validator', validateWorldResult], ['artifact-analysis', analyzeWorldArtifact], ['improver', improveWorldThroughEngine]]) add(name, typeof fn === 'function');
  try { const result = inspectWorldRequest({ prompt: '' }); add('invalid-input-guard', result?.ok === false && result?.status === 'missing-prompt'); } catch (error) { add('invalid-input-guard', false, String(error.message).slice(0, 300)); }
  try { const result = validateWorldResult({}); add('safe-validation', Boolean(result && typeof result.ok === 'boolean' && Array.isArray(result.issues))); } catch (error) { add('safe-validation', false, String(error.message).slice(0, 300)); }
  const failed = checks.filter(item => !item.ok).length;
  return { name: 'Quruvchi World Engine', version: '1.1.0', ok: failed === 0, status: failed ? 'degraded' : 'healthy', summary: { total: checks.length, passed: checks.length - failed, failed }, checks, execution: { studioMutated: false, playtestPerformed: false }, timestamp: new Date().toISOString() };
}

export function getWorldEngineInfo() {
  return { name: 'Quruvchi World Engine', version: '1.1.0', sourceAgent: getWorldAgentInfo(), modules: { analyzer: getWorldAnalyzerInfo(), blueprint: getWorldBlueprintInfo(), validator: getWorldValidatorInfo() }, preservesOriginalAgent: true };
}

export const WorldEngine = Object.freeze({ inspect: inspectWorldRequest, build: buildWorldBlueprint, run: runWorldEngine, validate: validateWorldResult, analyzeArtifact: analyzeWorldArtifact, improve: improveWorldThroughEngine, diagnostics: runWorldEngineDiagnostics, getInfo: getWorldEngineInfo });
export default WorldEngine;
