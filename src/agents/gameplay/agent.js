
// ============================================================
// QURUVCHI MAX — GAMEPLAY AGENT V2
// Location: src/agents/gameplay/agent.js
// Runtime: Node.js ES Modules
// Purpose:
// 1. Analyze complete game prompts.
// 2. Detect gameplay systems and requirements.
// 3. Validate generated Roblox Luau source.
// 4. Detect missing mechanics and common implementation bugs.
// 5. Check server-authoritative architecture.
// 6. Produce a structured implementation plan for other agents.
// 7. Preserve compatibility with src/agent.js.
// ============================================================

const VERSION = '2.0.0';
const MAX_SOURCE_LENGTH = 500000;
const MAX_FEATURES = 100;
const MAX_PATH_LENGTH = 240;

// ------------------------------------------------------------
// 1. SUPPORTED GAME TYPES
// ------------------------------------------------------------

const GAME_TYPES = Object.freeze({
    obby: {
        name: 'Obby',
        description: 'Parkour, stages, checkpoints and finish progression'
    },
    simulator: {
        name: 'Simulator',
        description: 'Collectibles, currency, upgrades and progression'
    },
    tycoon: {
        name: 'Tycoon',
        description: 'Plots, ownership, production and purchases'
    },
    world: {
        name: 'Open World',
        description: 'Exploration, interactions, NPCs, quests and world systems'
    },
    survival: {
        name: 'Survival',
        description: 'Health, resources, enemies and survival progression'
    },
    horror: {
        name: 'Horror',
        description: 'Atmosphere, objectives, encounters and survival'
    },
    simulator_pet: {
        name: 'Pet Simulator',
        description: 'Pets, collection, upgrades and rewards'
    },
    racing: {
        name: 'Racing',
        description: 'Vehicles, laps, checkpoints and race results'
    },
    tower_defense: {
        name: 'Tower Defense',
        description: 'Waves, towers, enemies and defenses'
    },
    battlegrounds: {
        name: 'Battlegrounds',
        description: 'Combat, abilities, cooldowns and rounds'
    }
});

// ------------------------------------------------------------
// 2. GAMEPLAY SYSTEM DEFINITIONS
// ------------------------------------------------------------

