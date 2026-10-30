/**
 * QURuvchi QA ENGINE — ANALYZER
 * Normalizes supplied project files and delegates static audit to the QA Agent.
 */
import { runQAAudit, createGameplayTestPlan, getQAAgentInfo } from '../agent.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clean = (value, max = 240) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const LIMITS = Object.freeze({ files: 2000, fileSize: 500000, totalSize: 20000000 });

export function normalizeQAProject(input = {}) {
  const files = (Array.isArray(input.files) ? input.files : []).slice(0, LIMITS.files).filter(isObject).map(file => {
    const content = typeof file.content === 'string' ? file.content : typeof file.source === 'string' ? file.source : '';
    const boundedContent = content.slice(0, LIMITS.fileSize);
    return { path: clean(file.path || file.name || 'Unknown.lua'), content: boundedContent, source: boundedContent, size: boundedContent.length, agent: clean(file.agent || 'unknown', 80), type: clean(file.type || '', 40) };
  });
  return { ...input, files, requirements: Array.isArray(input.requirements) ? input.requirements.slice(0, 500) : [], features: Array.isArray(input.features) ? input.features.slice(0, 500) : [] };
}

export function analyzeQAProject(input = {}) {
  const project = normalizeQAProject(input);
  const totalSize = project.files.reduce((sum, file) => sum + file.size, 0);
  const findings = [];
  if (!project.files.length) findings.push({ id: 'qa-files-empty', severity: 'warning', message: 'No project files were supplied; audit coverage will be limited.' });
  if ((Array.isArray(input.files) ? input.files.length : 0) > LIMITS.files) findings.push({ id: 'qa-file-limit', severity: 'error', message: 'Project file count exceeds the engine limit.' });
  if (totalSize > LIMITS.totalSize) findings.push({ id: 'qa-size-limit', severity: 'error', message: 'Total source size exceeds the engine limit.' });
  let report = null;
  if (findings.every(item => item.severity !== 'error')) {
    try { report = runQAAudit(project); }
    catch (error) { findings.push({ id: 'qa-agent-error', severity: 'error', message: clean(error.message, 1000) }); }
  }
  const testPlan = createGameplayTestPlan(project);
  return { ok: findings.every(item => item.severity !== 'error') && Boolean(report), status: report?.status || 'blocked', project: { name: clean(project.name || 'Untitled Project'), files: project.files.length, totalSize }, report, testPlan, findings, execution: { staticAuditOnly: true, studioPlaytestPerformed: false } };
}

export function getQAAnalyzerInfo() { return { name: 'QA Engine Analyzer', version: '1.0.1', sourceAgent: getQAAgentInfo().name, limits: { ...LIMITS }, capabilities: ['file normalization','project inventory','static QA delegation','test plan generation','bounded input checks'] }; }
