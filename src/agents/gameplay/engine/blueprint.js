
/**
 * ================================================================
 * QURUVCHI MAX — GAMEPLAY BLUEPRINT ENGINE V2
 * ================================================================
 * Deterministic architecture planner for Roblox experiences.
 *
 * Responsibilities:
 * - Detect gameplay architecture requirements
 * - Build scalable Roblox folder structures
 * - Plan server/client/shared responsibilities
 * - Define feature modules and dependencies
 * - Define RemoteEvent and RemoteFunction contracts
 * - Plan player lifecycle and persistence
 * - Build development phases and acceptance criteria
 * - Generate QA and security checklists
 *
 * This module creates architecture plans, not executable Luau.
 * ================================================================
 */

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
  MAX_FEATURES: 80,
  MAX_MODULES: 160,
  MAX_REMOTES: 100,
  MAX_REQUIREMENTS: 250,
  MAX_NAME: 100,
  MAX_DESCRIPTION: 500
});

const FEATURE_CATALOG = Object.freeze({
  player_data: {
    name: 'Player Data',
    description: 'Player profile, persistent progression and session state.',
    modules: ['PlayerDataService', 'ProfileSchema', 'DataMigrationService'],
    server: true,
    client: false,
    persistence: true,
    dependencies: [],
    remotes: []
  },

  currency: {
    name: 'Currency',
    description: 'Server-authoritative currency and reward transactions.',
    modules: ['CurrencyService', 'RewardService', 'CurrencyConfig'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['RequestPurchase', 'CurrencyUpdated']
  },

  inventory: {
    name: 'Inventory',
    description: 'Item ownership, inventory capacity and item operations.',
    modules: ['InventoryService', 'ItemCatalog', 'InventoryValidator'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['RequestInventory', 'RequestEquipItem', 'InventoryUpdated']
  },

  pets: {
    name: 'Pets',
    description: 'Pet ownership, following, equipping and pet progression.',
    modules: ['PetService', 'PetCatalog', 'PetFollowService', 'PetStatService'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data', 'inventory'],
    remotes: ['RequestEquipPet', 'RequestUnequipPet', 'PetStateUpdated']
  },

  eggs: {
    name: 'Egg Opening',
    description: 'Egg purchase, reward selection and pet creation.',
    modules: ['EggService', 'EggCatalog', 'EggRewardResolver'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['pets', 'currency'],
    remotes: ['RequestOpenEgg', 'EggResult']
  },

  shop: {
    name: 'Shop',
    description: 'In-game shop, purchase validation and catalog.',
    modules: ['ShopService', 'ShopCatalog', 'PurchaseValidator'],
    server: true,
    client: true,
    persistence: false,
    dependencies: ['currency', 'inventory'],
    remotes: ['RequestPurchase', 'PurchaseResult']
  },

  quests: {
    name: 'Quests',
    description: 'Quest objectives, progress tracking and rewards.',
    modules: ['QuestService', 'QuestCatalog', 'QuestProgressService'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['RequestQuestState', 'QuestProgressUpdated', 'QuestRewardClaim']
  },

  checkpoints: {
    name: 'Checkpoints',
    description: 'Progress checkpoints and respawn positions.',
    modules: ['CheckpointService', 'CheckpointCatalog'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['CheckpointReached', 'CheckpointUpdated']
  },

  collectibles: {
    name: 'Collectibles',
    description: 'World collectibles, pickup validation and respawn.',
    modules: ['CollectibleService', 'CollectibleCatalog', 'SpawnController'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['inventory'],
    remotes: ['RequestCollectible', 'CollectibleCollected']
  },

  upgrades: {
    name: 'Upgrades',
    description: 'Player upgrades, cost validation and progression.',
    modules: ['UpgradeService', 'UpgradeCatalog', 'UpgradeValidator'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['currency', 'player_data'],
    remotes: ['RequestUpgrade', 'UpgradeUpdated']
  },

  combat: {
    name: 'Combat',
    description: 'Combat requests, damage validation and server hit checks.',
    modules: ['CombatService', 'DamageValidator', 'WeaponCatalog'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RequestAttack', 'CombatEffect']
  },

  abilities: {
    name: 'Abilities',
    description: 'Ability cooldowns, targeting and server-side effects.',
    modules: ['AbilityService', 'AbilityCatalog', 'CooldownService'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['RequestAbility', 'AbilityStateUpdated']
  },

  npc: {
    name: 'NPC',
    description: 'NPC interactions, dialogue and server-side actions.',
    modules: ['NPCService', 'DialogueCatalog', 'InteractionValidator'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RequestNPCInteraction', 'NPCDialogue']
  },

  survival: {
    name: 'Survival',
    description: 'Hunger, thirst, stamina and survival progression.',
    modules: ['SurvivalService', 'SurvivalConfig'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['SurvivalStateUpdated']
  },

  tycoon: {
    name: 'Tycoon',
    description: 'Player plots, production, ownership and upgrades.',
    modules: ['PlotService', 'ProductionService', 'TycoonUpgradeService'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data', 'currency'],
    remotes: ['RequestClaimPlot', 'RequestTycoonUpgrade', 'TycoonStateUpdated']
  },

  vehicles: {
    name: 'Vehicles',
    description: 'Vehicle ownership, spawning and server validation.',
    modules: ['VehicleService', 'VehicleCatalog', 'VehicleValidator'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['RequestSpawnVehicle', 'RequestDespawnVehicle']
  },

  rounds: {
    name: 'Rounds',
    description: 'Round states, team assignment and round rewards.',
    modules: ['RoundService', 'RoundConfig', 'TeamService'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RoundStateUpdated', 'RequestReady']
  },

  waves: {
    name: 'Waves',
    description: 'Wave progression, enemy spawning and rewards.',
    modules: ['WaveService', 'EnemyService', 'WaveConfig'],
    server: true,
    client: true,
    persistence: false,
    dependencies: ['rounds'],
    remotes: ['WaveStateUpdated']
  },

  leaderboard: {
    name: 'Leaderboard',
    description: 'Player rankings and server-authoritative statistics.',
    modules: ['LeaderboardService', 'RankingConfig'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data'],
    remotes: ['LeaderboardUpdated']
  },

  portals: {
    name: 'Portals',
    description: 'Zone transitions and teleport validation.',
    modules: ['PortalService', 'ZoneCatalog', 'PortalValidator'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RequestPortalTravel']
  },

  building: {
    name: 'Building',
    description: 'Player construction, placement validation and ownership.',
    modules: ['BuildingService', 'BuildCatalog', 'PlacementValidator'],
    server: true,
    client: true,
    persistence: true,
    dependencies: ['player_data', 'inventory'],
    remotes: ['RequestPlaceObject', 'RequestRemoveObject']
  },

  social: {
    name: 'Social',
    description: 'Party state, player interactions and social features.',
    modules: ['PartyService', 'SocialValidator'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RequestPartyAction', 'PartyStateUpdated']
  },

  admin: {
    name: 'Admin',
    description: 'Restricted administrative actions with server permissions.',
    modules: ['AdminService', 'PermissionService', 'AdminAuditService'],
    server: true,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: ['RequestAdminAction', 'AdminActionResult']
  },

  ui: {
    name: 'User Interface',
    description: 'HUD, menus, notifications and interaction presentation.',
    modules: ['UIController', 'HUDController', 'NotificationController'],
    server: false,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: []
  },

  audio: {
    name: 'Audio',
    description: 'Sound effects, music and local audio controls.',
    modules: ['AudioController', 'AudioCatalog'],
    server: false,
    client: true,
    persistence: false,
    dependencies: [],
    remotes: []
  }
});

const GAME_PRESETS = Object.freeze({
  simulator: [
    'player_data', 'currency', 'inventory', 'pets',
    'eggs', 'shop', 'upgrades', 'quests', 'ui', 'audio'
  ],

  tycoon: [
    'player_data', 'currency', 'inventory', 'tycoon',
    'upgrades', 'quests', 'leaderboard', 'ui', 'audio'
  ],

  obby: [
    'player_data', 'checkpoints', 'collectibles',
    'quests', 'leaderboard', 'ui', 'audio'
  ],

  rpg: [
    'player_data', 'currency', 'inventory', 'combat',
    'abilities', 'npc', 'quests', 'portals', 'ui', 'audio'
  ],

  survival: [
    'player_data', 'inventory', 'survival', 'building',
    'combat', 'npc', 'quests', 'ui', 'audio'
  ],

  battlegrounds: [
    'player_data', 'combat', 'abilities',
    'rounds', 'leaderboard', 'ui', 'audio'
  ],

  tower_defense: [
    'player_data', 'currency', 'inventory',
    'rounds', 'waves', 'upgrades', 'leaderboard', 'ui'
  ],

  roleplay: [
    'player_data', 'inventory', 'vehicles',
    'npc', 'social', 'building', 'ui', 'audio'
  ],

  sandbox: [
    'player_data', 'inventory', 'building',
    'vehicles', 'social', 'ui', 'audio'
  ],

  custom: ['player_data', 'ui', 'audio']
});

const BASE_FOLDERS = Object.freeze([
  {
    path: 'ReplicatedStorage/Shared',
    className: 'Folder',
    purpose: 'Shared read-only definitions and common utilities.',
    authority: 'shared'
  },
  {
    path: 'ReplicatedStorage/Remotes',
    className: 'Folder',
    purpose: 'Explicit client/server communication contracts.',
    authority: 'server-controlled'
  },
  {
    path: 'ReplicatedStorage/Assets',
    className: 'Folder',
    purpose: 'Replicated visual and audio assets.',
    authority: 'shared-assets'
  },
  {
    path: 'ServerScriptService/Quruvchi',
    className: 'Folder',
    purpose: 'Server bootstrap and authoritative orchestration.',
    authority: 'server'
  },
  {
    path: 'ServerScriptService/Services',
    className: 'Folder',
    purpose: 'Server gameplay services.',
    authority: 'server'
  },
  {
    path: 'ServerScriptService/Modules',
    className: 'Folder',
    purpose: 'Server-only reusable modules.',
    authority: 'server'
  },
  {
    path: 'ServerStorage/GameAssets',
    className: 'Folder',
    purpose: 'Server-only templates and protected assets.',
    authority: 'server'
  },
  {
    path: 'ServerStorage/Runtime',
    className: 'Folder',
    purpose: 'Server-owned runtime templates.',
    authority: 'server'
  },
  {
    path: 'StarterPlayer/StarterPlayerScripts/Quruvchi',
    className: 'Folder',
    purpose: 'Client input, camera and presentation controllers.',
    authority: 'client'
  },
  {
    path: 'StarterGui/QuruvchiUI',
    className: 'ScreenGui',
    purpose: 'Main game interface.',
    authority: 'client'
  },
  {
    path: 'Workspace/Map',
    className: 'Folder',
    purpose: 'World geometry and map content.',
    authority: 'world'
  },
  {
    path: 'Workspace/Interactables',
    className: 'Folder',
    purpose: 'Validated world interaction objects.',
    authority: 'world'
  },
  {
    path: 'Workspace/SpawnPoints',
    className: 'Folder',
    purpose: 'Player and gameplay spawn locations.',
    authority: 'world'
  }
]);

const REMOTE_SECURITY = Object.freeze({
  clientRequestsAreUntrusted: true,
  serverMustValidateTypes: true,
  serverMustValidateRanges: true,
  serverMustValidateOwnership: true,
  serverMustValidateDistance: true,
  serverMustRateLimit: true,
  clientCannotGrantRewards: true,
  clientCannotSetCurrency: true,
  clientCannotChooseDamage: true,
  serverMustVerifyPurchase: true
});

function cleanString(value, max = LIMITS.MAX_NAME) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeFeatureId(value) {
  return cleanString(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeFeatureList(values) {
  if (!Array.isArray(values)) return [];

  return unique(
    values
      .slice(0, LIMITS.MAX_FEATURES)
      .map(normalizeFeatureId)
      .filter(id => Object.hasOwn(FEATURE_CATALOG, id))
  );
}

function normalizeGameType(value) {
  const type = cleanString(value, 60).toLowerCase();

  const aliases = {
    pet_simulator: 'simulator',
    simulator_pet: 'simulator',
    pet_game: 'simulator',
    towerdefense: 'tower_defense',
    tower_defence: 'tower_defense',
    battleground: 'battlegrounds',
    battle_arena: 'battlegrounds',
    role_play: 'roleplay',
    role_playing: 'rpg',
    obstacle_course: 'obby',
    obstacle: 'obby'
  };

  const normalized = aliases[type] || type;

  return Object.hasOwn(GAME_PRESETS, normalized)
    ? normalized
    : 'custom';
}

function resolveFeatures(input) {
  const gameType = normalizeGameType(
    input.gameType || input.kind || input.type
  );

  const preset = GAME_PRESETS[gameType] || GAME_PRESETS.custom;

  const requested = normalizeFeatureList([
    ...preset,
    ...(Array.isArray(input.features) ? input.features : [])
  ]);

  return {
    gameType,
    featureIds: requested
  };
}

function resolveDependencies(featureIds) {
  const resolved = new Set(featureIds);
  const queue = [...featureIds];

  while (queue.length) {
    const id = queue.shift();
    const feature = FEATURE_CATALOG[id];

    if (!feature) continue;

    for (const dependency of feature.dependencies) {
      if (resolved.has(dependency)) continue;

      resolved.add(dependency);
      queue.push(dependency);
    }
  }

  return [...resolved];
}

function buildModules(featureIds) {
  const modules = [];

  for (const id of featureIds) {
    const feature = FEATURE_CATALOG[id];
    if (!feature) continue;

    for (const moduleName of feature.modules) {
      modules.push({
        name: moduleName,
        featureId: id,
        server: feature.server,
        client: feature.client,
        description: feature.description
      });
    }
  }

  return modules.slice(0, LIMITS.MAX_MODULES);
}

function buildRemoteContracts(featureIds) {
  const contracts = [];

  for (const id of featureIds) {
    const feature = FEATURE_CATALOG[id];
    if (!feature) continue;

    for (const name of feature.remotes) {
      const isRequest = name.startsWith('Request');

      contracts.push({
        name,
        featureId: id,
        className: name.endsWith('Result') ||
          name.endsWith('Updated') ||
          name.endsWith('Dialogue') ||
          name.endsWith('Effect')
          ? 'RemoteEvent'
          : 'RemoteEvent',

        direction: isRequest
          ? 'client-to-server'
          : 'server-to-client',

        trust: isRequest
          ? 'untrusted-client-input'
          : 'server-authoritative-output',

        validation: isRequest
          ? [
              'Check player argument',
              'Validate every payload field',
              'Check numeric ranges',
              'Verify item and object ownership',
              'Validate character distance',
              'Apply per-player rate limit',
              'Perform authoritative state transition'
            ]
          : [
              'Send only required presentation data',
              'Never expose private server data',
              'Do not trust client acknowledgement as proof'
            ]
      });
    }
  }

  return contracts.slice(0, LIMITS.MAX_REMOTES);
}

function buildFolders(featureIds) {
  const folders = BASE_FOLDERS.map(item => ({ ...item }));

  const serverModules = buildModules(featureIds)
    .filter(item => item.server);

  const clientModules = buildModules(featureIds)
    .filter(item => item.client && !item.server);

  for (const module of serverModules) {
    folders.push({
      path: `ServerScriptService/Services/${module.name}`,
      className: 'ModuleScript',
      purpose: module.description,
      authority: 'server',
      featureId: module.featureId
    });
  }

  for (const module of clientModules) {
    folders.push({
      path: `StarterPlayer/StarterPlayerScripts/Quruvchi/${module.name}`,
      className: 'ModuleScript',
      purpose: module.description,
      authority: 'client',
      featureId: module.featureId
    });
  }

  folders.push({
    path: 'ReplicatedStorage/Shared/FeatureConfig',
    className: 'Folder',
    purpose: 'Shared feature configuration.',
    authority: 'shared'
  });

  return folders;
}

function buildPersistencePlan(featureIds) {
  const persistentFeatures = featureIds.filter(id =>
    FEATURE_CATALOG[id]?.persistence
  );

  if (!persistentFeatures.length) {
    return {
      enabled: false,
      features: [],
      strategy: 'No persistent feature was selected.'
    };
  }

  return {
    enabled: true,
    features: persistentFeatures,
    dataModel: {
      key: 'UserId',
      schemaVersion: 1,
      sections: [
        'Profile',
        'Progress',
        'Currency',
        'Inventory',
        'Settings',
        'FeatureData'
      ]
    },
    rules: [
      'Use UpdateAsync for safe state transitions where appropriate.',
      'Wrap network persistence calls with pcall.',
      'Validate saved data before applying it.',
      'Keep a schema version for migrations.',
      'Use bounded retry and backoff policies.',
      'Save on PlayerRemoving.',
      'Review BindToClose shutdown behavior.',
      'Do not save client-provided values directly.',
      'Avoid saving every frame or on every tiny state change.',
      'Handle throttling and unavailable DataStore responses.'
    ]
  };
}

function buildLifecyclePlan(featureIds) {
  const steps = [
    {
      event: 'Server startup',
      actions: [
        'Load server configuration',
        'Initialize shared service dependencies',
        'Register remote contracts',
        'Initialize feature services'
      ]
    },
    {
      event: 'PlayerAdded',
      actions: [
        'Create player session state',
        'Load and validate persistent data when enabled',
        'Initialize server-side permissions',
        'Prepare player feature state'
      ]
    },
    {
      event: 'CharacterAdded',
      actions: [
        'Bind character-dependent systems',
        'Initialize movement or combat state when required',
        'Connect character lifecycle handlers'
      ]
    },
    {
      event: 'CharacterRemoving',
      actions: [
        'Disconnect character-specific connections',
        'Clear temporary character references'
      ]
    },
    {
      event: 'PlayerRemoving',
      actions: [
        'Validate final player state',
        'Save persistent state when enabled',
        'Disconnect player-owned connections',
        'Destroy temporary player objects'
      ]
    },
    {
      event: 'Server shutdown',
      actions: [
        'Stop accepting new gameplay operations',
        'Complete bounded persistence work',
        'Clean up temporary runtime state'
      ]
    }
  ];

  if (!featureIds.includes('combat')) {
    steps[2].actions = steps[2].actions.filter(
      item => !item.toLowerCase().includes('combat')
    );
  }

  return steps;
}

function buildSecurityPlan(featureIds, remotes) {
  const checks = [
    'All client input is untrusted.',
    'The server owns currency and reward decisions.',
    'The server owns inventory and item ownership.',
    'Remote arguments are validated before use.',
    'Numeric values have explicit bounds.',
    'Player ownership is verified before modifying objects.',
    'World interactions validate distance.',
    'Sensitive operations have rate limits.',
    'Client scripts never receive private server secrets.',
    'Admin actions require server-side permissions.',
    'Purchase results are verified on the server.',
    'Unexpected requests fail safely.'
  ];

  if (featureIds.includes('combat')) {
    checks.push(
      'Damage is calculated and applied by the server.',
      'Attack range and cooldown are validated.',
      'Target eligibility is checked before damage.'
    );
  }

  if (featureIds.includes('pets')) {
    checks.push(
      'Pet ownership is checked before equipping.',
      'Pet stat changes are server-authoritative.'
    );
  }

  if (featureIds.includes('eggs')) {
    checks.push(
      'Egg price and reward pool are defined on the server.',
      'Random reward selection is performed on the server.',
      'Client cannot choose the reward result.'
    );
  }

  if (featureIds.includes('building')) {
    checks.push(
      'Placement bounds and collision are checked by the server.',
      'Players cannot modify another player’s structures.'
    );
  }

  return {
    policy: { ...REMOTE_SECURITY },
    remoteCount: remotes.length,
    checks: unique(checks)
  };
}

function buildPerformancePlan(featureIds) {
  const checks = [
    'Avoid unbounded loops.',
    'Use event-driven systems where practical.',
    'Disconnect unused RBXScriptConnections.',
    'Avoid repeatedly scanning the entire Workspace.',
    'Limit high-frequency remote traffic.',
    'Avoid creating unnecessary instances.',
    'Clean up temporary objects.',
    'Keep client rendering separate from authoritative logic.',
    'Avoid expensive work inside RenderStepped callbacks.',
    'Profile large systems in Studio.'
  ];

  if (featureIds.includes('pets')) {
    checks.push(
      'Limit active pet follower count.',
      'Avoid recalculating every pet path every frame.'
    );
  }

  if (featureIds.includes('waves')) {
    checks.push(
      'Pool or reuse repeated enemy objects where appropriate.',
      'Control simultaneous enemy counts.'
    );
  }

  if (featureIds.includes('vehicles')) {
    checks.push(
      'Avoid unnecessary physics constraints.',
      'Review network ownership for vehicle assemblies.'
    );
  }

  return unique(checks);
}

function buildDevelopmentPhases(featureIds, modules) {
  const phases = [
    {
      id: 'foundation',
      name: 'Foundation',
      order: 1,
      tasks: [
        'Create required folders',
        'Create shared configuration',
        'Create server bootstrap',
        'Define module initialization order'
      ]
    },
    {
      id: 'authority',
      name: 'Server authority',
      order: 2,
      tasks: [
        'Implement server services',
        'Implement state validation',
        'Implement remote request boundaries',
        'Implement lifecycle cleanup'
      ]
    },
    {
      id: 'gameplay',
      name: 'Gameplay systems',
      order: 3,
      tasks: modules.map(module =>
        `Implement ${module.name} for ${module.featureId}`
      )
    },
    {
      id: 'world',
      name: 'World and interaction',
      order: 4,
      tasks: [
        'Create required world folders',
        'Connect world interactions to server services',
        'Validate object ownership and interaction range'
      ]
    },
    {
      id: 'client',
      name: 'Client experience',
      order: 5,
      tasks: [
        'Implement player input',
        'Implement UI controllers',
        'Connect client presentation to remote contracts',
        'Handle loading and failure states'
      ]
    },
    {
      id: 'quality',
      name: 'Quality assurance',
      order: 6,
      tasks: [
        'Run static Luau analysis',
        'Review remote security',
        'Check persistence failure behavior',
        'Run Roblox Studio Play-test',
        'Test with multiple players',
        'Review performance and cleanup'
      ]
    }
  ];

  return phases;
}

function buildAcceptanceCriteria(featureIds, remotes) {
  const criteria = [
    'Project folders match the approved architecture.',
    'Every server gameplay service has a clear responsibility.',
    'Client code is not trusted with authoritative game state.',
    'All remote requests are validated on the server.',
    'Rate limits exist for sensitive remote operations.',
    'Player and character connections are cleaned up.',
    'Errors are handled without silently corrupting player state.',
    'Static analysis completes without unresolved critical findings.',
    'Roblox Studio Play-test has been completed.',
    'Multiplayer behavior has been reviewed.'
  ];

  if (featureIds.includes('player_data')) {
    criteria.push(
      'Player data loads and saves safely.',
      'DataStore failures do not overwrite valid saved data.',
      'Data schema migrations are handled deliberately.'
    );
  }

  if (featureIds.includes('currency')) {
    criteria.push(
      'Clients cannot grant or modify currency.',
      'Every reward has a server-side eligibility check.'
    );
  }

  if (featureIds.includes('pets')) {
    criteria.push(
      'Only owned pets can be equipped.',
      'Pet state remains consistent after respawn.'
    );
  }

  if (featureIds.includes('eggs')) {
    criteria.push(
      'Egg opening validates price and eligibility.',
      'Reward selection cannot be controlled by the client.'
    );
  }

  if (featureIds.includes('combat')) {
    criteria.push(
      'Damage is applied by the server.',
      'Attack cooldown and target validation work in multiplayer.'
    );
  }

  return unique(criteria).slice(0, LIMITS.MAX_REQUIREMENTS);
}

/**
 * Build a full gameplay architecture blueprint.
 *
 * Input example:
 * {
 *   name: "Pet Adventure",
 *   gameType: "simulator",
 *   features: ["pets", "eggs", "currency"]
 * }
 */
export function buildGameplayBlueprint(input = {}, detectedFeatures = []) {
  const safeInput = input && typeof input === 'object'
    ? input
    : {};

  const resolution = resolveFeatures({
    ...safeInput,
    features: [
      ...(Array.isArray(safeInput.features) ? safeInput.features : []),
      ...(Array.isArray(detectedFeatures)
        ? detectedFeatures.map(item =>
            typeof item === 'string' ? item : item?.id
          )
        : [])
    ]
  });

  const featureIds = resolveDependencies(
    resolution.featureIds
  );

  const modules = buildModules(featureIds);
  const remotes = buildRemoteContracts(featureIds);
  const folders = buildFolders(featureIds);
  const persistence = buildPersistencePlan(featureIds);

  return {
    version: VERSION,

    identity: {
      name: cleanString(
        safeInput.name || safeInput.title || 'Quruvchi Roblox Experience'
      ),
      gameType: resolution.gameType,
      description: cleanString(
        safeInput.description || '',
        LIMITS.MAX_DESCRIPTION
      )
    },

    features: featureIds.map(id => ({
      id,
      ...FEATURE_CATALOG[id]
    })),

    architecture: {
      style: 'modular-server-authoritative',
      serverOwnsGameState: true,
      clientRole: 'input-and-presentation',
      sharedRole: 'read-only-definitions-and-contracts',
      modules,
      folders
    },

    remotes: {
      total: remotes.length,
      contracts: remotes
    },

    persistence,

    lifecycle: buildLifecyclePlan(featureIds),

    security: buildSecurityPlan(featureIds, remotes),

    performance: {
      strategy: 'event-driven-and-bounded',
      checks: buildPerformancePlan(featureIds)
    },

    development: {
      phases: buildDevelopmentPhases(featureIds, modules),
      acceptanceCriteria: buildAcceptanceCriteria(featureIds, remotes)
    },

    generationRules: {
      useModuleScripts: true,
      useExplicitDependencies: true,
      avoidGlobalState: true,
      avoidUnreviewedDynamicExecution: true,
      serverAuthoritative: true,
      validateRemoteInputs: true,
      includeScriptHeaderComments: true,
      useConsistentNaming: true,
      separateClientAndServerCode: true,
      doNotClaimPlayTestWithoutStudioEvidence: true
    },

    metadata: {
      featureCount: featureIds.length,
      moduleCount: modules.length,
      folderCount: folders.length,
      remoteCount: remotes.length,
      persistenceEnabled: persistence.enabled,
      generatedBy: 'Quruvchi MAX Gameplay Blueprint Engine'
    }
  };
}

/**
 * Return available feature definitions.
 */
export function getGameplayFeatureCatalog() {
  return Object.entries(FEATURE_CATALOG).map(([id, item]) => ({
    id,
    name: item.name,
    description: item.description,
    dependencies: [...item.dependencies],
    modules: [...item.modules],
    persistence: item.persistence
  }));
}

/**
 * Return supported game presets.
 */
export function getGameplayPresetCatalog() {
  return Object.entries(GAME_PRESETS).map(([id, features]) => ({
    id,
    features: [...features]
  }));
}

/**
 * Validate an existing blueprint structure.
 */
export function validateGameplayBlueprint(blueprint = {}) {
  const issues = [];

  if (!blueprint || typeof blueprint !== 'object') {
    return {
      ok: false,
      issues: [{
        id: 'invalid-blueprint',
        severity: 'error',
        message: 'Blueprint must be an object.'
      }]
    };
  }

  const modules = Array.isArray(blueprint.architecture?.modules)
    ? blueprint.architecture.modules
    : [];

  const folders = Array.isArray(blueprint.architecture?.folders)
    ? blueprint.architecture.folders
    : [];

  const remotes = Array.isArray(blueprint.remotes?.contracts)
    ? blueprint.remotes.contracts
    : [];

  if (!modules.length) {
    issues.push({
      id: 'missing-modules',
      severity: 'error',
      message: 'No gameplay modules were defined.'
    });
  }

  if (!folders.length) {
    issues.push({
      id: 'missing-folders',
      severity: 'error',
      message: 'No Roblox folder structure was defined.'
    });
  }

  if (!blueprint.security?.policy?.serverMustValidateTypes) {
    issues.push({
      id: 'missing-remote-validation-policy',
      severity: 'error',
      message: 'Server remote type validation policy is missing.'
    });
  }

  if (blueprint.security?.policy?.clientCannotGrantRewards !== true) {
    issues.push({
      id: 'client-reward-authority',
      severity: 'error',
      message: 'Client reward restriction is not enabled.'
    });
  }

  for (const remote of remotes) {
    if (!remote.name || !remote.direction || !remote.trust) {
      issues.push({
        id: 'invalid-remote-contract',
        severity: 'error',
        message: 'A remote contract is missing required fields.'
      });
    }

    if (
      remote.direction === 'client-to-server' &&
      remote.trust !== 'untrusted-client-input'
    ) {
      issues.push({
        id: 'remote-trust-mismatch',
        severity: 'error',
        message: `Remote ${remote.name} has an invalid trust classification.`
      });
    }
  }

  return {
    ok: issues.every(item => item.severity !== 'error'),
    summary: {
      modules: modules.length,
      folders: folders.length,
      remotes: remotes.length,
      errors: issues.filter(item => item.severity === 'error').length
    },
    issues
  };
}

/**
 * Blueprint engine metadata.
 */
export function getGameplayBlueprintInfo() {
  return {
    name: 'Quruvchi MAX Gameplay Blueprint Engine',
    version: VERSION,
    featureCount: Object.keys(FEATURE_CATALOG).length,
    presetCount: Object.keys(GAME_PRESETS).length,
    capabilities: [
      'Game-type preset resolution',
      'Feature dependency resolution',
      'Roblox folder architecture',
      'Server and client module planning',
      'Remote communication contracts',
      'Persistence planning',
      'Player lifecycle planning',
      'Security requirements',
      'Performance requirements',
      'Development phases',
      'Acceptance criteria',
      'Blueprint validation'
    ],
    limits: { ...LIMITS }
  };
}

// ================================================================
// END OF QURuvchi MAX GAMEPLAY BLUEPRINT ENGINE V2
// ================================================================
