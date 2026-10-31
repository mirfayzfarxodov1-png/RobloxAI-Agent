
'use strict';

// ================================================================
// QURUVCHI MAX — WORLD GENERATOR AGENT V2
// File: src/agents/world/agent.js
// Architecture: Modular World Construction Engine
// Runtime: Node.js ES Modules
//
// PURPOSE:
// Generate complete Roblox worlds from natural-language prompts.
// Terrain, biomes, buildings, roads, vegetation, landmarks,
// lighting, spawn points, POIs, optimization and QA.
//
// OUTPUT:
// World Blueprint + Instance Tree + Terrain Operations + Luau.
//
// This module does not pretend to have executed Studio operations.
// The Roblox Studio plugin must execute the generated instructions.
// ================================================================

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
    maxParts: 12000,
    maxTerrainOperations: 5000,
    maxBuildings: 250,
    maxTrees: 2500,
    maxRoadSegments: 1500,
    maxPointsOfInterest: 200,
    maxDepth: 35,
    maxScripts: 100,
    maxSourceLength: 100000,
    maxCoordinate: 100000,
    maxText: 5000
});

// ================================================================
// 01. WORLD CONSTANTS
// ================================================================

const MATERIALS = Object.freeze({
    grass: 'Grass',
    ground: 'Ground',
    sand: 'Sand',
    rock: 'Rock',
    slate: 'Slate',
    snow: 'Snow',
    ice: 'Ice',
    water: 'Water',
    wood: 'Wood',
    concrete: 'Concrete',
    asphalt: 'Asphalt',
    cobblestone: 'Cobblestone',
    brick: 'Brick',
    granite: 'Granite',
    marble: 'Marble',
    metal: 'Metal',
    diamondPlate: 'DiamondPlate',
    basalt: 'Basalt',
    limestone: 'Limestone',
    leaf: 'LeafyGrass',
    mud: 'Mud'
});

const BIOMES = Object.freeze({
    forest: {
        name: 'Forest',
        ground: 'Grass',
        accent: 'Ground',
        vegetation: 'forest',
        water: true,
        atmosphere: {
            density: 0.28,
            color: '#A9C7A1',
            decay: '#547A55'
        },
        palette: {
            ground: '#477B42',
            accent: '#315C36',
            foliage: '#28723C',
            rock: '#77766B',
            water: '#378DAA',
            wood: '#65452E'
        }
    },

    desert: {
        name: 'Desert',
        ground: 'Sand',
        accent: 'Sandstone',
        vegetation: 'desert',
        water: false,
        atmosphere: {
            density: 0.18,
            color: '#E5BD86',
            decay: '#C58E57'
        },
        palette: {
            ground: '#D6B16E',
            accent: '#A77C4C',
            foliage: '#72874A',
            rock: '#8C7254',
            water: '#4297AC',
            wood: '#765234'
        }
    },

    snow: {
        name: 'Snow',
        ground: 'Snow',
        accent: 'Ice',
        vegetation: 'snow',
        water: true,
        atmosphere: {
            density: 0.3,
            color: '#D7E8F5',
            decay: '#8CA6BD'
        },
        palette: {
            ground: '#E8F1F8',
            accent: '#A9D8EC',
            foliage: '#577A70',
            rock: '#778591',
            water: '#79B9D7',
            wood: '#69584A'
        }
    },

    tropical: {
        name: 'Tropical',
        ground: 'Grass',
        accent: 'Sand',
        vegetation: 'tropical',
        water: true,
        atmosphere: {
            density: 0.16,
            color: '#A3D8D1',
            decay: '#398B78'
        },
        palette: {
            ground: '#46A65D',
            accent: '#E5D28D',
            foliage: '#168B54',
            rock: '#817E6D',
            water: '#22A9CF',
            wood: '#775033'
        }
    },

    volcanic: {
        name: 'Volcanic',
        ground: 'Basalt',
        accent: 'Rock',
        vegetation: 'none',
        water: false,
        atmosphere: {
            density: 0.42,
            color: '#80635D',
            decay: '#322321'
        },
        palette: {
            ground: '#343033',
            accent: '#5B4442',
            foliage: '#4C583C',
            rock: '#252327',
            water: '#E85A28',
            wood: '#45312A'
        }
    },

    fantasy: {
        name: 'Fantasy',
        ground: 'Grass',
        accent: 'Slate',
        vegetation: 'fantasy',
        water: true,
        atmosphere: {
            density: 0.3,
            color: '#B5A1E5',
            decay: '#62528D'
        },
        palette: {
            ground: '#586D62',
            accent: '#51466F',
            foliage: '#5B9C79',
            rock: '#77718E',
            water: '#8D83E8',
            wood: '#76518A'
        }
    },

    plains: {
        name: 'Plains',
        ground: 'Grass',
        accent: 'Ground',
        vegetation: 'plains',
        water: true,
        atmosphere: {
            density: 0.1,
            color: '#C7D8E5',
            decay: '#7B9A80'
        },
        palette: {
            ground: '#72A94F',
            accent: '#8C9B57',
            foliage: '#477D37',
            rock: '#817E75',
            water: '#479BC5',
            wood: '#805C3B'
        }
    }
});

const ARCHITECTURE_STYLES = Object.freeze({
    medieval: {
        wall: '#A99A82',
        roof: '#65443C',
        trim: '#4D342D',
        floor: '#8D785E',
        material: 'Stone'
    },
    modern: {
        wall: '#D9E0E8',
        roof: '#333E50',
        trim: '#687A91',
        floor: '#777F8B',
        material: 'Concrete'
    },
    wooden: {
        wall: '#A8784C',
        roof: '#503B2C',
        trim: '#65452E',
        floor: '#926C43',
        material: 'Wood'
    },
    fantasy: {
        wall: '#82749D',
        roof: '#403652',
        trim: '#D2B77D',
        floor: '#77658F',
        material: 'Slate'
    },
    industrial: {
        wall: '#68717B',
        roof: '#333A43',
        trim: '#D18A43',
        floor: '#555D66',
        material: 'Metal'
    }
});

// ================================================================
// 02. UTILITIES
// ================================================================

function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

function safeText(value, max = 300) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function safeName(value) {
    const result = safeText(value, 90)
        .replace(/[^a-zA-Z0-9_]/g, '');

    return result || 'WorldObject';
}

function isObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function unique(items) {
    return [...new Set(items)];
}

