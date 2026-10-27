import crypto from 'node:crypto';
import { config } from './config.js';
import { db, currentConversation, saveMessage, getMessages, addUsage, getUsage, getTaskPause, setTaskPause, clearTaskPause } from './db.js';
import { createMessage } from './claude.js';
import { tools, truncateOutput, toolSummary } from './tools.js';
import { systemPrompt } from './prompt.js';
import { searchWeb } from './research.js';
import { createProjectPlan, renderProjectPlanMarkdown } from './project-planner.js';
import { emit, sendCommand, statusForUser, setUserRunning, stateForUser } from './hub.js';

const running = new Map();
const MAX_HISTORY_CHARS = 400000;
const MAX_TOOL_OUTPUTS = 6;

function textBlock(text) { return [{ type: 'text', text }]; }
function contentLength(content) { return JSON.stringify(content).length; }
function repairHistory(rawMessages) {
  const messages = rawMessages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content : textBlock(String(m.content ?? '')) }));
  // A stopped agent must not leave orphaned tool_use blocks in the persisted conversation.
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== 'assistant') continue;
    const uses = message.content.filter(b => b?.type === 'tool_use');
    if (!uses.length) continue;
    const next = messages[i + 1];
    const results = new Set((next?.role === 'user' ? next.content : []).filter(b => b?.type === 'tool_result').map(b => b.tool_use_id));
    const missing = uses.filter(b => !results.has(b.id));
    if (missing.length) {
      const repair = missing.map(b => ({ type: 'tool_result', tool_use_id: b.id, is_error: true, content: 'Foydalanuvchi to‘xtatdi yoki buyruq javobi yo‘q.' }));
      if (next?.role === 'user') next.content = [...repair, ...next.content];
      else messages.splice(i + 1, 0, { role: 'user', content: repair });
      i++;
    }
  }
  // Merge adjacent equal roles so the API receives alternating user/assistant messages.
  const merged = [];
  for (const message of messages) {
    if (merged.length && merged[merged.length - 1].role === message.role) merged[merged.length - 1].content.push(...message.content);
    else merged.push({ role: message.role, content: [...message.content] });
  }
  // Trim only at a normal user text boundary, never in the middle of a tool-use/result cycle.
  while (merged.length > 2 && merged.reduce((n, m) => n + contentLength(m.content), 0) > MAX_HISTORY_CHARS) {
    const cut = merged.findIndex((m, index) => index > 0 && m.role === 'user' && m.content.some(b => b.type === 'text') && !m.content.some(b => b.type === 'tool_result'));
    if (cut < 1) break;
    merged.splice(0, cut);
  }
  if (merged.length && merged[0].role !== 'user') merged.shift();
  // Compress old tool results in the API copy only; database history remains intact.
  let seenResults = 0;
  for (let i = merged.length - 1; i >= 0; i--) {
    for (const block of merged[i].content) {
      if (block?.type === 'tool_result') {
        seenResults++;
        if (seenResults > MAX_TOOL_OUTPUTS && typeof block.content === 'string' && block.content.length > 1500) block.content = block.content.slice(0, 1500) + '\n[eski natija qisqartirildi]';
      }
    }
  }
  return merged;
}
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
  if (pause.reason === 'provider_rate_limit') return 'AI provayder limiti tugadi. Loyiha va bajarilgan ishlar saqlandi.';
  if (pause.reason === 'credit_limit') return 'AI provayder kredit/foydalanish limiti tugadi. Loyiha saqlandi.';
  if (pause.reason === 'batch_step_limit') return 'Ushbu ish bosqichi xavfsiz checkpoint’da pauzaga qo‘yildi.';
  return 'AI xizmati vaqtincha to‘xtadi. Loyiha holati saqlandi.';
}
export function isRunning(userId) { return running.has(userId); }

