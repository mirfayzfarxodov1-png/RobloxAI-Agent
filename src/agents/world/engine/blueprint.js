/**
 * QURUVCHI WORLD ENGINE — BLUEPRINT
 * Converts analyzed intent into the original World Agent's native project output.
 */
import { generateWorldProject, createWorldConfig, interpretWorldRequest, getWorldAgentInfo } from '../agent.js';
import { analyzeWorldRequest } from './analyzer.js';

const safeText = (value, max = 100) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const bounded = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;

export function buildWorldEngineBlueprint(input = {}) {
  const prompt = safeText(input.prompt, 30000);
  const analysis = analyzeWorldRequest({ prompt });
  if (!analysis.ok) return { success: false, status: analysis.status, analysis, errors: analysis.findings };
  const options = {
    name: safeText(input.name || input.gameName || 'Quruvchi World', 100),
    biome: safeText(input.biome || analysis.profile.biome, 60),
    seed: bounded(input.seed, 1, 2147483647, 20261030),
    worldSize: {
      x: bounded(input.worldSize?.x, 128, 10000, 1024),
      z: bounded(input.worldSize?.z, 128, 10000, 1024)
    },
    buildings: { style: safeText(input.architecture || analysis.profile.architecture, 60) },
    optimization: { level: ['low','medium','high'].includes(input.optimization?.level) ? input.optimization.level : 'high' },
    prompt
  };
  let result;
  try { result = generateWorldProject(options); }
  catch (error) { return { success: false, status: 'generation-failed', analysis, errors: [safeText(error.message, 1000)] }; }
  return {
    success: result.success === true,
    status: result.status || 'unknown',
    agent: 'World Engine',
    version: '1.0.0',
    request: { prompt, options },
    analysis,
    world: result.world || null,
    output: result.output || null,
    optimization: result.optimization || null,
    qa: result.qa || null,
    studio: result.studio || { connected: false, executed: false, requiresPlugin: true, requiresPlaytest: true },
    nativeResult: result
  };
}

export function createWorldBlueprintTemplate(input = {}) {
  const interpretation = input.prompt ? interpretWorldRequest(input.prompt) : null;
  const config = createWorldConfig({
    name: safeText(input.name || 'Quruvchi World', 100),
    biome: safeText(input.biome || interpretation?.biome || 'forest', 60),
    seed: bounded(input.seed, 1, 2147483647, 20261030),
    worldSize: input.worldSize
  });
  return { version: '1.0.0', agent: 'World Engine', config, interpretation, requirements: interpretation?.features || [], sourceAgent: getWorldAgentInfo().name, generatedAt: new Date().toISOString() };
}

export function getWorldBlueprintInfo() {
  return { version: '1.0.0', output: ['world config','world blueprint','instance tree','Luau batches','optimization report','World QA'], boundedInputs: true, mutatesStudio: false };
}
