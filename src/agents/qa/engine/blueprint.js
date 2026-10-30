/**
 * QURUVCHI QA ENGINE — BLUEPRINT
 * Creates a repeatable QA coverage matrix and test evidence contract.
 */
import { createGameplayTestPlan, getQAAgentInfo } from '../agent.js';

const clean = (value, max = 300) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const categories = Object.freeze(['structure','gameplay','security','persistence','ui','performance','lifecycle','integration','studio']);

export function buildQABlueprint(input = {}) {
  const requirements = (Array.isArray(input.requirements) ? input.requirements : []).slice(0, 250).map((item, index) => ({ id: 'REQ-' + String(index + 1).padStart(3, '0'), description: clean(typeof item === 'string' ? item : item.description || item.name), category: clean(item?.category || 'gameplay', 40) }));
  const features = (Array.isArray(input.features) ? input.features : []).slice(0, 250).map(item => clean(typeof item === 'string' ? item : item.name || item.id));
  const testPlan = createGameplayTestPlan({ ...input, requirements, features });
  const checks = categories.map(category => ({ category, required: category !== 'studio', evidenceRequired: category === 'studio' ? ['Studio Play-test evidence','Output log','server/client behavior'] : ['static report','source or artifact reference'], status: 'pending' }));
  return { version: '1.0.0', agent: 'QA Engine', project: clean(input.name || 'Untitled Project'), requirements, features, coverage: { categories, checks }, testPlan, acceptance: { noCriticalStaticIssues: true, serverAuthorityReviewed: true, remoteInputsReviewed: true, dataLifecycleReviewed: true, UIControlsReviewed: true, studioPlaytestEvidenceRequired: true }, limitations: ['Static QA is not a runtime test.','Studio Play-test evidence must be supplied separately.'] };
}

export function getQABlueprintInfo() { return { version: '1.0.0', coverageCategories: [...categories], outputs: ['requirements matrix','test cases','acceptance contract','Studio evidence checklist'] }; }
export function getQAEngineAgentInfo() { return getQAAgentInfo(); }
