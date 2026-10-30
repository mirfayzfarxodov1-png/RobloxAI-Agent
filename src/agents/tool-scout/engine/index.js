/**
 * QURUVCHI TOOL SCOUT ENGINE — PUBLIC API
 * Separates discovery analysis, recommendation blueprint and safety validation.
 */
import { runToolScout, getToolScoutInfo } from '../agent.js';
import { analyzeToolRequest, analyzeToolCandidates, getToolScoutAnalyzerInfo } from './analyzer.js';
import { buildToolScoutBlueprint, getToolScoutBlueprintInfo } from './blueprint.js';
import { validateToolScoutResult, validateToolDependencies, getToolScoutValidatorInfo } from './validator.js';

export function inspectToolRequest(input = {}) { return analyzeToolRequest(input); }
export function buildToolPlan(input = {}) { return buildToolScoutBlueprint(input); }
export function validateToolPlan(input = {}) { return validateToolScoutResult(input); }
export async function runToolScoutEngine(input = {}) {
  const plan = buildToolScoutBlueprint(input);
  if (!plan.success) return { success: false, status: plan.status, plan, validation: validateToolScoutResult(plan) };
  const validation = validateToolScoutResult(plan);
  return { success: validation.ok, status: validation.status, plan, validation, scout: await runToolScout({ name: input.name || 'Quruvchi project', requests: input.requests || [] }) };
}
export function getToolScoutEngineInfo() { return { name: 'Quruvchi Tool Scout Engine', version: '1.0.0', sourceAgent: getToolScoutInfo(), modules: { analyzer: getToolScoutAnalyzerInfo(), blueprint: getToolScoutBlueprintInfo(), validator: getToolScoutValidatorInfo() }, preservesOriginalAgent: true }; }
export const ToolScoutEngine = Object.freeze({ inspect: inspectToolRequest, build: buildToolPlan, run: runToolScoutEngine, validate: validateToolPlan, analyzeCandidates: analyzeToolCandidates, validateDependencies: validateToolDependencies, getInfo: getToolScoutEngineInfo });
export default ToolScoutEngine;
