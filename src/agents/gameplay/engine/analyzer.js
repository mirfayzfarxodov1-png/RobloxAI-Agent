
/**
 * ================================================================
 * QURUVCHI MAX — GAMEPLAY ANALYZER V2
 * ================================================================
 * Advanced static Luau analyzer for Roblox game projects.
 *
 * Features:
 * - Luau source inspection
 * - Roblox service detection
 * - RemoteEvent / RemoteFunction security analysis
 * - Server-authority checks
 * - DataStore reliability checks
 * - Player lifecycle inspection
 * - Memory and connection leak indicators
 * - Performance risk detection
 * - Infinite-loop detection
 * - Deprecated / dangerous API detection
 * - Architecture and code quality metrics
 * - Actionable findings with line and column information
 *
 * IMPORTANT:
 * This analyzer inspects source text only.
 * It does not execute Luau or prove runtime correctness.
 * ================================================================
 */

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
  MAX_SOURCE: 500000,
  MAX_FILES: 500,
  MAX_PATH: 300,
  MAX_FINDINGS: 1000,
  MAX_SNIPPET: 180
});

const SERVICES = Object.freeze([
  'Players',
  'Workspace',
  'ReplicatedStorage',
  'ServerStorage',
  'ServerScriptService',
  'StarterGui',
  'StarterPlayer',
  'Lighting',
  'SoundService',
  'TweenService',
  'RunService',
  'DataStoreService',
  'MemoryStoreService',
  'MessagingService',
  'CollectionService',
  'PhysicsService',
  'PathfindingService',
  'MarketplaceService',
  'HttpService',
  'TextService',
  'ContextActionService',
  'UserInputService',
  'GuiService',
  'TeleportService',
  'BadgeService',
  'Teams',
  'Debris',
  'InsertService',
  'ProximityPromptService'
]);

