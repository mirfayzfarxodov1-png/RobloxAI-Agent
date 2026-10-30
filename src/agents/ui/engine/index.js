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
export function getUIEngineInfo() { return { name: 'Quruvchi UI Engine', version: '1.0.0', sourceAgent: getUIAgentInfo(), modules: { analyzer: getUIAnalyzerInfo(), blueprint: getUIBlueprintInfo(), validator: getUIValidatorInfo() }, preservesOriginalAgent: true }; }
export const UIEngine = Object.freeze({ inspect: inspectUIRequest, build: buildUIBlueprintPackage, run: runUIEngine, validate: validateUIResult, analyzeArtifact: analyzeUIArtifact, improve: improveUIThroughEngine, getInfo: getUIEngineInfo });
export default UIEngine;
