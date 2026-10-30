/**
 * QURuvchi UI ENGINE — ANALYZER
 * Interprets UI intent and inspects UI blueprints using the original UI Agent.
 */
import { interpretUIRequest, auditAccessibility, auditLayout, validateHierarchy, validateProperties, getUIAgentInfo } from '../agent.js';

const clean = (value, max = 30000) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const presets = Object.freeze(['main-menu','game-hud','inventory','shop','settings']);

export function analyzeUIRequest(input = {}) {
  const prompt = clean(input.prompt);
  if (!prompt) return { ok: false, status: 'missing-prompt', findings: [{ id: 'ui-prompt-required', severity: 'error', message: 'UI prompt is required.' }] };
  let interpretation;
  try { interpretation = interpretUIRequest(prompt); }
  catch (error) { return { ok: false, status: 'interpretation-failed', findings: [{ id: 'ui-interpretation', severity: 'error', message: clean(error.message, 1000) }] }; }
  const requested = (Array.isArray(interpretation?.presets) ? interpretation.presets : ['main-menu']).filter(preset => presets.includes(preset));
  const viewport = input.viewport || {};
  return { ok: true, status: 'analyzed', prompt, interpretation, profile: { mobile: /mobile|phone|telefon|mobil/i.test(prompt), accessibility: true, responsive: true, theme: clean(input.theme || interpretation.theme || 'midnight', 60), viewport: { width: Math.max(320, Math.min(7680, Number(viewport.width) || 1280)), height: Math.max(240, Math.min(4320, Number(viewport.height) || 720)) }, requestedPresets: requested.length ? [...new Set(requested)] : ['main-menu'], knownPresets: [...presets] }, source: 'UI Agent interpreter', runtimeExecuted: false };
}

export function analyzeUIArtifact(input = {}) {
  const blueprint = input.blueprint || input;
  if (!object(blueprint?.root)) return { ok: false, status: 'invalid-blueprint', findings: [{ id: 'ui-root-missing', severity: 'error', message: 'UI blueprint root is missing.' }] };
  const hierarchy = validateHierarchy(blueprint.root);
  const properties = validateProperties(blueprint.root);
  const accessibility = auditAccessibility(blueprint.root);
  const layout = auditLayout(blueprint.root);
  return { ok: hierarchy.errors?.length === 0 && properties.issues?.every(item => item.severity !== 'error') && layout.findings?.every(item => item.severity !== 'error'), status: 'analyzed', metrics: { nodes: hierarchy.nodeCount || 0, hierarchyErrors: hierarchy.errors?.length || 0, propertyIssues: properties.issues?.length || 0, accessibilityFindings: accessibility.findings?.length || 0, layoutFindings: layout.findings?.length || 0 }, checks: { hierarchy, properties, accessibility, layout }, findings: [...(hierarchy.errors || []).map(message => ({ id: 'ui-hierarchy', severity: 'error', message: clean(message, 1000) })), ...(accessibility.findings || []).map(item => ({ id: 'ui-accessibility', severity: item.severity || 'warning', message: clean(item.issue, 1000), path: item.path }))] };
}

export function getUIAnalyzerInfo() { return { name: 'UI Engine Analyzer', version: '1.0.1', sourceAgent: getUIAgentInfo().name, capabilities: ['UI intent analysis','native preset selection','hierarchy inspection','property validation','accessibility review','layout review'], executesStudio: false }; }
