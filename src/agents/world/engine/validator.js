/**
 * QURUVCHI WORLD ENGINE — VALIDATOR
 * Static validation only; Studio execution and Play-test remain external.
 */
import { validateWorld, runWorldQA, getWorldAgentInfo } from '../agent.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').slice(0, 1000);

export function validateWorldEngineResult(input = {}) {
  const result = input.nativeResult || input;
  const world = result.world?.blueprint || result.world?.world || result.world || input.world;
  const issues = [];
  if (!isObject(result)) issues.push({ id: 'world-result-invalid', severity: 'error', message: 'World result must be an object.' });
  if (!result.success) issues.push({ id: 'world-generation-failed', severity: 'error', message: text(result.status || 'World generation did not succeed.') });
  if (!isObject(world) || !isObject(world.config)) {
    issues.push({ id: 'world-blueprint-missing', severity: 'error', message: 'Generated world blueprint is missing.' });
  } else {
    const validation = validateWorld(world);
    const qa = runWorldQA(world);
    for (const message of list(validation.errors)) issues.push({ id: 'world-invalid', severity: 'error', message: text(message) });
    for (const message of list(validation.warnings)) issues.push({ id: 'world-warning', severity: 'warning', message: text(message) });
    if (list(world.spawnPoints).length === 0) issues.push({ id: 'world-spawn-missing', severity: 'warning', message: 'No spawn point was generated.' });
    if (list(world.parts).length > 3000) issues.push({ id: 'world-part-budget', severity: 'warning', message: 'World exceeds the recommended 3,000-part review threshold.' });
    return finalize(issues, { validation, qa, parts: list(world.parts).length, terrainOperations: list(world.terrainOperations).length });
  }
  return finalize(issues, {});
}

function finalize(issues, metrics) {
  const errors = issues.filter(item => item.severity === 'error').length;
  const warnings = issues.filter(item => item.severity === 'warning').length;
  return { ok: errors === 0, status: errors ? 'needs-fix' : warnings ? 'review' : 'ready-for-studio', score: Math.max(0, 100 - errors * 25 - warnings * 7), summary: { total: issues.length, errors, warnings }, issues: issues.slice(0, 300), metrics, execution: { studioExecuted: false, playtestPassed: false, requiresManualStudioTest: true } };
}

export function getWorldValidatorInfo() {
  return { name: 'World Engine Validator', version: '1.0.0', sourceAgent: getWorldAgentInfo().name, checks: ['generation result','world config','part bounds and identifiers','spawn availability','terrain operation count','World Agent QA'], neverClaimsPlaytest: true };
}
