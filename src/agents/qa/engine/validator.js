/**
 * QURuvchi QA ENGINE — VALIDATOR
 * Validates QA report shape and prevents false Play-test success claims.
 */
import { buildQAPlan, getQAAgentInfo } from '../agent.js';

const list = value => Array.isArray(value) ? value : [];
const clean = value => String(value ?? '').slice(0, 1000);

export function validateQAEngineResult(input = {}) {
  const report = input.report || input;
  const issues = [];
  if (!report || typeof report !== 'object') issues.push({ id: 'qa-report-invalid', severity: 'error', message: 'QA report must be an object.' });
  if (report && !Array.isArray(report.issues)) issues.push({ id: 'qa-issues-missing', severity: 'warning', message: 'QA report does not contain an issues array.' });
  for (const issue of list(report?.issues).slice(0, 500)) {
    const severity = String(issue?.severity || 'info').toLowerCase();
    if (['critical','error'].includes(severity)) issues.push({ id: clean(issue.id || 'qa-critical'), severity: 'error', message: clean(issue.description || issue.message || issue.title) });
    else if (severity === 'warning') issues.push({ id: clean(issue.id || 'qa-warning'), severity: 'warning', message: clean(issue.description || issue.message || issue.title) });
  }
  const studioEvidenceSupplied = input.studioEvidence === true || Boolean(input.playtestEvidence);
  const playtestPassed = input.playtestEvidence?.passed === true;
  const staticApproved = Boolean(report) && !issues.some(item => item.severity === 'error');
  return { ok: staticApproved, status: !staticApproved ? 'needs-fix' : playtestPassed ? 'playtest-evidence-passed' : studioEvidenceSupplied ? 'studio-evidence-supplied' : 'static-review-only', score: Number.isFinite(report?.score) ? report.score : Math.max(0, 100 - issues.filter(item => item.severity === 'error').length * 20 - issues.filter(item => item.severity === 'warning').length * 5), summary: { errors: issues.filter(item => item.severity === 'error').length, warnings: issues.filter(item => item.severity === 'warning').length, findings: issues.length }, issues, claims: { staticAuditPassed: staticApproved, studioPlaytestPassed: playtestPassed, studioEvidenceSupplied } };
}
export function runQAChecks(input = {}) { const report = buildQAPlan(input.project || input); return { report, validation: validateQAEngineResult({ report, studioEvidence: input.studioEvidence, playtestEvidence: input.playtestEvidence }) }; }
export function getQAValidatorInfo() { return { name: 'QA Engine Validator', version: '1.0.1', sourceAgent: getQAAgentInfo().name, severityMapping: { critical: 'error', error: 'error', warning: 'warning', info: 'info' }, preventsStaticAsPlaytest: true }; }
