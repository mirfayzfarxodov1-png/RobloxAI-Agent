
'use strict';

// ============================================================
// QURUVCHI MAX — CORE UI AGENT V2
// File: src/agents/ui/agent.js
// Runtime: Node.js ES Modules
//
// PURPOSE:
// Complete Roblox UI planning, generation, improvement,
// responsive layout, theme design, animation planning,
// hierarchy construction and UI quality assurance.
//
// OUTPUT:
// Structured Roblox Instance Tree + Luau source + QA report.
//
// IMPORTANT:
// This agent generates UI specifications and Luau code.
// Actual Studio creation requires the Studio plugin dispatcher.
// ============================================================

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
    maxNodes: 1500,
    maxDepth: 35,
    maxTextLength: 10000,
    maxChildren: 300,
    maxScripts: 100,
    maxAnimationDuration: 5,
    maxNameLength: 100
});

// ------------------------------------------------------------
// 1. UI CONSTANTS
// ------------------------------------------------------------

const INSTANCE_TYPES = new Set([
    'ScreenGui',
    'Folder',
    'Frame',
    'ScrollingFrame',
    'CanvasGroup',
    'TextLabel',
    'TextButton',
    'TextBox',
    'ImageLabel',
    'ImageButton',
    'ViewportFrame',
    'VideoFrame',
    'UIListLayout',
    'UIGridLayout',
    'UIPadding',
    'UICorner',
    'UIStroke',
    'UIGradient',
    'UIScale',
    'UIAspectRatioConstraint',
    'UITextSizeConstraint',
    'UIFlexItem',
    'UIPageLayout',
    'UITableLayout',
    'UICardLayout',
    'Frame',
    'BlurEffect'
]);

const THEMES = Object.freeze({
    midnight: {
        background: '#090B14',
        surface: '#151A29',
        surfaceSecondary: '#20283B',
        primary: '#8175FF',
        secondary: '#40C9FF',
        accent: '#B69AFF',
        text: '#F5F6FF',
        muted: '#929BB2',
        success: '#45D6A0',
        danger: '#FF617C',
        warning: '#FFCA70',
        border: '#303A52'
    },
    ocean: {
        background: '#071923',
        surface: '#102B3A',
        surfaceSecondary: '#174253',
        primary: '#25B8D6',
        secondary: '#4CE0C1',
        accent: '#8BE9FF',
        text: '#F2FCFF',
        muted: '#9CBAC5',
        success: '#4BD7A2',
        danger: '#FF6B78',
        warning: '#FFC66E',
        border: '#285367'
    },
    fantasy: {
        background: '#130D24',
        surface: '#24173B',
        surfaceSecondary: '#35234F',
        primary: '#A66CFF',
        secondary: '#F06CDA',
        accent: '#FFD58B',
        text: '#FFF8FF',
        muted: '#B9A9D0',
        success: '#69E3AD',
        danger: '#FF6D91',
        warning: '#FFCE75',
        border: '#51366E'
    },
    minimalist: {
        background: '#101114',
        surface: '#1D2026',
        surfaceSecondary: '#292D35',
        primary: '#E5E7EB',
        secondary: '#9CA3AF',
        accent: '#FFFFFF',
        text: '#FFFFFF',
        muted: '#A1A1AA',
        success: '#6BD5A4',
        danger: '#FF7777',
        warning: '#F7C66A',
        border: '#414650'
    },
    vibrant: {
        background: '#100B21',
        surface: '#20173B',
        surfaceSecondary: '#302250',
        primary: '#FF5FC8',
        secondary: '#45C9FF',
        accent: '#FFE16D',
        text: '#FFFFFF',
        muted: '#B4A6D0',
        success: '#4EE3A8',
        danger: '#FF637E',
        warning: '#FFD36D',
        border: '#503A75'
    }
});

const PRESETS = Object.freeze({
    'main-menu': {
        name: 'MainMenu',
        description: 'Professional game main menu',
        layout: 'center',
        components: [
            'background',
            'game-title',
            'subtitle',
            'play-button',
            'settings-button',
            'credits-button'
        ]
    },
    'game-hud': {
        name: 'GameHUD',
        description: 'Gameplay heads-up display',
        layout: 'screen',
        components: [
            'health-bar',
            'level-display',
            'currency-display',
            'xp-bar',
            'settings-button'
        ]
    },
    inventory: {
        name: 'Inventory',
        description: 'Responsive inventory window',
        layout: 'grid',
        components: [
            'title',
            'close-button',
            'item-grid',
            'item-details',
            'equip-button'
        ]
    },
    shop: {
        name: 'Shop',
        description: 'Game shop with item cards',
        layout: 'grid',
        components: [
            'title',
            'close-button',
            'category-tabs',
            'item-grid',
            'purchase-button'
        ]
    },
    settings: {
        name: 'Settings',
        description: 'Game settings interface',
        layout: 'vertical',
        components: [
            'title',
            'close-button',
            'music-toggle',
            'sound-toggle',
            'graphics-selector',
            'save-button'
        ]
    },
    leaderboard: {
        name: 'Leaderboard',
        description: 'Player ranking interface',
        layout: 'vertical',
        components: [
            'title',
            'ranking-list',
            'player-rank'
        ]
    },
    loading: {
        name: 'LoadingScreen',
        description: 'Game loading interface',
        layout: 'center',
        components: [
            'game-title',
            'loading-progress',
            'loading-status'
        ]
    }
});

// ------------------------------------------------------------
// 2. GENERAL HELPERS
// ------------------------------------------------------------

function text(value, max = 500) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) return min;

    return Math.max(min, Math.min(max, number));
}

function isObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function hexToColor3(hex) {
    const value = text(hex, 20);

    if (!/^#[0-9A-F]{6}$/i.test(value)) {
        throw new Error(`Invalid HEX color: ${value}`);
    }

    const number = parseInt(value.slice(1), 16);

    return {
        r: ((number >> 16) & 255) / 255,
        g: ((number >> 8) & 255) / 255,
        b: (number & 255) / 255
    };
}

