/**
 * QURUVCHI TOOL SCOUT ENGINE — VALIDATOR
 * Enforces free/license/security and explicit installation approval boundaries.
 */
import { checkLicense, auditToolSecurity, auditDependencies, getToolScoutInfo } from '../agent.js';

const list = value => Array.isArray(value) ? value : [];
const clean = value => String(value ?? '').slice(0, 500);

export function validateToolScoutResult(input = {}) {
  const plan = input.plan || input;
  const issues = [];
  const recommendations = list(plan.recommendations?.recommendations);
  for (const item of recommendations.slice(0, 100)) {
    const tool = item.tool || item;
    let license;
    let security;
    try { license = checkLicense(tool); } catch (error) { license = { valid: false, error: clean(error.message) }; }
    try { security = auditToolSecurity(tool); } catch (error) { security = { safe: false, error: clean(error.message) }; }
    if (!license || license.valid === false || license.allowed === false) issues.push({ id: 'tool-license-review', severity: 'error', message: clean(tool.name) + ': license needs review.' });
    if (security?.safe === false || security?.passed === false) issues.push({ id: 'tool-security-review', severity: 'error', message: clean(tool.name) + ': security review failed.' });
    if (tool.free === true && Number(tool.price) !== 0) issues.push({ id: 'tool-price-conflict', severity: 'warning', message: clean(tool.name) + ': free flag conflicts with price.' });
  }
  for (const step of list(plan.installationPlan)) if (step.approved !== true || step.executeAutomatically !== false) issues.push({ id: 'tool-install-approval', severity: 'error', message: clean(step.name) + ': installation must remain manual and approval-gated.' });
  const errors = issues.filter(item => item.severity === 'error').length;
  return { ok: errors === 0, status: errors ? 'blocked' : issues.length ? 'review' : 'ready-for-manual-review', summary: { recommendations: recommendations.length, errors, warnings: issues.length - errors }, issues: issues.slice(0, 200), execution: { codeExecuted: false, installationPerformed: false, approvalRequired: true } };
}

export function validateToolDependencies(tool, knownTools = []) { return auditDependencies(tool, knownTools); }
export function getToolScoutValidatorInfo() { return { name: 'Tool Scout Engine Validator', version: '1.0.0', sourceAgent: getToolScoutInfo().name, enforces: ['license review','security review','free-price consistency','explicit installation approval'], autoInstall: false }; }
