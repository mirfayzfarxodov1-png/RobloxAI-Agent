import crypto from 'node:crypto';
import { config } from './config.js';
import { db, currentConversation, saveMessage, getMessages, addUsage, getUsage, getTaskPause, setTaskPause, clearTaskPause } from './db.js';
import { buildFreeProject } from './free-builder.js';
import { emit, sendCommand, statusForUser, setUserRunning, stateForUser } from './hub.js';

const running = new Map();

function textBlock(text) { return [{ type: 'text', text }]; }
function emitText(userId, content) {
  for (const block of content || []) {
    if (block?.type === 'text' && block.text) emit(userId, 'message', { id: crypto.randomUUID(), kind: 'assistant', text: block.text });
  }
}
function sendState(userId, conversationId) {
  emit(userId, 'state', { ...stateForUser(userId), running: running.has(userId), conversationId });
}
function nextUtcMidnight() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}
function pauseTaskForUser(userId, conversationId, reason, retryAt = null, details = '') {
  const pause = setTaskPause(userId, conversationId, reason, retryAt, details);
  emit(userId, 'pause', pause);
  sendState(userId, conversationId);
  return pause;
}
function pauseMessage(pause) {
  if (pause.reason === 'daily_step_limit') return 'Kunlik Quruvchi qadam limiti tugadi. Loyiha saqlandi va pauzaga qo‘yildi.';
  if (pause.reason === 'batch_step_limit') return 'Ushbu ish bosqichi xavfsiz checkpoint’da pauzaga qo‘yildi.';
  return 'Qurish bosqichi pauzaga qo‘yildi. Loyiha holati saqlandi.';
}
export function isRunning(userId) { return running.has(userId); }

