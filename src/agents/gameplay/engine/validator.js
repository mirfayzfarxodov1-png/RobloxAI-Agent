
/**
 * =====================================================================
 * QURUVCHI MAX — GAMEPLAY VALIDATION ENGINE
 * Version: 2.0.0
 * File: src/agents/gameplay/engine/validator.js
 * =====================================================================
 *
 * PURPOSE
 * ---------------------------------------------------------------------
 * 01. Validate generated Gameplay Agent artifacts.
 * 02. Validate Roblox Luau source analysis results.
 * 03. Validate legacy Gameplay Agent requirements.
 * 04. Validate architecture blueprints.
 * 05. Review RemoteEvent security requirements.
 * 06. Review DataStore reliability requirements.
 * 07. Review server/client separation.
 * 08. Review performance and maintainability signals.
 * 09. Produce unified actionable reports.
 * 10. Never claim that static validation is a Play-test.
 *
 * This module does not execute Luau.
 * This module does not modify Roblox Studio.
 * This module does not replace the original Gameplay Agent.
 * =====================================================================
 */

import {
  analyzeLuauSource,
  analyzeLuauProject
} from './analyzer.js';

import {
  validateGameplayBlueprint
} from './blueprint.js';

// =====================================================================
// 01. CONSTANTS
// =====================================================================

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
  MAX_SOURCE_LENGTH: 100000,
  MAX_FILES: 400,
  MAX_ISSUES: 500,
  MAX_LEGACY_CHECKS: 250,
  MAX_PATH_LENGTH: 300,
  MAX_MESSAGE_LENGTH: 1000
});

const SEVERITIES = Object.freeze([
  'error',
  'warning',
  'info'
]);

const REQUIRED_REMOTE_POLICY = Object.freeze([
  'serverMustValidateTypes',
  'serverMustValidateRanges',
  'serverMustValidateOwnership',
  'serverMustValidateDistance',
  'serverMustRateLimit'
]);

// =====================================================================
// 02. NORMALIZATION
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

function safeString(value, max = LIMITS.MAX_MESSAGE_LENGTH) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeArray(value, max = LIMITS.MAX_ISSUES) {
  return Array.isArray(value)
    ? value.slice(0, max)
    : [];
}

function normalizeSeverity(value) {
  const severity = safeString(value, 20).toLowerCase();

  return SEVERITIES.includes(severity)
    ? severity
    : 'info';
}

function normalizeIssue(issue = {}) {
  const item = safeObject(issue);

  return {
    id: safeString(item.id || 'unknown-issue', 100),

    severity: normalizeSeverity(item.severity),

    category: safeString(
      item.category || 'general',
      60
    ),

    title: safeString(
      item.title || item.message || 'Validation issue'
    ),

    detail: safeString(
      item.detail || item.message || ''
    ),

    recommendation: safeString(
      item.recommendation || ''
    ) || null,

    line: Number.isInteger(item.line)
      ? item.line
      : null,

    column: Number.isInteger(item.column)
      ? item.column
      : null,

    snippet: safeString(item.snippet || '', 300) || null
  };
}

function uniqueIssues(issues) {
  const seen = new Set();
  const result = [];

  for (const issue of issues) {
    const normalized = normalizeIssue(issue);

    const key = [
      normalized.id,
      normalized.category,
      normalized.line,
      normalized.title
    ].join('|');

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);

    if (result.length >= LIMITS.MAX_ISSUES) break;
  }

  return result;
}

// =====================================================================
// 03. REPORT CALCULATIONS
// =====================================================================

function summarizeIssues(issues = []) {
  const summary = {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0,
    categories: {}
  };

  for (const issue of issues) {
    summary.total++;

    const severity = normalizeSeverity(issue.severity);

    if (severity === 'error') {
      summary.errors++;
    } else if (severity === 'warning') {
      summary.warnings++;
    } else {
      summary.info++;
    }

    const category = issue.category || 'general';

    summary.categories[category] =
      (summary.categories[category] || 0) + 1;
  }

  return summary;
}

