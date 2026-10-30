/**
 * QURUVCHI WORLD ENGINE — ANALYZER
 * Inspects requests and generated world artifacts without changing World Agent.
 */
import { interpretWorldRequest, validateWorld, runWorldQA, getWorldAgentInfo } from '../agent.js';

const LIMITS = Object.freeze({ prompt: 30000, parts: 12000, findings: 300 });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clean = (value, max = 500) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const arr = value => Array.isArray(value) ? value : [];

export function analyzeWorldRequest(input = {}) {
  const prompt = clean(input.prompt, LIMITS.prompt);
  if (!prompt) return { ok: false, status: 'missing-prompt', findings: [{ id: 'world-prompt-required', severity: 'error', message: 'World generation prompt is required.' }] };
  let interpretation;
  try { interpretation = interpretWorldRequest(prompt); }
  catch (error) { return { ok: false, status: 'interpretation-failed', findings: [{ id: 'world-interpretation', severity: 'error', message: clean(error.message) }] }; }
  const features = arr(interpretation?.features).slice(0, 100);
  return {
    ok: true, status: 'analyzed', prompt, interpretation,
    profile: {
      biome: clean(interpretation?.biome || 'forest', 60),
      architecture: clean(interpretation?.architecture || 'medieval', 60),
      featureCount: features.length,
      features,
      hasWater: /water|river|lake|ocean|daryo|ko‘l|suv/i.test(prompt),
      hasRoads: /road|path|street|yo‘l|ko‘cha/i.test(prompt),
      hasLandmarks: /castle|tower|temple|city|qal'a|minora|ibodatxona|shahar/i.test(prompt)
    },
    limits: { ...LIMITS },
    source: 'World Agent interpretation',
    runtimeExecuted: false
  };
}

export function analyzeWorldArtifact(input = {}) {
  const world = input.world || input.blueprint || input;
  if (!isObject(world) || !isObject(world.config)) return { ok: false, status: 'invalid-world', findings: [{ id: 'world-artifact-invalid', severity: 'error', message: 'Expected a generated World Agent blueprint.' }] };
  const validation = validateWorld(world);
  const qa = runWorldQA(world);
  const statistics = isObject(world.metadata?.statistics) ? world.metadata.statistics : {};
  const parts = arr(world.parts);
  return {
    ok: validation.valid === true,
    status: validation.valid ? 'analyzed' : 'needs-fix',
    metrics: { parts: parts.length, terrainOperations: arr(world.terrainOperations).length, buildings: arr(world.buildings).length, vegetation: arr(world.vegetation).length, roads: arr(world.roads).length, spawnPoints: arr(world.spawnPoints).length, ...statistics },
    validation, qa,
    findings: [...arr(validation.errors).map(message => ({ id: 'world-validation', severity: 'error', message: clean(message) })), ...arr(validation.warnings).map(message => ({ id: 'world-warning', severity: 'warning', message: clean(message) }))].slice(0, LIMITS.findings),
    runtimeExecuted: false
  };
}

export function getWorldAnalyzerInfo() {
  return { name: 'World Engine Analyzer', version: '1.0.0', sourceAgent: getWorldAgentInfo().name, capabilities: ['prompt interpretation','biome and architecture extraction','world artifact metrics','world validation','world QA aggregation'], limits: { ...LIMITS }, executesStudio: false };
}
