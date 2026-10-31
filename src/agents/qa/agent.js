
// ============================================================
// QURUVCHI MAX — QA AGENT V2
// File: src/agents/qa/agent.js
// Runtime: Node.js ES Modules
//
// RESPONSIBILITIES:
// - Complete project quality assurance
// - Roblox Luau static analysis
// - World structure validation
// - Gameplay validation
// - UI validation
// - RemoteEvent security checks
// - Script dependency checks
// - Duplicate detection
// - Missing asset detection
// - Cross-agent integration checks
// - Automatic repair task generation
// - Studio test readiness
//
// IMPORTANT:
// This module analyzes project artifacts.
// It does not claim that a game was Play-tested unless
// actual Studio test evidence is supplied.
// ============================================================

const VERSION = '2.0.0';

const LIMITS = Object.freeze({
    maxFiles: 2000,
    maxFileSize: 500000,
    maxTotalSize: 20000000,
    maxPathLength: 240,
    maxIssues: 500,
    maxFindingsPerFile: 100
});

const SEVERITY = Object.freeze({
    critical: 5,
    error: 4,
    warning: 3,
    info: 2,
    success: 1
});

const AGENT_NAMES = Object.freeze([
    'Gameplay Agent',
    'World Generator',
    'UI Agent',
    'Script Agent',
    'Building Agent',
    'Data Agent',
    'Security Agent'
]);

// ------------------------------------------------------------
// 1. GENERAL UTILITIES
// ------------------------------------------------------------

function cleanText(value, max = 500) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function normalizePath(value) {
    return String(value ?? '')
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\/+/, '')
        .trim();
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function isObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value);
}

function matches(pattern, source) {
    pattern.lastIndex = 0;
    return pattern.test(source);
}

function makeIssue({
    id,
    title,
    description,
    severity = 'warning',
    file = null,
    line = null,
    category = 'general',
    recommendation = '',
    autoFixable = false
}) {
    return {
        id: cleanText(id, 100),
        title: cleanText(title, 180),
        description: cleanText(description, 1000),
        severity,
        category,
        file,
        line,
        recommendation: cleanText(recommendation, 1000),
        autoFixable: Boolean(autoFixable)
    };
}

// ------------------------------------------------------------
// 2. FILE NORMALIZATION
// ------------------------------------------------------------

function normalizeFiles(files) {

    return safeArray(files)
        .slice(0, LIMITS.maxFiles)
        .filter(isObject)
        .map((file, index) => {

            const path = normalizePath(
                file.path || file.name || `unknown-${index}.lua`
            );

            const content = typeof file.content === 'string'
                ? file.content
                : '';

            return {
                path: path.slice(0, LIMITS.maxPathLength),
                content: content.slice(0, LIMITS.maxFileSize),
                type: cleanText(file.type || '', 40),
                agent: cleanText(file.agent || '', 80),
                size: content.length,
                valid: Boolean(path) &&
                    !path.split('/').includes('..') &&
                    !path.includes('\0')
            };
        });
}

// ------------------------------------------------------------
// 3. FILE CLASSIFICATION
// ------------------------------------------------------------

function classifyFile(file) {

    const path = file.path.toLowerCase();

    if (/startergui|playergui/.test(path)) return 'ui';

    if (/workspace/.test(path)) return 'world';

    if (/replicatedstorage.*remote/.test(path)) return 'remotes';

    if (/server.*scriptservice|serverscriptservice/.test(path)) {
        return 'server';
    }

    if (/starterplayerscripts|startercharacterscripts/.test(path)) {
        return 'client';
    }

    if (/modules?|shared/.test(path)) return 'module';

    if (/tests?|specs?/.test(path)) return 'test';

    if (/\.(png|jpg|jpeg|rbxm|rbxmx|mesh|fbx)$/i.test(path)) {
        return 'asset';
    }

    if (/\.(lua|luau)$/i.test(path)) return 'script';

    return 'other';
}

// ------------------------------------------------------------
// 4. PROJECT STRUCTURE VALIDATION
// ------------------------------------------------------------

function checkProjectStructure(files, issues) {

    const paths = files.map(file => file.path.toLowerCase());

    const checks = [];

    const required = [
        {
            id: 'server',
            name: 'ServerScriptService',
            pattern: /serverscriptservice/
        },
        {
            id: 'replicated',
            name: 'ReplicatedStorage',
            pattern: /replicatedstorage/
        },
        {
            id: 'workspace',
            name: 'Workspace',
            pattern: /workspace/
        }
    ];

    for (const item of required) {

        const found = paths.some(path =>
            item.pattern.test(path)
        );

        checks.push({
            id: item.id,
            name: item.name,
            passed: found
        });

        if (!found) {
            issues.push(makeIssue({
                id: `structure-${item.id}`,
                title: `Missing ${item.name}`,
                description: `The project does not contain a recognized ${item.name} artifact.`,
                severity: 'warning',
                category: 'structure',
                recommendation: `Create or register the required ${item.name} structure.`
            }));
        }
    }

    const invalid = files.filter(file => !file.valid);

    for (const file of invalid) {
        issues.push(makeIssue({
            id: 'invalid-file-path',
            title: 'Invalid file path',
            description: `Unsafe or invalid path: ${file.path}`,
            severity: 'critical',
            file: file.path,
            category: 'structure',
            recommendation: 'Use a normalized relative project path without parent-directory traversal.'
        }));
    }

    return checks;
}