function randomId(prefix = 'WORLD') {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function position(x = 0, y = 0, z = 0) {
    return {
        x: clamp(x, -LIMITS.maxCoordinate, LIMITS.maxCoordinate),
        y: clamp(y, -LIMITS.maxCoordinate, LIMITS.maxCoordinate),
        z: clamp(z, -LIMITS.maxCoordinate, LIMITS.maxCoordinate)
    };
}

function size(x = 4, y = 4, z = 4) {
    return {
        x: clamp(x, 0.1, 2048),
        y: clamp(y, 0.1, 2048),
        z: clamp(z, 0.1, 2048)
    };
}

function hexToRGB(hex) {
    const value = safeText(hex, 20);

    if (!/^#[0-9A-F]{6}$/i.test(value)) {
        throw new Error(`Invalid color: ${value}`);
    }

    const number = parseInt(value.slice(1), 16);

    return {
        r: (number >> 16 & 255) / 255,
        g: (number >> 8 & 255) / 255,
        b: (number & 255) / 255
    };
}

function rgbToLuau(hex) {
    const c = hexToRGB(hex);

    return `Color3.fromRGB(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;
}

function materialName(value) {
    const material = safeText(value, 40);
    return MATERIALS[material] || material;
}

function assertFiniteVector(vector, label = 'Vector') {
    if (!isObject(vector)) {
        throw new Error(`${label} must be an object.`);
    }

    for (const axis of ['x', 'y', 'z']) {
        if (!Number.isFinite(Number(vector[axis]))) {
            throw new Error(`${label}.${axis} must be numeric.`);
        }
    }
}

// ================================================================
// 03. SEEDED RANDOM ENGINE
// ================================================================

export class RandomEngine {
    constructor(seed = 12345) {
        this.seed = Number(seed) >>> 0;
        if (!this.seed) this.seed = 1;
    }

    next() {
        this.seed = (1664525 * this.seed + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }

    integer(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    choose(items) {
        if (!items.length) return null;
        return items[this.integer(0, items.length - 1)];
    }

    chance(probability) {
        return this.next() < clamp(probability, 0, 1);
    }

    fork(offset = 1) {
        return new RandomEngine((this.seed + offset * 7919) >>> 0);
    }
}

// ================================================================
// 04. WORLD CONFIGURATION
// ================================================================

export function createWorldConfig(options = {}) {
    const worldSize = options.worldSize || {
        x: 1024,
        z: 1024
    };

    const config = {
        name: safeName(options.name || 'QuruvchiWorld'),
        seed: Number(options.seed) || 2026,
        biome: BIOMES[options.biome] ? options.biome : 'forest',

        worldSize: {
            x: clamp(worldSize.x, 128, 4096),
            z: clamp(worldSize.z, 128, 4096)
        },

        terrain: {
            enabled: options.terrain?.enabled !== false,
            resolution: clamp(
                options.terrain?.resolution || 32,
                8,
                128
            ),
            baseHeight: clamp(
                options.terrain?.baseHeight ?? 20,
                -500,
                500
            ),
            maxHeight: clamp(
                options.terrain?.maxHeight ?? 140,
                5,
                600
            ),
            roughness: clamp(
                options.terrain?.roughness ?? 0.45,
                0,
                1
            ),
            waterLevel: clamp(
                options.terrain?.waterLevel ?? 12,
                -100,
                300
            )
        },

        vegetation: {
            enabled: options.vegetation?.enabled !== false,
            density: clamp(
                options.vegetation?.density ?? 0.35,
                0,
                1
            ),
            trees: clamp(
                options.vegetation?.trees ?? 120,
                0,
                LIMITS.maxTrees
            ),
            rocks: clamp(
                options.vegetation?.rocks ?? 50,
                0,
                1000
            )
        },

        buildings: {
            enabled: options.buildings?.enabled !== false,
            count: clamp(
                options.buildings?.count ?? 8,
                0,
                LIMITS.maxBuildings
            ),
            style: ARCHITECTURE_STYLES[options.buildings?.style]
                ? options.buildings.style
                : 'medieval'
        },

        roads: {
            enabled: options.roads?.enabled !== false,
            width: clamp(options.roads?.width ?? 16, 4, 100),
            thickness: clamp(options.roads?.thickness ?? 2, 0.5, 20)
        },

        lighting: {
            timeOfDay: clamp(options.lighting?.timeOfDay ?? 14, 0, 24),
            brightness: clamp(options.lighting?.brightness ?? 2, 0, 10),
            shadows: options.lighting?.shadows !== false,
            atmosphere: options.lighting?.atmosphere !== false
        },

        optimization: {
            level: ['low', 'medium', 'high'].includes(
                options.optimization?.level
            ) ? options.optimization.level : 'medium',
            anchored: true,
            useTerrain: true
        },

        gameplay: {
            spawn: options.gameplay?.spawn !== false,
            safeZone: options.gameplay?.safeZone !== false,
            questLocations: options.gameplay?.questLocations !== false
        }
    };

    return config;
}

// ================================================================
// 05. WORLD BLUEPRINT
// ================================================================

export class WorldBlueprint {
    constructor(config) {
        this.id = randomId('WORLD');
        this.version = VERSION;
        this.config = config;
        this.folders = [];
        this.parts = [];
        this.terrainOperations = [];
        this.buildings = [];
        this.roads = [];
        this.vegetation = [];
        this.pointsOfInterest = [];
        this.spawnPoints = [];
        this.lighting = {};
        this.metadata = {
            createdAt: new Date().toISOString(),
            seed: config.seed
        };
    }

    addPart(part) {
        if (this.parts.length >= LIMITS.maxParts) {
            throw new Error('World part limit reached.');
        }

        this.parts.push(part);
        return part;
    }

    addTerrain(operation) {
        if (this.terrainOperations.length >= LIMITS.maxTerrainOperations) {
            throw new Error('Terrain operation limit reached.');
        }

        this.terrainOperations.push(operation);
        return operation;
    }

    addBuilding(building) {
        if (this.buildings.length >= LIMITS.maxBuildings) {
            throw new Error('Building limit reached.');
        }

        this.buildings.push(building);
        return building;
    }

    addRoad(road) {
        if (this.roads.length >= LIMITS.maxRoadSegments) {
            throw new Error('Road limit reached.');
        }

        this.roads.push(road);
        return road;
    }

    addVegetation(item) {
        if (this.vegetation.length >= LIMITS.maxTrees) {
            throw new Error('Vegetation limit reached.');
        }

        this.vegetation.push(item);
        return item;
    }

    addPOI(poi) {
        if (this.pointsOfInterest.length >= LIMITS.maxPointsOfInterest) {
            throw new Error('POI limit reached.');
        }

        this.pointsOfInterest.push(poi);
        return poi;
    }
}

// ================================================================
// 06. PART FACTORY
// ================================================================

export function createPart(options = {}) {
    const shape = ['Block', 'Ball', 'Cylinder', 'Wedge',
        'CornerWedge'].includes(options.shape)
        ? options.shape
        : 'Block';

    const part = {
        id: randomId('PART'),
        name: safeName(options.name || 'Part'),
        className: 'Part',
        shape,
        position: position(
            options.position?.x,
            options.position?.y,
            options.position?.z
        ),
        size: size(
            options.size?.x,
            options.size?.y,
            options.size?.z
        ),
        material: materialName(options.material || 'Grass'),
        color: options.color || '#777777',
        anchored: options.anchored !== false,
        canCollide: options.canCollide !== false,
        transparency: clamp(options.transparency ?? 0, 0, 1),
        reflectance: clamp(options.reflectance ?? 0, 0, 1),
        rotation: {
            x: clamp(options.rotation?.x ?? 0, -360, 360),
            y: clamp(options.rotation?.y ?? 0, -360, 360),
            z: clamp(options.rotation?.z ?? 0, -360, 360)
        },
        tags: asArray(options.tags).map(x => safeText(x, 50))
    };

    return part;
}

// ================================================================
// 07. TERRAIN ENGINE
// ================================================================

export class TerrainEngine {
    constructor(blueprint, random) {
        this.world = blueprint;
        this.random = random;
        this.config = blueprint.config;
    }

    addFillBlock(center, dimensions, material) {
        this.world.addTerrain({
            type: 'FillBlock',
            center: position(center.x, center.y, center.z),
            size: size(dimensions.x, dimensions.y, dimensions.z),
            material: materialName(material)
        });
    }

    addFillBall(center, radius, material) {
        this.world.addTerrain({
            type: 'FillBall',
            center: position(center.x, center.y, center.z),
            radius: clamp(radius, 1, 500),
            material: materialName(material)
        });
    }

    generateBase() {
        const c = this.config;
        const biome = BIOMES[c.biome];

        this.addFillBlock(
            position(0, c.terrain.baseHeight - 8, 0),
            size(c.worldSize.x, 16, c.worldSize.z),
            biome.ground
        );
    }

    generateHills(count = 24) {
        const c = this.config;
        const random = this.random.fork(2);

        for (let i = 0; i < count; i++) {
            const x = random.range(-c.worldSize.x / 2, c.worldSize.x / 2);
            const z = random.range(-c.worldSize.z / 2, c.worldSize.z / 2);
            const radius = random.range(25, 90);
            const height = random.range(20, c.terrain.maxHeight);

            this.addFillBall(
                position(x, c.terrain.baseHeight + height / 2, z),
                radius,
                BIOMES[c.biome].ground
            );
        }
    }

    generateMountain(positionValue, options = {}) {
        const center = positionValue;
        const radius = clamp(options.radius ?? 100, 20, 400);
        const height = clamp(options.height ?? 180, 20, 500);
        const steps = clamp(options.steps ?? 6, 2, 20);

        for (let i = 0; i < steps; i++) {
            const factor = 1 - i / steps;
            const currentRadius = radius * factor;
            const currentHeight = height / steps;

            this.addFillBall(
                position(
                    center.x,
                    center.y + i * currentHeight,
                    center.z
                ),
                currentRadius,
                options.material || 'Rock'
            );
        }
    }

    generateLake(center, options = {}) {
        const radius = clamp(options.radius ?? 70, 10, 300);
        const depth = clamp(options.depth ?? 12, 2, 80);
        const waterLevel = this.config.terrain.waterLevel;

        this.addFillBall(
            position(center.x, waterLevel - depth, center.z),
            radius,
            'Air'
        );

        this.addFillBall(
            position(center.x, waterLevel - 2, center.z),
            radius * 0.95,
            'Water'
        );
    }

    generateRiver(points, options = {}) {
        const width = clamp(options.width ?? 18, 4, 100);
        const depth = clamp(options.depth ?? 8, 2, 50);

        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];

            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const steps = Math.max(1, Math.ceil(distance / width));

            for (let step = 0; step <= steps; step++) {
                const t = step / steps;

                const x = a.x + dx * t;
                const z = a.z + dz * t;

                this.addFillBall(
                    position(x, this.config.terrain.waterLevel - depth, z),
                    width / 2,
                    'Air'
                );

                this.addFillBall(
                    position(x, this.config.terrain.waterLevel - 2, z),
                    width / 2,
                    'Water'
                );
            }
        }
    }

    generateCave(center, options = {}) {
        const radius = clamp(options.radius ?? 18, 5, 100);
        const length = clamp(options.length ?? 80, 10, 300);
        const segments = Math.ceil(length / radius);

        for (let i = 0; i < segments; i++) {
            this.addFillBall(
                position(
                    center.x + i * radius,
                    center.y,
                    center.z
                ),
                radius,
                'Air'
            );
        }
    }

    generateTerrain() {
        if (!this.config.terrain.enabled) return;

        this.generateBase();

        const area = this.config.worldSize.x * this.config.worldSize.z;
        const hillCount = clamp(
            Math.floor(area / 35000),
            8,
            120
        );

        if (['forest', 'plains', 'fantasy', 'snow'].includes(this.config.biome)) {
            this.generateHills(hillCount);
        }

        if (this.config.biome === 'mountain') {
            this.generateMountain(
                position(-180, 20, -180),
                { radius: 180, height: 260 }
            );
        }
    }
}

// ================================================================
// 08. BUILDING ENGINE
// ================================================================

export class BuildingEngine {
    constructor(blueprint, random) {
        this.world = blueprint;
        this.random = random;
        this.style = ARCHITECTURE_STYLES[
            blueprint.config.buildings.style
        ];
    }

    addBuildingPart(building, name, pos, dimensions, options = {}) {
        const part = createPart({
            name: `${building.name}_${name}`,
            position: pos,
            size: dimensions,
            material: options.material || 'Concrete',
            color: options.color || this.style.wall,
            shape: options.shape || 'Block',
            anchored: true,
            canCollide: options.canCollide !== false
        });

        building.parts.push(part);
        this.world.addPart(part);

        return part;
    }

    createHouse(options = {}) {
        const center = position(
            options.x ?? 0,
            options.y ?? 0,
            options.z ?? 0
        );

        const width = clamp(options.width ?? 30, 12, 120);
        const height = clamp(options.height ?? 18, 8, 100);
        const depth = clamp(options.depth ?? 28, 12, 120);

        const building = {
            id: randomId('BUILDING'),
            name: safeName(options.name || 'House'),
            type: 'house',
            position: center,
            parts: [],
            entrances: [],
            metadata: {
                style: this.world.config.buildings.style,
                dimensions: { width, height, depth }
            }
        };

        const wall = this.style.wall;
        const floor = this.style.floor;
        const roof = this.style.roof;

        // Foundation.
        this.addBuildingPart(
            building, 'Foundation',
            position(center.x, center.y + 1, center.z),
            size(width + 4, 2, depth + 4),
            { material: 'Concrete', color: floor }
        );

        // Floor.
        this.addBuildingPart(
            building, 'Floor',
            position(center.x, center.y + 3, center.z),
            size(width, 1, depth),
            { material: 'Wood', color: floor }
        );

        // Four walls.
        this.addBuildingPart(
            building, 'BackWall',
            position(center.x, center.y + height / 2, center.z - depth / 2),
            size(width, height, 2),
            { color: wall }
        );

        this.addBuildingPart(
            building, 'LeftWall',
            position(center.x - width / 2, center.y + height / 2, center.z),
            size(2, height, depth),
            { color: wall }
        );

        this.addBuildingPart(
            building, 'RightWall',
            position(center.x + width / 2, center.y + height / 2, center.z),
            size(2, height, depth),
            { color: wall }
        );

        // Front wall with a doorway gap.
        const sideWidth = Math.max(2, (width - 7) / 2);

        this.addBuildingPart(
            building, 'FrontLeft',
            position(center.x - (width - sideWidth) / 2, center.y + height / 2, center.z + depth / 2),
            size(sideWidth, height, 2),
            { color: wall }
        );

        this.addBuildingPart(
            building, 'FrontRight',
            position(center.x + (width - sideWidth) / 2, center.y + height / 2, center.z + depth / 2),
            size(sideWidth, height, 2),
            { color: wall }
        );

        this.addBuildingPart(
            building, 'FrontHeader',
            position(center.x, center.y + height - 2, center.z + depth / 2),
            size(7, 4, 2),
            { color: wall }
        );

        // Roof.
        this.addBuildingPart(
            building, 'Roof',
            position(center.x, center.y + height + 2, center.z),
            size(width + 6, 4, depth + 6),
            {
                material: 'Wood',
                color: roof
            }
        );

        // Door.
        this.addBuildingPart(
            building, 'Door',
            position(center.x, center.y + 7, center.z + depth / 2 + 1),
            size(5, 12, 1),
            {
                material: 'Wood',
                color: this.style.trim
            }
        );

        building.entrances.push(
            position(center.x, center.y + 3, center.z + depth / 2 + 4)
        );

        this.world.addBuilding(building);

        return building;
    }

    createTower(options = {}) {
        const center = position(
            options.x ?? 0,
            options.y ?? 0,
            options.z ?? 0
        );

        const radius = clamp(options.radius ?? 12, 5, 40);
        const height = clamp(options.height ?? 65, 20, 200);

        const building = {
            id: randomId('TOWER'),
            name: safeName(options.name || 'Tower'),
            type: 'tower',
            position: center,
            parts: [],
            metadata: {}
        };

        const segments = Math.ceil(height / 10);

        for (let i = 0; i < segments; i++) {
            const segmentHeight = height / segments;

            this.addBuildingPart(
                building,
                `TowerSegment${i}`,
                position(
                    center.x,
                    center.y + i * segmentHeight + segmentHeight / 2,
                    center.z
                ),
                size(radius * 2, segmentHeight, radius * 2),
                {
                    material: 'Stone',
                    color: this.style.wall
                }
            );
        }

        this.addBuildingPart(
            building,
            'TowerRoof',
            position(center.x, center.y + height + 5, center.z),
            size(radius * 2.5, 10, radius * 2.5),
            {
                material: 'Slate',
                color: this.style.roof
            }
        );

        this.world.addBuilding(building);

        return building;
    }

    createShop(options = {}) {
        return this.createHouse({
            ...options,
            name: options.name || 'Shop',
            width: options.width || 36,
            depth: options.depth || 30,
            height: options.height || 20
        });
    }

    generateSettlement(center, options = {}) {
        const count = clamp(options.count ?? 5, 1, 30);
        const spacing = clamp(options.spacing ?? 55, 20, 200);
        const created = [];

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const x = center.x + Math.cos(angle) * spacing;
            const z = center.z + Math.sin(angle) * spacing;

            created.push(this.createHouse({
                x,
                y: center.y,
                z,
                name: `SettlementHouse${i + 1}`
            }));
        }

        return created;
    }
}

// ================================================================
// 09. ROAD ENGINE
// ================================================================

export class RoadEngine {
    constructor(blueprint) {
        this.world = blueprint;
        this.config = blueprint.config.roads;
    }

    createSegment(a, b, options = {}) {
        assertFiniteVector(a, 'Road start');
        assertFiniteVector(b, 'Road end');

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 1) return null;

        const angle = Math.atan2(dx, dz) * 180 / Math.PI;

        const road = {
            id: randomId('ROAD'),
            start: position(a.x, a.y, a.z),
            end: position(b.x, b.y, b.z),
            center: position(
                (a.x + b.x) / 2,
                (a.y + b.y) / 2,
                (a.z + b.z) / 2
            ),
            length: distance,
            width: clamp(options.width ?? this.config.width, 4, 100),
            thickness: clamp(options.thickness ?? this.config.thickness, 0.5, 20),
            rotationY: angle,
            material: materialName(options.material || 'Cobblestone'),
            color: options.color || '#77736A'
        };

        this.world.addRoad(road);

        this.world.addPart(createPart({
            name: `Road_${road.id}`,
            position: road.center,
            size: size(road.width, road.thickness, distance),
            material: road.material,
            color: road.color,
            rotation: { y: angle },
            canCollide: true
        }));

        return road;
    }

    createPath(points, options = {}) {
        const roads = [];

        for (let i = 0; i < points.length - 1; i++) {
            const segment = this.createSegment(
                points[i],
                points[i + 1],
                options
            );

            if (segment) roads.push(segment);
        }

        return roads;
    }

    createCrossroads(center, options = {}) {
        const length = clamp(options.length ?? 120, 20, 500);
        const width = options.width || this.config.width;

        this.createPath([
            position(center.x - length / 2, center.y, center.z),
            position(center.x + length / 2, center.y, center.z)
        ], { width });

        this.createPath([
            position(center.x, center.y, center.z - length / 2),
            position(center.x, center.y, center.z + length / 2)
        ], { width });
    }
}

// ================================================================
// 10. VEGETATION ENGINE
// ================================================================

export class VegetationEngine {
    constructor(blueprint, random) {
        this.world = blueprint;
        this.random = random;
        this.biome = BIOMES[blueprint.config.biome];
    }

    createTree(x, y, z, options = {}) {
        const height = clamp(options.height ?? 20, 5, 80);
        const radius = clamp(options.radius ?? 4, 1, 20);

        const tree = {
            id: randomId('TREE'),
            name: safeName(options.name || 'Tree'),
            position: position(x, y, z),
            parts: []
        };

        const trunk = createPart({
            name: 'Trunk',
            position: position(x, y + height / 2, z),
            size: size(radius, height, radius),
            material: 'Wood',
            color: this.biome.palette.wood
        });

        const foliage = createPart({
            name: 'Foliage',
            shape: 'Ball',
            position: position(x, y + height + radius * 1.8, z),
            size: size(radius * 4, radius * 4, radius * 4),
            material: 'Grass',
            color: this.biome.palette.foliage,
            canCollide: false
        });

        tree.parts.push(trunk, foliage);

        this.world.addPart(trunk);
        this.world.addPart(foliage);
        this.world.addVegetation(tree);

        return tree;
    }

    createPalm(x, y, z) {
        const trunk = createPart({
            name: 'PalmTrunk',
            position: position(x, y + 15, z),
            size: size(3, 30, 3),
            material: 'Wood',
            color: '#86613A'
        });

        this.world.addPart(trunk);

        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;

            this.world.addPart(createPart({
                name: `PalmLeaf${i}`,
                position: position(
                    x + Math.cos(angle) * 8,
                    y + 29,
                    z + Math.sin(angle) * 8
                ),
                size: size(3, 2, 16),
                material: 'Grass',
                color: this.biome.palette.foliage,
                rotation: { y: angle * 180 / Math.PI },
                canCollide: false
            }));
        }
    }

    createRock(x, y, z, options = {}) {
        const radius = clamp(options.radius ?? 5, 1, 30);

        const rock = createPart({
            name: 'WorldRock',
            shape: options.shape || 'Ball',
            position: position(x, y + radius / 2, z),
            size: size(radius * 2, radius, radius * 1.5),
            material: 'Rock',
            color: this.biome.palette.rock
        });

        this.world.addPart(rock);
        return rock;
    }

    generateForest(center, options = {}) {
        const count = clamp(options.count ?? 100, 0, LIMITS.maxTrees);
        const radius = clamp(options.radius ?? 250, 20, 1500);

        for (let i = 0; i < count; i++) {
            const angle = this.random.range(0, Math.PI * 2);
            const distance = Math.sqrt(this.random.next()) * radius;

            const x = center.x + Math.cos(angle) * distance;
            const z = center.z + Math.sin(angle) * distance;

            if (this.biome.vegetation === 'tropical') {
                this.createPalm(x, center.y, z);
            } else {
                this.createTree(x, center.y, z, {
                    height: this.random.range(14, 28),
                    radius: this.random.range(2, 5)
                });
            }
        }
    }

    generateRocks(center, count = 30, radius = 300) {
        for (let i = 0; i < count; i++) {
            const angle = this.random.range(0, Math.PI * 2);
            const distance = this.random.range(0, radius);

            this.createRock(
                center.x + Math.cos(angle) * distance,
                center.y,
                center.z + Math.sin(angle) * distance
            );
        }
    }
}

// ================================================================
// 11. POI ENGINE
// ================================================================

export class POIEngine {
    constructor(blueprint) {
        this.world = blueprint;
    }

    createPOI(type, name, location, options = {}) {
        const poi = {
            id: randomId('POI'),
            type: safeName(type),
            name: safeText(name, 100),
            position: position(
                location.x,
                location.y,
                location.z
            ),
            radius: clamp(options.radius ?? 20, 2, 500),
            interactable: options.interactable === true,
            tags: asArray(options.tags),
            metadata: options.metadata || {}
        };

        this.world.addPOI(poi);
        return poi;
    }

    createSpawn(location, options = {}) {
        const spawn = {
            id: randomId('SPAWN'),
            name: safeName(options.name || 'PlayerSpawn'),
            position: position(
                location.x,
                location.y,
                location.z
            ),
            neutral: options.neutral !== false,
            enabled: true
        };

        this.world.spawnPoints.push(spawn);

        this.world.addPart(createPart({
            name: spawn.name,
            position: position(
                location.x,
                location.y + 1,
                location.z
            ),
            size: size(12, 1, 12),
            material: 'Neon',
            color: '#44D9A5',
            transparency: 0.2,
            canCollide: false
        }));

        return spawn;
    }

    createSafeZone(location, radius = 40) {
        return this.createPOI(
            'SafeZone',
            'SafeZone',
            location,
            {
                radius,
                tags: ['Safe', 'PlayerProtection']
            }
        );
    }

    createQuestPoint(location, name = 'QuestBoard') {
        return this.createPOI(
            'Quest',
            name,
            location,
            {
                radius: 15,
                interactable: true,
                tags: ['Quest', 'NPC']
            }
        );
    }

    createDungeon(location, name = 'Dungeon') {
        return this.createPOI(
            'Dungeon',
            name,
            location,
            {
                radius: 80,
                interactable: true,
                tags: ['Dungeon', 'Combat', 'Adventure']
            }
        );
    }
}

// ================================================================
// 12. LIGHTING ENGINE
// ================================================================

export class LightingEngine {
    constructor(blueprint) {
        this.world = blueprint;
    }

    configure(options = {}) {
        const biome = BIOMES[this.world.config.biome];

        this.world.lighting = {
            clockTime: clamp(
                options.timeOfDay ?? this.world.config.lighting.timeOfDay,
                0,
                24
            ),
            brightness: clamp(
                options.brightness ?? this.world.config.lighting.brightness,
                0,
                10
            ),
            globalShadows: options.shadows !== false,
            ambient: options.ambient || biome.palette.accent,
            outdoorAmbient: options.outdoorAmbient || biome.palette.ground,
            fogColor: biome.atmosphere.color,
            fogEnd: options.fogEnd ?? 1000,
            atmosphere: {
                enabled: this.world.config.lighting.atmosphere,
                density: biome.atmosphere.density,
                color: biome.atmosphere.color,
                decay: biome.atmosphere.decay
            }
        };

        return this.world.lighting;
    }
}

// ================================================================
// 13. WORLD GENERATION ORCHESTRATOR
// ================================================================

export function generateWorld(options = {}) {
    const config = createWorldConfig(options);
    const random = new RandomEngine(config.seed);
    const world = new WorldBlueprint(config);

    const terrain = new TerrainEngine(world, random.fork(1));
    const buildings = new BuildingEngine(world, random.fork(2));
    const roads = new RoadEngine(world);
    const vegetation = new VegetationEngine(world, random.fork(3));
    const poi = new POIEngine(world);
    const lighting = new LightingEngine(world);

    terrain.generateTerrain();

    const halfX = config.worldSize.x / 2;
    const halfZ = config.worldSize.z / 2;

    const center = position(0, config.terrain.baseHeight, 0);

    if (config.roads.enabled) {
        roads.createPath([
            position(-halfX * 0.8, center.y + 1, 0),
            position(-halfX * 0.35, center.y + 1, 0),
            position(0, center.y + 1, 0),
            position(halfX * 0.35, center.y + 1, 0),
            position(halfX * 0.8, center.y + 1, 0)
        ]);
    }

    if (config.buildings.enabled) {
        const count = config.buildings.count;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / Math.max(count, 1);
            const radius = 100 + (i % 3) * 45;

            buildings.createHouse({
                name: `WorldHouse${i + 1}`,
                x: Math.cos(angle) * radius,
                y: center.y,
                z: Math.sin(angle) * radius
            });
        }
    }

    if (config.vegetation.enabled) {
        const count = Math.floor(
            config.vegetation.trees * config.vegetation.density
        );

        vegetation.generateForest(
            position(0, center.y, 0),
            {
                count,
                radius: Math.min(halfX, halfZ) * 0.85
            }
        );

        vegetation.generateRocks(
            center,
            config.vegetation.rocks,
            Math.min(halfX, halfZ) * 0.9
        );
    }

    if (config.gameplay.spawn) {
        poi.createSpawn(
            position(0, center.y + 5, 0)
        );
    }

    if (config.gameplay.safeZone) {
        poi.createSafeZone(
            position(0, center.y, 0),
            45
        );
    }

    if (config.gameplay.questLocations) {
        poi.createQuestPoint(
            position(55, center.y + 2, 0)
        );
    }

    lighting.configure();

    world.metadata.statistics = {
        parts: world.parts.length,
        terrainOperations: world.terrainOperations.length,
        buildings: world.buildings.length,
        roads: world.roads.length,
        vegetation: world.vegetation.length,
        pointsOfInterest: world.pointsOfInterest.length,
        spawnPoints: world.spawnPoints.length
    };

    return world;
}

// ================================================================
// 14. WORLD VALIDATION ENGINE
// ================================================================

export function validateWorld(world) {
    const errors = [];
    const warnings = [];

    if (!world || !world.config) {
        return {
            valid: false,
            errors: ['Invalid world blueprint.'],
            warnings
        };
    }

    if (world.parts.length > LIMITS.maxParts) {
        errors.push('World part limit exceeded.');
    }

    if (world.terrainOperations.length > LIMITS.maxTerrainOperations) {
        errors.push('Terrain operation limit exceeded.');
    }

    const ids = new Set();

    for (const part of world.parts) {
        if (ids.has(part.id)) {
            errors.push(`Duplicate part ID: ${part.id}`);
        }

        ids.add(part.id);

        try {
            assertFiniteVector(part.position, part.name);
            assertFiniteVector(part.size, `${part.name} size`);
        } catch (error) {
            errors.push(error.message);
        }

        if (part.size.x <= 0 || part.size.y <= 0 || part.size.z <= 0) {
            errors.push(`${part.name}: invalid dimensions.`);
        }

        if (!part.anchored) {
            warnings.push(`${part.name}: unanchored world object.`);
        }

        try {
            hexToRGB(part.color);
        } catch {
            errors.push(`${part.name}: invalid color.`);
        }
    }

    if (!world.spawnPoints.length) {
        warnings.push('No player spawn point.');
    }

    if (!world.lighting.clockTime &&
        world.lighting.clockTime !== 0) {
        warnings.push('Lighting is not configured.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        statistics: world.metadata.statistics
    };
}

// ================================================================
// 15. WORLD OPTIMIZATION ENGINE
// ================================================================

export function optimizeWorld(world, options = {}) {
    const changes = [];
    const level = options.level ||
        world.config.optimization.level;

    const transparencyThreshold = level === 'high' ? 0.98 : 0.995;

    for (const part of world.parts) {
        if (part.transparency >= transparencyThreshold &&
            !part.canCollide) {
            changes.push({
                object: part.name,
                action: 'review-invisible-part',
                reason: 'Potential unnecessary invisible geometry.'
            });
        }

        part.anchored = true;
    }

    const recommendations = [];

    if (world.parts.length > 3000) {
        recommendations.push(
            'Consider combining static decorative geometry into reusable models.'
        );
    }

    if (world.vegetation.length > 500) {
        recommendations.push(
            'Consider distance-based vegetation spawning and streaming.'
        );
    }

    if (world.terrainOperations.length > 1000) {
        recommendations.push(
            'Batch terrain generation into smaller Studio tasks.'
        );
    }

    return {
        success: true,
        level,
        changes,
        recommendations,
        statistics: {
            parts: world.parts.length,
            terrainOperations: world.terrainOperations.length
        }
    };
}

// ================================================================
// 16. BIOME ENGINE
// ================================================================

export function getBiome(name) {
    const biome = BIOMES[name];

    if (!biome) {
        throw new Error(`Unknown biome: ${name}`);
    }

    return structuredClone(biome);
}

export function listBiomes() {
    return Object.keys(BIOMES).map(name => ({
        id: name,
        ...BIOMES[name]
    }));
}

// ================================================================
// 17. WORLD DESIGN INTERPRETER
// ================================================================

const WORLD_KEYWORDS = Object.freeze({
    forest: ['forest', 'o forest', 'orman', 'daraxtzor'],
    desert: ['desert', 'cho‘l', 'qumli', 'sahro'],
    snow: ['snow', 'qor', 'muzli', 'ice'],
    tropical: ['tropical', 'tropik', 'orol', 'jungle'],
    volcanic: ['volcanic', 'vulqon', 'lava'],
    fantasy: ['fantasy', 'sehrli', 'magic', 'fantastik'],
    plains: ['plains', 'dala', 'tekislik']
});

function detectBiome(prompt) {
    const normalized = prompt.toLowerCase();

    for (const [biome, words] of Object.entries(WORLD_KEYWORDS)) {
        if (words.some(word => normalized.includes(word))) {
            return biome;
        }
    }

    return 'forest';
}

function detectArchitecture(prompt) {
    const value = prompt.toLowerCase();

    if (/modern|zamonaviy/.test(value)) return 'modern';
    if (/wood|yog‘och|wooden/.test(value)) return 'wooden';
    if (/fantasy|sehrli/.test(value)) return 'fantasy';
    if (/industrial|zavod|sanoat/.test(value)) return 'industrial';

    return 'medieval';
}

function detectWorldFeatures(prompt) {
    const value = prompt.toLowerCase();

    return {
        mountains: /mountain|tog‘|toglar/.test(value),
        rivers: /river|daryo/.test(value),
        lakes: /lake|ko‘l/.test(value),
        caves: /cave|g‘or/.test(value),
        forest: /forest|o‘rmon/.test(value),
        village: /village|qishloq/.test(value),
        castle: /castle|qal’a|qorgon/.test(value),
        dungeon: /dungeon|zindon/.test(value),
        island: /island|orol/.test(value),
        city: /city|shahar/.test(value),
        roads: /road|yo‘l/.test(value)
    };
}

export function interpretWorldRequest(prompt) {
    const request = safeText(prompt, LIMITS.maxText);

    if (!request) {
        throw new Error('World description is required.');
    }

    return {
        request,
        biome: detectBiome(request),
        architecture: detectArchitecture(request),
        features: detectWorldFeatures(request),
        requirements: {
            terrain: true,
            structures: true,
            environment: true,
            lighting: true,
            spawn: true,
            optimization: true,
            qa: true
        }
    };
}

// ================================================================
// 18. WORLD FEATURE EXPANSION
// ================================================================

export function expandWorldFeatures(world, features = {}) {
    const random = new RandomEngine(world.config.seed + 50);
    const terrain = new TerrainEngine(world, random);
    const buildings = new BuildingEngine(world, random);
    const vegetation = new VegetationEngine(world, random);
    const roads = new RoadEngine(world);
    const poi = new POIEngine(world);

    const center = position(
        0,
        world.config.terrain.baseHeight,
        0
    );

    if (features.mountains) {
        terrain.generateMountain(
            position(-250, center.y, -200),
            { radius: 120, height: 220 }
        );

        terrain.generateMountain(
            position(250, center.y, 220),
            { radius: 90, height: 170 }
        );
    }

    if (features.lakes) {
        terrain.generateLake(
            position(220, center.y, -180),
            { radius: 80, depth: 16 }
        );
    }

    if (features.rivers) {
        terrain.generateRiver([
            position(-400, center.y, -250),
            position(-200, center.y, -100),
            position(0, center.y, 0),
            position(180, center.y, 130),
            position(400, center.y, 300)
        ]);
    }

    if (features.caves) {
        terrain.generateCave(
            position(-300, center.y - 20, 100),
            { radius: 20, length: 100 }
        );
    }

    if (features.village) {
        buildings.generateSettlement(
            position(180, center.y, 100),
            { count: 8, spacing: 65 }
        );
    }

    if (features.castle) {
        buildings.createTower({
            name: 'CastleTower',
            x: -180,
            y: center.y,
            z: -150,
            height: 100,
            radius: 15
        });

        buildings.createHouse({
            name: 'CastleHall',
            x: -180,
            y: center.y,
            z: -190,
            width: 80,
            height: 35,
            depth: 65
        });
    }

    if (features.dungeon) {
        poi.createDungeon(
            position(320, center.y, 200),
            'AncientDungeon'
        );
    }

    if (features.roads) {
        roads.createCrossroads(center, {
            length: 300
        });
    }

    if (features.forest) {
        vegetation.generateForest(center, {
            count: 100,
            radius: 300
        });
    }

    if (features.island) {
        terrain.generateLake(
            position(0, center.y, 0),
            { radius: 240, depth: 30 }
        );

        terrain.generateMountain(
            position(0, center.y + 10, 0),
            { radius: 110, height: 90 }
        );
    }

    return world;
}

// ================================================================
// 19. WORLD TREE SERIALIZER
// ================================================================

export function createWorldInstanceTree(world) {
    const folders = [];

    folders.push({
        name: 'QuruvchiWorld',
        className: 'Folder',
        children: [
            {
                name: 'Environment',
                className: 'Folder',
                children: world.parts.map(part => ({
                    name: part.name,
                    className: 'Part',
                    properties: {
                        Position: part.position,
                        Size: part.size,
                        Color: part.color,
                        Material: part.material,
                        Anchored: true,
                        CanCollide: part.canCollide,
                        Transparency: part.transparency,
                        Shape: part.shape,
                        Rotation: part.rotation
                    }
                }))
            },
            {
                name: 'PointsOfInterest',
                className: 'Folder',
                children: world.pointsOfInterest.map(poi => ({
                    name: poi.name,
                    className: 'Folder',
                    properties: {
                        Position: poi.position,
                        Radius: poi.radius,
                        Type: poi.type
                    },
                    children: []
                }))
            },
            {
                name: 'Spawns',
                className: 'Folder',
                children: world.spawnPoints.map(spawn => ({
                    name: spawn.name,
                    className: 'SpawnLocation',
                    properties: {
                        Position: spawn.position,
                        Neutral: spawn.neutral,
                        Enabled: spawn.enabled
                    }
                }))
            }
        ]
    });

    return {
        name: world.config.name,
        className: 'Workspace',
        children: folders
    };
}

// ================================================================
// 20. LUAU SOURCE GENERATOR
// ================================================================

function luauQuote(value) {
    return JSON.stringify(String(value ?? ''));
}

function vector3Luau(value) {
    return `Vector3.new(${value.x}, ${value.y}, ${value.z})`;
}

function colorLuau(value) {
    return rgbToLuau(value);
}

function enumMaterial(value) {
    const allowed = [
        'Grass', 'Ground', 'Sand', 'Rock', 'Slate',
        'Snow', 'Ice', 'Water', 'Wood', 'Concrete',
        'Asphalt', 'Cobblestone', 'Brick', 'Granite',
        'Marble', 'Metal', 'DiamondPlate', 'Basalt',
        'Limestone', 'LeafyGrass', 'Mud'
    ];

    const material = materialName(value);

    if (!allowed.includes(material)) {
        throw new Error(`Unsupported material: ${material}`);
    }

    return `Enum.Material.${material}`;
}

export function generateWorldLuau(world, options = {}) {
    const validation = validateWorld(world);

    if (!validation.valid) {
        throw new Error(
            `World validation failed: ${validation.errors.join('; ')}`
        );
    }

    const batchSize = clamp(options.batchSize ?? 150, 10, 500);

    const lines = [
        '-- ====================================================',
        '-- QURUVCHI MAX WORLD GENERATOR V2',
        '-- Generated Roblox Studio world construction script',
        '-- Review and execute through authorized Studio plugin.',
        '-- ====================================================',
        '',
        'local Workspace = game:GetService("Workspace")',
        'local Lighting = game:GetService("Lighting")',
        '',
        'local root = Workspace:FindFirstChild("QuruvchiWorld")',
        'if root then root:Destroy() end',
        '',
        'root = Instance.new("Folder")',
        'root.Name = "QuruvchiWorld"',
        'root.Parent = Workspace',
        '',
        'local environment = Instance.new("Folder")',
        'environment.Name = "Environment"',
        'environment.Parent = root',
        '',
        'local function createPart(data)',
        '    local part = Instance.new("Part")',
        '    part.Name = data.name',
        '    part.Size = data.size',
        '    part.Position = data.position',
        '    part.Color = data.color',
        '    part.Material = data.material',
        '    part.Anchored = true',
        '    part.CanCollide = data.canCollide',
        '    part.Transparency = data.transparency',
        '    part.Parent = environment',
        '    return part',
        'end',
        '',
        'local function buildBatch(batch)',
        '    for _, data in ipairs(batch) do',
        '        createPart(data)',
        '    end',
        'end',
        ''
    ];

    const parts = world.parts;

    for (let start = 0; start < parts.length; start += batchSize) {
        const batch = parts.slice(start, start + batchSize);

        lines.push(`-- World batch ${Math.floor(start / batchSize) + 1}`);
        lines.push('buildBatch({');

        for (const part of batch) {
            lines.push('    {');
            lines.push(`        name = ${luauQuote(part.name)},`);
            lines.push(`        size = ${vector3Luau(part.size)},`);
            lines.push(`        position = ${vector3Luau(part.position)},`);
            lines.push(`        color = ${colorLuau(part.color)},`);
            lines.push(`        material = ${enumMaterial(part.material)},`);
            lines.push(`        canCollide = ${part.canCollide ? 'true' : 'false'},`);
            lines.push(`        transparency = ${part.transparency}`);
            lines.push('    },');
        }

        lines.push('})');
        lines.push('');
    }

    // Terrain operations.
    if (world.terrainOperations.length) {
        lines.push('-- Terrain generation');
        lines.push('local terrain = Workspace.Terrain');

        for (const operation of world.terrainOperations) {
            if (operation.type === 'FillBlock') {
                lines.push(
                    `terrain:FillBlock(CFrame.new(${vector3Luau(operation.center).slice(13, -1)}), ${vector3Lu(operation.size)}, ${enumMaterial(operation.material)})`
                );
            } else if (operation.type === 'FillBall') {
                if (operation.material === 'Air') {
                    lines.push(
                        `terrain:FillBall(${vector3Lu(operation.center)}, ${operation.radius}, Enum.Material.Air)`
                    );
                } else {
                    lines.push(
                        `terrain:FillBall(${vector3Lu(operation.center)}, ${operation.radius}, ${enumMaterial(operation.material)})`
                    );
                }
            }
        }

        lines.push('');
    }

    // Spawn points.
    lines.push('-- Player spawn locations');

    for (const spawn of world.spawnPoints) {
        lines.push('do');
        lines.push('    local spawn = Instance.new("SpawnLocation")');
        lines.push(`    spawn.Name = ${luauQuote(spawn.name)}`);
        lines.push(`    spawn.Position = ${vector3Luau(spawn.position)}`);
        lines.push('    spawn.Size = Vector3.new(12, 1, 12)');
        lines.push('    spawn.Anchored = true');
        lines.push(`    spawn.Neutral = ${spawn.neutral ? 'true' : 'false'}`);
        lines.push('    spawn.Parent = root');
        lines.push('end');
    }

    // Lighting.
    if (world.lighting.clockTime !== undefined) {
        lines.push('');
        lines.push('-- World lighting');
        lines.push(`Lighting.ClockTime = ${world.lighting.clockTime}`);
        lines.push(`Lighting.Brightness = ${world.lighting.brightness}`);
        lines.push(`Lighting.GlobalShadows = ${world.lighting.globalShadows}`);
        lines.push(`Lighting.FogColor = ${colorLuau(world.lighting.fogColor)}`);
        lines.push(`Lighting.FogEnd = ${world.lighting.fogEnd}`);
    }

    lines.push('');
    lines.push('print("[Quruvchi MAX] World construction completed.")');
    lines.push('return root');

    const source = lines.join('\n');

    if (source.length > LIMITS.maxSourceLength) {
        throw new Error(
            'World Luau source exceeds configured limit. Split into multiple Studio tasks.'
        );
    }

    return {
        source,
        length: source.length,
        partCount: parts.length,
        terrainOperations: world.terrainOperations.length,
        batches: Math.ceil(parts.length / batchSize),
        target: 'Studio Plugin execution',
        requiresPlugin: true
    };
}

// ================================================================
// 21. WORLD QUALITY ASSURANCE
// ================================================================

export function runWorldQA(world) {
    const validation = validateWorld(world);
    const issues = [...validation.warnings];

    const worldArea =
        world.config.worldSize.x * world.config.worldSize.z;

    if (!world.spawnPoints.length) {
        issues.push('Spawn point missing.');
    }

    if (world.parts.length === 0) {
        issues.push('World contains no parts.');
    }

    if (world.parts.length > 3000) {
        issues.push('High part count: review performance.');
    }

    if (world.vegetation.length > 1000) {
        issues.push('High vegetation count: consider streaming.');
    }

    if (world.roads.length === 0) {
        issues.push('No road network found.');
    }

    if (world.buildings.length === 0) {
        issues.push('No buildings found.');
    }

    if (worldArea < 128 * 128) {
        issues.push('World playable area is very small.');
    }

    return {
        agent: 'Quruvchi MAX World QA',
        passed: validation.valid,
        status: validation.valid
            ? issues.length
                ? 'passed-with-warnings'
                : 'passed'
            : 'failed',
        score: Math.max(
            0,
            100 - validation.errors.length * 20 - issues.length * 3
        ),
        errors: validation.errors,
        warnings: issues,
        statistics: {
            ...world.metadata.statistics,
            worldArea
        },
        checks: {
            terrain: world.terrainOperations.length > 0,
            spawn: world.spawnPoints.length > 0,
            buildings: world.buildings.length > 0,
            lighting: world.lighting.clockTime !== undefined,
            partsValid: validation.valid
        }
    };
}

// ================================================================
// 22. COMPLETE WORLD PROJECT
// ================================================================

export function generateWorldProject(options = {}) {
    const interpretation = options.prompt
        ? interpretWorldRequest(options.prompt)
        : null;

    const merged = {
        ...options,
        biome: options.biome || interpretation?.biome || 'forest',
        buildings: {
            style: options.buildings?.style ||
                interpretation?.architecture ||
                'medieval',
            ...options.buildings
        }
    };

    const world = generateWorld(merged);

    if (interpretation) {
        expandWorldFeatures(
            world,
            interpretation.features
        );
    }

    const optimization = optimizeWorld(world);
    const qa = runWorldQA(world);

    if (!qa.passed) {
        return {
            success: false,
            status: 'qa-failed',
            world,
            qa,
            optimization
        };
    }

    const luau = generateWorldLuau(world);

    return {
        success: true,
        status: 'generated',
        agent: 'Quruvchi MAX World Generator',
        version: VERSION,
        world: {
            id: world.id,
            name: world.config.name,
            biome: world.config.biome,
            config: world.config,
            statistics: world.metadata.statistics,
            instanceTree: createWorldInstanceTree(world),
            blueprint: world
        },
        output: {
            luau: luau.source,
            sourceLength: luau.length,
            batches: luau.batches,
            partCount: luau.partCount,
            terrainOperations: luau.terrainOperations
        },
        optimization,
        qa,
        studio: {
            connected: false,
            executed: false,
            requiresPlugin: true,
            requiresPlaytest: true
        }
    };
}

// ================================================================
// 23. WORLD IMPROVEMENT ENGINE
// ================================================================

export function improveWorld(world, instructions = {}) {
    if (!world || !world.config) {
        throw new Error('Valid world is required.');
    }

    const changes = [];
    const prompt = safeText(instructions.prompt || '', 2000);

    if (/more trees|ko‘proq daraxt|daraxt qo‘sh/i.test(prompt)) {
        const engine = new VegetationEngine(
            world,
            new RandomEngine(world.config.seed + 200)
        );

        engine.generateForest(
            position(0, world.config.terrain.baseHeight, 0),
            {
                count: 100,
                radius: 300
            }
        );

        changes.push('Added forest vegetation.');
    }

    if (/more buildings|ko‘proq uy|binolar qo‘sh/i.test(prompt)) {
        const engine = new BuildingEngine(
            world,
            new RandomEngine(world.config.seed + 300)
        );

        engine.generateSettlement(
            position(180, world.config.terrain.baseHeight, 100),
            { count: 5 }
        );

        changes.push('Added settlement buildings.');
    }

    if (/mountain|tog‘ qo‘sh/i.test(prompt)) {
        const engine = new TerrainEngine(
            world,
            new RandomEngine(world.config.seed + 400)
        );

        engine.generateMountain(
            position(-250, 10, -250),
            { radius: 100, height: 200 }
        );

        changes.push('Added mountain terrain.');
    }

    return {
        success: true,
        changes,
        world,
        qa: runWorldQA(world)
    };
}

// ================================================================
// 24. AGENT TASK HANDLER
// ================================================================

export function handleWorldTask(task = {}) {
    const prompt = safeText(
        task.prompt || task.description,
        LIMITS.maxText
    );

    if (!prompt) {
        return {
            success: false,
            status: 'blocked',
            error: 'World prompt is required.'
        };
    }

    try {
        const interpretation = interpretWorldRequest(prompt);

        const project = generateWorldProject({
            ...task,
            prompt,
            biome: task.biome || interpretation.biome,
            buildings: {
                ...task.buildings,
                style: task.buildings?.style ||
                    interpretation.architecture
            }
        });

        return {
            success: project.success,
            taskId: randomId('WORLDTASK'),
            agent: 'Quruvchi MAX World Generator',
            interpretation,
            project,
            nextActions: [
                'Validate the generated world blueprint.',
                'Create the world folders in Studio.',
                'Generate terrain in controlled batches.',
                'Create structures and environment objects.',
                'Configure lighting and atmosphere.',
                'Check spawn and gameplay locations.',
                'Run QA and Studio play-test.',
                'Save the completed project.'
            ],
            execution: {
                studioConnected: false,
                worldCreated: false,
                terrainCreated: false,
                playtestCompleted: false,
                requiresPlugin: true
            }
        };
    } catch (error) {
        return {
            success: false,
            status: 'generation-failed',
            error: safeText(error.message, 1000)
        };
    }
}

// ================================================================
// 25. WORLD AGENT INFORMATION
// ================================================================

export function getWorldAgentInfo() {
    return {
        name: 'Quruvchi MAX World Generator',
        version: VERSION,
        status: 'ready',
        role: 'Complete Roblox world generation',
        engines: [
            'World Architect',
            'Terrain Engine',
            'Biome Engine',
            'Building Engine',
            'Road Engine',
            'Vegetation Engine',
            'POI Engine',
            'Lighting Engine',
            'Optimization Engine',
            'World QA',
            'Improvement Engine',
            'Luau Generator'
        ],
        supportedBiomes: Object.keys(BIOMES),
        architectureStyles: Object.keys(ARCHITECTURE_STYLES),
        limits: LIMITS,
        outputs: [
            'World Blueprint',
            'Instance Tree',
            'Terrain Operations',
            'Luau Source',
            'World QA Report',
            'Optimization Report'
        ],
        integrations: [
            'UI Agent',
            'Gameplay Agent',
            'Tool Scout',
            'QA Agent',
            'Roblox Studio Plugin'
        ]
    };
}


/** Free Builder scene-tree compatibility API backed by the native World Agent. */
export function buildWorldScene(options = {}) {
    const prompt = safeText(options.prompt || options.title || 'Roblox world', LIMITS.maxText);
    const kind = ['obby', 'simulator', 'tycoon', 'world'].includes(options.kind) ? options.kind : 'world';
    const title = safeText(options.title || 'Quruvchi Game', 100).replace(/[\r\n]+/g, ' ');
    const counts = options.counts || {};
    const stages = Math.round(clamp(counts.stages ?? 30, 1, 100));
    const collectibles = Math.round(clamp(counts.collectibles ?? 30, 1, 250));
    const plots = Math.round(clamp(counts.plots ?? 4, 1, 24));
    const theme = /space|cosmic|cosmos|kosmos|galaxy|galaktika/i.test(prompt) ? 'space' : detectBiome(prompt);
    const nativeBiome = theme === 'space' ? 'fantasy' : theme;
    // Build the native blueprint and serialize its hierarchy directly.
    // The Free Builder only needs the tree here; Luau generation is handled
    // by the gameplay builder and must not block on unrelated material checks.
    const world = generateWorld({ name: 'QuruvchiFreeWorld', prompt, biome: nativeBiome, seed: 2026,
        worldSize: { x: 1024, z: 1024 }, buildings: { count: 8 }, vegetation: { trees: 80, density: 0.25 } });
    const nativeTree = createWorldInstanceTree(world);
    const children = nativeTree.children.map(node => ({ ...node }));
    const part = (name, x, z, attributes = {}) => ({ name, className: 'Part',
        properties: { Position: { Vector3: [x, 4, z] }, Size: { Vector3: [8, 1, 8] }, Anchored: true }, attributes });
    const folder = (name, nodes = []) => ({ name, className: 'Folder', children: nodes });
    children.push(folder('WorldZones', Array.from({ length: 4 }, (_, i) => ({
        name: 'WorldZone' + (i + 1), className: 'Model', children: [part('ZoneMarker' + (i + 1), i * 120, 0)]
    }))));
    children.push(folder('WorldProps', [part('WorldCenterMarker', 0, 0)]));
    children.push(folder('WorldRoutes', [part('MainRouteStart', -300, 0), part('MainRouteEnd', 300, 0)]));
    const portalNodes = /portal|teleport|darvoza/i.test(prompt) ? [1, 2, 3].map(i => part('WorldPortal' + i, i * 35, -60)) : [];
    children.push(folder('WorldPortals', portalNodes));
    children.push(folder('WorldBuildings', [part('WorldLandmark', 80, 80)]));
    children.push(folder('InteractionPoints', [part('WorldInteractionPoint', 12, 12)]));
    if (/forest|o‘rmon|orman|daraxt/i.test(prompt)) children.push(folder('ThemeDressing', [part('ForestThemeMarker', 24, 24)]));
    if (kind === 'obby') {
        const nodes = [
            { name: 'StartSpawn', className: 'SpawnLocation', properties: { Position: { Vector3: [0, 3, 0] }, Size: { Vector3: [14, 1, 14] }, Anchored: true } }
        ];
        children.push({ name: 'StartSpawn', className: 'SpawnLocation', properties: { Position: { Vector3: [0, 3, 0] }, Size: { Vector3: [14, 1, 14] }, Anchored: true } });
        for (let i = 1; i <= stages; i++) {
            const row = Math.floor((i - 1) / 6), col = (i - 1) % 6;
            const platform = part('JumpPlatform' + i, (row % 2 ? 5 - col : col) * 18, (row + 1) * 20, { Stage: i });
            nodes.push(platform);
            children.push(platform);
            if (i % 5 === 0) {
                const checkpoint = part('Checkpoint' + i, (row % 2 ? 5 - col : col) * 18, (row + 1) * 20, { CheckpointIndex: i });
                nodes.push(checkpoint);
                children.push(checkpoint);
            }
            if (i === 3) { const stageMarker = part('StageMarker3', 36, 20); nodes.push(stageMarker); children.push(stageMarker); }
        }
        nodes.push(part('FinishPlatform', 0, (Math.ceil(stages / 6) + 1) * 20), part('SideRailLeft', -12, 30), part('SideRailRight', 102, 30));
        children.push(part('SideRailLeft', -12, 30), part('SideRailRight', 102, 30));
        children.push(folder('ObbyCourse', nodes));
    } else if (kind === 'simulator') {
        children.push(folder('Collectibles', Array.from({ length: collectibles }, (_, i) => part('Collectible_' + (i + 1), (i % 15) * 12, Math.floor(i / 15) * 12))));
    } else if (kind === 'tycoon') {
        children.push(folder('TycoonPlots', Array.from({ length: plots }, (_, i) => ({
            name: 'Plot_' + (i + 1), className: 'Model', children: [part('ClaimPad_' + (i + 1), i * 55, 0)]
        }))));
    }
    return { name: 'QuruvchiFreeWorld', className: 'Folder',
        attributes: { GameKind: kind, ProjectTitle: title, WorldTheme: theme }, children };
}

// ================================================================
// 26. DEFAULT EXPORT
// ================================================================

const WorldAgent = Object.freeze({
    version: VERSION,
    getInfo: getWorldAgentInfo,
    createConfig: createWorldConfig,
    generate: generateWorld,
    generateProject: generateWorldProject,
    interpret: interpretWorldRequest,
    expandFeatures: expandWorldFeatures,
    createPart,
    createInstanceTree: createWorldInstanceTree,
    generateLuau: generateWorldLuau,
    validate: validateWorld,
    optimize: optimizeWorld,
    qa: runWorldQA,
    improve: improveWorld,
    handleTask: handleWorldTask,
    getBiome,
    listBiomes,
    RandomEngine,
    WorldBlueprint,
    TerrainEngine,
    BuildingEngine,
    RoadEngine,
    VegetationEngine,
    POIEngine,
    LightingEngine
});

export default WorldAgent;

// ================================================================
// END — QURUVCHI MAX WORLD GENERATOR V2
// ================================================================
