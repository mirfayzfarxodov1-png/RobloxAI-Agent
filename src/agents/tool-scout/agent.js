
'use strict';

// ============================================================
// QURUVCHI MAX — TOOL SCOUT AGENT V2
// File: src/agents/tool-scout/agent.js
// Runtime: Node.js ES Modules
//
// PURPOSE:
// - Discover free development tools
// - Find Roblox development resources
// - Search reusable modules and packages
// - Evaluate licenses and compatibility
// - Detect suspicious tools and packages
// - Compare free alternatives
// - Recommend tools to specialized agents
// - Generate safe installation plans
// - Maintain a searchable tool catalog
//
// SECURITY:
// - Never executes discovered code.
// - Never installs packages automatically.
// - Never trusts descriptions as security evidence.
// - Requires explicit approval before installation.
// - Unknown licenses are not treated as free.
// ============================================================

const VERSION = '2.0.0';

const CONFIG = Object.freeze({
    maxResults: 100,
    maxQueryLength: 300,
    maxDescriptionLength: 2000,
    maxDependencies: 100,
    maxCatalogItems: 5000,
    maxIssues: 200,
    minimumScore: 45,
    defaultCurrency: 'USD'
});

const CATEGORIES = Object.freeze([
    'roblox-plugin',
    'roblox-asset',
    'luau-module',
    'npm-package',
    'node-library',
    '3d-model',
    'texture',
    'audio',
    'animation',
    'development-tool',
    'testing-tool',
    'documentation',
    'other'
]);

const AGENT_CATEGORIES = Object.freeze({
    'Gameplay Agent': [
        'luau-module',
        'roblox-plugin',
        'development-tool'
    ],
    'World Generator': [
        '3d-model',
        'texture',
        'roblox-asset',
        'development-tool'
    ],
    'UI Agent': [
        'texture',
        'roblox-asset',
        'animation',
        'development-tool'
    ],
    'Script Agent': [
        'npm-package',
        'node-library',
        'luau-module',
        'development-tool'
    ],
    'Security Agent': [
        'testing-tool',
        'development-tool'
    ],
    'QA Agent': [
        'testing-tool',
        'development-tool',
        'documentation'
    ],
    'Data Agent': [
        'node-library',
        'npm-package',
        'development-tool'
    ]
});

// ------------------------------------------------------------
// 1. UTILITIES
// ------------------------------------------------------------

function clean(value, max = 500) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function isObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function normalizeCategory(value) {
    const category = clean(value, 60).toLowerCase();

    return CATEGORIES.includes(category)
        ? category
        : 'other';
}

