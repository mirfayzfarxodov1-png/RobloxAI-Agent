
/**
 * =====================================================================
 * QURUVCHI MAX — GAMEPLAY ENGINE CORE
 * Version: 2.0.0
 * File: src/agents/gameplay/engine/index.js
 * =====================================================================
 *
 * MAIN RESPONSIBILITIES
 * ---------------------------------------------------------------------
 * 01. Connect the original Gameplay Agent V2.
 * 02. Coordinate the Luau source analyzer.
 * 03. Generate scalable Roblox game blueprints.
 * 04. Validate generated gameplay artifacts.
 * 05. Audit complete gameplay projects.
 * 06. Produce unified quality and security reports.
 * 07. Preserve legacy API compatibility.
 * 08. Expose engine metadata and feature catalogs.
 * 09. Normalize inputs and protect against malformed data.
 * 10. Keep static analysis separate from Studio runtime testing.
 *
 * IMPORTANT:
 * This module does not execute Luau.
 * This module does not modify the original specialist agent.
 * This module does not claim Roblox Studio Play-test success.
 * =====================================================================
 */

import {
  detectGameType,
  detectGameplayFeatures,
  createGameplaySpecification,
  buildGameplayPlan as buildLegacyGameplayPlan,
  auditGameplayProject as auditLegacyGameplayProject,
  getGameplayAgentInfo as getLegacyGameplayAgentInfo
} from '../agent.js';

import {
  analyzeLuauSource,
  analyzeLuauProject,
  getGameplayAnalyzerInfo
} from './analyzer.js';

import {
  buildGameplayBlueprint as buildRawGameplayBlueprint,
  getGameplayFeatureCatalog,
  getGameplayPresetCatalog,
  validateGameplayBlueprint,
  getGameplayBlueprintInfo
} from './blueprint.js';

import {
  validateGameplayArtifact
} from './validator.js';

// =====================================================================
// 01. ENGINE CONSTANTS
// =====================================================================

const ENGINE_NAME = 'Quruvchi MAX Gameplay Engine';

const ENGINE_VERSION = '2.0.0';

const ENGINE_STATUS = 'ready';

const ENGINE_LIMITS = Object.freeze({
  MAX_PROMPT_LENGTH: 12000,
  MAX_SOURCE_LENGTH: 100000,
  MAX_PROJECT_FILES: 400,
  MAX_FEATURES: 80,
  MAX_FINDINGS: 500,
  MAX_PATH_LENGTH: 300,
  MAX_NAME_LENGTH: 100
});

const ENGINE_CAPABILITIES = Object.freeze([
  'Original Gameplay Agent V2 compatibility',
  'Game type detection',
  'Gameplay feature detection',
  'Gameplay specification generation',
  'Modular Roblox architecture planning',
  'Server and client responsibility planning',
  'Remote communication contract planning',
  'Data persistence planning',
  'Player lifecycle planning',
  'Security policy generation',
  'Performance requirement generation',
  'Luau source analysis',
  'Multi-file project analysis',
  'Gameplay artifact validation',
  'Blueprint validation',
  'Unified project auditing',
  'Quality score calculation',
  'Actionable issue reporting',
  'Roblox Studio readiness reporting'
]);

// =====================================================================
// 02. INPUT NORMALIZATION
// =====================================================================

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function safeObject(value) {
  return isObject(value) ? value : {};
}