const FEATURE_DEFINITIONS = Object.freeze({

    player_data: {
        name: 'Player Data',
        words: ['data', 'save', 'saving', 'saqlash', 'profil', 'progress'],
        systems: [
            'Player data initialization',
            'Server-side player progression',
            'Safe player removal lifecycle',
            'Data validation'
        ],
        requirements: [
            ['Player lifecycle', /Players\.PlayerAdded|PlayerAdded/],
            ['Player removal lifecycle', /PlayerRemoving/]
        ]
    },

    currency: {
        name: 'Currency System',
        words: ['coin', 'coins', 'cash', 'money', 'gold', 'pul', 'tanga', 'valyuta'],
        systems: [
            'Server-authoritative currency',
            'Currency rewards',
            'Currency validation',
            'Leaderboard currency values'
        ],
        requirements: [
            ['Currency values', /Coins|Cash|Gold|Money/],
            ['Player stats', /leaderstats/]
        ]
    },

    checkpoints: {
        name: 'Checkpoint System',
        words: ['checkpoint', 'stage', 'bosqich', 'parkour', 'obby', 'respawn'],
        systems: [
            'Checkpoint progression',
            'Server-side checkpoint registration',
            'Safe respawn position',
            'Stage persistence during session'
        ],
        requirements: [
            ['Checkpoint objects', /Checkpoint/],
            ['Touch detection', /\.Touched/],
            ['Respawn handling', /CharacterAdded|PivotTo|RespawnLocation/]
        ]
    },

    collectibles: {
        name: 'Collectible System',
        words: ['collect', 'collectible', 'pickup', 'yig', 'olib', 'gem', 'crystal', 'item'],
        systems: [
            'Collectible registration',
            'Server-side pickup validation',
            'Duplicate pickup protection',
            'Reward calculation',
            'Collectible respawn lifecycle'
        ],
        requirements: [
            ['Collectible objects', /Collectible|Pickup|Gem/],
            ['Touch or interaction event', /\.Touched|\.Triggered/],
            ['Reward logic', /Coins|Cash|Gold|Reward/]
        ]
    },

    upgrades: {
        name: 'Upgrade System',
        words: ['upgrade', 'upgrades', 'level', 'improve', 'yaxshila', 'kuchaytir', 'tezlik'],
        systems: [
            'Upgrade catalog',
            'Upgrade price validation',
            'Server-side purchase processing',
            'Player upgrade progression',
            'Purchase cooldown and validation'
        ],
        requirements: [
            ['Upgrade logic', /Upgrade|upgrade/],
            ['Purchase validation', /cost|Cost|Price|price/],
            ['Currency check', /Coins|Cash|Gold/]
        ]
    },

    pets: {
        name: 'Pet System',
        words: ['pet', 'pets', 'hayvon', 'jonivor', 'egg', 'eggs', 'hatch', 'tuxum'],
        systems: [
            'Pet definitions',
            'Pet ownership',
            'Pet inventory',
            'Pet equip and unequip',
            'Pet reward multipliers',
            'Egg opening validation',
            'Server-side pet assignment'
        ],
        requirements: [
            ['Pet system', /Pet|pet/],
            ['Inventory or ownership', /Inventory|Owned|Equipped/],
            ['Server-side player handling', /Players/]
        ]
    },

    combat: {
        name: 'Combat System',
        words: ['combat', 'fight', 'battle', 'attack', 'damage', 'urush', 'jang', 'zarba'],
        systems: [
            'Server-side damage validation',
            'Attack range validation',
            'Cooldown management',
            'Target validation',
            'Combat state management',
            'Anti-spam protection'
        ],
        requirements: [
            ['Damage handling', /TakeDamage|Health/],
            ['Combat event', /OnServerEvent|Touched|Activated/],
            ['Cooldown or rate protection', /cooldown|Cooldown|lastAttack|LastAttack/]
        ]
    },

    npc: {
        name: 'NPC System',
        words: ['npc', 'villager', 'merchant', 'savdogar', 'personaj', 'dialog', 'suhbat'],
        systems: [
            'NPC registration',
            'NPC interaction',
            'Proximity prompts',
            'NPC service validation',
            'Interaction cooldowns'
        ],
        requirements: [
            ['NPC objects', /NPC|Npc|QuestNPC/],
            ['Interaction mechanism', /ProximityPrompt|Touched|Triggered/]
        ]
    },

    quests: {
        name: 'Quest System',
        words: ['quest', 'quests', 'mission', 'missions', 'vazifa', 'topshiriq', 'missiya'],
        systems: [
            'Quest definitions',
            'Quest acceptance',
            'Quest progress',
            'Quest completion validation',
            'Quest rewards',
            'Repeatable quest protection'
        ],
        requirements: [
            ['Quest definitions', /Quest|quest/],
            ['Quest progress', /Progress|Completed|Objective/],
            ['Reward handling', /Reward|Coins|Cash/]
        ]
    },

    portals: {
        name: 'Portal System',
        words: ['portal', 'teleport', 'teleportation', 'warp', 'dimension', 'olamlar'],
        systems: [
            'Portal registration',
            'Destination validation',
            'Server-side teleportation',
            'Teleport cooldown',
            'Character lifecycle handling'
        ],
        requirements: [
            ['Portal objects', /Portal/],
            ['Teleport handling', /PivotTo|TeleportTo|CFrame/]
        ]
    },

    vehicles: {
        name: 'Vehicle System',
        words: ['vehicle', 'car', 'truck', 'mashina', 'transport', 'drive', 'haydash'],
        systems: [
            'Vehicle registration',
            'Vehicle ownership',
            'Seat validation',
            'Vehicle spawn management',
            'Vehicle cleanup'
        ],
        requirements: [
            ['Vehicle objects', /Vehicle|Car|Seat/],
            ['Vehicle interaction', /VehicleSeat|Seat|ProximityPrompt/]
        ]
    },

    waves: {
        name: 'Wave System',
        words: ['wave', 'waves', 'enemy', 'enemies', 'zombie', 'dushman', 'hujum'],
        systems: [
            'Wave progression',
            'Enemy spawning',
            'Enemy lifecycle',
            'Wave completion detection',
            'Difficulty scaling',
            'Wave rewards'
        ],
        requirements: [
            ['Wave controller', /Wave|wave/],
            ['Enemy spawning', /Clone\(\)|Enemy|NPC/],
            ['Wave progression', /task\.wait|task\.delay|while/]
        ]
    },

    round_system: {
        name: 'Round System',
        words: ['round', 'rounds', 'match', 'arena', 'turnir', 'musobaqa'],
        systems: [
            'Round state machine',
            'Player registration',
            'Round timer',
            'Winner validation',
            'Round cleanup',
            'Next round initialization'
        ],
        requirements: [
            ['Round states', /Round|round/],
            ['Timer', /task\.wait|os\.clock|time\(\)/],
            ['Player management', /Players/]
        ]
    },

    leaderboard: {
        name: 'Leaderboard',
        words: ['leaderboard', 'ranking', 'top', 'reyting', 'jadval', 'record'],
        systems: [
            'Player leaderboard',
            'Score tracking',
            'Best result tracking',
            'Server-side score validation'
        ],
        requirements: [
            ['Leaderboard values', /leaderstats|OrderedDataStore/]
        ]
    },

    ui: {
        name: 'Game UI',
        words: ['ui', 'gui', 'interface', 'hud', 'menu', 'interfeys', 'tugma', 'button'],
        systems: [
            'ScreenGui structure',
            'Responsive interface',
            'Game status display',
            'Interactive buttons',
            'RemoteEvent communication',
            'UI state synchronization'
        ],
        requirements: [
            ['GUI creation', /ScreenGui|PlayerGui|StarterGui/],
            ['UI elements', /TextButton|TextLabel|Frame/]
        ]
    },

    shop: {
        name: 'Shop System',
        words: ['shop', 'store', 'market', 'do‘kon', 'dokon', 'sotib', 'purchase'],
        systems: [
            'Shop catalog',
            'Item price validation',
            'Purchase processing',
            'Ownership checks',
            'Purchase feedback'
        ],
        requirements: [
            ['Shop logic', /Shop|shop|Purchase|purchase/],
            ['Currency validation', /Coins|Cash|Gold/]
        ]
    },

    abilities: {
        name: 'Ability System',
        words: ['ability', 'abilities', 'skill', 'skills', 'power', 'superpower', 'qobiliyat'],
        systems: [
            'Ability definitions',
            'Ability cooldowns',
            'Server-side ability validation',
            'Target validation',
            'Ability effects'
        ],
        requirements: [
            ['Ability definitions', /Ability|Skill|Power/],
            ['Cooldown handling', /cooldown|Cooldown/]
        ]
    },

    survival: {
        name: 'Survival System',
        words: ['survival', 'survive', 'hunger', 'thirst', 'ochlik', 'chanqoq', 'tirik qol'],
        systems: [
            'Health management',
            'Hunger and thirst',
            'Resource collection',
            'Survival progression',
            'Death and respawn handling'
        ],
        requirements: [
            ['Health management', /Humanoid|Health/],
            ['Survival values', /Hunger|Thirst|Food|Water/]
        ]
    },

    tycoon: {
        name: 'Tycoon System',
        words: ['tycoon', 'factory', 'factory game', 'zavod', 'biznes', 'base', 'baza'],
        systems: [
            'Plot ownership',
            'Claim validation',
            'Production system',
            'Upgrade purchase',
            'Owner-only interactions',
            'Plot cleanup'
        ],
        requirements: [
            ['Plot ownership', /Plot|OwnerUserId|Owner/],
            ['Claim logic', /ClaimPad|Claim/],
            ['Currency', /Cash|Coins/]
        ]
    }
});