function calculateScore(issues = []) {
  let score = 100;

  for (const issue of issues) {
    const severity = normalizeSeverity(issue.severity);

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

function getStatus(summary) {
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
// 04. INPUT VALIDATION
// =====================================================================

function validateSourceInput(input) {
  const issues = [];

  if (!isObject(input)) {
    issues.push({
      id: 'invalid-input',
      severity: 'error',
      category: 'input',
      title: 'Invalid validation input',
      detail: 'Expected an object containing source code.'
    });

    return {
      ok: false,
      issues
    };
  }

  if (
    typeof input.source !== 'string' ||
    input.source.length === 0
  ) {
    issues.push({
      id: 'missing-source',
      severity: 'error',
      category: 'input',
      title: 'Source code is missing',
      detail: 'A non-empty Luau source string is required.'
    });
  }

  if (
    typeof input.source === 'string' &&
    input.source.length > LIMITS.MAX_SOURCE_LENGTH
  ) {
    issues.push({
      id: 'source-too-large',
      severity: 'error',
      category: 'input',
      title: 'Source exceeds the validation limit',
      detail: `Maximum allowed source length is ${LIMITS.MAX_SOURCE_LENGTH} characters.`
    });
  }

  if (
    typeof input.path === 'string' &&
    input.path.length > LIMITS.MAX_PATH_LENGTH
  ) {
    issues.push({
      id: 'path-too-large',
      severity: 'warning',
      category: 'input',
      title: 'Script path is unusually long',
      detail: 'Use a shorter Roblox instance path.'
    });
  }

  return {
    ok: issues.every(item => item.severity !== 'error'),
    issues
  };
}

// =====================================================================
// 05. LEGACY GAMEPLAY CHECKS
// =====================================================================

function validateLegacyChecks(checks = []) {
  const issues = [];

  const normalizedChecks = safeArray(
    checks,
    LIMITS.MAX_LEGACY_CHECKS
  );

  for (const check of normalizedChecks) {
    if (!isObject(check)) continue;

    if (check.ok === true) continue;

    const name = safeString(
      check.name || check.id || 'Unnamed requirement',
      150
    );

    issues.push({
      id: 'legacy-' + name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),

      severity: 'error',

      category: 'gameplay-requirement',

      title: 'Gameplay requirement missing',

      detail: safeString(
        check.message ||
        check.detail ||
        `${name} did not pass the original Gameplay Agent check.`
      ),

      recommendation: safeString(
        check.recommendation ||
        `Review and implement the missing requirement: ${name}.`
      )
    });
  }

  return issues;
}

// =====================================================================
// 06. BLUEPRINT VALIDATION
// =====================================================================

function validateBlueprint(blueprint) {
  if (!isObject(blueprint)) {
    return {
      ok: false,
      summary: {
        modules: 0,
        folders: 0,
        remotes: 0,
        errors: 1
      },
      issues: [{
        id: 'missing-blueprint',
        severity: 'error',
        category: 'architecture',
        title: 'Gameplay blueprint is missing',
        detail: 'A valid architecture blueprint is required.'
      }]
    };
  }

  const result = validateGameplayBlueprint(blueprint);

  const issues = safeArray(result.issues).map(issue => ({
    ...issue,
    category: 'architecture',
    title: issue.message || issue.title || 'Blueprint issue',
    detail: issue.message || issue.detail || ''
  }));

  return {
    ...result,
    issues
  };
}

// =====================================================================
// 07. REMOTE SECURITY REVIEW
// =====================================================================

function validateRemotePolicy(blueprint) {
  const issues = [];

  const security = safeObject(blueprint?.security);

  const policy = safeObject(security.policy);

  for (const key of REQUIRED_REMOTE_POLICY) {
    if (policy[key] === true) continue;

    issues.push({
      id: `remote-policy-${key}`,
      severity: 'error',
      category: 'security',
      title: 'Required server security policy missing',
      detail: `The blueprint does not enable ${key}.`,
      recommendation: 'Require server-side validation for every untrusted client request.'
    });
  }

  if (policy.clientCannotGrantRewards !== true) {
    issues.push({
      id: 'client-reward-authority',
      severity: 'error',
      category: 'security',
      title: 'Client reward authority is not restricted',
      detail: 'The client must never decide or grant authoritative rewards.',
      recommendation: 'Calculate rewards and update player data on the server.'
    });
  }

  if (policy.clientCannotSetCurrency !== true) {
    issues.push({
      id: 'client-currency-authority',
      severity: 'error',
      category: 'security',
      title: 'Client currency authority is not restricted',
      detail: 'Currency changes must be controlled by the server.',
      recommendation: 'Use server-owned currency transactions.'
    });
  }

  return issues;
}

// =====================================================================
// 08. SERVER / CLIENT ARCHITECTURE REVIEW
// =====================================================================

function validateArchitecture(blueprint) {
  const issues = [];

  const architecture = safeObject(
    blueprint?.architecture
  );

  const modules = safeArray(
    architecture.modules,
    160
  );

  const folders = safeArray(
    architecture.folders,
    250
  );

  if (architecture.serverOwnsGameState !== true) {
    issues.push({
      id: 'server-state-authority',
      severity: 'error',
      category: 'architecture',
      title: 'Server authority is not enabled',
      detail: 'The architecture must keep authoritative gameplay state on the server.',
      recommendation: 'Move rewards, progression, purchases and critical state changes to server services.'
    });
  }

  if (!modules.length) {
    issues.push({
      id: 'no-gameplay-modules',
      severity: 'error',
      category: 'architecture',
      title: 'No gameplay modules found',
      detail: 'The blueprint has no planned modules.'
    });
  }

  if (!folders.length) {
    issues.push({
      id: 'no-roblox-folders',
      severity: 'error',
      category: 'architecture',
      title: 'No Roblox folder structure found',
      detail: 'The blueprint has no planned Roblox hierarchy.'
    });
  }

  const moduleNames = new Set();

  for (const module of modules) {
    if (!isObject(module)) continue;

    const name = safeString(module.name, 100);

    if (!name) {
      issues.push({
        id: 'unnamed-module',
        severity: 'warning',
        category: 'architecture',
        title: 'Unnamed gameplay module',
        detail: 'A module does not have a valid name.'
      });

      continue;
    }

    if (moduleNames.has(name)) {
      issues.push({
        id: 'duplicate-module-' + name.toLowerCase(),
        severity: 'warning',
        category: 'architecture',
        title: 'Duplicate module name',
        detail: `The module ${name} appears more than once.`
      });
    }

    moduleNames.add(name);

    if (
      module.server !== true &&
      module.client !== true
    ) {
      issues.push({
        id: 'module-without-runtime-' + name,
        severity: 'warning',
        category: 'architecture',
        title: 'Module has no assigned runtime',
        detail: `${name} is neither marked server nor client.`
      });
    }
  }

  return issues;
}

// =====================================================================
// 09. REMOTE CONTRACT REVIEW
// =====================================================================

function validateRemoteContracts(blueprint) {
  const issues = [];

  const contracts = safeArray(
    blueprint?.remotes?.contracts,
    100
  );

  const names = new Set();

  for (const remote of contracts) {
    if (!isObject(remote)) continue;

    const name = safeString(remote.name, 100);

    if (!name) {
      issues.push({
        id: 'remote-without-name',
        severity: 'error',
        category: 'security',
        title: 'Remote contract has no name',
        detail: 'Every RemoteEvent or RemoteFunction contract needs a name.'
      });

      continue;
    }

    if (names.has(name)) {
      issues.push({
        id: 'duplicate-remote-' + name.toLowerCase(),
        severity: 'warning',
        category: 'architecture',
        title: 'Duplicate remote contract',
        detail: `Remote ${name} is defined more than once.`
      });
    }

    names.add(name);

    if (!remote.direction) {
      issues.push({
        id: 'remote-direction-' + name,
        severity: 'error',
        category: 'security',
        title: 'Remote direction is missing',
        detail: `Remote ${name} has no communication direction.`
      });
    }

    if (
      remote.direction === 'client-to-server' &&
      remote.trust !== 'untrusted-client-input'
    ) {
      issues.push({
        id: 'remote-trust-' + name,
        severity: 'error',
        category: 'security',
        title: 'Client request trust classification is incorrect',
        detail: `Remote ${name} must treat client data as untrusted.`
      });
    }

    if (
      remote.direction === 'client-to-server' &&
      !remote.validation
    ) {
      issues.push({
        id: 'remote-validation-' + name,
        severity: 'warning',
        category: 'security',
        title: 'Remote validation contract is unclear',
        detail: `Remote ${name} should declare its server validation requirements.`
      });
    }
  }

  return issues;
}

// =====================================================================
// 10. PERSISTENCE REVIEW
// =====================================================================

function validatePersistence(blueprint) {
  const issues = [];

  const persistence = safeObject(
    blueprint?.persistence
  );

  if (persistence.enabled !== true) {
    return issues;
  }

  if (!persistence.strategy) {
    issues.push({
      id: 'persistence-strategy',
      severity: 'warning',
      category: 'reliability',
      title: 'Persistence strategy is missing',
      detail: 'Persistent player data requires an explicit storage strategy.'
    });
  }

  const requirements = safeArray(
    persistence.requirements,
    100
  );

  const requirementText = requirements
    .map(item => typeof item === 'string' ? item : '')
    .join(' ')
    .toLowerCase();

  const expected = [
    {
      key: 'error-handling',
      terms: ['pcall', 'error handling', 'retry']
    },
    {
      key: 'player-lifecycle',
      terms: ['playerremoving', 'bindtoclose', 'player lifecycle']
    },
    {
      key: 'data-validation',
      terms: ['validation', 'schema']
    }
  ];

  for (const item of expected) {
    const found = item.terms.some(term =>
      requirementText.includes(term)
    );

    if (!found) {
      issues.push({
        id: 'persistence-' + item.key,
        severity: 'info',
        category: 'reliability',
        title: 'Persistence requirement should be reviewed',
        detail: `The persistence plan does not explicitly mention ${item.key}.`
      });
    }
  }

  return issues;
}

// =====================================================================
// 11. PERFORMANCE REQUIREMENTS REVIEW
// =====================================================================

function validatePerformancePlan(blueprint) {
  const issues = [];

  const performance = safeObject(
    blueprint?.performance
  );

  if (!performance.strategy) {
    issues.push({
      id: 'performance-strategy',
      severity: 'warning',
      category: 'performance',
      title: 'Performance strategy is missing',
      detail: 'The project should define how expensive gameplay work is controlled.'
    });
  }

  const checks = safeArray(
    performance.checks,
    100
  );

  if (!checks.length) {
    issues.push({
      id: 'performance-checks',
      severity: 'info',
      category: 'performance',
      title: 'No performance checks declared',
      detail: 'Consider adding bounded loops, event-driven updates and cleanup requirements.'
    });
  }

  return issues;
}

// =====================================================================
// 12. SINGLE ARTIFACT VALIDATOR
// =====================================================================

/**
 * Validate one generated Luau script.
 *
 * Input:
 * {
 *   source: "...",
 *   path: "ServerScriptService/Main.server.lua",
 *   legacyChecks: [...]
 * }
 */
export function validateGameplayArtifact(input = {}) {
  const data = safeObject(input);

  const inputValidation = validateSourceInput(data);

  if (!inputValidation.ok) {
    const issues = uniqueIssues(inputValidation.issues);

    return {
      ok: false,
      version: VERSION,
      status: 'invalid-input',
      score: calculateScore(issues),
      counts: summarizeIssues(issues),
      issues,
      sourceAnalysis: null,
      execution: {
        executed: false,
        studioPlayTestRequired: true
      }
    };
  }

  const sourceAnalysis = analyzeLuauSource({
    source: data.source,
    path: safeString(data.path || '', LIMITS.MAX_PATH_LENGTH)
  });

  const issues = [
    ...safeArray(sourceAnalysis.issues),
    ...validateLegacyChecks(data.legacyChecks)
  ];

  const normalized = uniqueIssues(issues);

  const counts = summarizeIssues(normalized);

  const score = calculateScore(normalized);

  return {
    ok: counts.errors === 0,

    version: VERSION,

    status: getStatus(counts),

    score,

    counts,

    issues: normalized,

    sourceAnalysis,

    execution: {
      staticAnalysisCompleted: true,
      luauExecuted: false,
      studioPlayTestRequired: true,
      runtimeSafetyProven: false
    }
  };
}

// =====================================================================
// 13. BLUEPRINT ARTIFACT VALIDATOR
// =====================================================================

export function validateGameplayBlueprintArtifact(input = {}) {
  const blueprint = safeObject(input.blueprint || input);

  const blueprintResult = validateBlueprint(blueprint);

  const issues = [
    ...safeArray(blueprintResult.issues),
    ...validateRemotePolicy(blueprint),
    ...validateArchitecture(blueprint),
    ...validateRemoteContracts(blueprint),
    ...validatePersistence(blueprint),
    ...validatePerformancePlan(blueprint)
  ];

  const normalized = uniqueIssues(issues);

  const counts = summarizeIssues(normalized);

  return {
    ok: counts.errors === 0,

    version: VERSION,

    status: getStatus(counts),

    score: calculateScore(normalized),

    counts,

    issues: normalized,

    blueprintSummary: blueprintResult.summary || null,

    execution: {
      architectureChecked: true,
      sourceExecuted: false,
      studioPlayTestRequired: true
    }
  };
}

// =====================================================================
// 14. COMPLETE GAMEPLAY PROJECT VALIDATOR
// =====================================================================

/**
 * Validate a complete project:
 *
 * {
 *   files: [
 *     { path: "...", source: "..." }
 *   ],
 *   blueprint: {...},
 *   legacyChecks: [...]
 * }
 */
export function validateGameplayProject(input = {}) {
  const project = safeObject(input);

  const files = safeArray(
    project.files,
    LIMITS.MAX_FILES
  );

  const fileAnalysis = analyzeLuauProject({
    files: files.map(file => ({
      path: safeString(file?.path || '', LIMITS.MAX_PATH_LENGTH),
      source: typeof file?.source === 'string'
        ? file.source.slice(0, LIMITS.MAX_SOURCE_LENGTH)
        : ''
    }))
  });

  const fileIssues = safeArray(fileAnalysis.results)
    .flatMap(result => safeArray(result.issues));

  const legacyIssues = validateLegacyChecks(
    project.legacyChecks
  );

  const blueprintResult = project.blueprint
    ? validateGameplayBlueprintArtifact({
        blueprint: project.blueprint
      })
    : null;

  const blueprintIssues = blueprintResult
    ? safeArray(blueprintResult.issues)
    : [];

  const allIssues = uniqueIssues([
    ...fileIssues,
    ...legacyIssues,
    ...blueprintIssues
  ]);

  const counts = summarizeIssues(allIssues);

  return {
    ok: counts.errors === 0,

    version: VERSION,

    status: getStatus(counts),

    score: calculateScore(allIssues),

    counts,

    files: {
      total: files.length,
      analyzed: fileAnalysis.summary?.analyzed || 0,
      analysis: fileAnalysis
    },

    blueprint: blueprintResult,

    issues: allIssues,

    execution: {
      staticValidationCompleted: true,
      runtimeExecuted: false,
      studioPlayTestRequired: true,
      playTestVerified: false
    },

    timestamp: new Date().toISOString()
  };
}

// =====================================================================
// 15. VALIDATION REPORT FORMATTER
// =====================================================================

export function createGameplayValidationReport(result = {}) {
  const data = safeObject(result);

  const issues = uniqueIssues(
    safeArray(data.issues)
  );

  const counts = summarizeIssues(issues);

  return {
    name: 'Quruvchi MAX Gameplay Validation Report',

    version: VERSION,

    ok: counts.errors === 0,

    status: getStatus(counts),

    score: calculateScore(issues),

    counts,

    findings: issues.map(issue => ({
      id: issue.id,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      detail: issue.detail,
      recommendation: issue.recommendation,
      location: issue.line
        ? {
            line: issue.line,
            column: issue.column
          }
        : null
    })),

    verification: {
      staticValidation: true,
      codeExecuted: false,
      studioPlayTest: false
    },

    generatedAt: new Date().toISOString()
  };
}

// =====================================================================
// 16. VALIDATOR METADATA
// =====================================================================

export function getGameplayValidatorInfo() {
  return {
    name: 'Quruvchi MAX Gameplay Validator',

    version: VERSION,

    status: 'ready',

    capabilities: [
      'Luau source validation',
      'Legacy Gameplay Agent check validation',
      'Blueprint validation',
      'Remote security policy review',
      'Remote contract validation',
      'Server/client architecture review',
      'DataStore reliability review',
      'Performance plan review',
      'Multi-file project validation',
      'Unified quality scoring',
      'Actionable validation reports'
    ],

    severityLevels: [...SEVERITIES],

    limits: {
      ...LIMITS
    },

    execution: {
      executesLuau: false,
      modifiesSource: false,
      connectsToRobloxStudio: false,
      provesRuntimeSafety: false,
      requiresStudioPlayTest: true
    }
  };
}

// =====================================================================
// 17. DEFAULT VALIDATOR API
// =====================================================================

export const GameplayValidator = Object.freeze({
  version: VERSION,

  validateArtifact: validateGameplayArtifact,

  validateBlueprint: validateGameplayBlueprintArtifact,

  validateProject: validateGameplayProject,

  report: createGameplayValidationReport,

  info: getGameplayValidatorInfo
});

export default GameplayValidator;

// =====================================================================
// END OF QURuvchi MAX GAMEPLAY VALIDATOR
// =====================================================================
