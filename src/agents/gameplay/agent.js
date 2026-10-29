const SYSTEMS = Object.freeze({
  obby: [
    'server-authoritative player stats',
    'stage progression from touched platforms',
    'checkpoint progress and respawn handling',
    'finish detection, rewards and timer',
    'leaderboard values and best-time tracking'
  ],
  simulator: [
    'server-authoritative currency',
    'collectible pickup and respawn lifecycle',
    'repeat-pickup protection',
    'player progression and leaderboard values'
  ],
  tycoon: [
    'server-authoritative cash and plot ownership',
    'claim-pad ownership checks',
    'upgrade purchase validation',
    'production loop and lifecycle cleanup'
  ],
  world: [
    'safe player spawn',
    'deterministic world construction',
    'reusable named world root'
  ]
});

const REQUIREMENTS = Object.freeze({
  obby: [
    ['world root', /QuruvchiFreeWorld/],
    ['stage count', /STAGE_COUNT/],
    ['checkpoint logic', /Checkpoint/],
    ['finish platform', /FinishPlatform/],
    ['player stats', /leaderstats/],
    ['touch event', /Touched/]
  ],
  simulator: [
    ['world root', /QuruvchiFreeWorld/],
    ['collectible logic', /Collectible/],
    ['currency', /Coins|Cash/],
    ['player stats', /leaderstats/]
  ],
  tycoon: [
    ['world root', /QuruvchiFreeWorld/],
    ['plot logic', /Plot/],
    ['claim pad', /ClaimPad/],
    ['cash stat', /Cash|Coins/],
    ['player stats', /leaderstats/]
  ],
  world: [
    ['world root', /QuruvchiFreeWorld/],
    ['world construction', /Instance\.new\(/],
    ['player lifecycle', /Players/]
  ]
});

function cleanText(value, max=100) {
  return String(value ?? '').replace(/[\u0000-\u001F]/g, ' ').trim().slice(0,max);
}

/**
 * Gameplay agent owns the generated server-side Luau contract.
 * It validates the actual source that will be sent to Studio, not just a list of claims.
 */
export function buildGameplayPlan(project={}) {
  const kind = Object.hasOwn(SYSTEMS, project.kind) ? project.kind : 'world';
  const source = typeof project.source === 'string' ? project.source : '';
  const scriptPath = cleanText(project.path,240);
  const checks = (REQUIREMENTS[kind] || REQUIREMENTS.world).map(([name,pattern]) => ({
    name,
    ok: pattern.test(source)
  }));
  if (source.length < 1000) checks.push({name:'minimum gameplay source',ok:false});
  if (!scriptPath.startsWith('ServerScriptService/')) checks.push({name:'server script path',ok:false});
  const missing = checks.filter(item=>!item.ok).map(item=>item.name);
  const requested = Array.isArray(project.features) ? project.features.map(x=>cleanText(x,180)).filter(Boolean) : [];
  const systems = [...new Set([...(SYSTEMS[kind] || SYSTEMS.world),...requested])];
  return {
    agent:'Gameplay Agent',
    kind,
    title:cleanText(project.name || 'Quruvchi project'),
    scriptPath,
    systems,
    checks,
    missing,
    ok:missing.length===0,
    source,
    sourceLength:source.length,
    status:missing.length===0?'ready-for-studio':'needs-fix',
    note:missing.length===0
      ? 'Generated Luau passed local contract checks. Studio execution and Play-test are still required.'
      : 'Gameplay source is incomplete: '+missing.join(', ')
  };
}