// ------------------------------------------------------------
// 3. BASE SYSTEMS PER GAME TYPE
// ------------------------------------------------------------

const BASE_SYSTEMS = Object.freeze({

    obby: [
        'Player lifecycle',
        'Stage progression',
        'Checkpoint registration',
        'Safe respawn',
        'Finish detection',
        'Completion rewards',
        'Leaderboard',
        'Touch debounce'
    ],

    simulator: [
        'Player lifecycle',
        'Server-authoritative currency',
        'Collectible registration',
        'Pickup validation',
        'Collectible respawn',
        'Progression',
        'Leaderboard',
        'Reward validation'
    ],

    tycoon: [
        'Player lifecycle',
        'Plot registration',
        'Plot ownership',
        'Claim validation',
        'Cash management',
        'Purchase validation',
        'Production system',
        'Owner-only access'
    ],

    world: [
        'Player lifecycle',
        'World registration',
        'Spawn management',
        'World interactions',
        'Interaction validation',
        'World cleanup'
    ],

    survival: [
        'Player lifecycle',
        'Health management',
        'Resource collection',
        'Survival progression',
        'Enemy management',
        'Death handling'
    ],

    horror: [
        'Player lifecycle',
        'Atmosphere controller',
        'Objective progression',
        'Encounter management',
        'Survival state',
        'Round or chapter progression'
    ],

    simulator_pet: [
        'Player lifecycle',
        'Pet ownership',
        'Pet inventory',
        'Egg opening',
        'Reward calculation',
        'Pet equip management'
    ],

    racing: [
        'Player lifecycle',
        'Vehicle registration',
        'Race checkpoints',
        'Lap tracking',
        'Finish detection',
        'Race leaderboard'
    ],

    tower_defense: [
        'Wave controller',
        'Enemy spawning',
        'Tower placement validation',
        'Tower targeting',
        'Damage calculation',
        'Wave rewards'
    ],

    battlegrounds: [
        'Combat state',
        'Ability registration',
        'Server-side damage',
        'Cooldown validation',
        'Round management',
        'Winner detection'
    ]
});

