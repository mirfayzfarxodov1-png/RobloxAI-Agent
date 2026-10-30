/**
 * QURUVCHI UI ENGINE — VALIDATOR
 * Validates generated UI screens and their controller scripts.
 */
import { runUIQA, validateHierarchy, validateProperties, getUIAgentInfo } from '../agent.js';

const list = value => Array.isArray(value) ? value : [];
const clean = value => String(value ?? '').slice(0, 1000);

export function validateUIEngineResult(input = {}) {
  const project = input.project || input.nativeResult || input;
  const issues = [];
  if (!project || typeof project !== 'object') issues.push({ id: 'ui-result-invalid', severity: 'error', message: 'UI project result must be an object.' });
  const screens = list(project.screens);
  const scripts = list(project.scripts);
  if (!screens.length) issues.push({ id: 'ui-screens-missing', severity: 'error', message: 'No valid UI screens were generated.' });
  if (screens.length && scripts.length === 0) issues.push({ id: 'ui-controller-missing', severity: 'error', message: 'UI screens have no controller scripts.' });
  for (const screen of screens.slice(0, 30)) {
    const blueprint = screen.blueprint || screen;
    if (!blueprint.root) { issues.push({ id: 'ui-root-missing', severity: 'error', message: clean(screen.name || screen.preset) + ': missing root.' }); continue; }
    const hierarchy = validateHierarchy(blueprint.root);
    const properties = validateProperties(blueprint.root);
    for (const error of list(hierarchy.errors)) issues.push({ id: 'ui-hierarchy', severity: 'error', message: clean(error) });
    for (const item of list(properties.issues)) if (item.severity === 'error') issues.push({ id: 'ui-property', severity: 'error', message: clean(item.path + ': ' + item.property) });
    const qa = runUIQA(blueprint);
    for (const warning of list(qa.warnings)) issues.push({ id: 'ui-warning', severity: 'warning', message: clean(typeof warning === 'string' ? warning : warning.issue || warning.path) });
  }
  for (const script of scripts.slice(0, 100)) {
    if (typeof script.source !== 'string' || !script.source.trim()) issues.push({ id: 'ui-script-empty', severity: 'error', message: clean(script.path || script.name) + ': controller source is empty.' });
    if (!String(script.path || '').startsWith('StarterPlayer/')) issues.push({ id: 'ui-script-path', severity: 'warning', message: clean(script.path || script.name) + ': expected a client-side script path.' });
  }
  const errors = issues.filter(item => item.severity === 'error').length;
  const warnings = issues.length - errors;
  return { ok: errors === 0, status: errors ? 'needs-fix' : warnings ? 'review' : 'ready-for-studio', score: Math.max(0, 100 - errors * 20 - warnings * 4), summary: { screens: screens.length, scripts: scripts.length, errors, warnings }, issues: issues.slice(0, 300), execution: { studioExecuted: false, playtestPassed: false, requiresManualStudioTest: true } };
}

export function getUIValidatorInfo() { return { name: 'UI Engine Validator', version: '1.0.0', sourceAgent: getUIAgentInfo().name, checks: ['screen hierarchy','properties','accessibility','layout','controller source','client script paths'], runtimeExecution: false }; }
