/**
 * QURUVCHI TOOL SCOUT ENGINE — BLUEPRINT
 * Produces a reviewable discovery and installation recommendation plan.
 */
import { recommendTools, auditDependencies, getToolScoutInfo } from '../agent.js';
import { analyzeToolRequest } from './analyzer.js';

const clean = (value, max = 300) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const list = value => Array.isArray(value) ? value : [];

export function buildToolScoutBlueprint(input = {}) {
  const analysis = analyzeToolRequest(input);
  if (!analysis.ok) return { success: false, status: analysis.status, analysis };
  const recommendations = recommendTools({ agent: analysis.agent, query: analysis.query, tools: list(input.tools), freeOnly: analysis.constraints.freeOnly, compatibility: input.compatibility, limit: analysis.constraints.maxResults });
  const dependencyAudits = recommendations.recommendations.map(item => ({ tool: item.tool, audit: auditDependencies(item.tool, list(input.knownTools)) }));
  return { success: true, status: 'planned', agent: 'Tool Scout Engine', version: '1.0.0', analysis, recommendations, dependencyAudits, installationPlan: recommendations.recommendations.map(item => ({ toolId: item.tool.id, name: item.tool.name, action: 'manual-review', approved: false, requiresExplicitApproval: true, executeAutomatically: false })), security: { executesDiscoveredCode: false, installsPackages: false, unknownLicenseIsFree: false, approvalRequired: true } };
}

export function getToolScoutBlueprintInfo() { return { version: '1.0.0', outputs: ['discovery request','ranked recommendations','dependency audit','manual installation plan'], automaticInstallation: false }; }
export function getToolScoutAgentEngineInfo() { return getToolScoutInfo(); }