// ------------------------------------------------------------
// 5. LUAAU SOURCE ANALYSIS
// ------------------------------------------------------------

function analyzeLuau(source) {

    const lines = source.split(/\r?\n/);

    const counts = {
        functions: 0,
        localFunctions: 0,
        events: 0,
        loops: 0,
        conditionals: 0,
        instances: 0,
        remoteEvents: 0,
        remoteFunctions: 0,
        services: 0,
        requires: 0,
        comments: 0
    };

    for (const line of lines) {

        if (/^\s*--/.test(line)) {
            counts.comments++;
        }

        if (/\bfunction\b/.test(line)) counts.functions++;

        if (/\blocal\s+function\b/.test(line)) {
            counts.localFunctions++;
        }

        if (/\.Connect\s*\(/.test(line)) counts.events++;

        if (/\bwhile\b|\bfor\b/.test(line)) counts.loops++;

        if (/\bif\b/.test(line)) counts.conditionals++;

        if (/Instance\.new\s*\(/.test(line)) counts.instances++;

        if (/RemoteEvent/.test(line)) counts.remoteEvents++;

        if (/RemoteFunction/.test(line)) counts.remoteFunctions++;

        if (/GetService\s*\(/.test(line)) counts.services++;

    }

    counts.requires = (source.match(/\brequire\s*\(/g) || []).length;

    const suspicious = [];

    const rules = [
        {
            id: 'loadstring',
            pattern: /\bloadstring\s*\(/,
            severity: 'critical',
            message: 'Dynamic code execution detected.'
        },
        {
            id: 'global-state',
            pattern: /\b_G\s*(?:\[|\.|\=)/,
            severity: 'error',
            message: 'Shared global state detected.'
        },
        {
            id: 'wait-deprecated',
            pattern: /\bwait\s*\(/,
            severity: 'warning',
            message: 'Legacy wait() detected; prefer task.wait().'
        },
        {
            id: 'spawn-deprecated',
            pattern: /\bspawn\s*\(/,
            severity: 'warning',
            message: 'Legacy spawn() detected; review task scheduling.'
        },
        {
            id: 'delay-deprecated',
            pattern: /\bdelay\s*\(/,
            severity: 'warning',
            message: 'Legacy delay() detected; prefer task.delay().'
        },
        {
            id: 'infinite-loop',
            pattern: /while\s+true\s+do/,
            severity: 'warning',
            message: 'Infinite loop found. Verify that it yields and has an exit strategy.'
        },
        {
            id: 'client-authority',
            pattern: /LocalPlayer[\s\S]{0,300}(?:Coins|Cash|Money|Gold)\s*\.\s*Value\s*=/i,
            severity: 'error',
            message: 'Client-side currency modification detected.'
        },
        {
            id: 'unprotected-datastore',
            pattern: /(?:GetAsync|SetAsync|UpdateAsync)\s*\(/,
            severity: 'warning',
            message: 'Review DataStore error handling and retry strategy.'
        },
        {
            id: 'deprecated-body-mover',
            pattern: /\bBodyVelocity\b|\bBodyPosition\b/,
            severity: 'info',
            message: 'Legacy body mover detected. Consider modern constraints.'
        }
    ];

    for (const rule of rules) {

        if (matches(rule.pattern, source)) {
            suspicious.push({
                id: rule.id,
                severity: rule.severity,
                message: rule.message
            });
        }
    }

    return {
        lineCount: lines.length,
        counts,
        suspicious,
        hasComments: counts.comments > 0,
        hasFunctions: counts.functions > 0,
        hasEvents: counts.events > 0,
        hasRemoteCommunication:
            counts.remoteEvents > 0 ||
            counts.remoteFunctions > 0
    };
}

// ------------------------------------------------------------
// 6. SOURCE FILE QUALITY CHECKS
// ------------------------------------------------------------

function checkScriptFile(file, issues) {

    const source = file.content;

    if (!source.trim()) {

        issues.push(makeIssue({
            id: 'empty-script',
            title: 'Empty script',
            description: 'Script file contains no source code.',
            severity: 'error',
            file: file.path,
            category: 'code',
            recommendation: 'Generate the missing implementation or remove the unused file.'
        }));

        return null;
    }

    const analysis = analyzeLuau(source);

    for (const item of analysis.suspicious) {

        issues.push(makeIssue({
            id: `luau-${item.id}`,
            title: item.id.replace(/-/g, ' '),
            description: item.message,
            severity: item.severity,
            file: file.path,
            category: 'code',
            recommendation: 'Review and correct this implementation pattern.'
        }));
    }

    if (source.length > 100000) {

        issues.push(makeIssue({
            id: 'large-script',
            title: 'Very large script',
            description: 'This script exceeds 100 KB.',
            severity: 'warning',
            file: file.path,
            category: 'maintainability',
            recommendation: 'Split the implementation into focused ModuleScripts.'
        }));
    }

    if (!analysis.hasComments && source.length > 3000) {

        issues.push(makeIssue({
            id: 'missing-comments',
            title: 'Missing code documentation',
            description: 'A large script contains no comment lines.',
            severity: 'info',
            file: file.path,
            category: 'maintainability',
            recommendation: 'Document important systems, dependencies and public functions.'
        }));
    }

    return analysis;
}

// ------------------------------------------------------------
// 7. DUPLICATE FILE DETECTION
// ------------------------------------------------------------

function detectDuplicateFiles(files, issues) {

    const seen = new Map();

    for (const file of files) {

        if (!file.content) continue;

        const key = file.content.trim();

        if (key.length < 100) continue;

        if (seen.has(key)) {

            issues.push(makeIssue({
                id: 'duplicate-script',
                title: 'Duplicate file content',
                description: `This file has identical content to ${seen.get(key)}.`,
                severity: 'warning',
                file: file.path,
                category: 'maintainability',
                recommendation: 'Keep one authoritative implementation and reference it from other scripts.'
            }));

        } else {
            seen.set(key, file.path);
        }
    }
}

// ------------------------------------------------------------
// 8. REMOTE EVENT SECURITY
// ------------------------------------------------------------

function auditRemoteSecurity(files, issues) {

    const results = [];

    for (const file of files) {

        if (!/\.(lua|luau)$/i.test(file.path)) continue;

        const source = file.content;

        if (!/OnServerEvent/.test(source)) continue;

        const hasPlayerArgument =
            /OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(\s*\w+/.test(source);

        const hasValidation =
            /\btypeof\s*\(|\btype\s*\(|\bassert\s*\(|\bmath\.clamp\s*\(/.test(source);

        const hasRateLimit =
            /cooldown|lastRequest|lastAction|rateLimit|rateLimit/i.test(source);

        const hasServerReward =
            /(?:Coins|Cash|Gold|Money)\s*\.\s*Value\s*[+\-]?=/.test(source);

        const result = {
            file: file.path,
            hasPlayerArgument,
            hasValidation,
            hasRateLimit,
            hasServerReward
        };

        results.push(result);

        if (!hasValidation) {
            issues.push(makeIssue({
                id: 'remote-no-validation',
                title: 'RemoteEvent validation not detected',
                description: 'The server receives remote input but obvious argument validation was not found.',
                severity: 'warning',
                file: file.path,
                category: 'security',
                recommendation: 'Validate argument types, ranges, ownership and object references on the server.'
            }));
        }

        if (!hasRateLimit) {
            issues.push(makeIssue({
                id: 'remote-no-rate-limit',
                title: 'RemoteEvent rate limit not detected',
                description: 'No obvious cooldown or rate limiter was found.',
                severity: 'warning',
                file: file.path,
                category: 'security',
                recommendation: 'Add per-player rate limiting to prevent request spam.'
            }));
        }
    }

    return results;
}

// ------------------------------------------------------------
// 9. REQUIRE DEPENDENCY CHECK
// ------------------------------------------------------------

function auditDependencies(files, issues) {

    const knownPaths = new Set(
        files.map(file => file.path.toLowerCase())
    );

    const dependencies = [];

    for (const file of files) {

        const regex = /require\s*\(\s*script(?:\.Parent)*(?:\.(\w+))*/g;

        let match;

        while ((match = regex.exec(file.content)) !== null) {

            const dependency = match[0];

            dependencies.push({
                file: file.path,
                expression: dependency,
                resolved: null
            });
        }

        const moduleNames = [
            ...file.content.matchAll(
                /require\s*\(\s*game:GetService\s*\(\s*["']ReplicatedStorage["']\s*\)[^)]*\)/g
            )
        ];

        for (const item of moduleNames) {
            dependencies.push({
                file: file.path,
                expression: item[0],
                resolved: 'needs-runtime-verification'
            });
        }
    }

    for (const dependency of dependencies) {

        if (dependency.resolved === 'needs-runtime-verification') {
            continue;
        }

        const localParentReference =
            /script\.Parent/.test(dependency.expression);

        if (localParentReference) {
            dependency.resolved = 'relative-module-reference';
        }
    }

    return {
        dependencies,
        knownPathCount: knownPaths.size,
        note: 'Dynamic Roblox require references need Studio-side verification.'
    };
}

// ------------------------------------------------------------
// 10. UI QUALITY CHECKS
// ------------------------------------------------------------

function auditUI(files, issues) {

    const uiFiles = files.filter(file =>
        classifyFile(file) === 'ui' ||
        /ScreenGui|PlayerGui/.test(file.content)
    );

    const results = [];

    for (const file of uiFiles) {

        const source = file.content;

        const hasScreenGui = /ScreenGui/.test(source);

        const hasInteractiveButton =
            /TextButton|ImageButton/.test(source);

        const hasResponsiveSizing =
            /UDim2\.fromScale|Scale\s*=|AnchorPoint/.test(source);

        const hasInputHandler =
            /\.Activated|MouseButton1Click/.test(source);

        const hasLayout =
            /UIListLayout|UIGridLayout|UIPadding|UIAspectRatioConstraint/.test(source);

        results.push({
            file: file.path,
            hasScreenGui,
            hasInteractiveButton,
            hasResponsiveSizing,
            hasInputHandler,
            hasLayout
        });

        if (hasInteractiveButton && !hasInputHandler) {
            issues.push(makeIssue({
                id: 'ui-inert-button',
                title: 'Button interaction not detected',
                description: 'UI contains a button but no obvious click or activation handler.',
                severity: 'warning',
                file: file.path,
                category: 'ui',
                recommendation: 'Connect the button to its intended action and handle its state.'
            }));
        }

        if (hasScreenGui && !hasResponsiveSizing) {
            issues.push(makeIssue({
                id: 'ui-responsive',
                title: 'Responsive sizing not detected',
                description: 'The interface may not adapt well to different screen sizes.',
                severity: 'warning',
                file: file.path,
                category: 'ui',
                recommendation: 'Use Scale sizing, constraints and layout objects where appropriate.'
            }));
        }

        if (hasInteractiveButton && !hasLayout) {
            issues.push(makeIssue({
                id: 'ui-layout',
                title: 'Layout management not detected',
                description: 'No common UI layout component was detected.',
                severity: 'info',
                file: file.path,
                category: 'ui',
                recommendation: 'Review spacing, alignment and responsive layout.'
            }));
        }
    }

    return results;
}

// ------------------------------------------------------------
// 11. WORLD GENERATOR QUALITY CHECKS
// ------------------------------------------------------------

function auditWorld(files, issues) {

    const worldFiles = files.filter(file =>
        classifyFile(file) === 'world' ||
        /QuruvchiFreeWorld|WorldGenerator/i.test(file.content)
    );

    const results = [];

    for (const file of worldFiles) {

        const source = file.content;

        const result = {
            file: file.path,
            hasWorldRoot: /QuruvchiFreeWorld|WorldRoot/.test(source),
            hasParts: /Instance\.new\s*\(\s*["']Part["']\s*\)/.test(source),
            hasModels: /Instance\.new\s*\(\s*["']Model["']\s*\)/.test(source),
            hasPositioning: /CFrame|Position|PivotTo/.test(source),
            hasAnchoring: /Anchored\s*=/.test(source),
            hasCollisionSettings: /CanCollide\s*=/.test(source),
            hasSpawn: /SpawnLocation|SpawnPoint|PlayerSpawn/.test(source),
            hasCleanup: /Destroy\(\)/.test(source)
        };

        results.push(result);

        if (!result.hasPositioning && result.hasParts) {
            issues.push(makeIssue({
                id: 'world-no-positioning',
                title: 'World positioning not detected',
                description: 'Parts are created without an obvious positioning operation.',
                severity: 'warning',
                file: file.path,
                category: 'world',
                recommendation: 'Assign deliberate positions or transforms to generated objects.'
            }));
        }

        if (result.hasParts && !result.hasAnchoring) {
            issues.push(makeIssue({
                id: 'world-anchor',
                title: 'Anchoring not detected',
                description: 'Generated parts may move unexpectedly if they are intended to be static.',
                severity: 'warning',
                file: file.path,
                category: 'world',
                recommendation: 'Anchor static environment parts.'
            }));
        }

        if (!result.hasSpawn) {
            issues.push(makeIssue({
                id: 'world-spawn',
                title: 'Spawn point not detected',
                description: 'No obvious player spawn implementation was found.',
                severity: 'warning',
                file: file.path,
                category: 'world',
                recommendation: 'Create a valid spawn point and verify that players can reach the playable area.'
            }));
        }
    }

    return results;
}

// ------------------------------------------------------------
// 12. CROSS-AGENT INTEGRATION
// ------------------------------------------------------------

function auditAgentIntegration(project, issues) {

    const agents = safeArray(project.agents);

    const completed = agents
        .filter(item => isObject(item) && item.status === 'completed')
        .map(item => cleanText(item.name, 80));

    const failed = agents
        .filter(item => isObject(item) && item.status === 'failed')
        .map(item => cleanText(item.name, 80));

    const pending = agents
        .filter(item => isObject(item) && item.status === 'pending')
        .map(item => cleanText(item.name, 80));

    for (const name of failed) {
        issues.push(makeIssue({
            id: 'agent-failed',
            title: `${name} failed`,
            description: `The ${name} did not complete its assigned task.`,
            severity: 'error',
            category: 'integration',
            recommendation: 'Send a repair task to the responsible agent.'
        }));
    }

    for (const name of pending) {
        issues.push(makeIssue({
            id: 'agent-pending',
            title: `${name} is pending`,
            description: `The ${name} has not completed its assigned task.`,
            severity: 'warning',
            category: 'integration',
            recommendation: 'Complete the assigned task before final QA approval.'
        }));
    }

    return {
        completed: unique(completed),
        failed: unique(failed),
        pending: unique(pending),
        knownAgents: [...AGENT_NAMES]
    };
}

// ------------------------------------------------------------
// 13. PROJECT REQUIREMENT COVERAGE
// ------------------------------------------------------------

function auditRequirements(project, files, issues) {

    const requirements = safeArray(project.requirements)
        .map(item => {
            if (typeof item === 'string') return cleanText(item, 300);

            if (isObject(item)) {
                return cleanText(item.description || item.name, 300);
            }

            return '';
        })
        .filter(Boolean);

    const corpus = files
        .map(file => file.content)
        .join('\n')
        .toLowerCase();

    const results = requirements.map(requirement => {

        const terms = requirement
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3);

        const matched = terms.filter(term =>
            corpus.includes(term)
        );

        const coverage = terms.length
            ? matched.length / terms.length
            : 0;

        return {
            requirement,
            coverage: Math.round(coverage * 100),
            matchedTerms: matched,
            status: coverage >= 0.6 ? 'possible-match' : 'not-detected'
        };
    });

    for (const item of results) {

        if (item.status === 'not-detected') {
            issues.push(makeIssue({
                id: 'requirement-not-detected',
                title: 'Requirement not detected',
                description: item.requirement,
                severity: 'warning',
                category: 'requirements',
                recommendation: 'Ask the responsible agent to implement and provide evidence for this requirement.'
            }));
        }
    }

    return results;
}

// ------------------------------------------------------------
// 14. PERFORMANCE REVIEW
// ------------------------------------------------------------

function auditPerformance(files, issues) {

    const results = [];

    for (const file of files) {

        if (!/\.(lua|luau)$/i.test(file.path)) continue;

        const source = file.content;

        const result = {
            file: file.path,
            hasRunService: /RunService/.test(source),
            hasHeartbeat: /Heartbeat/.test(source),
            hasRenderStepped: /RenderStepped/.test(source),
            hasWaitForChild: /WaitForChild/.test(source),
            hasDisconnect: /Disconnect\(\)/.test(source),
            hasDestroy: /Destroy\(\)/.test(source)
        };

        results.push(result);

        if (result.hasHeartbeat && !result.hasDisconnect) {
            issues.push(makeIssue({
                id: 'performance-heartbeat',
                title: 'Heartbeat cleanup not detected',
                description: 'Heartbeat connections may remain active longer than intended.',
                severity: 'warning',
                file: file.path,
                category: 'performance',
                recommendation: 'Store connection references and disconnect them when no longer needed.'
            }));
        }

        if ((source.match(/Instance\.new\s*\(/g) || []).length > 100) {
            issues.push(makeIssue({
                id: 'performance-instance-count',
                title: 'High instance creation count',
                description: 'This script creates more than 100 instances in its source.',
                severity: 'info',
                file: file.path,
                category: 'performance',
                recommendation: 'Review object count, reuse opportunities and generation performance.'
            }));
        }
    }

    return results;
}

// ------------------------------------------------------------
// 15. AUTOMATIC REPAIR TASK GENERATION
// ------------------------------------------------------------

function createRepairTasks(issues) {

    const grouped = new Map();

    for (const issue of issues) {

        if (issue.severity === 'info' ||
            issue.severity === 'success') {
            continue;
        }

        const owner = issue.file || 'project';

        if (!grouped.has(owner)) {
            grouped.set(owner, []);
        }

        grouped.get(owner).push(issue);
    }

    const tasks = [];

    for (const [file, fileIssues] of grouped.entries()) {

        const critical = fileIssues.filter(item =>
            item.severity === 'critical' ||
            item.severity === 'error'
        );

        const warnings = fileIssues.filter(item =>
            item.severity === 'warning'
        );

        tasks.push({
            id: `repair-${tasks.length + 1}`,
            target: file,
            priority: critical.length ? 'high' : 'normal',
            assignedAgent: determineResponsibleAgent(file, fileIssues),
            task: 'Repair identified quality issues without removing existing working functionality.',
            issues: fileIssues.map(item => ({
                id: item.id,
                title: item.title,
                severity: item.severity,
                recommendation: item.recommendation
            })),
            instructions: [
                'Read the complete existing file before editing.',
                'Preserve working features.',
                'Fix only the identified problems.',
                'Do not create duplicate systems.',
                'Maintain server-authoritative gameplay.',
                'Preserve existing project interfaces and exports.',
                'Return the complete updated file.',
                'Run QA again after repair.'
            ],
            counts: {
                critical: fileIssues.filter(item => item.severity === 'critical').length,
                errors: critical.length,
                warnings: warnings.length
            }
        });
    }

    return tasks;
}

function determineResponsibleAgent(file, issues) {

    const categories = issues.map(item => item.category);

    if (categories.includes('ui')) return 'UI Agent';

    if (categories.includes('world')) return 'World Generator';

    if (categories.includes('security')) return 'Security Agent';

    if (categories.includes('code')) return 'Gameplay Agent';

    if (/workspace/i.test(file)) return 'World Generator';

    if (/startergui/i.test(file)) return 'UI Agent';

    return 'Script Agent';
}

// ------------------------------------------------------------
// 16. QA SCORE
// ------------------------------------------------------------

function calculateScore(issues, files) {

    if (!files.length) return 0;

    let score = 100;

    for (const issue of issues) {

        switch (issue.severity) {
            case 'critical':
                score -= 25;
                break;
            case 'error':
                score -= 12;
                break;
            case 'warning':
                score -= 4;
                break;
            case 'info':
                score -= 1;
                break;
        }
    }

    return Math.max(0, Math.min(100, score));
}

function calculateStatus(score, issues, evidence) {

    const critical = issues.some(item =>
        item.severity === 'critical'
    );

    const errors = issues.some(item =>
        item.severity === 'error'
    );

    if (!filesExist(evidence)) return 'incomplete';

    if (critical) return 'blocked';

    if (errors) return 'failed';

    if (score < 75) return 'needs-improvement';

    if (!evidence.studioPlayTestPassed) {
        return 'static-check-passed';
    }

    return 'playtest-passed';
}

function filesExist(evidence) {
    return evidence.fileCount > 0;
}

// ------------------------------------------------------------
// 17. MAIN QA ENGINE
// ------------------------------------------------------------

export function runQAAudit(project = {}) {

    const issues = [];

    const files = normalizeFiles(project.files);

    const totalSize = files.reduce(
        (sum, file) => sum + file.size,
        0
    );

    // Input limits.

    if (files.length > LIMITS.maxFiles) {
        issues.push(makeIssue({
            id: 'file-limit',
            title: 'File limit exceeded',
            description: 'Project contains more files than the configured QA limit.',
            severity: 'critical',
            category: 'limits',
            recommendation: 'Split the audit into smaller project batches.'
        }));
    }

    if (totalSize > LIMITS.maxTotalSize) {
        issues.push(makeIssue({
            id: 'project-size-limit',
            title: 'Project size limit exceeded',
            description: 'Total supplied source size exceeds the QA limit.',
            severity: 'critical',
            category: 'limits',
            recommendation: 'Audit smaller batches of files.'
        }));
    }

    // File classification.

    const inventory = files.map(file => ({
        path: file.path,
        type: classifyFile(file),
        size: file.size,
        agent: file.agent
    }));

    // Run individual checks.

    const structureChecks = checkProjectStructure(files, issues);

    const scriptAnalysis = [];

    for (const file of files) {

        if (/\.(lua|luau)$/i.test(file.path)) {

            const result = checkScriptFile(file, issues);

            if (result) {
                scriptAnalysis.push({
                    path: file.path,
                    ...result
                });
            }
        }
    }

    detectDuplicateFiles(files, issues);

    const remoteAudit = auditRemoteSecurity(files, issues);

    const dependencyAudit = auditDependencies(files, issues);

    const uiAudit = auditUI(files, issues);

    const worldAudit = auditWorld(files, issues);

    const performanceAudit = auditPerformance(files, issues);

    const integrationAudit = auditAgentIntegration(project, issues);

    const requirementAudit = auditRequirements(
        project,
        files,
        issues
    );

    // Bound issue count.

    const finalIssues = issues.slice(0, LIMITS.maxIssues);

    const score = calculateScore(finalIssues, files);

    const evidence = {
        fileCount: files.length,
        studioConnected: Boolean(project.studio?.connected),
        studioPlayTestPassed: Boolean(project.studio?.playTestPassed),
        outputErrors: safeArray(project.studio?.outputErrors),
        runtimeEvidence: Boolean(project.studio?.runtimeEvidence)
    };

    const status = calculateStatus(
        score,
        finalIssues,
        evidence
    );

    const repairTasks = createRepairTasks(finalIssues);

    const counts = {
        total: finalIssues.length,
        critical: finalIssues.filter(item => item.severity === 'critical').length,
        errors: finalIssues.filter(item => item.severity === 'error').length,
        warnings: finalIssues.filter(item => item.severity === 'warning').length,
        info: finalIssues.filter(item => item.severity === 'info').length
    };

    return {

        // Main result.

        agent: 'Quruvchi MAX QA Agent',
        version: VERSION,
        status,
        score,
        passed: status === 'playtest-passed',
        readyForPlayTest:
            status === 'static-check-passed' ||
            status === 'playtest-passed',

        // Project details.

        project: {
            name: cleanText(project.name || 'Untitled Game', 100),
            id: cleanText(project.id || '', 100),
            fileCount: files.length,
            totalSize,
            scriptCount: inventory.filter(item =>
                item.type === 'script'
            ).length
        },

        // Reports.

        summary: {
            message: createSummary(status, counts, score),
            counts
        },

        inventory,
        structureChecks,
        scriptAnalysis,
        remoteAudit,
        dependencyAudit,
        uiAudit,
        worldAudit,
        performanceAudit,
        integrationAudit,
        requirementAudit,

        issues: finalIssues,
        repairTasks,

        // Actual Studio verification.

        studio: {
            connected: evidence.studioConnected,
            playTestPassed: evidence.studioPlayTestPassed,
            runtimeEvidence: evidence.runtimeEvidence,
            outputErrors: evidence.outputErrors,
            verified: evidence.studioPlayTestPassed &&
                evidence.runtimeEvidence,
            note: evidence.studioPlayTestPassed
                ? 'Studio test evidence supplied.'
                : 'Static analysis is not a substitute for Roblox Studio Play-test.'
        },

        // Recommended next action.

        nextAction: repairTasks.length
            ? 'repair'
            : status === 'static-check-passed'
                ? 'request-studio-playtest'
                : status === 'playtest-passed'
                    ? 'complete'
                    : 'investigate',

        timestamp: new Date().toISOString()
    };
}

// ------------------------------------------------------------
// 18. QA SUMMARY
// ------------------------------------------------------------

function createSummary(status, counts, score) {

    const messages = {
        incomplete: 'Insufficient project artifacts for QA.',
        blocked: 'Critical security or implementation issues found.',
        failed: 'One or more important checks failed.',
        'needs-improvement': 'Project requires additional improvements.',
        'static-check-passed': 'Static QA passed. Studio Play-test is still required.',
        'playtest-passed': 'Static QA and supplied Studio Play-test evidence passed.'
    };

    return {
        status,
        score,
        text: messages[status] || messages.incomplete,
        criticalIssues: counts.critical,
        errors: counts.errors,
        warnings: counts.warnings
    };
}

// ------------------------------------------------------------
// 19. REPAIR VERIFICATION
// ------------------------------------------------------------

/** Compatibility adapter used by the legacy agent orchestrator and Free Builder tests. */
export function auditGeneratedProject(project = {}) {
    const files = Array.isArray(project.files) ? [...project.files] : [];
    if (typeof project.source === 'string' && project.source.trim()) {
        files.push({ path: project.path || 'ServerScriptService/Quruvchi/Gameplay.server.lua', content: project.source, agent: 'Gameplay Agent' });
    }
    if (typeof project.uiSource === 'string' && project.uiSource.trim()) {
        files.push({ path: 'StarterGui/QuruvchiMAXUI/UIController.client.lua', content: project.uiSource, agent: 'UI Agent' });
    }
    if (project.sceneTree) {
        files.push({ path: 'Workspace/QuruvchiFreeWorld/World.model.json', content: JSON.stringify(project.sceneTree), agent: 'World Agent' });
    }
    const report = runQAAudit({ ...project, files });
    const errors = report.issues.filter(issue => issue.severity === 'critical' || issue.severity === 'error');
    const countNodes = (node) => 1 + (Array.isArray(node?.children) ? node.children.reduce((sum, child) => sum + countNodes(child), 0) : 0);
    return {
        ok: errors.length === 0,
        errors: errors.map(issue => issue.title + ': ' + issue.description),
        warnings: report.issues.filter(issue => issue.severity === 'warning'),
        nodeCount: project.sceneTree ? countNodes(project.sceneTree) : 0,
        // Stable compatibility contract consumed by src/agent.js.
        agents: ['World Agent', 'UI Agent', 'Gameplay Agent', 'Tool Scout', 'QA Agent'],
        report
    };
}

export function verifyQAFixes(previousReport, updatedProject) {

    const nextReport = runQAAudit(updatedProject);

    const oldIssues = safeArray(previousReport?.issues);

    const newIssues = nextReport.issues;

    const oldIds = new Set(oldIssues.map(item =>
        `${item.id}:${item.file || ''}`
    ));

    const newIds = new Set(newIssues.map(item =>
        `${item.id}:${item.file || ''}`
    ));

    const fixed = [...oldIds].filter(id =>
        !newIds.has(id)
    );

    const remaining = [...newIds].filter(id =>
        oldIds.has(id)
    );

    const introduced = [...newIds].filter(id =>
        !oldIds.has(id)
    );

    return {
        agent: 'Quruvchi MAX QA Agent',
        version: VERSION,
        success: introduced.length === 0 &&
            remaining.length === 0,
        previousScore: previousReport?.score ?? 0,
        currentScore: nextReport.score,
        fixed,
        remaining,
        introduced,
        newReport: nextReport,
        recommendation: introduced.length
            ? 'New issues were introduced. Review the latest changes.'
            : remaining.length
                ? 'Some previous issues still remain.'
                : 'Previously detected issues are no longer present in this audit.'
    };
}

// ------------------------------------------------------------
// 20. GAMEPLAY TEST PLAN
// ------------------------------------------------------------

export function createGameplayTestPlan(project = {}) {

    const requirements = safeArray(project.requirements);

    const features = safeArray(project.features);

    const cases = [
        {
            id: 'QA-001',
            name: 'Player joining',
            category: 'lifecycle',
            steps: [
                'Start the experience.',
                'Join as a player.',
                'Verify character spawning.',
                'Verify player initialization.'
            ],
            expected: 'Player initializes without errors.'
        },
        {
            id: 'QA-002',
            name: 'Player leaving',
            category: 'lifecycle',
            steps: [
                'Join the experience.',
                'Leave the experience.',
                'Inspect server state.',
                'Check cleanup behavior.'
            ],
            expected: 'Player resources and connections are cleaned up.'
        },
        {
            id: 'QA-003',
            name: 'Gameplay interaction',
            category: 'gameplay',
            steps: [
                'Perform the main gameplay action.',
                'Repeat the action.',
                'Verify the expected result.',
                'Inspect server output.'
            ],
            expected: 'Gameplay behaves according to the requested mechanics.'
        },
        {
            id: 'QA-004',
            name: 'Invalid remote input',
            category: 'security',
            steps: [
                'Test invalid argument types in a controlled test environment.',
                'Test out-of-range values.',
                'Check server validation.',
                'Verify that unauthorized rewards are rejected.'
            ],
            expected: 'Invalid requests are rejected by the server.'
        },
        {
            id: 'QA-005',
            name: 'UI interaction',
            category: 'ui',
            steps: [
                'Open the game interface.',
                'Activate each important button.',
                'Check visual feedback.',
                'Check different viewport sizes.'
            ],
            expected: 'Interface controls work and layout remains usable.'
        },
        {
            id: 'QA-006',
            name: 'Performance',
            category: 'performance',
            steps: [
                'Run the game.',
                'Inspect object counts.',
                'Observe frame stability.',
                'Check connection cleanup.'
            ],
            expected: 'No obvious runaway loops or uncontrolled object creation.'
        },
        {
            id: 'QA-007',
            name: 'Multiplayer',
            category: 'multiplayer',
            steps: [
                'Start a two-player test.',
                'Perform simultaneous interactions.',
                'Verify player ownership.',
                'Check shared game state.'
            ],
            expected: 'Players cannot modify each other’s unauthorized state.'
        },
        {
            id: 'QA-008',
            name: 'Progression',
            category: 'progression',
            steps: [
                'Complete a progression action.',
                'Verify the reward.',
                'Rejoin the experience if saving is implemented.',
                'Verify restored progression.'
            ],
            expected: 'Progression is consistent with the implemented save system.'
        }
    ];

    if (requirements.length) {
        cases.push({
            id: 'QA-009',
            name: 'Original user requirements',
            category: 'requirements',
            steps: requirements.map(item =>
                typeof item === 'string'
                    ? cleanText(item, 300)
                    : cleanText(item.description || item.name, 300)
            ).filter(Boolean),
            expected: 'All requested requirements are implemented and verified.'
        });
    }

    if (features.length) {
        cases.push({
            id: 'QA-010',
            name: 'Feature-specific testing',
            category: 'features',
            steps: features.map(item =>
                cleanText(
                    typeof item === 'string'
                        ? item
                        : item.name || item.id,
                    200
                )
            ),
            expected: 'Every requested feature works as intended.'
        });
    }

    return {
        agent: 'Quruvchi MAX QA Agent',
        version: VERSION,
        testCount: cases.length,
        tests: cases,
        execution: {
            automatic: false,
            requiresRobloxStudio: true,
            multiplayerTesting: true,
            outputInspection: true
        }
    };
}

// ------------------------------------------------------------
// 21. QA AGENT CAPABILITIES
// ------------------------------------------------------------

export function getQAAgentInfo() {

    return {
        name: 'Quruvchi MAX QA Agent',
        version: VERSION,
        status: 'ready',
        capabilities: [
            'Complete project static analysis',
            'Luau source inspection',
            'Project structure validation',
            'RemoteEvent security auditing',
            'UI quality checks',
            'World Generator checks',
            'Duplicate source detection',
            'Dependency inventory',
            'Performance pattern detection',
            'Agent integration monitoring',
            'Requirement coverage analysis',
            'Automatic repair task generation',
            'Repair verification',
            'Roblox Studio test plan generation'
        ],
        supportedInputs: [
            'files',
            'agents',
            'requirements',
            'features',
            'studio test evidence'
        ],
        outputs: [
            'QA score',
            'Project status',
            'Issue list',
            'Repair tasks',
            'Test plan',
            'Integration report'
        ],
        limitations: [
            'Does not execute Luau in Roblox runtime.',
            'Does not independently inspect live Studio Explorer.',
            'Static source checks can produce false positives.',
            'Real multiplayer behavior needs Studio testing.',
            'Play-test success requires supplied test evidence.'
        ]
    };
}

// ------------------------------------------------------------
// 22. MAIN COMPATIBILITY EXPORT
// ------------------------------------------------------------

export function buildQAPlan(project = {}) {

    const report = runQAAudit(project);

    return {
        ...report,
        qaVersion: VERSION,
        requiresRepair: report.repairTasks.length > 0,
        approved: report.status === 'playtest-passed'
    };
}

// ------------------------------------------------------------
// END OF QURUVCHI MAX QA AGENT V2
// ============================================================
