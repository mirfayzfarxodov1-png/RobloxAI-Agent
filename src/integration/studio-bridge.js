/**
 * Quruvchi Studio integration boundary.
 *
 * This module is the only adapter between the existing specialist outputs
 * and the existing Studio plugin command protocol. It intentionally imports
 * no specialist agent or plugin source and never mutates their implementation.
 */

const MAX_PLUGIN_SOURCE = 100000;
const SUPPORTED_PLUGIN_COMMANDS = new Set([
  'create_tree',
  'create_script',
  'audit_project',
  'get_logs'
]);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(label + ' noto‘g‘ri formatda.');
  }
}

function assertTree(tree, label) {
  assertObject(tree, label);
  if (typeof tree.name !== 'string' || !tree.name.trim()) {
    throw new TypeError(label + '.name mavjud emas.');
  }
  if (tree.children !== undefined && !Array.isArray(tree.children)) {
    throw new TypeError(label + '.children massiv bo‘lishi kerak.');
  }
}

function assertSource(source, label) {
  if (typeof source !== 'string' || source.trim().length === 0) {
    throw new TypeError(label + ' bo‘sh.');
  }
  if (source.length > MAX_PLUGIN_SOURCE) {
    throw new RangeError(label + ' Studio Plugin limitidan oshdi.');
  }
}

function command(name, summary, input) {
  if (!SUPPORTED_PLUGIN_COMMANDS.has(name)) {
    throw new Error('Studio Plugin uchun noma’lum buyruq: ' + name);
  }
  return Object.freeze({ name, summary, input: Object.freeze(input) });
}

/**
 * Converts World/UI/Gameplay agent results into the plugin's established
 * create_tree/create_script/audit_project/get_logs request shapes.
 */
export function buildStudioCommandPlan(project, gameplayPlan) {
  assertObject(project, 'Project');
  assertObject(gameplayPlan, 'Gameplay Agent natijasi');
  if (gameplayPlan.ok !== true) {
    throw new Error('Gameplay Agent tekshiruvdan o‘tmagan; Studio buyruqlari yuborilmadi.');
  }

  assertTree(project.sceneTree, 'World Agent sceneTree');
  assertTree(project.uiTree, 'UI Agent uiTree');
  assertSource(project.uiSource, 'UI Agent LocalScript');
  assertSource(gameplayPlan.source, 'Gameplay Agent server Luau');

  const scriptPath = String(project.path || '');
  if (!scriptPath.startsWith('ServerScriptService/')) {
    throw new Error('Gameplay skripti ServerScriptService ichida bo‘lishi kerak.');
  }
  if (scriptPath.length > 240 || scriptPath.includes('..')) {
    throw new Error('Gameplay skript yo‘li xavfsiz emas.');
  }

  const commands = [
    command('create_tree', 'World Agent — xarita va 3D obyektlar', {
      parent: 'Workspace',
      tree: project.sceneTree
    }),
    command('create_tree', 'UI Agent — o‘yin ichidagi HUD va panellar', {
      parent: 'StarterGui',
      tree: project.uiTree
    }),
    command('create_script', 'UI Agent — tugmalar va panellar uchun LocalScript', {
      path: 'StarterGui/QuruvchiMAXUI/UIController.client.lua',
      className: 'LocalScript',
      source: project.uiSource
    }),
    command('create_script', 'Gameplay Agent — o‘yin mexanikasi', {
      path: scriptPath,
      className: 'Script',
      source: gameplayPlan.source
    }),
    command('audit_project', 'QA Agent — Studio loyihasini tekshirish', {
      path: 'game',
      maxNodes: 8000
    }),
    command('get_logs', 'QA Agent — Studio Output jurnalini tekshirish', {
      limit: 60,
      onlyErrors: true
    })
  ];

  return Object.freeze(commands);
}

/**
 * Executes commands in order through the existing authenticated hub queue.
 * Lifecycle callbacks keep the web chat's existing progress/result behavior.
 */
export async function executeStudioCommandPlan({
  userId,
  commands,
  signal,
  sendCommand,
  onCommand = () => {},
  onResult = () => {}
}) {
  if (typeof sendCommand !== 'function') {
    throw new TypeError('sendCommand callback talab qilinadi.');
  }
  if (!Array.isArray(commands)) {
    throw new TypeError('commands massiv bo‘lishi kerak.');
  }

  const results = [];
  for (const item of commands) {
    if (signal?.aborted) break;
    if (!item || !SUPPORTED_PLUGIN_COMMANDS.has(item.name)) {
      throw new Error('Studio Plugin command allowlist tekshiruvidan o‘tmadi.');
    }

    const toolId = globalThis.crypto?.randomUUID?.()
      || 'quruvchi-' + Date.now().toString(36) + '-' + results.length.toString(36);
    onCommand(item, toolId);

    let result;
    try {
      result = await sendCommand(userId, item.name, item.input, signal);
    } catch (error) {
      result = { ok: false, output: error?.message || 'Studio Plugin bilan aloqa xatosi' };
    }
    if (!result || typeof result !== 'object') {
      result = { ok: false, output: 'Studio Plugin noto‘g‘ri javob qaytardi.' };
    }

    const output = String(result.output ?? '');
    const normalized = { ...result, ok: result.ok === true, output };
    const record = { ...normalized, name: item.name, summary: item.summary };
    results.push(record);
    onResult({ command: item, toolId, result: normalized, output });
  }

  return results;
}
