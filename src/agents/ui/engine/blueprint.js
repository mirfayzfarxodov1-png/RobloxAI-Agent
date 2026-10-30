/**
 * QURUVCHI UI ENGINE — BLUEPRINT
 * Creates native UI Agent blueprints and multi-screen project packages.
 */
import { buildUIBlueprint, generateUIProject, getUIAgentInfo } from '../agent.js';
import { analyzeUIRequest } from './analyzer.js';

const clean = (value, max = 100) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const allowed = new Set(['main-menu','game-hud','inventory','shop','settings']);

export function buildUIEngineBlueprint(input = {}) {
  const analysis = analyzeUIRequest(input);
  if (!analysis.ok) return { success: false, status: analysis.status, analysis };
  const requested = Array.isArray(input.presets) ? input.presets : analysis.profile.requestedPresets;
  const selected = [...new Set(requested.map(item => clean(item, 60)).filter(item => allowed.has(item)))].slice(0, 5);
  if (!selected.length) selected.push('main-menu');
  const options = { gameName: clean(input.gameName || 'Quruvchi Game', 100), theme: clean(input.theme || analysis.profile.theme, 60), viewport: input.viewport || analysis.profile.viewport, presets: selected };
  let project;
  try { project = generateUIProject(options); }
  catch (error) { return { success: false, status: 'generation-failed', analysis, errors: [clean(error.message, 1000)] }; }
  const blueprints = [];
  for (const preset of selected) {
    try { blueprints.push(buildUIBlueprint({ ...options, preset })); }
    catch (error) { blueprints.push({ preset, error: clean(error.message, 500) }); }
  }
  return { success: project.success === true, status: project.success ? 'generated' : 'qa-failed', agent: 'UI Engine', version: '1.0.1', analysis, project, blueprints, studio: project.studio || { requiresPlugin: true, playtestRequired: true } };
}

export function getUIBlueprintInfo() { return { version: '1.0.1', supportedPresets: [...allowed], outputs: ['ScreenGui hierarchy','responsive UI blueprint','LocalScript controllers','UI QA reports'], requiresPlugin: true }; }
export function getUIAgentEngineInfo() { return getUIAgentInfo(); }
