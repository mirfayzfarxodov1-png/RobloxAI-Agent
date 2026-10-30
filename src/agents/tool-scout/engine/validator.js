/**
 * QURuvchi TOOL SCOUT ENGINE — VALIDATOR
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
    try { license = checkLicense(tool); } catch (error) { license = { known: false, approved: false, error: clean(error.message) }; }
    try { security = auditToolSecurity(tool); } catch (error) { security = { safe: false, error: clean(error.message) }; }
    if (!license || license.known !== true || license.approved !== true) issues.push({ id: 'tool-license-review', severity: 'warning', message: clean(tool.name) + ': license needs manual review.' });
    if (security?.safe === false) issues.push({ id: 'tool-security-review', severity: 'error', message: clean(tool.name) + ': security review failed.' });
    if (tool.free === true && Number(tool.price) !== 0) issues.push({ id: 'tool-price-conflict', severity: 'warning', message: clean(tool.name) + ': free flag conflicts with price.' });
    const dependency = auditDependencies(tool, list(input.knownTools));
    if (dependency.valid === false && dependency.total > 0) issues.push({ id: 'tool-dependencies', severity: 'warning', message: clean(tool.name) + ': one or more dependencies are unresolved.' });
  }
  for (const step of list(plan.installationPlan)) if (step.approved !== false || step.executeAutomatically !== false || step.requiresExplicitApproval !== true) issues.push({ id: 'tool-install-approval', severity: 'error', message: clean(step.name) + ': installation must remain manual and approval-gated.' });
  const errors = issues.filter(item => item.severity === 'error').length;
  const warnings = issues.filter(item => item.severity === 'warning').length;
  return { ok: errors === 0, status: errors ? 'blocked' : warnings ? 'review' : 'ready-for-manual-review', summary: { recommendations: recommendations.length, errors, warnings }, issues: issues.slice(0, 200), execution: { codeExecuted: false, installationPerformed: false, approvalRequired: true } };
}

export function validateToolDependencies(tool, knownTools = []) { return auditDependencies(tool, knownTools); }
export function getToolScoutValidatorInfo() { return { name: 'Tool Scout Engine Validator', version: '1.0.1', sourceAgent: getToolScoutInfo().name, enforces: ['license review','security review','free-price consistency','explicit installation approval'], autoInstall: false }; }
