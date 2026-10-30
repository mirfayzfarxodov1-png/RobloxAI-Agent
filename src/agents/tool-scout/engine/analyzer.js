/**
 * QURUVCHI TOOL SCOUT ENGINE — ANALYZER
 * Reviews tool candidates and normalizes tool-discovery requests.
 */
import { auditToolSecurity, auditDependencies, scoreTool, getToolScoutInfo } from '../agent.js';

const clean = (value, max = 300) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const list = value => Array.isArray(value) ? value : [];

export function analyzeToolRequest(input = {}) {
  const query = clean(input.query || input.prompt, 300);
  const agent = clean(input.agent || 'Gameplay Agent', 100);
  if (!query) return { ok: false, status: 'missing-query', findings: [{ id: 'tool-query-required', severity: 'error', message: 'Tool Scout requires a search query.' }] };
  return { ok: true, status: 'analyzed', query, agent, constraints: { freeOnly: input.freeOnly === true, categories: list(input.categories).slice(0, 20), maxResults: Math.max(1, Math.min(20, Number(input.limit) || 10)), installationRequiresApproval: true, externalCodeExecution: false }, source: 'Tool Scout Engine', runtimeExecuted: false };
}

export function analyzeToolCandidates(input = {}) {
  const tools = list(input.tools).slice(0, 500);
  const results = [];
  for (const tool of tools) {
    let security = null;
    let compatibility = null;
    try { security = auditToolSecurity(tool); } catch (error) { security = { safe: false, error: clean(error.message, 500) }; }
    try { compatibility = scoreTool(tool, clean(input.query || '', 300), { compatibility: input.compatibility }); } catch (error) { compatibility = { recommended: false, error: clean(error.message, 500) }; }
    results.push({ id: clean(tool?.id || tool?.name || 'unknown', 100), name: clean(tool?.name || 'Unnamed tool', 120), security, compatibility, approvedForAutoInstall: false });
  }
  const unsafe = results.filter(item => item.security?.safe === false || item.security?.passed === false);
  return { ok: true, status: unsafe.length ? 'review-required' : 'analyzed', summary: { candidates: results.length, unsafe: unsafe.length }, results, findings: unsafe.map(item => ({ id: 'tool-security-review', severity: 'warning', message: item.name + ' needs manual security review.' })), execution: { externalCodeExecuted: false, packagesInstalled: false } };
}

export function getToolScoutAnalyzerInfo() { return { name: 'Tool Scout Engine Analyzer', version: '1.0.0', sourceAgent: getToolScoutInfo().name, capabilities: ['query normalization','tool security review','compatibility scoring','free-only constraints','manual approval enforcement'] }; }