function normalizeUrl(value) {
    try {
        const url = new URL(String(value));

        if (!['https:', 'http:'].includes(url.protocol)) {
            return null;
        }

        if (url.username || url.password) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

function normalizeTool(tool) {
    if (!isObject(tool)) return null;

    const name = clean(tool.name, 150);

    if (!name) return null;

    const price = Number(tool.price ?? 0);

    return {
        id: clean(tool.id || name.toLowerCase().replace(/\s+/g, '-'), 150),
        name,
        description: clean(
            tool.description,
            CONFIG.maxDescriptionLength
        ),
        category: normalizeCategory(tool.category),
        version: clean(tool.version || 'unknown', 80),
        source: clean(tool.source || 'unknown', 100),
        url: normalizeUrl(tool.url),
        documentationUrl: normalizeUrl(tool.documentationUrl),
        repositoryUrl: normalizeUrl(tool.repositoryUrl),
        license: clean(tool.license || 'UNKNOWN', 100),
        price: Number.isFinite(price) && price >= 0 ? price : null,
        currency: clean(tool.currency || CONFIG.defaultCurrency, 10),
        free: tool.free === true,
        openSource: tool.openSource === true,
        verified: tool.verified === true,
        official: tool.official === true,
        compatibility: asArray(tool.compatibility)
            .map(item => clean(item, 80))
            .slice(0, 30),
        dependencies: asArray(tool.dependencies)
            .map(item => clean(item, 150))
            .slice(0, CONFIG.maxDependencies),
        tags: asArray(tool.tags)
            .map(item => clean(item, 60).toLowerCase())
            .slice(0, 50),
        capabilities: asArray(tool.capabilities)
            .map(item => clean(item, 120))
            .slice(0, 50),
        permissions: asArray(tool.permissions)
            .map(item => clean(item, 100))
            .slice(0, 30),
        downloadCount: Math.max(0, Number(tool.downloadCount) || 0),
        lastUpdated: clean(tool.lastUpdated || '', 50),
        checksum: clean(tool.checksum || '', 200),
        publisher: clean(tool.publisher || '', 150)
    };
}

// ------------------------------------------------------------
// 2. LICENSE VALIDATION
// ------------------------------------------------------------

const LICENSES = Object.freeze({
    MIT: {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    ISC: {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'Apache-2.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'BSD-2-Clause': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'BSD-3-Clause': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'MPL-2.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'GPL-3.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'LGPL-3.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'Unlicense': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: false
    },
    'CC0-1.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: false
    },
    'CC-BY-4.0': {
        known: true,
        commercial: true,
        redistribution: true,
        attribution: true
    },
    'CC-BY-NC-4.0': {
        known: true,
        commercial: false,
        redistribution: true,
        attribution: true
    },
    'Proprietary': {
        known: true,
        commercial: false,
        redistribution: false,
        attribution: false
    }
});

export function checkLicense(tool) {
    const name = clean(tool?.license || 'UNKNOWN', 100);

    const license = LICENSES[name];

    if (!license) {
        return {
            name,
            known: false,
            approved: false,
            commercial: false,
            reason: 'License is unknown or has not been verified.',
            action: 'manual-review-required'
        };
    }

    return {
        name,
        ...license,
        approved: license.known,
        reason: license.known
            ? 'Recognized license; verify its actual source and conditions.'
            : 'License could not be verified.',
        action: license.known
            ? 'check-license-conditions'
            : 'manual-review-required'
    };
}

// ------------------------------------------------------------
// 3. TOOL SECURITY SCANNER
// ------------------------------------------------------------

export function auditToolSecurity(tool) {
    const item = normalizeTool(tool);

    if (!item) {
        return {
            safe: false,
            risk: 'critical',
            findings: ['Invalid tool metadata.']
        };
    }

    const findings = [];

    let riskPoints = 0;

    const suspiciousPatterns = [
        {
            id: 'remote-execution',
            pattern: /\b(loadstring|eval)\s*\(/i,
            points: 30,
            message: 'Dynamic code execution pattern.'
        },
        {
            id: 'shell-execution',
            pattern: /\b(exec|spawn|execSync|spawnSync)\s*\(/i,
            points: 20,
            message: 'Process execution pattern.'
        },
        {
            id: 'credential-access',
            pattern: /(?:password|token|secret|api[_-]?key)\s*(?:=|:)/i,
            points: 25,
            message: 'Possible credential handling.'
        },
        {
            id: 'obfuscation',
            pattern: /\beval\s*\(|String\.fromCharCode|atob\s*\(/i,
            points: 15,
            message: 'Potentially obfuscated code.'
        },
        {
            id: 'unsafe-network',
            pattern: /(?:http:\/\/|https:\/\/)[^\s]+/i,
            points: 5,
            message: 'External network reference requires review.'
        }
    ];

    const evidence = [
        item.description,
        ...item.capabilities,
        ...item.permissions,
        ...item.tags
    ].join('\n');

    for (const rule of suspiciousPatterns) {
        if (rule.pattern.test(evidence)) {
            findings.push({
                id: rule.id,
                message: rule.message
            });

            riskPoints += rule.points;
        }
    }

    if (!item.url) {
        findings.push({
            id: 'missing-source',
            message: 'No valid source URL was provided.'
        });

        riskPoints += 20;
    }

    if (!item.verified && !item.official) {
        findings.push({
            id: 'unverified-publisher',
            message: 'Publisher is not verified.'
        });

        riskPoints += 10;
    }

    const license = checkLicense(item);

    if (!license.known) {
        findings.push({
            id: 'unknown-license',
            message: 'License requires manual verification.'
        });

        riskPoints += 15;
    }

    let risk = 'low';

    if (riskPoints >= 50) risk = 'critical';
    else if (riskPoints >= 30) risk = 'high';
    else if (riskPoints >= 15) risk = 'medium';

    return {
        safe: risk === 'low',
        risk,
        riskPoints: Math.min(100, riskPoints),
        findings,
        license,
        recommendation: risk === 'critical' || risk === 'high'
            ? 'Do not install until security review is complete.'
            : 'Review the source and verify the package before use.'
    };
}

// ------------------------------------------------------------
// 4. QUERY ENGINE
// ------------------------------------------------------------

function tokenize(query) {
    return unique(
        clean(query, CONFIG.maxQueryLength)
            .toLowerCase()
            .split(/[^a-z0-9+#.-]+/)
            .filter(word => word.length > 1)
    );
}

function calculateRelevance(tool, query) {
    const terms = tokenize(query);

    if (!terms.length) return 0;

    const searchable = [
        tool.name,
        tool.description,
        tool.category,
        tool.source,
        ...tool.tags,
        ...tool.capabilities
    ].join(' ').toLowerCase();

    let points = 0;

    for (const term of terms) {
        if (tool.name.toLowerCase().includes(term)) {
            points += 10;
        } else if (tool.tags.includes(term)) {
            points += 8;
        } else if (tool.capabilities.some(item =>
            item.toLowerCase().includes(term)
        )) {
            points += 6;
        } else if (searchable.includes(term)) {
            points += 3;
        }
    }

    return Math.min(100, Math.round(points / terms.length * 10));
}

// ------------------------------------------------------------
// 5. TOOL SCORING
// ------------------------------------------------------------

export function scoreTool(tool, query = '', context = {}) {
    const item = normalizeTool(tool);

    if (!item) return null;

    const security = auditToolSecurity(item);
    const license = checkLicense(item);

    const relevance = calculateRelevance(item, query);

    let score = relevance;

    if (item.free && item.price === 0) score += 20;

    if (item.openSource) score += 10;

    if (item.official) score += 10;

    if (item.verified) score += 8;

    if (item.documentationUrl) score += 5;

    if (item.repositoryUrl) score += 3;

    if (license.known) score += 5;

    if (security.risk === 'medium') score -= 15;

    if (security.risk === 'high') score -= 35;

    if (security.risk === 'critical') score -= 70;

    if (!license.known) score -= 20;

    if (item.price > 0) score -= 25;

    const preferredCategories = asArray(
        context.preferredCategories
    );

    if (preferredCategories.includes(item.category)) {
        score += 15;
    }

    const compatibleWith = clean(
        context.compatibility || '',
        100
    ).toLowerCase();

    if (compatibleWith && item.compatibility.some(value =>
        value.toLowerCase().includes(compatibleWith)
    )) {
        score += 10;
    }

    return {
        id: item.id,
        name: item.name,
        category: item.category,
        score: Math.max(0, Math.min(100, score)),
        relevance,
        free: item.free && item.price === 0,
        licenseApproved: license.known,
        securityRisk: security.risk,
        recommended: score >= CONFIG.minimumScore &&
            security.risk !== 'critical' &&
            security.risk !== 'high' &&
            license.known
    };
}

// ------------------------------------------------------------
// 6. CATALOG MANAGER
// ------------------------------------------------------------

export class ToolCatalog {
    constructor(initialTools = []) {
        this.tools = new Map();

        for (const tool of asArray(initialTools).slice(
            0,
            CONFIG.maxCatalogItems
        )) {
            this.add(tool);
        }
    }

    add(rawTool) {
        const tool = normalizeTool(rawTool);

        if (!tool) {
            return {
                success: false,
                reason: 'Invalid tool.'
            };
        }

        this.tools.set(tool.id, tool);

        return {
            success: true,
            id: tool.id
        };
    }

    remove(id) {
        return this.tools.delete(clean(id, 150));
    }

    get(id) {
        const item = this.tools.get(clean(id, 150));

        return item ? structuredClone(item) : null;
    }

    list(filters = {}) {
        let results = [...this.tools.values()];

        if (filters.category) {
            results = results.filter(item =>
                item.category === normalizeCategory(filters.category)
            );
        }

        if (filters.freeOnly) {
            results = results.filter(item =>
                item.free && item.price === 0
            );
        }

        if (filters.verifiedOnly) {
            results = results.filter(item =>
                item.verified || item.official
            );
        }

        return results.slice(0, CONFIG.maxResults)
            .map(item => structuredClone(item));
    }

    get size() {
        return this.tools.size;
    }
}

// ------------------------------------------------------------
// 7. EXTERNAL DISCOVERY ADAPTER
// ------------------------------------------------------------

export async function discoverTools(options = {}) {
    const query = clean(options.query, CONFIG.maxQueryLength);

    if (!query) {
        return {
            success: false,
            results: [],
            error: 'A search query is required.'
        };
    }

    const providers = asArray(options.providers);

    if (!providers.length) {
        return {
            success: false,
            results: [],
            error: 'No discovery provider configured.',
            hint: 'Connect an approved catalog or search adapter.'
        };
    }

    const output = [];
    const errors = [];

    for (const provider of providers) {
        if (!isObject(provider) ||
            typeof provider.search !== 'function') {
            continue;
        }

        try {
            const result = await provider.search({
                query,
                categories: asArray(options.categories),
                freeOnly: options.freeOnly === true,
                limit: Math.min(
                    CONFIG.maxResults,
                    Math.max(1, Number(options.limit) || 20)
                )
            });

            const items = Array.isArray(result)
                ? result
                : asArray(result?.results);

            for (const rawTool of items) {
                const tool = normalizeTool(rawTool);

                if (!tool) continue;

                if (options.freeOnly &&
                    !(tool.free && tool.price === 0)) {
                    continue;
                }

                output.push(tool);
            }
        } catch (error) {
            errors.push({
                provider: clean(provider.name || 'unknown', 100),
                error: clean(error.message, 300)
            });
        }
    }

    const uniqueTools = [
        ...new Map(output.map(tool => [
            tool.id,
            tool
        ])).values()
    ];

    return {
        success: uniqueTools.length > 0,
        query,
        results: uniqueTools.slice(0, CONFIG.maxResults),
        errors,
        total: uniqueTools.length
    };
}

// ------------------------------------------------------------
// 8. RECOMMENDATION ENGINE
// ------------------------------------------------------------

export function recommendTools(options = {}) {
    const agent = clean(options.agent || '', 100);

    const allowedCategories = AGENT_CATEGORIES[agent] || [];

    const query = clean(options.query, CONFIG.maxQueryLength);

    const tools = asArray(options.tools)
        .map(normalizeTool)
        .filter(Boolean);

    const results = [];

    for (const tool of tools) {
        if (allowedCategories.length &&
            !allowedCategories.includes(tool.category)) {
            continue;
        }

        if (options.freeOnly &&
            !(tool.free && tool.price === 0)) {
            continue;
        }

        const score = scoreTool(tool, query, {
            preferredCategories: allowedCategories,
            compatibility: options.compatibility
        });

        if (!score || !score.recommended) continue;

        results.push({
            tool,
            evaluation: score
        });
    }

    results.sort((a, b) =>
        b.evaluation.score - a.evaluation.score
    );

    return {
        agent: agent || 'General Agent',
        query,
        total: results.length,
        recommendations: results.slice(
            0,
            Math.max(1, Math.min(20, Number(options.limit) || 10))
        )
    };
}

// ------------------------------------------------------------
// 9. FREE ALTERNATIVE FINDER
// ------------------------------------------------------------

export function findFreeAlternatives(original, tools = []) {
    const target = normalizeTool(original);

    if (!target) {
        return {
            success: false,
            alternatives: []
        };
    }

    const terms = [
        target.name,
        ...target.tags,
        ...target.capabilities
    ].join(' ');

    const alternatives = asArray(tools)
        .map(normalizeTool)
        .filter(Boolean)
        .filter(tool => tool.id !== target.id)
        .filter(tool => tool.free && tool.price === 0)
        .map(tool => ({
            tool,
            evaluation: scoreTool(tool, terms, {
                preferredCategories: [target.category]
            })
        }))
        .filter(item => item.evaluation?.recommended)
        .sort((a, b) =>
            b.evaluation.score - a.evaluation.score
        );

    return {
        success: true,
        original: target.name,
        alternatives: alternatives.slice(0, 10)
    };
}

// ------------------------------------------------------------
// 10. COMPATIBILITY VALIDATOR
// ------------------------------------------------------------

export function checkCompatibility(tool, environment = {}) {
    const item = normalizeTool(tool);

    if (!item) {
        return {
            compatible: false,
            findings: ['Invalid tool metadata.']
        };
    }

    const findings = [];

    const required = item.compatibility.map(value =>
        value.toLowerCase()
    );

    const actual = [
        environment.runtime,
        environment.engine,
        environment.language,
        environment.platform
    ]
        .filter(Boolean)
        .map(value => clean(value, 80).toLowerCase());

    const matchesEnvironment = required.length === 0 ||
        required.some(value =>
            actual.some(actualValue =>
                value.includes(actualValue) ||
                actualValue.includes(value)
            )
        );

    if (!matchesEnvironment) {
        findings.push(
            'The tool does not declare compatibility with the current environment.'
        );
    }

    if (item.category === 'luau-module' &&
        environment.language &&
        !/luau|lua/i.test(environment.language)) {
        findings.push('A Luau module requires a compatible Luau environment.');
    }

    if (item.category === 'npm-package' &&
        !environment.runtime) {
        findings.push('Node.js runtime version was not supplied.');
    }

    return {
        compatible: findings.length === 0,
        findings,
        environment: {
            runtime: clean(environment.runtime, 80),
            engine: clean(environment.engine, 80),
            language: clean(environment.language, 80),
            platform: clean(environment.platform, 80)
        }
    };
}

// ------------------------------------------------------------
// 11. INSTALLATION PLAN
// ------------------------------------------------------------

export function createInstallPlan(tool, options = {}) {
    const item = normalizeTool(tool);

    if (!item) {
        return {
            approved: false,
            reason: 'Invalid tool.'
        };
    }

    const security = auditToolSecurity(item);
    const license = checkLicense(item);

    const compatibility = checkCompatibility(
        item,
        options.environment || {}
    );

    const blockers = [];

    if (!item.url) {
        blockers.push('No verified source URL.');
    }

    if (!license.known) {
        blockers.push('Unknown license.');
    }

    if (!security.safe) {
        blockers.push('Security review required.');
    }

    if (!compatibility.compatible) {
        blockers.push('Compatibility not established.');
    }

    if (item.price !== 0 || !item.free) {
        blockers.push('Free status has not been established.');
    }

    if (item.category === 'roblox-asset' &&
        !item.official &&
        !item.verified) {
        blockers.push('Roblox asset publisher requires verification.');
    }

    return {
        tool: item.name,
        toolId: item.id,
        approved: blockers.length === 0 &&
            options.userApproved === true,
        readyForApproval: blockers.length === 0,
        requiresUserApproval: true,
        blockers,
        security,
        license,
        compatibility,
        steps: [
            'Review the official source.',
            'Read the license and usage restrictions.',
            'Inspect the package or asset contents.',
            'Verify version and integrity information.',
            'Review permissions and dependencies.',
            'Back up the current project.',
            'Obtain explicit user approval.',
            'Install through the appropriate trusted integration.',
            'Run QA Agent after installation.'
        ],
        execution: {
            automatic: false,
            executed: false,
            requiresExplicitApproval: true
        }
    };
}

// ------------------------------------------------------------
// 12. TOOL DEPENDENCY REVIEW
// ------------------------------------------------------------

export function auditDependencies(tool, knownTools = []) {
    const item = normalizeTool(tool);

    if (!item) {
        return {
            valid: false,
            dependencies: []
        };
    }

    const known = new Map(
        asArray(knownTools)
            .map(normalizeTool)
            .filter(Boolean)
            .map(tool => [tool.name.toLowerCase(), tool])
    );

    const dependencies = item.dependencies.map(name => {
        const found = known.get(name.toLowerCase());

        return {
            name,
            found: Boolean(found),
            license: found?.license || 'UNKNOWN',
            free: found?.free === true && found?.price === 0
        };
    });

    return {
        valid: dependencies.every(item => item.found),
        total: dependencies.length,
        missing: dependencies
            .filter(item => !item.found)
            .map(item => item.name),
        dependencies
    };
}

// ------------------------------------------------------------
// 13. DUPLICATE DETECTION
// ------------------------------------------------------------

export function detectDuplicateTools(tools = []) {
    const groups = new Map();

    for (const rawTool of asArray(tools)) {
        const tool = normalizeTool(rawTool);

        if (!tool) continue;

        const key = tool.name.toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(tool);
    }

    return [...groups.values()]
        .filter(group => group.length > 1)
        .map(group => ({
            name: group[0].name,
            matches: group.map(tool => ({
                id: tool.id,
                source: tool.source,
                url: tool.url
            }))
        }));
}

// ------------------------------------------------------------
// 14. AGENT TOOL REQUEST HANDLER
// ------------------------------------------------------------

export async function handleAgentToolRequest(request = {}) {
    const agent = clean(request.agent, 100);
    const task = clean(request.task, 500);
    const query = clean(request.query || task, CONFIG.maxQueryLength);

    if (!agent || !task) {
        return {
            success: false,
            error: 'Agent and task are required.'
        };
    }

    const allowedCategories = AGENT_CATEGORIES[agent] || [];

    const discovered = await discoverTools({
        query,
        providers: request.providers,
        categories: allowedCategories,
        freeOnly: request.freeOnly !== false,
        limit: 30
    });

    if (!discovered.success) {
        return {
            success: false,
            agent,
            query,
            results: [],
            errors: discovered.errors || [],
            message: discovered.error ||
                'No suitable tools were discovered.'
        };
    }

    const recommendations = recommendTools({
        agent,
        query,
        tools: discovered.results,
        freeOnly: request.freeOnly !== false,
        compatibility: request.compatibility,
        limit: 10
    });

    return {
        success: true,
        agent,
        task,
        recommendations,
        discoveryErrors: discovered.errors,
        requiresUserApproval: true
    };
}

// ------------------------------------------------------------
// 15. COMPLETE TOOL SCOUT REPORT
// ------------------------------------------------------------

export async function runToolScout(project = {}) {
    const requests = asArray(project.requests);

    const reports = [];

    for (const request of requests.slice(0, 30)) {
        const result = await handleAgentToolRequest({
            ...request,
            providers: project.providers,
            compatibility: project.environment
        });

        reports.push(result);
    }

    const allTools = reports.flatMap(report =>
        asArray(report.recommendations?.recommendations)
            .map(item => item.tool)
    );

    return {
        agent: 'Quruvchi MAX Tool Scout',
        version: VERSION,
        status: 'completed',
        project: clean(project.name || 'Untitled Game', 100),
        reports,
        summary: {
            requests: requests.length,
            successful: reports.filter(item => item.success).length,
            failed: reports.filter(item => !item.success).length,
            recommendedTools: allTools.length,
            freeTools: allTools.filter(item =>
                item.free && item.price === 0
            ).length
        },
        duplicates: detectDuplicateTools(allTools),
        installation: {
            executed: false,
            approvalRequired: true,
            note: 'Tool Scout only recommends tools. Installation requires an approved installer.'
        },
        timestamp: new Date().toISOString()
    };
}

// ------------------------------------------------------------
// 16. AGENT INFORMATION
// ------------------------------------------------------------

/** Synchronous compatibility facade for the original server orchestrator. */
export function scoutTools(input = []) {
    const query = clean((Array.isArray(input) ? input : [input]).join(' '), CONFIG.maxQueryLength).toLowerCase();
    const catalog = [
        { id: 'terrain', name: 'Roblox Terrain Engine', cost: 'free', tags: ['terrain', 'mountain', 'world', 'landscape'] },
        { id: 'ui', name: 'Roblox UI Builder', cost: 'free', tags: ['ui', 'interface', 'screen', 'button', 'panel'] },
        { id: 'modeling', name: 'Roblox Model Tools', cost: 'free', tags: ['model', 'building', 'object', 'part'] },
        { id: 'testing', name: 'Roblox Studio Test Tools', cost: 'free', tags: ['test', 'qa', 'debug', 'playtest'] }
    ];
    const terms = query.split(/[^a-z0-9а-яё‘’]+/i).filter(Boolean);
    const recommendations = catalog
        .map(item => ({ ...item, score: item.tags.reduce((sum, tag) => sum + (terms.some(term => tag.includes(term) || term.includes(tag)) ? 1 : 0), 0) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...item }) => item);
    return { success: true, query, total: recommendations.length, recommendations };
}

export function getToolScoutInfo() {
    return {
        name: 'Quruvchi MAX Tool Scout Agent',
        version: VERSION,
        status: 'ready',
        capabilities: [
            'Free tool discovery',
            'Roblox asset discovery',
            'Luau module discovery',
            'NPM package discovery',
            'License checking',
            'Security scanning',
            'Compatibility checking',
            'Free alternative discovery',
            'Dependency auditing',
            'Duplicate detection',
            'Agent-specific recommendations',
            'Installation planning'
        ],
        supportedCategories: [...CATEGORIES],
        connectedAgents: Object.keys(AGENT_CATEGORIES),
        security: {
            executesExternalCode: false,
            autoInstalls: false,
            unknownLicenseAllowed: false,
            explicitApprovalRequired: true
        },
        integrations: [
            'Catalog search adapters',
            'Approved package registries',
            'Roblox asset catalog adapters',
            'Internal tool catalog'
        ]
    };
}

// ------------------------------------------------------------
// END — QURUVCHI MAX TOOL SCOUT AGENT V2
// ============================================================