function color3ToLuau(hex) {
    const color = hexToColor3(hex);

    return `Color3.fromRGB(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
}

function vector2(x, y) {
    return {
        x: clamp(x, 0, 1),
        y: clamp(y, 0, 1)
    };
}

function makeId(prefix = 'UI') {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeName(value) {
    const name = text(value, LIMITS.maxNameLength)
        .replace(/[^a-zA-Z0-9_]/g, '');

    return name || 'UIElement';
}

// ------------------------------------------------------------
// 3. THEME ENGINE
// ------------------------------------------------------------

export function getTheme(themeName = 'midnight', custom = {}) {
    const base = THEMES[themeName] || THEMES.midnight;

    const result = { ...base };

    for (const [key, value] of Object.entries(custom)) {
        if (key in result &&
            typeof value === 'string' &&
            /^#[0-9A-F]{6}$/i.test(value)) {
            result[key] = value;
        }
    }

    return result;
}

export function createThemeReport(theme) {
    const colors = Object.entries(theme);

    return {
        valid: colors.every(([key, value]) => {
            try {
                hexToColor3(value);
                return Boolean(key);
            } catch {
                return false;
            }
        }),
        colors: Object.fromEntries(colors.map(([key, value]) => [
            key,
            {
                hex: value,
                color3: hexToColor3(value)
            }
        ]))
    };
}

// ------------------------------------------------------------
// 4. INSTANCE FACTORY
// ------------------------------------------------------------

function node(className, name, properties = {}, children = []) {
    if (!INSTANCE_TYPES.has(className)) {
        throw new Error(`Unsupported Roblox Instance: ${className}`);
    }

    return {
        id: makeId(name),
        className,
        name: safeName(name),
        properties,
        children
    };
}

function makeCorner(radius = 12) {
    return node('UICorner', 'Corner', {
        CornerRadius: {
            scale: 0,
            offset: clamp(radius, 0, 100)
        }
    });
}

function makeStroke(color, transparency = 0.4, thickness = 1) {
    return node('UIStroke', 'Border', {
        Color: hexToColor3(color),
        Transparency: clamp(transparency, 0, 1),
        Thickness: clamp(thickness, 0, 10)
    });
}

function makePadding(top = 12, right = 12, bottom = 12, left = 12) {
    return node('UIPadding', 'Padding', {
        PaddingTop: { scale: 0, offset: top },
        PaddingRight: { scale: 0, offset: right },
        PaddingBottom: { scale: 0, offset: bottom },
        PaddingLeft: { scale: 0, offset: left }
    });
}

function makeTextConstraint(min = 12, max = 36) {
    return node('UITextSizeConstraint', 'TextConstraint', {
        MinTextSize: min,
        MaxTextSize: max
    });
}

// ------------------------------------------------------------
// 5. COMPONENT BUILDERS
// ------------------------------------------------------------

function createPanel(name, theme, options = {}) {
    const panel = node('Frame', name, {
        BackgroundColor3: hexToColor3(
            options.color || theme.surface
        ),
        BackgroundTransparency: clamp(
            options.transparency ?? 0,
            0,
            1
        ),
        BorderSizePixel: 0,
        Size: options.size || {
            x: 0.4,
            y: 0.5
        },
        Position: options.position || {
            x: 0.5,
            y: 0.5
        },
        AnchorPoint: vector2(0.5, 0.5),
        Visible: true,
        ClipsDescendants: options.clips ?? false,
        ZIndex: clamp(options.zIndex ?? 2, 1, 100)
    });

    panel.children.push(makeCorner(options.radius || 18));
    panel.children.push(
        makeStroke(theme.border, 0.25, 1)
    );

    return panel;
}

function createLabel(name, value, theme, options = {}) {
    const label = node('TextLabel', name, {
        BackgroundTransparency: 1,
        Text: text(value, LIMITS.maxTextLength),
        TextColor3: hexToColor3(
            options.color || theme.text
        ),
        TextSize: clamp(options.textSize || 18, 8, 72),
        Font: options.font || 'GothamMedium',
        TextXAlignment: options.align || 'Left',
        TextYAlignment: 'Center',
        TextWrapped: options.wrapped ?? false,
        RichText: false,
        Size: options.size || {
            x: 1,
            y: 0,
            xOffset: 0,
            yOffset: 32
        },
        Position: options.position || {
            x: 0,
            y: 0
        },
        ZIndex: options.zIndex || 3
    });

    label.children.push(
        makeTextConstraint(
            options.minTextSize || 10,
            options.maxTextSize || 42
        )
    );

    return label;
}

function createButton(name, value, theme, options = {}) {
    const button = node('TextButton', name, {
        BackgroundColor3: hexToColor3(
            options.color || theme.primary
        ),
        BackgroundTransparency: 0,
        BorderSizePixel: 0,
        Text: text(value, 200),
        TextColor3: hexToColor3(
            options.textColor || '#FFFFFF'
        ),
        Font: options.font || 'GothamBold',
        TextSize: clamp(options.textSize || 17, 10, 40),
        TextWrapped: true,
        AutoButtonColor: options.autoButtonColor ?? true,
        Active: true,
        Selectable: true,
        Size: options.size || {
            x: 0.8,
            y: 0,
            xOffset: 0,
            yOffset: 48
        },
        Position: options.position || {
            x: 0.1,
            y: 0
        },
        ZIndex: options.zIndex || 4
    });

    button.children.push(makeCorner(options.radius || 12));
    button.children.push(makeTextConstraint(10, 32));

    if (options.border !== false) {
        button.children.push(
            makeStroke(theme.border, 0.5, 1)
        );
    }

    return button;
}

function createBar(name, theme, options = {}) {
    const container = node('Frame', name, {
        BackgroundColor3: hexToColor3(theme.surfaceSecondary),
        BorderSizePixel: 0,
        Size: options.size || {
            x: 0.3,
            y: 0,
            xOffset: 0,
            yOffset: 18
        },
        Position: options.position || {
            x: 0,
            y: 0
        },
        ClipsDescendants: true,
        ZIndex: 4
    });

    container.children.push(makeCorner(9));

    container.children.push(node('Frame', 'Fill', {
        BackgroundColor3: hexToColor3(
            options.fillColor || theme.success
        ),
        BorderSizePixel: 0,
        Size: {
            x: clamp(options.value ?? 0.75, 0, 1),
            y: 1
        },
        Position: {
            x: 0,
            y: 0
        },
        ZIndex: 5
    }, [makeCorner(9)]));

    return container;
}

function createCard(name, title, description, theme, options = {}) {
    const card = createPanel(name, theme, {
        size: options.size || {
            x: 0.28,
            y: 0.35
        },
        radius: 14
    });

    card.children.push(makePadding(14, 14, 14, 14));

    card.children.push(createLabel(
        'CardTitle',
        title,
        theme,
        {
            size: {
                x: 1,
                y: 0,
                yOffset: 30
            },
            textSize: 19
        }
    ));

    card.children.push(createLabel(
        'CardDescription',
        description,
        theme,
        {
            position: { x: 0, y: 0.2 },
            size: {
                x: 1,
                y: 0,
                yOffset: 65
            },
            textSize: 13,
            color: theme.muted,
            wrapped: true
        }
    ));

    return card;
}

// ------------------------------------------------------------
// 6. RESPONSIVE LAYOUT ENGINE
// ------------------------------------------------------------

export function calculateResponsiveLayout(options = {}) {
    const width = Math.max(320, Number(options.width) || 1280);
    const height = Math.max(240, Number(options.height) || 720);

    const mobile = width < 600;
    const tablet = width >= 600 && width < 1024;

    const mode = mobile
        ? 'mobile'
        : tablet
            ? 'tablet'
            : 'desktop';

    const scale = mobile
        ? 0.85
        : tablet
            ? 0.92
            : 1;

    return {
        mode,
        viewport: { width, height },
        scale,
        safePadding: mobile ? 12 : tablet ? 22 : 32,
        titleSize: mobile ? 23 : tablet ? 28 : 36,
        buttonHeight: mobile ? 48 : 54,
        panelWidth: mobile
            ? 0.92
            : tablet
                ? 0.7
                : 0.48,
        gridColumns: mobile ? 2 : tablet ? 3 : 4,
        useScrolling: mobile || height < 600,
        minimumTouchTarget: 44
    };
}

// ------------------------------------------------------------
// 7. LAYOUT BUILDERS
// ------------------------------------------------------------

function addVerticalLayout(parent, spacing = 10) {
    parent.children.push(node('UIListLayout', 'VerticalLayout', {
        FillDirection: 'Vertical',
        HorizontalAlignment: 'Center',
        VerticalAlignment: 'Top',
        SortOrder: 'LayoutOrder',
        Padding: {
            scale: 0,
            offset: spacing
        }
    }));
}

function addGridLayout(parent, columns = 3, spacing = 10) {
    parent.children.push(node('UIGridLayout', 'GridLayout', {
        FillDirection: 'Horizontal',
        SortOrder: 'LayoutOrder',
        FillDirectionMaxCells: columns,
        CellPadding: {
            x: { scale: 0, offset: spacing },
            y: { scale: 0, offset: spacing }
        },
        CellSize: {
            x: 0.3,
            y: 0,
            xOffset: 0,
            yOffset: 105
        },
        HorizontalAlignment: 'Center',
        VerticalAlignment: 'Top'
    }));
}

// ------------------------------------------------------------
// 8. MAIN MENU GENERATOR
// ------------------------------------------------------------

function buildMainMenu(theme, config) {
    const layout = calculateResponsiveLayout(config.viewport);

    const screen = node('ScreenGui', 'MainMenu', {
        ResetOnSpawn: false,
        IgnoreGuiInset: true,
        DisplayOrder: 10,
        ZIndexBehavior: 'Sibling',
        Enabled: true
    });

    const background = node('Frame', 'Background', {
        Size: { x: 1, y: 1 },
        Position: { x: 0, y: 0 },
        BackgroundColor3: hexToColor3(theme.background),
        BorderSizePixel: 0,
        ZIndex: 1
    });

    const panel = createPanel('MainPanel', theme, {
        size: {
            x: layout.panelWidth,
            y: 0.72
        }
    });

    panel.children.push(makePadding(25, 22, 25, 22));

    panel.children.push(createLabel(
        'GameTitle',
        config.gameName || 'YOUR GAME',
        theme,
        {
            textSize: layout.titleSize,
            align: 'Center',
            size: { x: 1, y: 0, yOffset: 55 }
        }
    ));

    panel.children.push(createLabel(
        'Subtitle',
        config.subtitle || 'Welcome to your adventure',
        theme,
        {
            color: theme.muted,
            textSize: 14,
            align: 'Center',
            position: { x: 0, y: 0.17 },
            size: { x: 1, y: 0, yOffset: 35 }
        }
    ));

    const buttons = [
        ['PlayButton', 'PLAY', theme.primary],
        ['SettingsButton', 'SETTINGS', theme.surfaceSecondary],
        ['CreditsButton', 'CREDITS', theme.surfaceSecondary]
    ];

    buttons.forEach(([name, label, color], index) => {
        panel.children.push(createButton(
            name,
            label,
            theme,
            {
                color,
                size: {
                    x: 0.85,
                    y: 0,
                    yOffset: layout.buttonHeight
                },
                position: {
                    x: 0.075,
                    y: 0.42 + index * 0.17
                }
            }
        ));
    });

    background.children.push(panel);
    screen.children.push(background);

    return screen;
}

// ------------------------------------------------------------
// 9. GAME HUD GENERATOR
// ------------------------------------------------------------

function buildGameHUD(theme, config) {
    const layout = calculateResponsiveLayout(config.viewport);

    const screen = node('ScreenGui', 'GameHUD', {
        ResetOnSpawn: false,
        IgnoreGuiInset: false,
        DisplayOrder: 5,
        ZIndexBehavior: 'Sibling',
        Enabled: true
    });

    const topBar = createPanel('TopBar', theme, {
        size: {
            x: layout.mode === 'mobile' ? 0.95 : 0.55,
            y: 0,
            xOffset: 0,
            yOffset: layout.mode === 'mobile' ? 118 : 105
        },
        position: {
            x: 0.5,
            y: 0.08
        },
        radius: 14
    });

    topBar.children.push(makePadding(10, 12, 10, 12));

    topBar.children.push(createLabel(
        'LevelLabel',
        'LEVEL 1',
        theme,
        {
            textSize: 16,
            size: {
                x: 0.35,
                y: 0,
                yOffset: 24
            }
        }
    ));

    topBar.children.push(createLabel(
        'CurrencyLabel',
        'COINS: 0',
        theme,
        {
            color: theme.warning,
            textSize: 16,
            align: 'Right',
            position: { x: 0.55, y: 0 },
            size: {
                x: 0.4,
                y: 0,
                yOffset: 24
            }
        }
    ));

    topBar.children.push(createLabel(
        'HealthLabel',
        'HEALTH',
        theme,
        {
            textSize: 11,
            color: theme.muted,
            position: { x: 0, y: 0.32 },
            size: { x: 1, y: 0, yOffset: 16 }
        }
    ));

    topBar.children.push(createBar(
        'HealthBar',
        theme,
        {
            value: 1,
            fillColor: theme.success,
            size: {
                x: 1,
                y: 0,
                yOffset: 13
            },
            position: { x: 0, y: 0.52 }
        }
    ));

    topBar.children.push(createBar(
        'XPBar',
        theme,
        {
            value: 0.3,
            fillColor: theme.secondary,
            size: {
                x: 1,
                y: 0,
                yOffset: 8
            },
            position: { x: 0, y: 0.78 }
        }
    ));

    screen.children.push(topBar);

    const settingsButton = createButton(
        'SettingsButton',
        '⚙',
        theme,
        {
            size: {
                x: 0,
                y: 0,
                xOffset: 50,
                yOffset: 50
            },
            position: {
                x: 1,
                y: 0
            },
            color: theme.surface,
            textSize: 24
        }
    );

    settingsButton.properties.AnchorPoint = vector2(1, 0);
    settingsButton.properties.Position = {
        x: 1,
        y: 0.18
    };

    screen.children.push(settingsButton);

    return screen;
}

// ------------------------------------------------------------
// 10. INVENTORY GENERATOR
// ------------------------------------------------------------

function buildInventory(theme, config) {
    const layout = calculateResponsiveLayout(config.viewport);

    const screen = node('ScreenGui', 'Inventory', {
        ResetOnSpawn: false,
        DisplayOrder: 20,
        Enabled: true
    });

    const panel = createPanel('InventoryPanel', theme, {
        size: {
            x: layout.mode === 'mobile' ? 0.94 : 0.76,
            y: layout.mode === 'mobile' ? 0.84 : 0.72
        }
    });

    panel.children.push(makePadding(18, 18, 18, 18));

    panel.children.push(createLabel(
        'Title',
        'INVENTORY',
        theme,
        {
            textSize: 26,
            size: {
                x: 0.75,
                y: 0,
                yOffset: 45
            }
        }
    ));

    panel.children.push(createButton(
        'CloseButton',
        'X',
        theme,
        {
            color: theme.danger,
            size: {
                x: 0,
                y: 0,
                xOffset: 42,
                yOffset: 42
            },
            position: {
                x: 1,
                y: 0
            }
        }
    ));

    const grid = node('ScrollingFrame', 'ItemGrid', {
        BackgroundTransparency: 1,
        BorderSizePixel: 0,
        Size: {
            x: 1,
            y: 0.78
        },
        Position: {
            x: 0,
            y: 0.16
        },
        CanvasSize: {
            x: 0,
            y: 0
        },
        AutomaticCanvasSize: 'Y',
        ScrollingDirection: 'Y',
        ScrollBarThickness: 5,
        ScrollBarImageColor3: hexToColor3(theme.primary),
        ZIndex: 3
    });

    grid.children.push(makePadding(5, 5, 10, 5));

    addGridLayout(grid, layout.gridColumns, 10);

    for (let index = 1; index <= 12; index++) {
        const slot = createCard(
            `ItemSlot${index}`,
            `ITEM ${index}`,
            'Empty inventory slot',
            theme,
            {
                size: {
                    x: 0,
                    y: 0,
                    xOffset: 100,
                    yOffset: 105
                }
            }
        );

        slot.properties.LayoutOrder = index;
        grid.children.push(slot);
    }

    panel.children.push(grid);
    screen.children.push(panel);

    return screen;
}

// ------------------------------------------------------------
// 11. SHOP GENERATOR
// ------------------------------------------------------------

function buildShop(theme, config) {
    const screen = node('ScreenGui', 'Shop', {
        ResetOnSpawn: false,
        DisplayOrder: 20,
        Enabled: true
    });

    const layout = calculateResponsiveLayout(config.viewport);

    const panel = createPanel('ShopPanel', theme, {
        size: {
            x: layout.mode === 'mobile' ? 0.95 : 0.78,
            y: 0.78
        }
    });

    panel.children.push(makePadding(20, 20, 20, 20));

    panel.children.push(createLabel(
        'ShopTitle',
        'GAME SHOP',
        theme,
        {
            textSize: 28,
            size: { x: 0.7, y: 0, yOffset: 45 }
        }
    ));

    panel.children.push(createButton(
        'CloseButton',
        'X',
        theme,
        {
            color: theme.danger,
            size: {
                x: 0,
                y: 0,
                xOffset: 44,
                yOffset: 44
            },
            position: { x: 1, y: 0 }
        }
    ));

    const grid = node('ScrollingFrame', 'Products', {
        BackgroundTransparency: 1,
        BorderSizePixel: 0,
        Size: {
            x: 1,
            y: 0.8
        },
        Position: {
            x: 0,
            y: 0.15
        },
        AutomaticCanvasSize: 'Y',
        CanvasSize: {
            x: 0,
            y: 0
        },
        ScrollingDirection: 'Y',
        ScrollBarThickness: 5
    });

    addGridLayout(grid, layout.gridColumns, 12);

    const products = asArray(config.products);

    for (let index = 0; index < Math.min(products.length, 60); index++) {
        const product = products[index];

        const card = createCard(
            `Product${index + 1}`,
            product.name || `ITEM ${index + 1}`,
            product.description || 'Special game item',
            theme
        );

        card.properties.LayoutOrder = index + 1;

        card.children.push(createLabel(
            'Price',
            String(product.price ?? 'FREE'),
            theme,
            {
                color: theme.warning,
                position: { x: 0, y: 0.6 },
                textSize: 15
            }
        ));

        card.children.push(createButton(
            'PurchaseButton',
            'BUY',
            theme,
            {
                color: theme.primary,
                size: {
                    x: 0.85,
                    y: 0,
                    yOffset: 32
                },
                position: { x: 0.075, y: 0.75 },
                textSize: 13
            }
        ));

        grid.children.push(card);
    }

    panel.children.push(grid);
    screen.children.push(panel);

    return screen;
}

// ------------------------------------------------------------
// 12. SETTINGS GENERATOR
// ------------------------------------------------------------

function buildSettings(theme, config) {
    const screen = node('ScreenGui', 'Settings', {
        ResetOnSpawn: false,
        DisplayOrder: 25,
        Enabled: true
    });

    const panel = createPanel('SettingsPanel', theme, {
        size: {
            x: 0.6,
            y: 0.7
        }
    });

    panel.children.push(makePadding(20, 20, 20, 20));

    panel.children.push(createLabel(
        'SettingsTitle',
        'SETTINGS',
        theme,
        {
            textSize: 28,
            size: { x: 0.75, y: 0, yOffset: 45 }
        }
    ));

    panel.children.push(createButton(
        'CloseButton',
        'X',
        theme,
        {
            color: theme.danger,
            size: {
                x: 0,
                y: 0,
                xOffset: 42,
                yOffset: 42
            },
            position: { x: 1, y: 0 }
        }
    ));

    const options = [
        'MUSIC',
        'SOUND',
        'GRAPHICS',
        'CAMERA',
        'NOTIFICATIONS'
    ];

    options.forEach((name, index) => {
        const row = createPanel(
            `${name}Row`,
            theme,
            {
                size: {
                    x: 1,
                    y: 0,
                    yOffset: 55
                },
                position: {
                    x: 0.5,
                    y: 0.18 + index * 0.14
                },
                radius: 10
            }
        );

        row.children.push(createLabel(
            `${name}Label`,
            name,
            theme,
            {
                position: { x: 0.04, y: 0 },
                size: {
                    x: 0.65,
                    y: 1
                },
                textSize: 15
            }
        ));

        row.children.push(createButton(
            'ToggleButton',
            'ON',
            theme,
            {
                color: theme.success,
                position: { x: 0.77, y: 0.15 },
                size: {
                    x: 0.19,
                    y: 0.7
                },
                textSize: 12
            }
        ));

        panel.children.push(row);
    });

    screen.children.push(panel);

    return screen;
}

// ------------------------------------------------------------
// 13. UI BLUEPRINT BUILDER
// ------------------------------------------------------------

const BUILDERS = Object.freeze({
    'main-menu': buildMainMenu,
    'game-hud': buildGameHUD,
    inventory: buildInventory,
    shop: buildShop,
    settings: buildSettings
});

export function buildUIBlueprint(options = {}) {
    const preset = text(options.preset || 'main-menu', 60);

    const builder = BUILDERS[preset];

    if (!builder) {
        throw new Error(`Unknown UI preset: ${preset}`);
    }

    const theme = getTheme(
        options.theme || 'midnight',
        options.customTheme
    );

    const config = {
        gameName: text(options.gameName || 'YOUR GAME', 100),
        subtitle: text(options.subtitle || '', 200),
        viewport: options.viewport || {
            width: 1280,
            height: 720
        },
        products: asArray(options.products)
    };

    const root = builder(theme, config);

    return {
        id: makeId('BLUEPRINT'),
        version: VERSION,
        preset,
        theme,
        config,
        root,
        metadata: {
            name: PRESETS[preset]?.name || preset,
            description: PRESETS[preset]?.description || '',
            responsive: true,
            createdAt: new Date().toISOString()
        }
    };
}

// ------------------------------------------------------------
// 14. CUSTOM UI COMPONENT BUILDER
// ------------------------------------------------------------

export function createCustomComponent(spec = {}, themeName = 'midnight') {
    const theme = getTheme(themeName);

    const type = text(spec.type || 'panel', 50);
    const name = safeName(spec.name || 'CustomComponent');

    switch (type) {
        case 'panel':
            return createPanel(name, theme, spec);

        case 'label':
            return createLabel(
                name,
                spec.text || '',
                theme,
                spec
            );

        case 'button':
            return createButton(
                name,
                spec.text || 'BUTTON',
                theme,
                spec
            );

        case 'progress-bar':
            return createBar(name, theme, spec);

        case 'card':
            return createCard(
                name,
                spec.title || 'CARD',
                spec.description || '',
                theme,
                spec
            );

        default:
            throw new Error(`Unknown component type: ${type}`);
    }
}

// ------------------------------------------------------------
// 15. HIERARCHY VALIDATOR
// ------------------------------------------------------------

export function validateHierarchy(root) {
    const errors = [];
    const warnings = [];

    let nodeCount = 0;
    const ids = new Set();

    function walk(current, depth = 0, path = 'Root') {
        if (!isObject(current)) {
            errors.push(`${path}: Invalid node.`);
            return;
        }

        nodeCount++;

        if (nodeCount > LIMITS.maxNodes) {
            errors.push('Maximum UI node count exceeded.');
            return;
        }

        if (depth > LIMITS.maxDepth) {
            errors.push(`${path}: Maximum nesting depth exceeded.`);
            return;
        }

        if (!INSTANCE_TYPES.has(current.className)) {
            errors.push(`${path}: Unsupported class ${current.className}`);
        }

        if (!current.name) {
            errors.push(`${path}: Missing Instance name.`);
        }

        if (current.id) {
            if (ids.has(current.id)) {
                errors.push(`${path}: Duplicate node ID.`);
            }

            ids.add(current.id);
        }

        if (!isObject(current.properties)) {
            errors.push(`${path}: Invalid properties.`);
        }

        const children = asArray(current.children);

        if (children.length > LIMITS.maxChildren) {
            errors.push(`${path}: Too many direct children.`);
        }

        if (current.className === 'TextButton' &&
            !current.properties.Text) {
            warnings.push(`${path}: Button has no text.`);
        }

        if (current.className === 'TextLabel' &&
            !current.properties.Text) {
            warnings.push(`${path}: Empty TextLabel.`);
        }

        if (current.className === 'ScreenGui' &&
            current.properties.ResetOnSpawn === undefined) {
            warnings.push(`${path}: ResetOnSpawn is not explicitly configured.`);
        }

        children.forEach((child, index) => {
            walk(child, depth + 1, `${path}/${child?.name || index}`);
        });
    }

    walk(root);

    return {
        valid: errors.length === 0,
        nodeCount,
        errors,
        warnings,
        summary: {
            errors: errors.length,
            warnings: warnings.length
        }
    };
}

// ------------------------------------------------------------
// 16. PROPERTY VALIDATION
// ------------------------------------------------------------

const ALLOWED_PROPERTIES = Object.freeze({
    ScreenGui: [
        'ResetOnSpawn',
        'IgnoreGuiInset',
        'DisplayOrder',
        'ZIndexBehavior',
        'Enabled'
    ],
    Frame: [
        'BackgroundColor3',
        'BackgroundTransparency',
        'BorderSizePixel',
        'Size',
        'Position',
        'AnchorPoint',
        'Visible',
        'ClipsDescendants',
        'ZIndex',
        'LayoutOrder'
    ],
    TextLabel: [
        'BackgroundTransparency',
        'Text',
        'TextColor3',
        'TextSize',
        'Font',
        'TextXAlignment',
        'TextYAlignment',
        'TextWrapped',
        'RichText',
        'Size',
        'Position',
        'ZIndex',
        'LayoutOrder'
    ],
    TextButton: [
        'BackgroundColor3',
        'BackgroundTransparency',
        'BorderSizePixel',
        'Text',
        'TextColor3',
        'Font',
        'TextSize',
        'TextWrapped',
        'AutoButtonColor',
        'Active',
        'Selectable',
        'Size',
        'Position',
        'ZIndex',
        'LayoutOrder'
    ],
    ScrollingFrame: [
        'BackgroundTransparency',
        'BorderSizePixel',
        'Size',
        'Position',
        'CanvasSize',
        'AutomaticCanvasSize',
        'ScrollingDirection',
        'ScrollBarThickness',
        'ScrollBarImageColor3',
        'ZIndex'
    ]
});

export function validateProperties(root) {
    const issues = [];

    function walk(current, path = 'Root') {
        if (!isObject(current)) return;

        const allowed = ALLOWED_PROPERTIES[current.className];

        if (allowed) {
            for (const property of Object.keys(
                current.properties || {}
            )) {
                if (!allowed.includes(property)) {
                    issues.push({
                        path,
                        property,
                        type: 'unsupported-property',
                        severity: 'warning'
                    });
                }
            }
        }

        for (const child of asArray(current.children)) {
            walk(child, `${path}/${child.name}`);
        }
    }

    walk(root);

    return {
        valid: !issues.some(item => item.severity === 'error'),
        issues: issues.slice(0, 200)
    };
}

// ------------------------------------------------------------
// 17. LUAU SERIALIZATION
// ------------------------------------------------------------

function luauString(value) {
    return JSON.stringify(String(value ?? ''));
}

function serializeValue(value) {
    if (value === null || value === undefined) {
        return 'nil';
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error('Invalid numeric property.');
        }

        return String(value);
    }

    if (typeof value === 'string') {
        return luauString(value);
    }

    if (Array.isArray(value)) {
        return `{ ${value.map(serializeValue).join(', ')} }`;
    }

    if (!isObject(value)) {
        throw new Error('Unsupported property value.');
    }

    if (
        typeof value.r === 'number' &&
        typeof value.g === 'number' &&
        typeof value.b === 'number'
    ) {
        return `Color3.new(${value.r}, ${value.g}, ${value.b})`;
    }

    if (
        typeof value.scale === 'number' &&
        typeof value.offset === 'number'
    ) {
        return `UDim.new(${value.scale}, ${value.offset})`;
    }

    if (
        typeof value.x === 'number' &&
        typeof value.y === 'number' &&
        Object.keys(value).length === 2
    ) {
        return `Vector2.new(${value.x}, ${value.y})`;
    }

    if (
        typeof value.x === 'number' &&
        typeof value.y === 'number' &&
        typeof value.xOffset === 'number'
    ) {
        return `UDim2.new(${value.x}, ${value.xOffset || 0}, ${value.y}, ${value.yOffset || 0})`;
    }

    if (
        typeof value.x === 'number' &&
        typeof value.y === 'number'
    ) {
        return `UDim2.fromScale(${value.x}, ${value.y})`;
    }

    if (
        typeof value.X === 'object' &&
        typeof value.Y === 'object'
    ) {
        return `UDim2.new(${value.X.Scale}, ${value.X.Offset}, ${value.Y.Scale}, ${value.Y.Offset})`;
    }

    if (
        'CornerRadius' in value ||
        'PaddingTop' in value
    ) {
        return serializeValue(value);
    }

    const entries = Object.entries(value).map(([key, item]) =>
        `[${luauString(key)}] = ${serializeValue(item)}`
    );

    return `{ ${entries.join(', ')} }`;
}

const PROPERTY_TYPES = Object.freeze({
    FillDirection: {
        Vertical: 'Enum.FillDirection.Vertical',
        Horizontal: 'Enum.FillDirection.Horizontal'
    },
    HorizontalAlignment: {
        Left: 'Enum.HorizontalAlignment.Left',
        Center: 'Enum.HorizontalAlignment.Center',
        Right: 'Enum.HorizontalAlignment.Right'
    },
    VerticalAlignment: {
        Top: 'Enum.VerticalAlignment.Top',
        Center: 'Enum.VerticalAlignment.Center',
        Bottom: 'Enum.VerticalAlignment.Bottom'
    },
    SortOrder: {
        LayoutOrder: 'Enum.SortOrder.LayoutOrder',
        Name: 'Enum.SortOrder.Name'
    },
    ScrollingDirection: {
        Y: 'Enum.ScrollingDirection.Y',
        X: 'Enum.ScrollingDirection.X',
        XY: 'Enum.ScrollingDirection.XY'
    },
    AutomaticCanvasSize: {
        None: 'Enum.AutomaticSize.None',
        Y: 'Enum.AutomaticSize.Y',
        X: 'Enum.AutomaticSize.X',
        XY: 'Enum.AutomaticSize.XY'
    },
    TextXAlignment: {
        Left: 'Enum.TextXAlignment.Left',
        Center: 'Enum.TextXAlignment.Center',
        Right: 'Enum.TextXAlignment.Right'
    },
    TextYAlignment: {
        Top: 'Enum.TextYAlignment.Top',
        Center: 'Enum.TextYAlignment.Center',
        Bottom: 'Enum.TextYAlignment.Bottom'
    },
    ZIndexBehavior: {
        Global: 'Enum.ZIndexBehavior.Global',
        Sibling: 'Enum.ZIndexBehavior.Sibling'
    },
    Font: {
        Gotham: 'Enum.Font.Gotham',
        GothamBold: 'Enum.Font.GothamBold',
        GothamMedium: 'Enum.Font.GothamMedium',
        GothamBlack: 'Enum.Font.GothamBlack',
        SourceSans: 'Enum.Font.SourceSans',
        SourceSansBold: 'Enum.Font.SourceSansBold'
    }
});

function serializeProperty(property, value) {
    if (PROPERTY_TYPES[property] &&
        typeof value === 'string' &&
        PROPERTY_TYPES[property][value]) {
        return PROPERTY_TYPES[property][value];
    }

    return serializeValue(value);
}

function emitNode(nodeData, parentExpression, lines, counter) {
    const variable = `ui_${counter.value++}`;

    lines.push(
        `local ${variable} = Instance.new(${luauString(nodeData.className)})`
    );

    lines.push(
        `${variable}.Name = ${luauString(nodeData.name)}`
    );

    for (const [property, value] of Object.entries(
        nodeData.properties || {}
    )) {
        lines.push(
            `${variable}.${property} = ${serializeProperty(property, value)}`
        );
    }

    lines.push(`${variable}.Parent = ${parentExpression}`);

    for (const child of asArray(nodeData.children)) {
        emitNode(child, variable, lines, counter);
    }

    return variable;
}

// ------------------------------------------------------------
// 18. COMPLETE LUAU SCRIPT GENERATOR
// ------------------------------------------------------------

export function generateLuau(blueprint, options = {}) {
    if (!blueprint?.root) {
        throw new Error('A valid UI blueprint is required.');
    }

    const validation = validateHierarchy(blueprint.root);

    if (!validation.valid) {
        throw new Error(
            `UI hierarchy invalid: ${validation.errors.join('; ')}`
        );
    }

    const lines = [
        '-- =====================================================',
        '-- GENERATED BY QURUVCHI MAX UI AGENT V2',
        '-- Roblox Studio UI creation script',
        '-- Review before execution.',
        '-- =====================================================',
        '',
        'local Players = game:GetService("Players")',
        'local player = Players.LocalPlayer',
        'assert(player, "LocalPlayer is unavailable")',
        '',
        'local playerGui = player:WaitForChild("PlayerGui")',
        '',
        'local oldUI = playerGui:FindFirstChild(' +
            luauString(blueprint.root.name) + ')',
        'if oldUI then',
        '    oldUI:Destroy()',
        'end',
        '',
        'local uiRoot = Instance.new("Folder")',
        'uiRoot.Name = "QuruvchiGeneratedUI"',
        'uiRoot.Parent = playerGui',
        ''
    ];

    const counter = { value: 1 };

    emitNode(
        blueprint.root,
        'uiRoot',
        lines,
        counter
    );

    lines.push('');
    lines.push('-- UI generated successfully.');
    lines.push('return uiRoot');

    const source = lines.join('\n');

    if (source.length > 100000) {
        throw new Error('Generated Luau exceeds source size limit.');
    }

    return {
        source,
        length: source.length,
        instances: validation.nodeCount,
        target: 'StarterPlayerScripts/LocalScript',
        executionMode: 'client',
        warnings: validation.warnings
    };
}

// ------------------------------------------------------------
// 19. UI ANIMATION PLANNER
// ------------------------------------------------------------

const ANIMATIONS = Object.freeze({
    fadeIn: {
        style: 'Quad',
        direction: 'Out',
        duration: 0.25,
        property: 'BackgroundTransparency'
    },
    slideIn: {
        style: 'Quint',
        direction: 'Out',
        duration: 0.4,
        property: 'Position'
    },
    popIn: {
        style: 'Back',
        direction: 'Out',
        duration: 0.35,
        property: 'Size'
    },
    fadeOut: {
        style: 'Quad',
        direction: 'In',
        duration: 0.2,
        property: 'BackgroundTransparency'
    },
    hover: {
        style: 'Sine',
        direction: 'Out',
        duration: 0.12,
        property: 'Size'
    }
});

export function createAnimationPlan(name, options = {}) {
    const preset = ANIMATIONS[name];

    if (!preset) {
        throw new Error(`Unknown animation: ${name}`);
    }

    return {
        name,
        style: preset.style,
        direction: preset.direction,
        duration: clamp(
            options.duration ?? preset.duration,
            0.05,
            LIMITS.maxAnimationDuration
        ),
        property: preset.property,
        reducedMotionSupported: true
    };
}

export function generateAnimationLuau(name, targetName, options = {}) {
    const animation = createAnimationPlan(name, options);

    const style = animation.style;
    const direction = animation.direction;
    const duration = animation.duration;

    const enumStyle = {
        Quad: 'Quad',
        Quint: 'Quint',
        Back: 'Back',
        Sine: 'Sine'
    }[style];

    const enumDirection = {
        In: 'In',
        Out: 'Out',
        InOut: 'InOut'
    }[direction];

    return `
local TweenService = game:GetService("TweenService")
local target = script.Parent:FindFirstChild(${luauString(targetName)})

if not target then
    warn("Quruvchi UI animation target not found")
    return
end

local tweenInfo = TweenInfo.new(
    ${duration},
    Enum.EasingStyle.${enumStyle},
    Enum.EasingDirection.${enumDirection}
)

-- Connect the target property to a project-specific goal.
-- The UI Agent does not invent a goal for unknown layouts.
local tween = TweenService:Create(target, tweenInfo, {})
tween:Play()
`;
}

// ------------------------------------------------------------
// 20. UI IMPROVEMENT ENGINE
// ------------------------------------------------------------

export function improveBlueprint(blueprint, instructions = {}) {
    if (!blueprint?.root) {
        throw new Error('Blueprint is required.');
    }

    const theme = getTheme(
        instructions.theme || 'midnight',
        instructions.customTheme
    );

    const changes = [];

    function walk(current) {
        if (!isObject(current)) return;

        const properties = current.properties || {};

        if (current.className === 'TextLabel' ||
            current.className === 'TextButton') {

            if (!properties.TextSize ||
                properties.TextSize < 10) {
                properties.TextSize = 14;
                changes.push({
                    node: current.name,
                    change: 'Fixed unreadable text size.'
                });
            }

            if (!properties.Font) {
                properties.Font = 'GothamMedium';
                changes.push({
                    node: current.name,
                    change: 'Applied consistent font.'
                });
            }

            if (properties.RichText === true) {
                properties.RichText = false;
            }
        }

        if (current.className === 'TextButton') {
            properties.Active = true;
            properties.Selectable = true;
        }

        if (current.className === 'Frame' &&
            properties.BackgroundColor3) {
            // Existing custom color is preserved.
        }

        for (const child of asArray(current.children)) {
            walk(child);
        }
    }

    walk(blueprint.root);

    blueprint.theme = theme;
    blueprint.metadata = {
        ...blueprint.metadata,
        lastImprovedAt: new Date().toISOString()
    };

    return {
        blueprint,
        changes,
        totalChanges: changes.length
    };
}

// ------------------------------------------------------------
// 21. UI ACCESSIBILITY AUDITOR
// ------------------------------------------------------------

export function auditAccessibility(root) {
    const findings = [];

    function walk(current, path = 'Root') {
        if (!isObject(current)) return;

        const properties = current.properties || {};

        if (current.className === 'TextButton' ||
            current.className === 'ImageButton') {

            const size = properties.Size;

            if (size?.yOffset !== undefined &&
                size.yOffset < 44) {
                findings.push({
                    path,
                    severity: 'warning',
                    issue: 'Button may be too small for touch input.',
                    recommendation: 'Use a touch target of at least 44 pixels.'
                });
            }

            if (current.className === 'ImageButton' &&
                !properties.Image) {
                findings.push({
                    path,
                    severity: 'warning',
                    issue: 'ImageButton has no image configured.'
                });
            }
        }

        if (current.className === 'TextLabel' &&
            !properties.Text) {
            findings.push({
                path,
                severity: 'warning',
                issue: 'Text element has no accessible label.'
            });
        }

        for (const child of asArray(current.children)) {
            walk(child, `${path}/${child.name}`);
        }
    }

    walk(root);

    return {
        passed: findings.length === 0,
        findings,
        total: findings.length
    };
}

// ------------------------------------------------------------
// 22. OVERLAP / LAYOUT AUDITOR
// ------------------------------------------------------------

export function auditLayout(root) {
    const findings = [];

    function walk(current, path = 'Root') {
        if (!isObject(current)) return;

        const properties = current.properties || {};

        const size = properties.Size;

        if (size && typeof size.x === 'number' &&
            typeof size.y === 'number') {

            if (size.x > 1.5 || size.y > 1.5) {
                findings.push({
                    path,
                    severity: 'warning',
                    issue: 'Large normalized layout size.',
                    recommendation: 'Check whether offset or scale sizing was intended.'
                });
            }

            if (size.x < 0 || size.y < 0) {
                findings.push({
                    path,
                    severity: 'error',
                    issue: 'Negative layout size.'
                });
            }
        }

        if (properties.ZIndex !== undefined &&
            (properties.ZIndex < 1 || properties.ZIndex > 100)) {
            findings.push({
                path,
                severity: 'warning',
                issue: 'Unusual ZIndex value.'
            });
        }

        for (const child of asArray(current.children)) {
            walk(child, `${path}/${child.name}`);
        }
    }

    walk(root);

    return {
        passed: !findings.some(item => item.severity === 'error'),
        findings
    };
}

// ------------------------------------------------------------
// 23. COMPLETE UI QA
// ------------------------------------------------------------

export function runUIQA(blueprint) {
    if (!blueprint?.root) {
        return {
            passed: false,
            status: 'blocked',
            errors: ['Missing blueprint.']
        };
    }

    const hierarchy = validateHierarchy(blueprint.root);
    const properties = validateProperties(blueprint.root);
    const accessibility = auditAccessibility(blueprint.root);
    const layout = auditLayout(blueprint.root);

    const errors = [
        ...hierarchy.errors,
        ...properties.issues
            .filter(item => item.severity === 'error')
            .map(item => `${item.path}: ${item.property}`),
        ...layout.findings
            .filter(item => item.severity === 'error')
            .map(item => `${item.path}: ${item.issue}`)
    ];

    const warnings = [
        ...hierarchy.warnings,
        ...properties.issues
            .filter(item => item.severity === 'warning'),
        ...accessibility.findings,
        ...layout.findings
            .filter(item => item.severity === 'warning')
    ];

    const passed = errors.length === 0;

    return {
        agent: 'Quruvchi MAX UI Agent',
        version: VERSION,
        passed,
        status: passed
            ? warnings.length
                ? 'passed-with-warnings'
                : 'passed'
            : 'failed',
        score: Math.max(
            0,
            100 - errors.length * 20 - warnings.length * 2
        ),
        statistics: {
            nodes: hierarchy.nodeCount,
            errors: errors.length,
            warnings: warnings.length
        },
        checks: {
            hierarchy,
            properties,
            accessibility,
            layout
        },
        errors,
        warnings
    };
}

// ------------------------------------------------------------
// 24. UI PROJECT GENERATOR
// ------------------------------------------------------------

export function generateUIProject(options = {}) {
    const presets = asArray(options.presets);

    if (!presets.length) {
        throw new Error('At least one UI preset is required.');
    }

    const screens = [];
    const scripts = [];
    const reports = [];

    for (const preset of unique(presets)) {
        const blueprint = buildUIBlueprint({
            ...options,
            preset
        });

        const qa = runUIQA(blueprint);

        if (!qa.passed) {
            reports.push({
                preset,
                success: false,
                qa
            });

            continue;
        }

        const luau = generateLuau(blueprint);

        screens.push({
            name: blueprint.root.name,
            preset,
            blueprint
        });

        scripts.push({
            name: `${blueprint.root.name}.client.lua`,
            path: `StarterPlayer/StarterPlayerScripts/QuruvchiUI/${blueprint.root.name}.client.lua`,
            source: luau.source
        });

        reports.push({
            preset,
            success: true,
            qa,
            instances: luau.instances,
            sourceLength: luau.length
        });
    }

    return {
        success: screens.length > 0,
        agent: 'Quruvchi MAX UI Agent',
        version: VERSION,
        projectName: text(options.gameName || 'Untitled Game', 100),
        screens,
        scripts,
        reports,
        summary: {
            requested: presets.length,
            generated: screens.length,
            failed: presets.length - screens.length,
            totalInstances: reports.reduce(
                (sum, report) => sum + (report.instances || 0),
                0
            )
        },
        studio: {
            requiresPlugin: true,
            target: 'StarterPlayer/StarterPlayerScripts',
            creationMode: 'structured-instance-tree',
            playtestRequired: true
        }
    };
}

// ------------------------------------------------------------
// 25. AI DESIGN REQUEST INTERPRETER
// ------------------------------------------------------------

const INTENT_MAP = Object.freeze([
    {
        pattern: /\b(main menu|start menu|bosh menyu|asosiy menyu)\b/i,
        preset: 'main-menu'
    },
    {
        pattern: /\b(hud|health bar|coin|xp|stamina|jon|hayot)\b/i,
        preset: 'game-hud'
    },
    {
        pattern: /\b(inventory|inventar|sumka|itemlar)\b/i,
        preset: 'inventory'
    },
    {
        pattern: /\b(shop|do[' ]?kon|magazin|sotib olish)\b/i,
        preset: 'shop'
    },
    {
        pattern: /\b(settings|sozlamalar|parametrlar)\b/i,
        preset: 'settings'
    }
]);

export function interpretUIRequest(request = '') {
    const prompt = text(request, 5000);

    const presets = [];

    for (const intent of INTENT_MAP) {
        if (intent.pattern.test(prompt)) {
            presets.push(intent.preset);
        }
    }

    if (!presets.length) {
        presets.push('main-menu');
    }

    const theme = /\b(fantasy|sehrli|magic)\b/i.test(prompt)
        ? 'fantasy'
        : /\b(ocean|suv|dengiz)\b/i.test(prompt)
            ? 'ocean'
            : /\b(vibrant|rangli|neon)\b/i.test(prompt)
                ? 'vibrant'
                : /\b(minimal|minimalist)\b/i.test(prompt)
                    ? 'minimalist'
                    : 'midnight';

    return {
        originalRequest: prompt,
        presets: unique(presets),
        theme,
        requirements: {
            responsive: true,
            animations: true,
            accessibility: true,
            qualityCheck: true,
            studioIntegration: true
        },
        missingInformation: [],
        needsAIPlanning: true
    };
}

// ------------------------------------------------------------
// 26. AGENT TASK HANDLER
// ------------------------------------------------------------

export function handleUITask(task = {}) {
    const prompt = text(task.prompt || task.description, 5000);

    if (!prompt) {
        return {
            success: false,
            status: 'blocked',
            error: 'UI design prompt is required.'
        };
    }

    const interpreted = interpretUIRequest(prompt);

    const presets = asArray(task.presets).length
        ? task.presets
        : interpreted.presets;

    const project = generateUIProject({
        gameName: task.gameName || 'Quruvchi Game',
        theme: task.theme || interpreted.theme,
        customTheme: task.customTheme,
        viewport: task.viewport,
        presets,
        products: task.products
    });

    return {
        success: project.success,
        agent: 'Quruvchi MAX UI Agent',
        taskId: makeId('UITASK'),
        originalPrompt: prompt,
        interpretation: interpreted,
        project,
        nextActions: [
            'Review generated UI hierarchy.',
            'Send structured UI tree to Studio Plugin.',
            'Create Instances in the correct services.',
            'Connect button interactions and game systems.',
            'Run UI QA.',
            'Start Roblox Studio Play-test.'
        ],
        execution: {
            studioConnected: false,
            instancesCreated: false,
            playtestCompleted: false,
            requiresDispatcher: true
        }
    };
}

// ------------------------------------------------------------
// 27. UI AGENT INFORMATION
// ------------------------------------------------------------

export function getUIAgentInfo() {
    return {
        name: 'Quruvchi MAX Core UI Agent',
        version: VERSION,
        status: 'ready',
        role: 'Roblox UI architecture and implementation',
        capabilities: [
            'Full UI generation',
            'Main menu generation',
            'Gameplay HUD',
            'Inventory systems',
            'Shop interfaces',
            'Settings screens',
            'Responsive layout',
            'Theme management',
            'Component creation',
            'UI hierarchy validation',
            'Luau generation',
            'Animation planning',
            'UI improvement',
            'Accessibility auditing',
            'Layout auditing',
            'Multi-screen generation',
            'Studio integration output'
        ],
        presets: Object.keys(BUILDERS),
        themes: Object.keys(THEMES),
        output: [
            'UI Blueprint',
            'Roblox Instance Tree',
            'Luau Source',
            'QA Report',
            'Studio Task'
        ],
        limits: LIMITS,
        integrations: [
            'Gameplay Agent',
            'World Generator',
            'Tool Scout Agent',
            'QA Agent',
            'Roblox Studio Plugin'
        ]
    };
}

// ------------------------------------------------------------
// 28. DEFAULT EXPORT
// ------------------------------------------------------------

const UIAgent = Object.freeze({
    version: VERSION,
    getInfo: getUIAgentInfo,
    interpret: interpretUIRequest,
    build: buildUIBlueprint,
    buildProject: generateUIProject,
    createComponent: createCustomComponent,
    generateLuau,
    improve: improveBlueprint,
    validate: validateHierarchy,
    validateProperties,
    auditAccessibility,
    auditLayout,
    qa: runUIQA,
    animate: createAnimationPlan,
    generateAnimationLuau,
    handleTask: handleUITask,
    responsive: calculateResponsiveLayout,
    getTheme,
    themeReport: createThemeReport
});

export default UIAgent;

// ============================================================
// END — QURUVCHI MAX CORE UI AGENT V2
// ============================================================
