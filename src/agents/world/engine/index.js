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

export function getWorldEngineInfo() {
  return { name: 'Quruvchi World Engine', version: '1.0.0', sourceAgent: getWorldAgentInfo(), modules: { analyzer: getWorldAnalyzerInfo(), blueprint: getWorldBlueprintInfo(), validator: getWorldValidatorInfo() }, preservesOriginalAgent: true };
}

export const WorldEngine = Object.freeze({ inspect: inspectWorldRequest, build: buildWorldBlueprint, run: runWorldEngine, validate: validateWorldResult, analyzeArtifact: analyzeWorldArtifact, improve: improveWorldThroughEngine, getInfo: getWorldEngineInfo });
export default WorldEngine;