const DANGEROUS_PATTERNS = Object.freeze([
  {
    id: 'global-state',
    pattern: /\b_G\s*(?:\[|\.|=)/,
    severity: 'error',
    title: 'Shared global state',
    detail: 'Avoid _G for game architecture. Prefer ModuleScripts and explicit dependencies.',
    recommendation: 'Move shared logic into a ModuleScript.'
  },
  {
    id: 'loadstring',
    pattern: /\bloadstring\s*\(/,
    severity: 'error',
    title: 'Dynamic code execution',
    detail: 'Dynamic string execution creates a serious code integrity risk.',
    recommendation: 'Use explicit ModuleScripts and reviewed functions.'
  },
  {
    id: 'numeric-require',
    pattern: /\brequire\s*\(\s*\d+\s*\)/,
    severity: 'warning',
    title: 'External numeric require',
    detail: 'A numeric asset require can execute third-party code.',
    recommendation: 'Use reviewed local ModuleScripts.'
  },
  {
    id: 'client-currency',
    pattern: /LocalPlayer[\s\S]{0,180}(?:Coins|Cash|Gold|Money|Currency)\s*\.Value\s*=/,
    severity: 'error',
    title: 'Client-side currency mutation',
    detail: 'Currency must be owned and updated by the server.',
    recommendation: 'Send a validated request to a server-side currency service.'
  },
  {
    id: 'client-damage',
    pattern: /LocalPlayer[\s\S]{0,180}(?:Humanoid\.Health|Health)\s*=/,
    severity: 'warning',
    title: 'Client-side health mutation',
    detail: 'Health and damage should be controlled by server-side game logic.',
    recommendation: 'Move damage calculations to server scripts.'
  },
  {
    id: 'http-request',
    pattern: /\bHttpService\s*:\s*(?:GetAsync|PostAsync|RequestAsync)\s*\(/,
    severity: 'info',
    title: 'External HTTP request',
    detail: 'Review external requests, response validation and failure handling.',
    recommendation: 'Validate response structure and handle request failures.'
  },
  {
    id: 'deprecated-wait',
    pattern: /(?<![\w.])wait\s*\(/,
    severity: 'info',
    title: 'Legacy wait usage',
    detail: 'Legacy wait can have inconsistent scheduling behavior.',
    recommendation: 'Prefer task.wait where appropriate.'
  },
  {
    id: 'deprecated-spawn',
    pattern: /(?<![\w.])spawn\s*\(/,
    severity: 'info',
    title: 'Legacy spawn usage',
    detail: 'Legacy spawn is less predictable than task scheduling APIs.',
    recommendation: 'Prefer task.spawn.'
  },
  {
    id: 'deprecated-delay',
    pattern: /(?<![\w.])delay\s*\(/,
    severity: 'info',
    title: 'Legacy delay usage',
    detail: 'Legacy delay is superseded by task.delay.',
    recommendation: 'Prefer task.delay.'
  },
  {
    id: 'teleport-unvalidated',
    pattern: /TeleportService\s*:\s*Teleport(?:Async)?\s*\(/,
    severity: 'warning',
    title: 'Teleport operation detected',
    detail: 'Teleport operations need valid destination and failure handling.',
    recommendation: 'Validate destination and handle teleport errors.'
  }
]);

const PERFORMANCE_PATTERNS = Object.freeze([
  {
    id: 'tight-loop',
    pattern: /while\s+true\s+do(?:(?!\b(?:task\.wait|wait|RunService\.[A-Za-z]+:Wait)\s*\().){0,300}?end/s,
    severity: 'error',
    title: 'Possible tight infinite loop',
    detail: 'An infinite loop may not yield execution.',
    recommendation: 'Use task.wait or event-driven logic.'
  },
  {
    id: 'heartbeat-loop',
    pattern: /RunService\.Heartbeat\s*:\s*Connect\s*\(/,
    severity: 'info',
    title: 'Heartbeat connection',
    detail: 'Heartbeat callbacks execute frequently.',
    recommendation: 'Keep callback work small and disconnect when no longer needed.'
  },
  {
    id: 'render-loop',
    pattern: /RenderStepped\s*:\s*Connect\s*\(/,
    severity: 'info',
    title: 'RenderStepped connection',
    detail: 'Render callbacks execute frequently on the client.',
    recommendation: 'Avoid expensive calculations and unnecessary allocations.'
  },
  {
    id: 'task-spawn-loop',
    pattern: /while\s+true\s+do[\s\S]{0,250}task\.spawn\s*\(/,
    severity: 'warning',
    title: 'Task creation inside loop',
    detail: 'Repeated task creation can cause excessive concurrent work.',
    recommendation: 'Use one controlled worker or an event-based design.'
  },
  {
    id: 'large-descendants',
    pattern: /GetDescendants\s*\(\s*\)/,
    severity: 'info',
    title: 'Full descendant traversal',
    detail: 'Repeated full-tree traversal can become expensive in large worlds.',
    recommendation: 'Cache results or use CollectionService tags.'
  },
  {
    id: 'waitforchild-no-timeout',
    pattern: /WaitForChild\s*\(\s*["'][^"']+["']\s*\)/,
    severity: 'info',
    title: 'WaitForChild without timeout',
    detail: 'An indefinite wait may hide missing-instance problems.',
    recommendation: 'Use an intentional timeout when the instance may be absent.'
  },
  {
    id: 'clone-in-loop',
    pattern: /(?:for|while)[\s\S]{0,180}:Clone\s*\(/,
    severity: 'warning',
    title: 'Cloning inside loop',
    detail: 'Repeated cloning may create many instances quickly.',
    recommendation: 'Pool reusable objects or limit creation rate.'
  }
]);

const REMOTE_VALIDATION_PATTERNS = Object.freeze([
  {
    id: 'remote-type-check',
    pattern: /\btypeof\s*\(/,
    description: 'Type validation evidence'
  },
  {
    id: 'remote-range-check',
    pattern: /\bmath\.(?:clamp|floor|ceil)\s*\(/,
    description: 'Numeric range validation evidence'
  },
  {
    id: 'remote-ownership-check',
    pattern: /(?:UserId|PlayerGui|IsDescendantOf|\.Parent\s*==)/,
    description: 'Ownership or ancestry validation evidence'
  },
  {
    id: 'remote-distance-check',
    pattern: /(?:Magnitude|AssemblyRootPart|HumanoidRootPart)/,
    description: 'Distance or character validation evidence'
  },
  {
    id: 'remote-rate-limit',
    pattern: /(?:os\.clock|tick|time)\s*\(|lastRequest|cooldown|rateLimit|RateLimit/i,
    description: 'Possible request rate limiting evidence'
  }
]);

const DATASTORE_PATTERNS = Object.freeze({
  calls: /\b(?:GetAsync|SetAsync|UpdateAsync|IncrementAsync|RemoveAsync|GetSortedAsync)\s*\(/g,
  protection: /\bpcall\s*\(/g,
  retries: /(?:retry|retries|attempt|backoff)/i,
  playerLifecycle: /PlayerRemoving|BindToClose/,
  schemaVersion: /(?:SchemaVersion|DataVersion|Version)\s*=/i
});

const SERVER_PATTERNS = Object.freeze({
  serverScript: /ServerScriptService/,
  localScript: /\bLocalScript\b/,
  clientPlayer: /\bLocalPlayer\b/,
  serverEvent: /OnServerEvent\s*:\s*Connect\s*\(/g,
  serverFunction: /OnServerInvoke\s*=/g,
  remoteCreation: /Instance\.new\s*\(\s*["']Remote(?:Event|Function)["']\s*\)/g
});

function safeString(value, max = LIMITS.MAX_PATH) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function collectMatches(source, regex) {
  regex.lastIndex = 0;
  return [...source.matchAll(regex)];
}

function countMatches(source, regex) {
  return collectMatches(source, regex).length;
}

function getPosition(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function getSnippet(source, index) {
  return source
    .slice(index, index + LIMITS.MAX_SNIPPET)
    .split('\n')[0]
    .trim();
}

function addFinding(findings, finding) {
  if (findings.length >= LIMITS.MAX_FINDINGS) return;

  findings.push({
    id: finding.id,
    severity: finding.severity || 'info',
    category: finding.category || 'general',
    title: finding.title,
    detail: finding.detail,
    recommendation: finding.recommendation || null,
    line: finding.line ?? null,
    column: finding.column ?? null,
    snippet: finding.snippet || null
  });
}

function addPatternFindings(source, patterns, category, findings) {
  for (const item of patterns) {
    const match = item.pattern.exec(source);
    if (!match) continue;

    const position = getPosition(source, match.index);

    addFinding(findings, {
      id: item.id,
      severity: item.severity,
      category,
      title: item.title,
      detail: item.detail,
      recommendation: item.recommendation,
      ...position,
      snippet: getSnippet(source, match.index)
    });
  }
}

function detectServices(source) {
  return SERVICES.filter(service => {
    const escaped = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b').test(source);
  });
}

function analyzeRemoteSecurity(source, findings) {
  const eventCount = countMatches(
    source,
    SERVER_PATTERNS.serverEvent
  );

  const functionCount = countMatches(
    source,
    SERVER_PATTERNS.serverFunction
  );

  const remoteCount = eventCount + functionCount;

  const evidence = REMOTE_VALIDATION_PATTERNS.map(item => ({
    id: item.id,
    description: item.description,
    detected: item.pattern.test(source)
  }));

  const detected = evidence.filter(item => item.detected).length;

  if (remoteCount > 0 && !evidence[0].detected) {
    addFinding(findings, {
      id: 'remote-missing-type-validation',
      severity: 'warning',
      category: 'security',
      title: 'Remote type validation unclear',
      detail: 'Server remote handlers were found, but no typeof validation was detected.',
      recommendation: 'Validate every argument type before using remote data.'
    });
  }

  if (remoteCount > 0 && !evidence[3].detected) {
    addFinding(findings, {
      id: 'remote-distance-validation',
      severity: 'warning',
      category: 'security',
      title: 'Distance validation unclear',
      detail: 'No obvious character distance validation was detected.',
      recommendation: 'Validate player distance before allowing world interactions.'
    });
  }

  if (remoteCount > 0 && !evidence[4].detected) {
    addFinding(findings, {
      id: 'remote-rate-limit',
      severity: 'warning',
      category: 'security',
      title: 'Remote rate limiting unclear',
      detail: 'No obvious request cooldown or rate-limit pattern was detected.',
      recommendation: 'Apply server-side per-player request limits.'
    });
  }

  return {
    remoteEvents: eventCount,
    remoteFunctions: functionCount,
    totalHandlers: remoteCount,
    validationEvidence: evidence,
    detectedEvidenceCount: detected
  };
}

function analyzePersistence(source, findings) {
  const calls = countMatches(source, DATASTORE_PATTERNS.calls);
  const protectedCalls = countMatches(source, DATASTORE_PATTERNS.protection);

  const result = {
    detected: calls > 0,
    calls,
    protectedCalls,
    hasRetryEvidence: DATASTORE_PATTERNS.retries.test(source),
    hasPlayerLifecycle: DATASTORE_PATTERNS.playerLifecycle.test(source),
    hasSchemaVersion: DATASTORE_PATTERNS.schemaVersion.test(source)
  };

  if (calls > 0 && protectedCalls === 0) {
    addFinding(findings, {
      id: 'datastore-error-handling',
      severity: 'warning',
      category: 'reliability',
      title: 'DataStore error handling unclear',
      detail: 'Persistence calls exist but no pcall usage was detected.',
      recommendation: 'Handle DataStore failures and prevent save errors from crashing gameplay.'
    });
  }

  if (calls > 0 && !result.hasPlayerLifecycle) {
    addFinding(findings, {
      id: 'datastore-player-lifecycle',
      severity: 'warning',
      category: 'reliability',
      title: 'Player save lifecycle unclear',
      detail: 'No PlayerRemoving or BindToClose reference was detected.',
      recommendation: 'Review saving on player departure and server shutdown.'
    });
  }

  if (calls > 0 && !result.hasSchemaVersion) {
    addFinding(findings, {
      id: 'datastore-schema',
      severity: 'info',
      category: 'architecture',
      title: 'Data schema version not detected',
      detail: 'No obvious schema version marker was found.',
      recommendation: 'Consider versioning persistent player data.'
    });
  }

  return result;
}

function analyzeArchitecture(source, path, findings) {
  const isServerPath = path.startsWith('ServerScriptService/');
  const isClientPath =
    path.startsWith('StarterPlayer/') ||
    path.startsWith('StarterGui/');

  const hasLocalPlayer = /\bLocalPlayer\b/.test(source);
  const hasServerRemote = /OnServerEvent|OnServerInvoke/.test(source);

  if (isServerPath && hasLocalPlayer) {
    addFinding(findings, {
      id: 'server-localplayer',
      severity: 'error',
      category: 'architecture',
      title: 'LocalPlayer referenced in server path',
      detail: 'LocalPlayer is a client-side concept and is not available in ordinary server scripts.',
      recommendation: 'Use the Player argument supplied to server remote handlers.'
    });
  }

  if (isClientPath && hasServerRemote) {
    addFinding(findings, {
      id: 'client-server-handler',
      severity: 'warning',
      category: 'architecture',
      title: 'Server handler in client path',
      detail: 'A client-side script path contains server remote handler code.',
      recommendation: 'Move authoritative event handlers into ServerScriptService.'
    });
  }

  return {
    path,
    isServerPath,
    isClientPath,
    hasLocalPlayer,
    hasServerRemote
  };
}

function calculateScore(findings) {
  let score = 100;

  for (const finding of findings) {
    if (finding.severity === 'error') score -= 25;
    else if (finding.severity === 'warning') score -= 8;
    else if (finding.severity === 'info') score -= 1;
  }

  return Math.max(0, Math.min(100, score));
}

function summarizeFindings(findings) {
  const result = {
    total: findings.length,
    errors: 0,
    warnings: 0,
    info: 0,
    categories: {}
  };

  for (const finding of findings) {
    if (finding.severity === 'error') result.errors++;
    else if (finding.severity === 'warning') result.warnings++;
    else result.info++;

    result.categories[finding.category] =
      (result.categories[finding.category] || 0) + 1;
  }

  return result;
}

function getHealthStatus(summary) {
  if (summary.errors > 0) return 'critical';
  if (summary.warnings > 5) return 'needs-review';
  if (summary.warnings > 0) return 'review';
  return 'healthy';
}

/**
 * Analyze a single Luau source file.
 *
 * @param {{source?: string, path?: string}} input
 * @returns {object}
 */
export function analyzeLuauSource(input = {}) {
  const source = typeof input.source === 'string'
    ? input.source
    : '';

  const path = safeString(input.path || '');

  const findings = [];

  if (source.length > LIMITS.MAX_SOURCE) {
    return {
      version: VERSION,
      ok: false,
      status: 'source-too-large',
      score: 0,
      summary: {
        total: 1,
        errors: 1,
        warnings: 0,
        info: 0,
        categories: { input: 1 }
      },
      metrics: {
        characters: source.length,
        lines: source.split('\n').length
      },
      issues: [{
        id: 'source-too-large',
        severity: 'error',
        category: 'input',
        title: 'Source exceeds analysis limit',
        detail: 'The source is larger than the allowed analysis size.'
      }]
    };
  }

  if (!source.trim()) {
    addFinding(findings, {
      id: 'empty-source',
      severity: 'error',
      category: 'input',
      title: 'Empty Luau source',
      detail: 'No source code was provided.'
    });
  }

  addPatternFindings(
    source,
    DANGEROUS_PATTERNS,
    'security',
    findings
  );

  addPatternFindings(
    source,
    PERFORMANCE_PATTERNS,
    'performance',
    findings
  );

  const remoteSecurity = analyzeRemoteSecurity(
    source,
    findings
  );

  const persistence = analyzePersistence(
    source,
    findings
  );

  const architecture = analyzeArchitecture(
    source,
    path,
    findings
  );

  const summary = summarizeFindings(findings);
  const score = calculateScore(findings);

  const metrics = {
    characters: source.length,
    lines: source ? source.split('\n').length : 0,
    words: source.trim()
      ? source.trim().split(/\s+/).length
      : 0,

    functions: countMatches(
      source,
      /\bfunction\s+[\w.:]+\s*\(|\bfunction\s*\(/g
    ),

    localFunctions: countMatches(
      source,
      /\blocal\s+function\s+\w+/g
    ),

    loops: countMatches(
      source,
      /\b(?:while|for)\b[\s\S]{0,100}?\bdo\b/g
    ),

    eventConnections: countMatches(
      source,
      /:Connect\s*\(/g
    ),

    disconnectCalls: countMatches(
      source,
      /:Disconnect\s*\(/g
    ),

    waits: countMatches(
      source,
      /\b(?:task\.wait|task\.delay|wait)\s*\(/g
    ),

    instancesCreated: countMatches(
      source,
      /Instance\.new\s*\(/g
    ),

    clones: countMatches(
      source,
      /:Clone\s*\(/g
    ),

    remoteEventsCreated: countMatches(
      source,
      SERVER_PATTERNS.remoteCreation
    ),

    attributeCalls: countMatches(
      source,
      /(?:GetAttribute|SetAttribute)\s*\(/g
    ),

    collectionTagCalls: countMatches(
      source,
      /CollectionService:(?:AddTag|GetTagged|HasTag)\s*\(/g
    ),

    services: detectServices(source)
  };

  return {
    version: VERSION,
    ok: summary.errors === 0,
    status: getHealthStatus(summary),
    score,
    summary,
    metrics,
    remoteSecurity,
    persistence,
    architecture,
    issues: findings
  };
}

/**
 * Analyze multiple source files.
 *
 * Each file:
 * {
 *   path: "ServerScriptService/Main.server.lua",
 *   source: "..."
 * }
 */
export function analyzeLuauProject(input = {}) {
  const files = Array.isArray(input.files)
    ? input.files
    : [];

  if (files.length > LIMITS.MAX_FILES) {
    return {
      version: VERSION,
      ok: false,
      status: 'too-many-files',
      summary: {
        files: files.length,
        analyzed: 0,
        errors: 1,
        warnings: 0
      },
      results: []
    };
  }

  const results = files.map(file =>
    analyzeLuauSource({
      source: file?.source,
      path: file?.path
    })
  );

  const summary = {
    files: files.length,
    analyzed: results.length,
    errors: results.reduce(
      (sum, item) => sum + item.summary.errors,
      0
    ),
    warnings: results.reduce(
      (sum, item) => sum + item.summary.warnings,
      0
    ),
    info: results.reduce(
      (sum, item) => sum + item.summary.info,
      0
    ),
    totalFindings: results.reduce(
      (sum, item) => sum + item.summary.total,
      0
    )
  };

  const score = results.length
    ? Math.round(
        results.reduce((sum, item) => sum + item.score, 0) /
        results.length
      )
    : 100;

  return {
    version: VERSION,
    ok: summary.errors === 0,
    status: summary.errors
      ? 'critical'
      : summary.warnings
        ? 'review'
        : 'healthy',
    score,
    summary,
    results
  };
}

/**
 * Returns supported analyzer metadata.
 */
export function getGameplayAnalyzerInfo() {
  return {
    name: 'Quruvchi MAX Gameplay Analyzer',
    version: VERSION,
    type: 'static-luau-analysis',
    capabilities: [
      'Luau source metrics',
      'Roblox service detection',
      'RemoteEvent security review',
      'RemoteFunction security review',
      'Server authority inspection',
      'DataStore reliability inspection',
      'Player lifecycle checks',
      'Memory connection indicators',
      'Performance risk inspection',
      'Architecture path checks',
      'Multi-file project analysis',
      'Actionable findings'
    ],
    limits: { ...LIMITS },
    execution: {
      executesLuau: false,
      modifiesSource: false,
      provesRuntimeSafety: false,
      requiresStudioPlayTest: true
    }
  };
}

// ================================================================
// END OF QURuvchi MAX GAMEPLAY ANALYZER V2
// ================================================================