function safeString(value, maxLength = ENGINE_LIMITS.MAX_NAME_LENGTH) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeArray(value, maxLength = ENGINE_LIMITS.MAX_FEATURES) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, maxLength);
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeProjectInput(input = {}) {
  const project = safeObject(input);

  return {
    ...project,

    name: safeString(
      project.name || project.title || 'Quruvchi Roblox Experience'
    ),

    title: safeString(
      project.title || project.name || 'Quruvchi Roblox Experience'
    ),

    kind: safeString(
      project.kind || project.gameType || project.type || 'custom',
      60
    ),

    gameType: safeString(
      project.gameType || project.kind || project.type || 'custom',
      60
    ),

    description: safeString(
      project.description || '',
      1000
    ),

    prompt: safeString(
      project.prompt || project.description || '',
      ENGINE_LIMITS.MAX_PROMPT_LENGTH
    ),

    source: typeof project.source === 'string'
      ? project.source.slice(0, ENGINE_LIMITS.MAX_SOURCE_LENGTH)
      : '',

    scriptPath: safeString(
      project.scriptPath || project.path || '',
      ENGINE_LIMITS.MAX_PATH_LENGTH
    ),

    path: safeString(
      project.path || project.scriptPath || '',
      ENGINE_LIMITS.MAX_PATH_LENGTH
    ),

    features: safeArray(project.features),

    files: safeArray(
      project.files,
      ENGINE_LIMITS.MAX_PROJECT_FILES
    )
  };
}

// =====================================================================
// 03. SAFE EXECUTION HELPERS
// =====================================================================

function executeSafely(callback, fallback) {
  try {
    return callback();
  } catch (error) {
    return {
      ...fallback,
      ok: false,
      status: 'engine-error',
      error: {
        name: error?.name || 'Error',
        message: safeString(error?.message || 'Unknown engine error', 500)
      }
    };
  }
}

function normalizeSeverity(value) {
  const severity = safeString(value, 20).toLowerCase();

  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';

  return 'info';
}

function summarizeIssues(issues = []) {
  const summary = {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0
  };

  for (const issue of safeArray(issues, ENGINE_LIMITS.MAX_FINDINGS)) {
    if (!isObject(issue)) continue;

    summary.total++;

    const severity = normalizeSeverity(issue.severity);

    if (severity === 'error') {
      summary.errors++;
    } else if (severity === 'warning') {
      summary.warnings++;
    } else {
      summary.info++;
    }
  }

  return summary;
}

