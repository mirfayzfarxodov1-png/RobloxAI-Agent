/**
 * Gameplay Engine static Luau analyzer.
 * This module inspects text only; it never executes generated Luau.
 */
const SERVICES = [
  'Players', 'Workspace', 'ReplicatedStorage', 'ServerStorage',
  'ServerScriptService', 'StarterGui', 'StarterPlayer',
  'DataStoreService', 'CollectionService', 'RunService',
  'TweenService', 'PhysicsService', 'PathfindingService'
];

function matches(source, regex) {
  regex.lastIndex = 0;
  return [...source.matchAll(regex)];
}

function issue(list, id, severity, title, detail, line = null) {
  list.push({ id, severity, title, detail, line });
}

export function analyzeLuauSource(input = {}) {
  const source = typeof input.source === 'string' ? input.source : '';
  const path = String(input.path || '');
  const issues = [];
  const lineOf = index => source.slice(0, index).split('\n').length;

  if (!source.trim()) issue(issues, 'empty-source', 'error', 'Empty source', 'No Luau source was supplied.');
  if (source.length > 500000) issue(issues, 'source-limit', 'error', 'Source too large', 'Source exceeds the 500,000 character analysis limit.');

  const risks = [
    ['global-state', /\b_G\s*(?:\[|\.|=)/, 'Shared global state', 'Prefer ModuleScripts and explicit dependencies.'],
    ['dynamic-code', /\bloadstring\s*\(/, 'Dynamic code execution', 'Generated gameplay should not compile arbitrary strings.'],
    ['external-require', /\brequire\s*\(\s*\d+\s*\)/, 'External asset require', 'Review third-party asset code before use.'],
    ['client-reward', /LocalPlayer[\s\S]{0,180}(?:Coins|Cash|Gold|Money)\.Value\s*=/, 'Client reward mutation', 'Currency and rewards must be committed by the server.'],
    ['tight-loop', /while\s+true\s+do(?:(?!\b(?:task\.wait|wait)\s*\().){0,220}?\bend\b/s, 'Possible tight loop', 'Yield with task.wait or prefer event-driven logic.']
  ];

  for (const [id, pattern, title, detail] of risks) {
    const found = pattern.exec(source);
    if (found) issue(issues, id, 'error', title, detail, lineOf(found.index));
  }

  const remoteHandlers = matches(source, /OnServerEvent\s*:\s*Connect\s*\(/g).length;
  const remoteFunctions = matches(source, /OnServerInvoke\s*=/g).length;
  const dataStoreCalls = matches(source, /GetDataStore\s*\(|GetOrderedDataStore\s*\(/g).length;
  const protectedCalls = matches(source, /\bpcall\s*\(/g).length;
  const connections = matches(source, /:Connect\s*\(/g).length;
  const disconnects = matches(source, /:Disconnect\s*\(/g).length;
  const loops = matches(source, /\b(?:while|for)\b[\s\S]{0,100}?\bdo\b/g).length;
  const waits = matches(source, /\b(?:task\.wait|task\.delay|wait)\s*\(/g).length;

  if (dataStoreCalls && !protectedCalls) {
    issue(issues, 'datastore-pcall', 'warning', 'DataStore error handling unclear', 'Wrap persistence calls with pcall and handle failures.');
  }
  if (remoteHandlers && !/typeof\s*\(/.test(source)) {
    issue(issues, 'remote-types', 'warning', 'Remote payload validation unclear', 'Validate argument types, ranges and ownership on the server.');
  }
  if (connections > disconnects && !/PlayerRemoving/.test(source)) {
    issue(issues, 'connection-cleanup', 'warning', 'Connection cleanup unclear', 'Review player-owned event connections and cleanup on leave.');
  }
  if (path && !path.startsWith('ServerScriptService/')) {
    issue(issues, 'server-path', 'error', 'Wrong server script path', 'Gameplay server scripts belong under ServerScriptService.');
  }

  const errors = issues.filter(item => item.severity === 'error').length;
  const warnings = issues.filter(item => item.severity === 'warning').length;
  return {
    version: '1.0.0',
    ok: errors === 0,
    score: Math.max(0, 100 - errors * 25 - warnings * 8),
    summary: { errors, warnings, findings: issues.length },
    metrics: {
      characters: source.length,
      lines: source ? source.split('\n').length : 0,
      functions: matches(source, /\bfunction\s+[\w.:]+\s*\(|\bfunction\s*\(/g).length,
      loops,
      waits,
      remoteHandlers,
      remoteFunctions,
      dataStoreCalls,
      protectedCalls,
      connections,
      disconnects,
      services: SERVICES.filter(name => new RegExp('\\b' + name + '\\b').test(source))
    },
    issues
  };
}