export async function startTask(user, text) {
  if (running.has(user.id)) return { ok: false, status: 409, error: 'Agent hali ishlayapti' };
  const status = statusForUser(user.id);
  if (!status.connected) return { ok: false, status: 412, error: 'Studio ulanmagan', needPairing: true };
  if (text.length < 1 || text.length > 30000) return { ok: false, status: 400, error: 'Xabar 1–30 000 belgi oralig‘ida bo‘lishi kerak.' };
  const conversationId = currentConversation(user.id);
  const existingPause = getTaskPause(user.id);
  if (existingPause && existingPause.conversationId === conversationId) {
    return { ok: false, status: 409, error: 'Bu loyiha pauzada. Davom etish tugmasidan foydalaning.', paused: existingPause };
  }
  const usage = getUsage(user.id);
  if (usage.steps >= config.dailyStepLimit) {
    saveMessage(conversationId, 'user', textBlock(text));
    emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'user', text });
    const pause = pauseTaskForUser(user.id, conversationId, 'daily_step_limit', nextUtcMidnight(), 'Kunlik ichki qadam limiti');
    emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'pause', text: pauseMessage(pause) });
    return { ok: true, status: 202, paused: pause };
  }
  const controller = new AbortController();
  const task = { controller, conversationId, startedAt: Date.now() };
  running.set(user.id, task); setUserRunning(user.id, true);
  saveMessage(conversationId, 'user', textBlock(text));
  emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'user', text });
  sendState(user.id, conversationId);
  task.done = runFreeTask(user.id, task, text).catch(error => {
    console.error('[Quruvchi agent]', error?.status || '', error?.message || error);
    if (error?.name !== 'AbortError') emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'error', text: 'Quruvchi vazifani bajara olmadi. Studio ulanishini tekshiring; batafsil sabab server CMD oynasida ko‘rsatiladi.' });
  }).finally(() => {
    if (running.get(user.id) === task) running.delete(user.id);
    setUserRunning(user.id, false);
    sendState(user.id, conversationId);
  });
  void task.done;
  return { ok: true, status: 202 };
}
async function runFreeTask(userId, task, prompt) {
  const signal = task.controller.signal;
  if (signal.aborted) return;
  const historyMessages = getMessages(task.conversationId);
  const project = buildFreeProject(prompt, historyMessages);
  const explanation = [
    '## Quruvchi — mahalliy bepul qurish rejimi',
    'Tashqi AI provayder yoki kalit ishlatilmaydi. Mahalliy generator mavjud Luau shablonidan kod tayyorlab, ulangan Roblox Studio’ga joylaydi.',
    '',
    '**Loyiha:** ' + project.name,
    '**Bosqich:** ' + project.level + ' / 4',
    '**Yaratilayotgan qism:** ' + project.summary,
    '**Studio yo‘li:** `' + project.path + '`',
    '',
    'Kod Studio’ga joylangach, Play bosib tekshiring. Hozirgi generator obby, tycoon, collectible simulator va 3D world starter shablonlarini qo‘llaydi. Murakkab yoki noodatiy g‘oyalar uchun shablon kodini keyin kengaytirish kerak.',
    '',
    '```lua',
    project.source,
    '```'
  ].join('\n');
  const assistantContent = textBlock(explanation);
  saveMessage(task.conversationId, 'assistant', assistantContent);
  emitText(userId, assistantContent);
  if (signal.aborted) return;
  const toolId = crypto.randomUUID();
  emit(userId, 'message', { id: toolId, kind: 'tool', toolId, name: 'create_script', summary: 'create_script: ' + project.path });
  sendState(userId, task.conversationId);
  addUsage(userId, 1, 0, 0);
  const result = await sendCommand(userId, 'create_script', { path: project.path, className: 'Script', source: project.source }, signal);
  const output = String(result.output || '');
  saveMessage(task.conversationId, 'user', [{ type: 'tool_result', tool_use_id: toolId, is_error: !result.ok, content: output.slice(0, 20000) }]);
  emit(userId, 'message', { id: crypto.randomUUID(), kind: 'tool_result', toolId, ok: !!result.ok, preview: output.slice(0, 300) });
  if (!result.ok && !signal.aborted) {
    const block = textBlock('Kod mahalliy rejimda yaratildi, lekin Roblox Studio’ga joylash muvaffaqiyatsiz bo‘ldi. Sabab: ' + (output.slice(0, 1000) || 'Studio plugin javob bermadi') + '\nKod yuqorida mavjud; Studio ulanishini tekshiring.');
    saveMessage(task.conversationId, 'assistant', block);
    emitText(userId, block);
  } else if (result.ok) {
    const done = textBlock('Kod Roblox Studio’ga joylandi. Endi **Play** bosib sinab ko‘ring. Bu mahalliy generator shabloni; sinov natijasi alohida tekshirilishi kerak.');
    saveMessage(task.conversationId, 'assistant', done);
    emitText(userId, done);
  }
}
export async function resumeTask(user) {
  if (running.has(user.id)) return { ok: false, status: 409, error: 'Agent hali ishlayapti' };
  const pause = getTaskPause(user.id);
  if (!pause) return { ok: false, status: 409, error: 'Davom ettiriladigan pauza topilmadi.' };
  const conversationId = currentConversation(user.id);
  if (pause.conversationId !== conversationId) {
    clearTaskPause(user.id);
    return { ok: false, status: 409, error: 'Pauzadagi loyiha chatidan chiqib ketilgan. Chat tarixini tekshiring.' };
  }
  if (pause.retryAt && pause.retryAt > Date.now()) {
    return { ok: false, status: 429, error: 'Qurish limiti hali tiklanmagan.', paused: pause };
  }
  const status = statusForUser(user.id);
  if (!status.connected) return { ok: false, status: 412, error: 'Studio ulanmagan', needPairing: true };
  const controller = new AbortController();
  const task = { controller, conversationId, startedAt: Date.now(), resumed: true };
  clearTaskPause(user.id);
  running.set(user.id, task);
  setUserRunning(user.id, true);
  sendState(user.id, conversationId);
  task.done = runFreeTask(user.id, task, 'Davom ettir: mahalliy bepul qurish rejimi').catch(error => {
    console.error('[Quruvchi agent resume]', error?.status || '', error?.message || error);
    emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'error', text: 'Davom ettirishda xatolik yuz berdi. Saqlangan loyiha tarixi saqlanib qoldi.' });
  }).finally(() => {
    if (running.get(user.id) === task) running.delete(user.id);
    setUserRunning(user.id, false);
    sendState(user.id, conversationId);
  });
  void task.done;
  return { ok: true, status: 202 };
}
export async function stopTask(userId) {
  const task = running.get(userId);
  if (!task) return false;
  task.controller.abort();
  try { await task.done; } catch {}
  return true;
}
export async function newConversation(userId) {
  await stopTask(userId);
  const current = db.prepare('SELECT id FROM conversations WHERE user_id=? AND archived=0 ORDER BY id DESC LIMIT 1').get(userId);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (current) db.prepare('UPDATE conversations SET archived=1 WHERE id=? AND user_id=?').run(current.id, userId);
    const result = db.prepare('INSERT INTO conversations(user_id,created_at,archived) VALUES(?,?,0)').run(userId, Date.now());
    db.exec('COMMIT');
    clearTaskPause(userId);
    emit(userId, 'reset', { conversationId: Number(result.lastInsertRowid) });
    sendState(userId, Number(result.lastInsertRowid));
    return Number(result.lastInsertRowid);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
