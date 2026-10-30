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
export function getQAEngineInfo() { return { name: 'Quruvchi QA Engine', version: '1.0.0', sourceAgent: getQAAgentInfo(), modules: { analyzer: getQAAnalyzerInfo(), blueprint: getQABlueprintInfo(), validator: getQAValidatorInfo() }, preservesOriginalAgent: true }; }
export const QAEngine = Object.freeze({ inspect: inspectQAProject, build: buildQAEngineBlueprint, run: runQAEngine, validate: validateQAResult, verifyRepairs: verifyRepairsThroughQA, getInfo: getQAEngineInfo });
export default QAEngine;
