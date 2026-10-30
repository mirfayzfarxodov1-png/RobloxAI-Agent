/**
 * Builds a deterministic Roblox gameplay architecture blueprint.
 * This is a planning artifact, not executable game code.
 */
const LAYERS = [
  ['server', 'Server authority', 'ServerScriptService/QuruvchiGameplay', 'Game state, rewards, ownership and validation.'],
  ['modules', 'Reusable modules', 'ServerScriptService/Modules', 'Feature services and server-side configuration.'],
  ['remotes', 'Remote contracts', 'ReplicatedStorage/Remotes', 'Validated client/server messages.'],
  ['shared', 'Shared definitions', 'ReplicatedStorage/Shared', 'Read-only configuration and data definitions.'],
  ['client', 'Client presentation', 'StarterPlayer/StarterPlayerScripts', 'Input, camera and local effects.'],
  ['ui', 'Game interface', 'StarterGui/QuruvchiMAXUI', 'HUD, menus, inventory and interaction feedback.'],
  ['world', 'World content', 'Workspace/QuruvchiFreeWorld', 'Map geometry, spawn points and interactable objects.']
];

const MODULES = Object.freeze({
  player_data: ['PlayerDataService', 'ProfileSchema'],
  currency: ['CurrencyService', 'RewardService'],
  checkpoints: ['CheckpointService'],
  collectibles: ['CollectibleService'],
  upgrades: ['UpgradeService', 'UpgradeCatalog'],
  pets: ['PetService', 'EggService', 'PetCatalog'],
  combat: ['CombatService', 'DamageValidator'],
  npc: ['NPCService', 'InteractionService'],
  quests: ['QuestService', 'QuestCatalog'],
  portals: ['PortalService'],
  vehicles: ['VehicleService'],
  waves: ['WaveService', 'EnemyService'],
  round_system: ['RoundService'],
  leaderboard: ['LeaderboardService'],
  ui: ['UIController'],
  shop: ['ShopService', 'ShopCatalog'],
  abilities: ['AbilityService'],
  survival: ['SurvivalService'],
  tycoon: ['PlotService', 'ProductionService']
});

const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

export function buildGameplayBlueprint(input = {}, detectedFeatures = []) {
  const featureIds = [...new Set(detectedFeatures.map(item => item && item.id).filter(Boolean))];
  const requested = Array.isArray(input.features) ? input.features.map(clean).filter(Boolean) : [];
  const modules = [...new Set(featureIds.flatMap(id => MODULES[id] || []))];
  const persistence = featureIds.includes('player_data');

  return {
    version: '1.0.0',
    title: clean(input.name || input.title || 'Quruvchi project'),
    kind: clean(input.kind || 'world'),
    requestedFeatures: requested,
    detectedFeatureIds: featureIds,
    layers: LAYERS.map(([id, name, path, responsibility]) => ({ id, name, path, responsibility })),
    modules,
    persistence: persistence ? {
      enabled: true,
      key: 'UserId',
      schemaVersionRequired: true,
      strategy: 'UpdateAsync with pcall, retry/backoff and safe player lifecycle'
    } : {
      enabled: false,
      reason: 'Persistent player data was not explicitly requested.'
    },
    remoteContract: {
      serverOwnsRewards: true,
      validateTypes: true,
      validateRanges: true,
      validateOwnership: true,
      validateDistance: true,
      rateLimit: true,
      clientCanRequestButNeverAward: true
    },
    lifecycle: [
      'Initialize player state on PlayerAdded',
      'Bind character systems on CharacterAdded',
      'Clean player-owned connections on PlayerRemoving',
      'Persist only validated server-owned state',
      'Remove temporary objects when their owner leaves'
    ],
    buildOrder: [
      'Shared configuration and folder structure',
      'Server services and validation boundaries',
      'Remote contracts',
      'World interactions and progression',
      'Client input and UI',
      'Static QA, Studio audit and manual Play-test'
    ],
    acceptance: [
      'Client cannot decide currency, damage or ownership',
      'Every remote payload is type- and range-validated',
      'Repeated requests are rate-limited',
      'Connections have a cleanup path',
      'Persistence failures are handled safely',
      'The game is tested in Roblox Studio before release'
    ]
  };
}
