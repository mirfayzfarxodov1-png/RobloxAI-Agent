/**
 * Quruvchi MAX Gameplay Engine V1.
 * Compatibility facade over the untouched Gameplay Agent V2.
 */
import {
  detectGameType,
  detectGameplayFeatures,
  createGameplaySpecification,
  buildGameplayPlan as buildLegacyGameplayPlan,
  auditGameplayProject as auditLegacyGameplayProject,
  getGameplayAgentInfo as getLegacyGameplayAgentInfo
} from '../agent.js';
import { analyzeLuauSource } from './analyzer.js';
import { buildGameplayBlueprint } from './blueprint.js';
import { validateGameplayArtifact } from './validator.js';

export {
  detectGameType,
  detectGameplayFeatures,
  createGameplaySpecification,
  analyzeLuauSource,
  buildGameplayBlueprint,
  validateGameplayArtifact
};

export function buildGameplayPlan(project = {}) {
  const legacy = buildLegacyGameplayPlan(project);
  const features = Array.isArray(legacy.detectedFeatures) ? legacy.detectedFeatures : [];
  const blueprint = buildGameplayBlueprint({
    ...project,
    kind: legacy.kind,
    name: legacy.title
  }, features);
  const quality = validateGameplayArtifact({
    source: legacy.source,
    path: legacy.scriptPath,
    legacyChecks: legacy.checks
  });

  return {
    ...legacy,
    engine: {
      version: '1.0.0',
      status: quality.status,
      score: quality.score,
      counts: quality.counts,
      blueprint,
      quality
    }
  };
}

export function auditGameplayProject(project = {}) {
  const plan = buildGameplayPlan(project);
  const legacy = auditLegacyGameplayProject(project);
  return {
    ...legacy,
    engine: plan.engine,
    score: Math.min(legacy.score, plan.engine.score)
  };
}

export function getGameplayAgentInfo() {
  const legacy = getLegacyGameplayAgentInfo();
  return {
    ...legacy,
    engineVersion: '1.0.0',
    capabilities: [
      ...legacy.capabilities,
      'Modular architecture blueprint',
      'Luau source metrics and static risk analysis',
      'Combined legacy and engine quality report'
    ],
    engineModules: ['analyzer.js', 'blueprint.js', 'validator.js', 'index.js']
  };
}