function calculateUnifiedScore(issues = []) {
  let score = 100;

  for (const issue of issues) {
    const severity = normalizeSeverity(issue?.severity);

    if (severity === 'error') {
      score -= 25;
    } else if (severity === 'warning') {
      score -= 8;
    } else {
      score -= 1;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function resolveQualityStatus(summary) {
  if (summary.errors > 0) {
    return 'needs-fix';
  }

  if (summary.warnings > 5) {
    return 'needs-review';
  }

  if (summary.warnings > 0) {
    return 'review';
  }

  return 'ready-for-studio';
}

// =====================================================================
// 04. GAMEPLAY FEATURE DETECTION
// =====================================================================

export {
  detectGameType,
  detectGameplayFeatures,
  createGameplaySpecification,
  analyzeLuauSource,
  analyzeLuauProject,
  getGameplayAnalyzerInfo,
  getGameplayFeatureCatalog,
  getGameplayPresetCatalog,
  validateGameplayBlueprint,
  getGameplayBlueprintInfo,
  validateGameplayArtifact
};

/**
 * Detect the game type and requested gameplay features.
 *
 * This function delegates detection to the original Gameplay Agent.
 * It does not replace or rewrite its internal logic.
 */
export function inspectGameplayRequest(input = {}) {
  const project = normalizeProjectInput(input);

  return executeSafely(
    () => {
      const detectedType = detectGameType({
        ...project,
        prompt: project.prompt,
        description: project.description
      });

      const detectedFeatures = detectGameplayFeatures({
        ...project,
        kind: detectedType?.kind || project.kind,
        gameType: detectedType?.kind || project.gameType
      });

      return {
        ok: true,
        engineVersion: ENGINE_VERSION,

        project: {
          name: project.name,
          kind: project.kind,
          description: project.description
        },

        detectedType,

        detectedFeatures: Array.isArray(detectedFeatures)
          ? detectedFeatures
          : [],

        timestamp: new Date().toISOString()
      };
    },
    {
      detectedType: null,
      detectedFeatures: []
    }
  );
}

// =====================================================================
// 05. BLUEPRINT COMPATIBILITY LAYER
// =====================================================================

/**
 * Convert the native blueprint into a compatibility-friendly structure.
 *
 * The original blueprint fields are preserved.
 * Additional aliases are provided for older consumers.
 */
function addBlueprintCompatibility(blueprint) {
  const result = safeObject(blueprint);

  const architecture = safeObject(result.architecture);

  const modules = safeArray(architecture.modules, 160);

  const folders = safeArray(architecture.folders, 250);

  const remoteContracts = safeArray(
    result.remotes?.contracts,
    100
  );

  const persistence = safeObject(result.persistence);

  const moduleNames = modules
    .map(item => typeof item === 'string' ? item : item?.name)
    .filter(Boolean);

  const layers = folders.map(folder => ({
    name: safeString(folder?.path || 'Unnamed folder'),
    path: safeString(folder?.path || ''),
    className: safeString(folder?.className || 'Folder'),
    purpose: safeString(folder?.purpose || ''),
    authority: safeString(folder?.authority || 'shared')
  }));

  const hasRewardRemote = remoteContracts.some(remote =>
    /reward|purchase|egg|currency/i.test(
      safeString(remote?.name || '')
    )
  );

  return {
    ...result,

    // Compatibility fields.
    modules: moduleNames,

    layers,

    remoteContract: {
      serverOwnsRewards: true,
      clientRequestsAreUntrusted: true,
      contracts: remoteContracts,
      rewardRelatedRemotesDetected: hasRewardRemote
    },

    persistence: {
      ...persistence,
      enabled: persistence.enabled === true ||
        persistence.required === true ||
        persistence.strategy === 'profile-based'
    },

    compatibility: {
      originalBlueprintPreserved: true,
      moduleAliasesAdded: true,
      layerAliasesAdded: true,
      remoteContractAliasAdded: true
    }
  };
}

/**
 * Public blueprint builder.
 *
 * It preserves the original blueprint generator and adds stable
 * compatibility fields for the rest of Quruvchi.
 */
export function buildGameplayBlueprint(input = {}, detectedFeatures = []) {
  const project = normalizeProjectInput(input);

  return executeSafely(
    () => {
      const blueprint = buildRawGameplayBlueprint(
        project,
        safeArray(detectedFeatures)
      );

      return addBlueprintCompatibility(blueprint);
    },
    {
      version: ENGINE_VERSION,
      identity: {
        name: project.name,
        gameType: project.gameType
      },
      architecture: {
        modules: [],
        folders: []
      },
      modules: [],
      layers: [],
      remotes: {
        total: 0,
        contracts: []
      },
      remoteContract: {
        serverOwnsRewards: true,
        clientRequestsAreUntrusted: true,
        contracts: []
      },
      persistence: {
        enabled: false
      },
      compatibility: {
        originalBlueprintPreserved: false
      }
    }
  );
}

// =====================================================================
// 06. LEGACY GAMEPLAY PLAN ADAPTER
// =====================================================================

function buildLegacyPlan(project) {
  return buildLegacyGameplayPlan({
    ...project,
    source: project.source,
    scriptPath: project.scriptPath,
    path: project.path,
    prompt: project.prompt,
    kind: project.kind,
    title: project.title,
    name: project.name,
    features: project.features
  });
}

function normalizeLegacyChecks(checks) {
  return safeArray(checks, 250).map(check => ({
    ...safeObject(check),
    name: safeString(check?.name || 'Unnamed requirement'),
    ok: check?.ok === true
  }));
}

// =====================================================================
// 07. UNIFIED GAMEPLAY PLAN
// =====================================================================

/**
 * Main Gameplay Engine entry point.
 *
 * Pipeline:
 * 1. Normalize user project.
 * 2. Run original Gameplay Agent V2.
 * 3. Collect detected features.
 * 4. Generate modular architecture blueprint.
 * 5. Validate generated source.
 * 6. Validate architecture blueprint.
 * 7. Combine findings.
 * 8. Return legacy-compatible result plus engine report.
 */
export function buildGameplayPlan(input = {}) {
  const project = normalizeProjectInput(input);

  return executeSafely(
    () => {
      // -------------------------------------------------------------
      // STEP 1 — Original Gameplay Agent
      // -------------------------------------------------------------

      const legacy = buildLegacyPlan(project);

      const detectedFeatures = safeArray(
        legacy?.detectedFeatures,
        ENGINE_LIMITS.MAX_FEATURES
      );

      const legacyChecks = normalizeLegacyChecks(
        legacy?.checks
      );

      // -------------------------------------------------------------
      // STEP 2 — Blueprint generation
      // -------------------------------------------------------------

      const blueprint = buildGameplayBlueprint(
        {
          ...project,
          kind: legacy?.kind || project.kind,
          gameType: legacy?.kind || project.gameType,
          name: legacy?.title || project.name,
          title: legacy?.title || project.title
        },
        detectedFeatures
      );

      // -------------------------------------------------------------
      // STEP 3 — Source validation
      // -------------------------------------------------------------

      const source = typeof legacy?.source === 'string'
        ? legacy.source
        : project.source;

      const scriptPath = safeString(
        legacy?.scriptPath || project.scriptPath
      );

      const artifactQuality = validateGameplayArtifact({
        source,
        path: scriptPath,
        legacyChecks
      });

      // -------------------------------------------------------------
      // STEP 4 — Blueprint validation
      // -------------------------------------------------------------

      const blueprintQuality = validateGameplayBlueprint(
        blueprint
      );

      // -------------------------------------------------------------
      // STEP 5 — Unified findings
      // -------------------------------------------------------------

      const sourceIssues = safeArray(
        artifactQuality?.issues,
        ENGINE_LIMITS.MAX_FINDINGS
      );

      const blueprintIssues = safeArray(
        blueprintQuality?.issues,
        ENGINE_LIMITS.MAX_FINDINGS
      ).map(issue => ({
        id: safeString(issue?.id || 'blueprint-issue'),
        severity: normalizeSeverity(issue?.severity),
        category: 'architecture',
        title: safeString(issue?.message || 'Blueprint validation issue'),
        detail: safeString(issue?.message || '')
      }));

      const allIssues = [
        ...sourceIssues,
        ...blueprintIssues
      ];

      const summary = summarizeIssues(allIssues);

      const score = calculateUnifiedScore(allIssues);

      const status = resolveQualityStatus(summary);

      // -------------------------------------------------------------
      // STEP 6 — Engine report
      // -------------------------------------------------------------

      const engineReport = {
        name: ENGINE_NAME,
        version: ENGINE_VERSION,
        status,
        ok: summary.errors === 0,
        score,

        counts: summary,

        blueprint,

        quality: {
          ok: summary.errors === 0,
          status,
          score,
          counts: summary,
          issues: allIssues
        },

        sourceQuality: artifactQuality,

        blueprintQuality,

        pipeline: {
          legacyAgentExecuted: true,
          blueprintGenerated: true,
          sourceValidated: true,
          blueprintValidated: true,
          runtimeExecuted: false,
          studioPlayTestCompleted: false
        },

        timestamp: new Date().toISOString()
      };

      // -------------------------------------------------------------
      // STEP 7 — Preserve legacy result
      // -------------------------------------------------------------

      return {
        ...legacy,

        agent: legacy?.agent || 'Gameplay Agent',

        source,

        scriptPath,

        checks: legacyChecks,

        detectedFeatures,

        engine: engineReport
      };
    },
    {
      agent: 'Gameplay Agent',
      ok: false,
      status: 'engine-error',
      source: '',
      checks: [],
      missing: [],
      engine: {
        name: ENGINE_NAME,
        version: ENGINE_VERSION,
        status: 'engine-error',
        ok: false,
        score: 0,
        counts: {
          total: 1,
          errors: 1,
          warnings: 0,
          info: 0
        },
        pipeline: {
          legacyAgentExecuted: false,
          blueprintGenerated: false,
          sourceValidated: false,
          blueprintValidated: false,
          runtimeExecuted: false,
          studioPlayTestCompleted: false
        }
      }
    }
  );
}

// =====================================================================
// 08. MULTI-FILE PROJECT ANALYSIS
// =====================================================================

/**
 * Analyze an entire Roblox project represented as source files.
 *
 * Input:
 * {
 *   name: "My Game",
 *   files: [
 *     {
 *       path: "ServerScriptService/Main.server.lua",
 *       source: "..."
 *     }
 *   ]
 * }
 */
export function analyzeGameplayProject(input = {}) {
  const project = normalizeProjectInput(input);

  const files = safeArray(
    project.files,
    ENGINE_LIMITS.MAX_PROJECT_FILES
  ).map(file => ({
    path: safeString(
      file?.path || file?.name || '',
      ENGINE_LIMITS.MAX_PATH_LENGTH
    ),

    source: typeof file?.source === 'string'
      ? file.source.slice(0, ENGINE_LIMITS.MAX_SOURCE_LENGTH)
      : ''
  }));

  return executeSafely(
    () => {
      const analysis = analyzeLuauProject({
        files
      });

      const results = safeArray(
        analysis.results,
        ENGINE_LIMITS.MAX_PROJECT_FILES
      );

      const issueList = results.flatMap(result =>
        safeArray(result?.issues, ENGINE_LIMITS.MAX_FINDINGS)
      );

      const summary = summarizeIssues(issueList);

      return {
        ok: summary.errors === 0,

        name: project.name,

        version: ENGINE_VERSION,

        status: resolveQualityStatus(summary),

        score: calculateUnifiedScore(issueList),

        summary: {
          files: files.length,
          analyzed: results.length,
          ...summary
        },

        results,

        issues: issueList,

        runtime: {
          executed: false,
          studioRequired: true
        }
      };
    },
    {
      ok: false,
      status: 'analysis-error',
      score: 0,
      summary: {
        files: files.length,
        analyzed: 0,
        total: 1,
        errors: 1,
        warnings: 0,
        info: 0
      },
      results: [],
      issues: []
    }
  );
}

// =====================================================================
// 09. GAMEPLAY PROJECT AUDIT
// =====================================================================

/**
 * Run both the original audit and the new engine validation.
 */
export function auditGameplayProject(input = {}) {
  const project = normalizeProjectInput(input);

  return executeSafely(
    () => {
      const legacyAudit = auditLegacyGameplayProject(project);

      const plan = buildGameplayPlan(project);

      const engine = safeObject(plan.engine);

      const legacyScore = Number.isFinite(legacyAudit?.score)
        ? legacyAudit.score
        : 0;

      const engineScore = Number.isFinite(engine.score)
        ? engine.score
        : 0;

      const combinedScore = Math.min(
        legacyScore,
        engineScore
      );

      const legacyErrors = safeArray(
        legacyAudit?.errors,
        250
      );

      const engineIssues = safeArray(
        engine.quality?.issues,
        ENGINE_LIMITS.MAX_FINDINGS
      );

      const criticalIssues = engineIssues.filter(
        issue => normalizeSeverity(issue?.severity) === 'error'
      );

      const nextActions = [];

      if (criticalIssues.length > 0) {
        nextActions.push(
          'Fix critical source and architecture errors.'
        );
      }

      if (engine.counts?.warnings > 0) {
        nextActions.push(
          'Review security and performance warnings.'
        );
      }

      if (engine.blueprintQuality?.ok === false) {
        nextActions.push(
          'Repair missing blueprint modules or remote contracts.'
        );
      }

      nextActions.push(
        'Generate or synchronize the planned objects in Roblox Studio.',
        'Run the game in Roblox Studio.',
        'Inspect the Output window.',
        'Test player lifecycle and multiplayer behavior.',
        'Verify server-side ownership of rewards and progression.'
      );

      return {
        ...legacyAudit,

        agent: ENGINE_NAME,

        engineVersion: ENGINE_VERSION,

        ok: legacyAudit?.ok === true &&
          engine.ok === true,

        status: engine.status,

        score: combinedScore,

        legacyScore,

        engineScore,

        errors: unique([
          ...legacyErrors.map(item => String(item)),
          ...criticalIssues.map(item => item.title || item.id)
        ]),

        engine,

        nextActions,

        verification: {
          staticAnalysisCompleted: true,
          blueprintValidationCompleted: true,
          studioConnectionVerified: false,
          runtimeExecutionVerified: false,
          playTestVerified: false
        }
      };
    },
    {
      agent: ENGINE_NAME,
      ok: false,
      status: 'audit-error',
      score: 0,
      errors: ['Gameplay project audit failed.'],
      nextActions: [
        'Inspect the engine error.',
        'Run the test suite again.'
      ]
    }
  );
}

// =====================================================================
// 10. GAMEPLAY SPECIFICATION PIPELINE
// =====================================================================

/**
 * Create a normalized gameplay specification.
 */
export function createEngineGameplaySpecification(input = {}) {
  const project = normalizeProjectInput(input);

  return executeSafely(
    () => {
      const specification = createGameplaySpecification({
        ...project,
        kind: project.kind,
        name: project.name,
        prompt: project.prompt,
        features: project.features
      });

      const blueprint = buildGameplayBlueprint(
        project,
        specification?.detectedFeatures || project.features
      );

      return {
        ...safeObject(specification),

        engine: {
          version: ENGINE_VERSION,
          blueprint,
          generatedAt: new Date().toISOString()
        }
      };
    },
    {
      ok: false,
      specification: null,
      engine: {
        version: ENGINE_VERSION,
        error: 'Specification generation failed.'
      }
    }
  );
}

// =====================================================================
// 11. QUALITY REPORT FORMATTER
// =====================================================================

/**
 * Convert a plan into a compact report for UI and API consumers.
 */
export function createGameplayQualityReport(plan = {}) {
  const result = safeObject(plan);

  const engine = safeObject(result.engine);

  const quality = safeObject(engine.quality);

  const issues = safeArray(
    quality.issues,
    ENGINE_LIMITS.MAX_FINDINGS
  );

  const summary = summarizeIssues(issues);

  return {
    agent: ENGINE_NAME,

    version: ENGINE_VERSION,

    project: {
      name: safeString(result.title || result.name || ''),
      kind: safeString(result.kind || '')
    },

    status: engine.status || result.status || 'unknown',

    score: Number.isFinite(engine.score)
      ? engine.score
      : 0,

    summary,

    issues: issues.map(issue => ({
      id: safeString(issue?.id || 'unknown'),
      severity: normalizeSeverity(issue?.severity),
      category: safeString(issue?.category || 'general'),
      title: safeString(issue?.title || 'Issue'),
      detail: safeString(issue?.detail || ''),
      recommendation: safeString(issue?.recommendation || ''),
      line: Number.isInteger(issue?.line)
        ? issue.line
        : null
    })),

    studio: {
      required: true,
      playTestVerified: false
    }
  };
}

// =====================================================================
// 12. ENGINE HEALTH AND METADATA
// =====================================================================

export function getGameplayAgentInfo() {
  const legacy = getLegacyGameplayAgentInfo();

  const analyzer = getGameplayAnalyzerInfo();

  const blueprint = getGameplayBlueprintInfo();

  return {
    ...legacy,

    name: ENGINE_NAME,

    version: legacy.version || '2.0.0',

    engineVersion: ENGINE_VERSION,

    status: ENGINE_STATUS,

    runtime: 'Node.js ES Modules',

    output: 'Roblox Luau',

    capabilities: unique([
      ...safeArray(legacy.capabilities, 100),
      ...ENGINE_CAPABILITIES
    ]),

    engineModules: [
      'analyzer.js',
      'blueprint.js',
      'validator.js',
      'index.js'
    ],

    components: {
      analyzer,
      blueprint
    },

    limits: {
      ...ENGINE_LIMITS
    },

    execution: {
      executesLuau: false,
      modifiesRobloxStudio: false,
      connectsToStudioDirectly: false,
      performsStaticAnalysis: true,
      generatesArchitectureBlueprints: true,
      requiresStudioPlayTest: true
    },

    verification: {
      sourceAnalysis: 'static-only',
      architectureAnalysis: 'static-only',
      runtimeTesting: 'not-performed',
      playTest: 'must-be-confirmed-in-roblox-studio'
    }
  };
}

// =====================================================================
// 13. ENGINE SELF-DIAGNOSTICS
// =====================================================================

/**
 * Check whether all required engine modules are callable.
 */
export function runGameplayEngineDiagnostics() {
  const checks = [];

  function check(name, callback) {
    try {
      const result = callback();

      checks.push({
        name,
        ok: result !== undefined && result !== null,
        status: 'available'
      });
    } catch (error) {
      checks.push({
        name,
        ok: false,
        status: 'failed',
        error: safeString(error?.message || 'Unknown error')
      });
    }
  }

  check('Legacy Gameplay Agent', () =>
    typeof buildLegacyGameplayPlan
  );

  check('Luau Analyzer', () =>
    typeof analyzeLuauSource
  );

  check('Multi-file Analyzer', () =>
    typeof analyzeLuauProject
  );

  check('Blueprint Generator', () =>
    typeof buildRawGameplayBlueprint
  );

  check('Blueprint Validator', () =>
    typeof validateGameplayBlueprint
  );

  check('Artifact Validator', () =>
    typeof validateGameplayArtifact
  );

  check('Feature Catalog', () =>
    typeof getGameplayFeatureCatalog
  );

  check('Preset Catalog', () =>
    typeof getGameplayPresetCatalog
  );

  const failed = checks.filter(item => !item.ok).length;

  return {
    name: ENGINE_NAME,

    version: ENGINE_VERSION,

    ok: failed === 0,

    status: failed === 0 ? 'healthy' : 'degraded',

    summary: {
      total: checks.length,
      passed: checks.length - failed,
      failed
    },

    checks,

    timestamp: new Date().toISOString()
  };
}

// =====================================================================
// 14. PUBLIC ENGINE API
// =====================================================================

export const GameplayEngine = Object.freeze({
  name: ENGINE_NAME,
  version: ENGINE_VERSION,

  inspect: inspectGameplayRequest,

  build: buildGameplayPlan,

  blueprint: buildGameplayBlueprint,

  specification: createEngineGameplaySpecification,

  analyzeSource: analyzeLuauSource,

  analyzeProject: analyzeGameplayProject,

  validate: validateGameplayArtifact,

  validateBlueprint: validateGameplayBlueprint,

  audit: auditGameplayProject,

  report: createGameplayQualityReport,

  diagnostics: runGameplayEngineDiagnostics,

  info: getGameplayAgentInfo,

  features: getGameplayFeatureCatalog,

  presets: getGameplayPresetCatalog
});

// =====================================================================
// 15. DEFAULT EXPORT
// =====================================================================

export default GameplayEngine;

// =====================================================================
// END OF QURuvchi MAX GAMEPLAY ENGINE CORE
// =====================================================================