export async function startTask(user, text) {
  if (running.has(user.id)) return { ok: false, status: 409, error: 'Agent hali ishlayapti' };
  const status = statusForUser(user.id);
  if (!status.connected) return { ok: false, status: 412, error: 'Studio ulanmagan', needPairing: true };
  if (!config.anthropicApiKey) return { ok: false, status: 503, error: 'AI provider sozlanmagan. Serverdagi .env fayliga ANTHROPIC_API_KEY kiriting.' };
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
  task.done = runLoop(user.id, task).catch(error => {
    console.error('[Quruvchi agent]', error?.status || '', error?.message || error);
    if (error?.name !== 'AbortError') emit(user.id, 'message', { id: crypto.randomUUID(), kind: 'error', text: 'AI xizmati vaqtincha javob bermayapti. API sozlamalari va limitlarni tekshiring.' });
  }).finally(() => {
    if (running.get(user.id) === task) running.delete(user.id);
    setUserRunning(user.id, false);
    sendState(user.id, conversationId);
  });
  void task.done;
  return { ok: true, status: 202 };
}
async function runLoop(userId, task) {
  let steps = 0;
  const signal = task.controller.signal;
  try {
    while (!signal.aborted) {
      const history = repairHistory(getMessages(task.conversationId));
      const response = await createMessage({ messages: history, tools, system: systemPrompt, signal, maxTokens: config.maxTokens });
      const content = Array.isArray(response.content) ? response.content : textBlock('AI javobi noto‘g‘ri formatda keldi.');
      saveMessage(task.conversationId, 'assistant', content);
      emitText(userId, content);
      const usage = response.usage || {};
      if (usage.input_tokens || usage.output_tokens) addUsage(userId, 0, usage.input_tokens || 0, usage.output_tokens || 0);
      if (response.stop_reason !== 'tool_use') break;

      const toolUses = content.filter(block => block?.type === 'tool_use');
      const results = [];
      let limitReached = false;
      for (const toolUse of toolUses) {
        if (signal.aborted) {
          results.push({ type:'tool_result', tool_use_id:toolUse.id, is_error:true, content:'Foydalanuvchi to‘xtatdi' });
          continue;
        }
        const used = getUsage(userId).steps;
        if (steps >= config.maxSteps || used >= config.dailyStepLimit ) {
          results.push({ type:'tool_result', tool_use_id:toolUse.id, is_error:true, content:'Tool qadam limiti sabab hozir bajarilmadi. Hozirgi holat checkpoint sifatida saqlandi; foydalanuvchi davom ettirganda shu vazifani bajar.' });
          limitReached = true;
          continue;
        }
        steps++;
        addUsage(userId, 1, 0, 0);
        const summary = toolSummary(toolUse.name, toolUse.input);
        emit(userId, 'message', { id: toolUse.id, kind:'tool', toolId:toolUse.id, name:toolUse.name, summary });
        sendState(userId, task.conversationId);
        let result;
        try {
          if (toolUse.name === 'create_project_plan') {
            const plan = createProjectPlan(toolUse.input || {});
            result = { ok:true, output:renderProjectPlanMarkdown(plan) };
          } else if (toolUse.name === 'web_research') {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const research = await searchWeb(toolUse.input || {});
            result = { ok:true, output:JSON.stringify(research) };
          } else {
            result = await sendCommand(userId, toolUse.name, toolUse.input || {}, signal);
          }
        } catch (error) {
          result = { ok:false, output: error?.name === 'AbortError' ? 'Foydalanuvchi to‘xtatdi' : String(error?.message || 'Tool bajarilmadi').slice(0, 500) };
        }
        const output = truncateOutput(result.output || '', 20000);
        results.push({ type:'tool_result', tool_use_id:toolUse.id, is_error:!result.ok, content:output });
        emit(userId, 'message', { id: crypto.randomUUID(), kind:'tool_result', toolId:toolUse.id, ok:!!result.ok, preview:output.slice(0, 300) });
        if (result.cancelled) continue;
      }
      if (results.length) saveMessage(task.conversationId, 'user', results);
      if (signal.aborted) break;
      if (limitReached || steps >= config.maxSteps || getUsage(userId).steps >= config.dailyStepLimit) {
        const dailyLimitReached = getUsage(userId).steps >= config.dailyStepLimit;
        const reason = dailyLimitReached ? 'daily_step_limit' : 'batch_step_limit';
        const retryAt = dailyLimitReached ? nextUtcMidnight() : null;
        const pause = pauseTaskForUser(userId, task.conversationId, reason, retryAt,
          dailyLimitReached ? 'Kunlik ichki qadam limiti' : 'Xavfsiz bosqich checkpoint’i');
        emit(userId, 'message', { id: crypto.randomUUID(), kind: 'pause', text: pauseMessage(pause) });
        break;
      }
    }
  } catch (error) {
    if (error?.name !== 'AbortError' && !signal.aborted) {
      const isLimit = Boolean(error?.isLimit || error?.status === 429);
      const isCreditLimit = /credit_balance_too_low|usage_limit|credit|billing/i.test(String(error?.providerType || '') + ' ' + String(error?.providerMessage || error?.message || ''));
      const retryAt = error?.retryAfterMs != null
        ? Date.now() + Math.max(0, Number(error.retryAfterMs))
        : (error?.status >= 500 || !error?.status ? Date.now() + 60000 : null);
      const reason = isLimit ? (isCreditLimit ? 'credit_limit' : 'provider_rate_limit') : 'provider_error';
      const details = String(error?.providerMessage || error?.message || 'AI xizmati xatosi').slice(0, 500);
      const pause = pauseTaskForUser(userId, task.conversationId, reason, retryAt, details);
      emit(userId, 'message', { id: crypto.randomUUID(), kind: 'pause', text: pauseMessage(pause) + (details ? ' Sabab: ' + details : '') });
    }
  } finally {
    // Persist missing tool results for the last assistant tool-use turn after cancellation.
    const rows = getMessages(task.conversationId);
    const lastAssistantIndex = rows.map((m, i) => m.role === 'assistant' && m.content.some(b => b?.type === 'tool_use') ? i : -1).filter(i => i >= 0).pop();
    if (lastAssistantIndex !== undefined) {
      const uses = rows[lastAssistantIndex].content.filter(b => b?.type === 'tool_use');
      const seen = new Set();
      for (const row of rows.slice(lastAssistantIndex + 1)) {
        if (row.role === 'assistant') break;
        if (row.role === 'user') for (const block of row.content) if (block?.type === 'tool_result') seen.add(block.tool_use_id);
      }
      const missing = uses.filter(b => !seen.has(b.id)).map(b => ({ type:'tool_result', tool_use_id:b.id, is_error:true, content:signal.aborted ? 'Foydalanuvchi to‘xtatdi' : 'Tool natijasi mavjud emas' }));
      if (missing.length) saveMessage(task.conversationId, 'user', missing);
    }
    if (signal.aborted) emit(userId, 'message', { id: crypto.randomUUID(), kind:'info', text:'To‘xtatildi' });
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
    return { ok: false, status: 429, error: 'AI limiti hali tiklanmagan.', paused: pause };
  }
  const status = statusForUser(user.id);
  if (!status.connected) return { ok: false, status: 412, error: 'Studio ulanmagan', needPairing: true };
  if (!config.anthropicApiKey) return { ok: false, status: 503, error: 'AI provider sozlanmagan. Serverdagi .env fayliga ANTHROPIC_API_KEY kiriting.' };
  const controller = new AbortController();
  const task = { controller, conversationId, startedAt: Date.now(), resumed: true };
  clearTaskPause(user.id);
  running.set(user.id, task);
  setUserRunning(user.id, true);
  sendState(user.id, conversationId);
  task.done = runLoop(user.id, task).catch(error => {
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
