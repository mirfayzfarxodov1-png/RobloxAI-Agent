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
export function runToolScoutEngineDiagnostics() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), status: ok ? 'passed' : 'failed', ...(detail ? { detail } : {}) });
  for (const [name, fn] of [['analyzer', inspectToolRequest], ['candidate-analysis', analyzeToolCandidates], ['blueprint', buildToolPlan], ['runner', runToolScoutEngine], ['validator', validateToolPlan], ['dependency-check', validateToolDependencies]]) add(name, typeof fn === 'function');
  try { const result = inspectToolRequest({ query: '' }); add('invalid-input-guard', result?.ok === false && result?.status === 'missing-query'); } catch (error) { add('invalid-input-guard', false, String(error.message).slice(0, 300)); }
  try { const result = validateToolPlan({ recommendations: { recommendations: [] }, installationPlan: [] }); add('manual-install-boundary', result?.ok === true && result.execution?.installationPerformed === false && result.execution?.approvalRequired === true); } catch (error) { add('manual-install-boundary', false, String(error.message).slice(0, 300)); }
  const failed = checks.filter(item => !item.ok).length;
  return { name: 'Quruvchi Tool Scout Engine', version: '1.1.0', ok: failed === 0, status: failed ? 'degraded' : 'healthy', summary: { total: checks.length, passed: checks.length - failed, failed }, checks, execution: { packagesInstalled: false, externalCodeExecuted: false }, timestamp: new Date().toISOString() };
}

export function getToolScoutEngineInfo() { return { name: 'Quruvchi Tool Scout Engine', version: '1.0.0', sourceAgent: getToolScoutInfo(), modules: { analyzer: getToolScoutAnalyzerInfo(), blueprint: getToolScoutBlueprintInfo(), validator: getToolScoutValidatorInfo() }, preservesOriginalAgent: true }; }
export const ToolScoutEngine = Object.freeze({ inspect: inspectToolRequest, build: buildToolPlan, run: runToolScoutEngine, validate: validateToolPlan, analyzeCandidates: analyzeToolCandidates, validateDependencies: validateToolDependencies, diagnostics: runToolScoutEngineDiagnostics, getInfo: getToolScoutEngineInfo });
export default ToolScoutEngine;
