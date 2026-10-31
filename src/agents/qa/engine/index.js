/**
 * QURUVCHI QA ENGINE — PUBLIC API
 * Aggregates QA analysis, coverage blueprint and report validation.
 */
import { verifyQAFixes, getQAAgentInfo } from '../agent.js';
import { analyzeQAProject, normalizeQAProject, getQAAnalyzerInfo } from './analyzer.js';
import { buildQABlueprint, getQABlueprintInfo } from './blueprint.js';
import { validateQAEngineResult, runQAChecks, getQAValidatorInfo } from './validator.js';

export function inspectQAProject(input = {}) { return analyzeQAProject(input); }
export function buildQAEngineBlueprint(input = {}) { return buildQABlueprint(input); }
export function validateQAResult(input = {}) { return validateQAEngineResult(input); }
export function runQAEngine(input = {}) {
  const normalized = normalizeQAProject(input);
  const analysis = analyzeQAProject(normalized);
  const blueprint = buildQABlueprint(normalized);
  const validation = validateQAEngineResult({ report: analysis.report, studioEvidence: input.studioEvidence, playtestEvidence: input.playtestEvidence });
  return { success: analysis.ok && validation.ok, status: validation.status, analysis, blueprint, validation };
}
export function verifyRepairsThroughQA(previousReport, updatedProject) { return verifyQAFixes(previousReport, updatedProject); }
export function runQAEngineDiagnostics() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), status: ok ? 'passed' : 'failed', ...(detail ? { detail } : {}) });
  for (const [name, fn] of [['analyzer', inspectQAProject], ['normalizer', normalizeQAProject], ['blueprint', buildQAEngineBlueprint], ['runner', runQAEngine], ['validator', validateQAResult], ['repair-verification', verifyRepairsThroughQA]]) add(name, typeof fn === 'function');
  try { const result = validateQAResult({ report: { issues: [] } }); add('static-runtime-separation', result?.claims?.staticAuditPassed === true && result?.claims?.studioPlaytestPassed === false); } catch (error) { add('static-runtime-separation', false, String(error.message).slice(0, 300)); }
  try { const result = inspectQAProject({ files: [] }); add('empty-project-handling', Boolean(result && typeof result.status === 'string' && Array.isArray(result.findings))); } catch (error) { add('empty-project-handling', false, String(error.message).slice(0, 300)); }
  const failed = checks.filter(item => !item.ok).length;
  return { name: 'Quruvchi QA Engine', version: '1.1.0', ok: failed === 0, status: failed ? 'degraded' : 'healthy', summary: { total: checks.length, passed: checks.length - failed, failed }, checks, execution: { studioPlaytestPerformed: false }, timestamp: new Date().toISOString() };
}

export function getQAEngineInfo() { return { name: 'Quruvchi QA Engine', version: '1.1.0', sourceAgent: getQAAgentInfo(), modules: { analyzer: getQAAnalyzerInfo(), blueprint: getQABlueprintInfo(), validator: getQAValidatorInfo() }, preservesOriginalAgent: true }; }
export const QAEngine = Object.freeze({ inspect: inspectQAProject, build: buildQAEngineBlueprint, run: runQAEngine, validate: validateQAResult, verifyRepairs: verifyRepairsThroughQA, diagnostics: runQAEngineDiagnostics, getInfo: getQAEngineInfo });
export default QAEngine;