// ------------------------------------------------------------
// 4. SECURITY RULES
// ------------------------------------------------------------

const SECURITY_RULES = Object.freeze([

    {
        id: 'remote_validation',
        name: 'RemoteEvent validation',
        test: source =>
            /OnServerEvent/.test(source) &&
            !/OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(\s*\w+\s*,\s*\w+\s*\)/.test(source),
        severity: 'warning',
        message: 'RemoteEvent argument validation should be reviewed.'
    },

    {
        id: 'server_authority',
        name: 'Server authority',
        test: source =>
            /OnServerEvent|ProximityPrompt|\.Touched/.test(source),
        severity: 'info',
        message: 'Server-side interaction entry points detected.'
    },

    {
        id: 'http_external',
        name: 'External HTTP calls',
        test: source =>
            !/HttpService:GetAsync|HttpService:PostAsync|RequestAsync/.test(source),
        severity: 'info',
        message: 'No external HTTP request detected.'
    },

    {
        id: 'global_environment',
        name: 'Global environment usage',
        test: source => !/\b_G\s*(?:\[|\.|\=)/.test(source),
        severity: 'error',
        message: 'Avoid shared global _G state.'
    },

    {
        id: 'infinite_loop',
        name: 'Unbounded tight loops',
        test: source =>
            !/while\s+true\s+do\s*(?:local\s+\w+\s*=\s*[^;\n]+\s*)?end/.test(source),
        severity: 'warning',
        message: 'Check while loops for waits and resource consumption.'
    },

    {
        id: 'unsafe_loadstring',
        name: 'Dynamic code execution',
        test: source => !/\bloadstring\s*\(/.test(source),
        severity: 'error',
        message: 'Dynamic loadstring execution is not allowed by this agent.'
    },

    {
        id: 'server_script',
        name: 'Server script path',
        test: (_, path) => path.startsWith('ServerScriptService/'),
        severity: 'error',
        message: 'Gameplay server code must be placed in ServerScriptService.'
    }
]);

// ------------------------------------------------------------
// 5. GENERAL UTILITIES
// ------------------------------------------------------------

function cleanText(value, max = 200) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function validKind(kind) {
    return Object.hasOwn(GAME_TYPES, kind);
}

function testPattern(pattern, source) {
    if (!(pattern instanceof RegExp)) return false;

    // Avoid accidentally retaining the lastIndex of global regexes.
    pattern.lastIndex = 0;
    return pattern.test(source);
}

function makeCheck(name, ok, severity = 'error', detail = '') {
    return {
        name,
        ok: Boolean(ok),
        severity,
        detail: cleanText(detail, 300)
    };
}

// ------------------------------------------------------------
// 6. GAME TYPE DETECTION
// ------------------------------------------------------------

export function detectGameType(prompt, fallback = 'world') {

    const text = cleanText(prompt, 12000).toLowerCase();

    const patterns = [
        ['tower_defense', /\btower defense\b|tower defence|minora.*himoya/],
        ['battlegrounds', /\bbattlegrounds?\b|arena fighter|jang maydoni/],
        ['simulator_pet', /\bpet simulator\b|egg simulator|pet collection|hayvon.*tuxum/],
        ['horror', /\bhorror\b|scary game|qo‘rqinch|qo'rqinch|dahshat/],
        ['survival', /\bsurvival\b|survive|tirik qol|zombie survival/],
        ['racing', /\bracing\b|race game|car racing|poyga/],
        ['tycoon', /\btycoon\b|factory simulator|business simulator/],
        ['obby', /\bobby\b|parkour|obstacle course|to‘siqlar|tosiklar/],
        ['simulator', /\bsimulator\b|clicker|collector game/]
    ];

    for (const [kind, pattern] of patterns) {
        if (pattern.test(text)) return kind;
    }

    return validKind(fallback) ? fallback : 'world';
}

// ------------------------------------------------------------
// 7. FEATURE DETECTION
// ------------------------------------------------------------

export function detectGameplayFeatures(prompt) {

    const text = cleanText(prompt, 12000).toLowerCase();

    const features = [];

    for (const [id, definition] of Object.entries(FEATURE_DEFINITIONS)) {

        const found = definition.words.some(word =>
            text.includes(word.toLowerCase())
        );

        if (found) {
            features.push({
                id,
                name: definition.name,
                systems: [...definition.systems],
                requirements: definition.requirements.map(item => item[0])
            });
        }
    }

    return features.slice(0, MAX_FEATURES);
}

// ------------------------------------------------------------
// 8. FEATURE REQUIREMENT CHECKING
// ------------------------------------------------------------

function checkFeatureRequirements(features, source) {

    const checks = [];

    for (const feature of features) {

        const definition = FEATURE_DEFINITIONS[feature.id];

        if (!definition) continue;

        for (const [name, pattern] of definition.requirements) {

            checks.push(
                makeCheck(
                    feature.name + ': ' + name,
                    testPattern(pattern, source),
                    'error',
                    'Required implementation evidence for ' + feature.name
                )
            );
        }
    }

    return checks;
}

// ------------------------------------------------------------
// 9. GAME TYPE REQUIREMENT CHECKING
// ------------------------------------------------------------

const TYPE_REQUIREMENTS = Object.freeze({

    obby: [
        ['World root', /QuruvchiFreeWorld/],
        ['Stage count', /STAGE_COUNT|StageCount|JumpPlatform/],
        ['Checkpoint logic', /Checkpoint/],
        ['Finish platform', /FinishPlatform/],
        ['Player stats', /leaderstats/],
        ['Touch event', /\.Touched/],
        ['Player lifecycle', /PlayerAdded|CharacterAdded/]
    ],

    simulator: [
        ['World root', /QuruvchiFreeWorld/],
        ['Collectible logic', /Collectible/],
        ['Currency', /Coins|Cash/],
        ['Player stats', /leaderstats/],
        ['Player lifecycle', /PlayerAdded|CharacterAdded/]
    ],

    tycoon: [
        ['World root', /QuruvchiFreeWorld/],
        ['Plot logic', /Plot/],
        ['Claim pad', /ClaimPad|Claim/],
        ['Cash stat', /Cash|Coins/],
        ['Player stats', /leaderstats/],
        ['Purchase validation', /Price|Cost|Purchase|purchase/]
    ],

    world: [
        ['World root', /QuruvchiFreeWorld/],
        ['World construction', /Instance\.new\s*\(/],
        ['Player lifecycle', /Players/],
        ['Spawn management', /SpawnLocation|PlayerSpawn|CharacterAdded/]
    ],

    survival: [
        ['Health management', /Humanoid|Health/],
        ['Player lifecycle', /Players/],
        ['Survival state', /Survival|Hunger|Thirst|Health/]
    ],

    horror: [
        ['Horror world', /QuruvchiFreeWorld/],
        ['Player lifecycle', /Players/],
        ['Objective or encounter', /Objective|Encounter|Chapter|Monster|Enemy/]
    ],

    simulator_pet: [
        ['Pet system', /Pet|pet/],
        ['Egg system', /Egg|egg|Hatch/],
        ['Ownership system', /Owned|Inventory|Equipped/],
        ['Player lifecycle', /Players/]
    ],

    racing: [
        ['Race system', /Race|race/],
        ['Vehicle or seat', /Vehicle|Car|VehicleSeat/],
        ['Checkpoint system', /Checkpoint/],
        ['Player lifecycle', /Players/]
    ],

    tower_defense: [
        ['Wave system', /Wave|wave/],
        ['Enemy system', /Enemy|enemy/],
        ['Tower system', /Tower|tower/],
        ['Player lifecycle', /Players/]
    ],

    battlegrounds: [
        ['Combat system', /Combat|Attack|Damage/],
        ['Cooldown system', /Cooldown|cooldown/],
        ['Player lifecycle', /Players/]
    ]
});

// ------------------------------------------------------------
// 10. LUUAU SOURCE ANALYSIS
// ------------------------------------------------------------

function analyzeSource(source) {

    const lines = source.split(/\r?\n/);

    const result = {
        length: source.length,
        lineCount: lines.length,
        hasServices: /GetService\s*\(/.test(source),
        hasPlayers: /GetService\s*\(\s*["']Players["']\s*\)/.test(source),
        hasWorkspace: /GetService\s*\(\s*["']Workspace["']\s*\)/.test(source),
        hasRemoteEvent: /RemoteEvent/.test(source),
        hasRemoteFunction: /RemoteFunction/.test(source),
        hasServerEvent: /OnServerEvent/.test(source),
        hasTouched: /\.Touched/.test(source),
        hasPrompt: /ProximityPrompt/.test(source),
        hasPlayerLifecycle: /PlayerAdded|PlayerRemoving/.test(source),
        hasLeaderstats: /leaderstats/.test(source),
        hasDataStore: /DataStoreService/.test(source),
        hasPcall: /\bpcall\s*\(/.test(source),
        hasDebounce: /debounce|cooldown|Cooldown|lastTouch|lastPickup/i.test(source),
        hasCleanup: /PlayerRemoving|Destroy\(\)|Disconnect\(\)/.test(source),
        hasUI: /ScreenGui|TextButton|TextLabel/.test(source),
        hasModuleScript: /ModuleScript/.test(source),
        hasCollectionService: /CollectionService/.test(source),
        hasAttributes: /SetAttribute|GetAttribute/.test(source),
        suspiciousPatterns: []
    };

    const suspicious = [
        {
            name: 'loadstring',
            pattern: /\bloadstring\s*\(/,
            severity: 'error'
        },
        {
            name: '_G shared state',
            pattern: /\b_G\s*(?:\[|\.|\=)/,
            severity: 'error'
        },
        {
            name: 'client trust for rewards',
            pattern: /OnServerEvent[\s\S]{0,400}(?:coins|cash|reward|money)\s*\.\s*Value\s*=/i,
            severity: 'warning'
        },
        {
            name: 'unprotected DataStore call',
            pattern: /(?:GetAsync|SetAsync|UpdateAsync)\s*\(/,
            severity: 'warning'
        },
        {
            name: 'unbounded while loop',
            pattern: /while\s+true\s+do\s*(?:--[^\n]*\n\s*)?end/,
            severity: 'warning'
        }
    ];

    for (const item of suspicious) {
        if (item.pattern.test(source)) {
            result.suspiciousPatterns.push({
                name: item.name,
                severity: item.severity
            });
        }
    }

    // Simple structural check. This is not a complete Luau parser.
    const opening = (source.match(/\b(function|if|for|while|repeat|do)\b/g) || []).length;
    const closing = (source.match(/\b(end|until)\b/g) || []).length;

    result.blockCount = {
        opening,
        closing,
        balanced: closing >= Math.max(0, opening - 2)
    };

    return result;
}

// ------------------------------------------------------------
// 11. SECURITY AUDIT
// ------------------------------------------------------------

function runSecurityAudit(source, path) {

    const checks = [];

    for (const rule of SECURITY_RULES) {

        let ok = false;

        try {
            ok = rule.test(source, path);
        } catch {
            ok = false;
        }

        checks.push({
            id: rule.id,
            name: rule.name,
            ok,
            severity: rule.severity,
            message: rule.message
        });
    }

    return checks;
}

// ------------------------------------------------------------
// 12. ARCHITECTURE ANALYSIS
// ------------------------------------------------------------

function buildArchitecture(source, kind, features) {

    const info = analyzeSource(source);

    const components = [];

    if (info.hasPlayers) {
        components.push({
            name: 'Players Service',
            role: 'Player lifecycle and player references'
        });
    }

    if (info.hasWorkspace) {
        components.push({
            name: 'Workspace',
            role: 'World objects and physical interactions'
        });
    }

    if (info.hasRemoteEvent || info.hasRemoteFunction) {
        components.push({
            name: 'Remote Communication',
            role: 'Client-server communication; server validation required'
        });
    }

    if (info.hasDataStore) {
        components.push({
            name: 'DataStoreService',
            role: 'Persistent player data; protected calls required'
        });
    }

    if (info.hasCollectionService) {
        components.push({
            name: 'CollectionService',
            role: 'Tag-based object registration'
        });
    }

    return {
        gameType: kind,
        gameName: GAME_TYPES[kind]?.name || 'Open World',
        components,
        features: features.map(item => item.name),
        recommendedStructure: [
            'ServerScriptService/QuruvchiGameplay',
            'ServerScriptService/Modules',
            'ReplicatedStorage/Remotes',
            'ReplicatedStorage/Shared',
            'StarterGui',
            'Workspace/QuruvchiFreeWorld'
        ],
        observations: {
            serverPlayerLifecycle: info.hasPlayerLifecycle,
            remoteCommunication: info.hasRemoteEvent || info.hasRemoteFunction,
            persistentData: info.hasDataStore,
            leaderboard: info.hasLeaderstats,
            interface: info.hasUI,
            cleanup: info.hasCleanup
        }
    };
}

// ------------------------------------------------------------
// 13. GENERATE IMPLEMENTATION PLAN
// ------------------------------------------------------------

export function createGameplaySpecification(input = {}) {

    const prompt = cleanText(input.prompt || input.idea || '', 12000);

    const kind = validKind(input.kind)
        ? input.kind
        : detectGameType(prompt, 'world');

    const detectedFeatures = detectGameplayFeatures(prompt);

    const baseSystems = BASE_SYSTEMS[kind] || BASE_SYSTEMS.world;

    const systems = unique([
        ...baseSystems,
        ...detectedFeatures.flatMap(feature => feature.systems),
        ...safeArray(input.features).map(item => cleanText(item, 180))
    ]);

    return {
        version: VERSION,
        agent: 'Gameplay Agent',
        gameType: kind,
        gameTypeName: GAME_TYPES[kind].name,
        title: cleanText(input.name || input.title || 'Quruvchi MAX Game', 100),
        originalPrompt: prompt,
        detectedFeatures,
        systems,
        architecture: {
            authority: 'server',
            clientRole: 'presentation and input',
            serverRole: 'game state, rewards, validation and progression',
            recommendedFolders: [
                'ServerScriptService/QuruvchiGameplay',
                'ServerScriptService/Modules',
                'ReplicatedStorage/Remotes',
                'ReplicatedStorage/Shared',
                'StarterGui',
                'Workspace/QuruvchiFreeWorld'
            ]
        },
        safety: {
            validateAllRemoteInputs: true,
            neverTrustClientRewards: true,
            rateLimitRemoteEvents: true,
            validatePlayerOwnership: true,
            protectDataStoreCalls: true,
            cleanPlayerConnections: true,
            avoidGlobalState: true
        },
        generatedAt: new Date().toISOString()
    };
}

// ------------------------------------------------------------
// 14. FULL GAMEPLAY SOURCE VALIDATION
// ------------------------------------------------------------

export function buildGameplayPlan(project = {}) {

    const kind = validKind(project.kind)
        ? project.kind
        : 'world';

    const source = typeof project.source === 'string'
        ? project.source
        : '';

    const scriptPath = cleanText(project.path, MAX_PATH_LENGTH);

    const prompt = cleanText(
        project.prompt || project.idea || '',
        12000
    );

    const title = cleanText(
        project.name || project.title || 'Quruvchi project',
        100
    );

    const errors = [];
    const warnings = [];
    const checks = [];

    // Basic source validation.

    checks.push(makeCheck(
        'source exists',
        source.trim().length > 0
    ));

    checks.push(makeCheck(
        'source size limit',
        source.length <= MAX_SOURCE_LENGTH
    ));

    checks.push(makeCheck(
        'minimum gameplay source',
        source.length >= 1000
    ));

    checks.push(makeCheck(
        'server script path',
        scriptPath.startsWith('ServerScriptService/')
    ));

    checks.push(makeCheck(
        'Luau source contains code',
        /\b(local|function|game|Instance|script)\b/.test(source)
    ));

    // Game type requirements.

    const typeRequirements = TYPE_REQUIREMENTS[kind] || TYPE_REQUIREMENTS.world;

    for (const [name, pattern] of typeRequirements) {
        checks.push(makeCheck(
            'game type: ' + name,
            testPattern(pattern, source)
        ));
    }

    // Feature requirements.

    const requestedFeatures = safeArray(project.features)
        .map(item => cleanText(item, 180))
        .filter(Boolean);

    const detectedFeatures = detectGameplayFeatures(prompt);

    const allFeatures = unique([
        ...detectedFeatures.map(item => item.id),
        ...requestedFeatures
    ]);

    const featureChecks = checkFeatureRequirements(
        detectedFeatures,
        source
    );

    checks.push(...featureChecks);

    // Architecture analysis.

    const sourceInfo = analyzeSource(source);

    // Security audit.

    const security = runSecurityAudit(source, scriptPath);

    for (const issue of security) {

        if (issue.ok) continue;

        if (issue.severity === 'error') {
            errors.push(issue.message);
        } else if (issue.severity === 'warning') {
            warnings.push(issue.message);
        }
    }

    for (const suspicious of sourceInfo.suspiciousPatterns) {

        if (suspicious.severity === 'error') {
            errors.push('Unsafe pattern: ' + suspicious.name);
        } else {
            warnings.push('Review required: ' + suspicious.name);
        }
    }

    // Missing requirements.

    const missing = checks
        .filter(item => !item.ok)
        .map(item => item.name);

    // Server-authority observations.

    if (sourceInfo.hasServerEvent && !sourceInfo.hasDebounce) {
        warnings.push(
            'RemoteEvent rate limiting or cooldown was not detected.'
        );
    }

    if (sourceInfo.hasDataStore && !sourceInfo.hasPcall) {
        warnings.push(
            'DataStore calls were found without a visible pcall wrapper.'
        );
    }

    if (!sourceInfo.hasCleanup) {
        warnings.push(
            'Explicit player cleanup or connection cleanup was not detected.'
        );
    }

    if (!sourceInfo.hasLeaderstats &&
        ['obby', 'simulator', 'tycoon'].includes(kind)) {
        warnings.push(
            'Leaderboard values should be reviewed.'
        );
    }

    if (!sourceInfo.blockCount.balanced) {
        warnings.push(
            'Luau block structure needs manual syntax review.'
        );
    }

    // QA score.

    const successfulChecks = checks.filter(item => item.ok).length;

    const score = checks.length > 0
        ? Math.round((successfulChecks / checks.length) * 100)
        : 0;

    const criticalErrors = errors.length > 0;

    const ok = missing.length === 0 && !criticalErrors;

    const architecture = buildArchitecture(
        source,
        kind,
        detectedFeatures
    );

    const systems = unique([
        ...(BASE_SYSTEMS[kind] || BASE_SYSTEMS.world),
        ...detectedFeatures.flatMap(item => item.systems),
        ...requestedFeatures
    ]);

    return {

        // Compatibility fields used by existing src/agent.js.

        agent: 'Gameplay Agent',
        kind,
        title,
        scriptPath,
        systems,
        checks,
        missing,
        ok,
        source,
        sourceLength: source.length,
        status: ok ? 'ready-for-studio' : 'needs-fix',

        note: ok
            ? 'Gameplay Agent V2 checks passed. Roblox Studio Play-test is still required.'
            : 'Gameplay implementation needs attention: ' +
                [...missing, ...errors].join(', '),

        // New V2 fields.

        version: VERSION,

        report: {
            score,
            passed: successfulChecks,
            failed: checks.length - successfulChecks,
            warnings: warnings.length,
            errors: errors.length
        },

        security: {
            checks: security,
            errors,
            warnings: unique(warnings)
        },

        sourceAnalysis: sourceInfo,

        architecture,

        detectedFeatures,

        generatedSpecification: createGameplaySpecification({
            kind,
            name: title,
            prompt,
            features: requestedFeatures
        }),

        studio: {
            required: true,
            executionVerified: false,
            playTestVerified: false,
            note: 'Static analysis cannot replace a real Roblox Studio Play-test.'
        },

        timestamp: new Date().toISOString()
    };
}

// ------------------------------------------------------------
// 15. QUICK PROJECT AUDIT
// ------------------------------------------------------------

export function auditGameplayProject(project = {}) {

    const result = buildGameplayPlan(project);

    return {
        agent: result.agent,
        version: result.version,
        ok: result.ok,
        status: result.status,
        score: result.report.score,
        checks: result.checks,
        security: result.security,
        warnings: result.security.warnings,
        errors: result.security.errors,
        missing: result.missing,
        nextActions: result.ok
            ? [
                'Send the script to Roblox Studio.',
                'Run the project.',
                'Check the Output window.',
                'Test multiplayer behavior.',
                'Confirm that rewards and progression are server-authoritative.'
            ]
            : [
                'Fix missing gameplay requirements.',
                'Review security warnings.',
                'Check the generated Luau syntax.',
                'Run the local test suite again.',
                'Re-run Gameplay Agent validation.'
            ]
    };
}

// ------------------------------------------------------------
// 16. AGENT HEALTH
// ------------------------------------------------------------

export function getGameplayAgentInfo() {

    return {
        name: 'Quruvchi MAX Gameplay Agent',
        version: VERSION,
        status: 'ready',
        runtime: 'Node.js ES Modules',
        output: 'Roblox Luau',
        gameTypes: Object.keys(GAME_TYPES),
        availableFeatures: Object.keys(FEATURE_DEFINITIONS),
        capabilities: [
            'Gameplay requirement detection',
            'Game type detection',
            'Server-side architecture planning',
            'Feature requirement validation',
            'Luau source analysis',
            'Security pattern detection',
            'Project architecture reporting',
            'Studio readiness reporting'
        ],
        limitations: [
            'Does not execute Roblox Luau inside Node.js.',
            'Does not independently connect to Roblox Studio.',
            'Static checks cannot guarantee runtime correctness.',
            'Actual Studio Play-test is required.'
        ]
    };
}

// ------------------------------------------------------------
// END OF QURUVCHI MAX GAMEPLAY AGENT V2
// ------------------------------------------------------------
