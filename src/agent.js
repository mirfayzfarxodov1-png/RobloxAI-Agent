import crypto from 'node:crypto';
import { config } from './config.js';
import { db, currentConversation, saveMessage, getMessages, addUsage, getUsage, getTaskPause, setTaskPause, clearTaskPause } from './db.js';
import { buildFreeProject } from './free-builder.js';
import { auditGeneratedProject } from './agents/qa/agent.js';
import { buildGameplayPlan } from './agents/gameplay/engine/index.js';
import { scoutTools } from './agents/tool-scout/agent.js';
import { emit, sendCommand, statusForUser, setUserRunning, stateForUser } from './hub.js';
import { buildStudioCommandPlan, executeStudioCommandPlan } from './integration/studio-bridge.js';

const running = new Map();
const listOrEmpty = value => Array.isArray(value) ? value : [];

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
  if (/(^|\\b)(logs|audit|xatolarni tekshir|xatolarni ko‘r|loyihani tekshir)(\\b|$)/i.test(prompt)) {
    const checks = [
      {name:'audit_project',summary:'Studio loyiha auditi',input:{maxNodes:8000}},
      {name:'get_logs',summary:'Studio Output xatolari',input:{limit:100,onlyErrors:true}}
    ];
    const reports = [];
    for (const check of checks) {
      if (signal.aborted) return;
      const toolId = crypto.randomUUID();
      emit(userId,'message',{id:toolId,kind:'tool',toolId,name:check.name,summary:check.summary});
      const result = await sendCommand(userId,check.name,check.input,signal);
      const output = String(result.output || '');
      reports.push({ ...check, ...result, output });
      emit(userId,'message',{id:crypto.randomUUID(),kind:'tool_result',toolId,ok:!!result.ok,text:check.summary,preview:output.slice(0,700)});
      saveMessage(task.conversationId,'user',[{type:'tool_result',tool_use_id:toolId,is_error:!result.ok,content:output.slice(0,20000)}]);
    }
    addUsage(userId,checks.length,0,0);
    const report = reports.map(item=>'### '+item.summary+'\\n'+(item.ok?item.output.slice(0,3500):'Tekshiruv bajarilmadi: '+item.output.slice(0,500))).join('\\n\\n');
    const resultBlock = textBlock('## Roblox Studio tekshiruvi\\n'+report+'\\n\\nBu statik audit va Output jurnali; o‘yin ichidagi Play-testni to‘liq almashtirmaydi. Agar xato topilgan bo‘lsa, uni tuzatish uchun shu natijaga asoslanib keyingi topshiriq yubor.');
    saveMessage(task.conversationId,'assistant',resultBlock);
    emitText(userId,resultBlock);
    return;
  }
  const project = buildFreeProject(prompt, historyMessages);
  const gameplayPlan = buildGameplayPlan(project);
  project.gameplayPlan = gameplayPlan;
  if (!gameplayPlan.ok) throw new Error('Gameplay Agent kod tekshiruvidan o‘tmadi: ' + listOrEmpty(gameplayPlan.missing).join(', '));
  const localQa = auditGeneratedProject(project);
  const toolReport = scoutTools([prompt, ...(project.features || [])]);
  if (!localQa.ok) throw new Error('MAX oldindan tekshiruvdan o‘tmadi: ' + listOrEmpty(localQa.errors).join('; '));
  const explanation = [
    '## Quruvchi MAX — ko‘p agentli Studio qurish',
    'Bu ish alohida World, UI, Gameplay, Tool Scout va QA agentlariga bo‘lingan. Agentlar faqat so‘rovdagi otlarni sanab chiqmaydi: mavzu, zonalar, dekor, spawn, o‘zaro ta’sir va zarur qo‘llab-quvvatlovchi tizimlarni ham aniqlaydi. Mavjud xarita ko‘r-ko‘rona o‘chirib yuborilmaydi.',
    '',
    '**Loyiha:** ' + project.name,
    '**Tur:** ' + project.kind,
    '**Bosqich:** ' + project.level + ' / 4',
    '**World Agent:** ' + localQa.nodeCount + ' ta obyekt node’i · mavzu: ' + (project.sceneTree.attributes?.WorldTheme || 'adventure') + ' · zonalar, dekor va so‘rovga mos obyektlar.',
    '**UI Agent:** Do‘kon, inventar, vazifalar va yordam tugmalari.',
    '**Gameplay Agent:** ' + listOrEmpty(gameplayPlan.systems).join(', '),
    '**Gameplay kod tekshiruvi:** ' + gameplayPlan.status + ' · ' + listOrEmpty(gameplayPlan.checks).filter(item=>item?.ok).length + '/' + listOrEmpty(gameplayPlan.checks).length + ' local tekshiruv, ' + gameplayPlan.sourceLength + ' belgili server Luau.',
    '**Tool Scout:** ' + listOrEmpty(toolReport.recommendations).map(item => item.name + ' (' + item.cost + ')').join('; ') || 'Mos vosita topilmadi',
    '**QA Agent:** ' + listOrEmpty(localQa.agents).join(', ') || 'QA Agent' + ' — mahalliy tekshiruv o‘tdi.',
    '**Obyektlar yo‘li:** Workspace/QuruvchiFreeWorld',
    '**UI yo‘li:** StarterGui/QuruvchiMAXUI',
    '**Gameplay skripti:** ' + project.path,
    '',
    ...listOrEmpty(toolReport.notes),
    '',
    'Qurish tugagach, Studio’da Explorer’ni ochib obyektlarni ko‘r va Play bosib tekshir.'
  ].join('\n');
  const assistantContent = textBlock(explanation);
  saveMessage(task.conversationId, 'assistant', assistantContent);
  emitText(userId, assistantContent);
  if (signal.aborted) return;

  const commands = buildStudioCommandPlan(project, gameplayPlan);
  const results = await executeStudioCommandPlan({
    userId,
    commands,
    signal,
    sendCommand,
    onCommand(command, toolId) {
      emit(userId, 'message', { id:toolId, kind:'tool', toolId, name:command.name, summary:command.summary });
      sendState(userId, task.conversationId);
    },
    onResult({ command, toolId, result, output }) {
      saveMessage(task.conversationId, 'user', [{ type:'tool_result', tool_use_id:toolId, is_error:!result.ok, content:output.slice(0,20000) }]);
      emit(userId, 'message', { id:crypto.randomUUID(), kind:'tool_result', toolId, ok:!!result.ok, text:command.summary, preview:output.slice(0,500) });
    }
  });
  if (signal.aborted) return;
  addUsage(userId, commands.length, 0, 0);
  const failed = results.filter(result => !result.ok);
  if (failed.length) {
    const details = failed.map(result => '- **'+result.summary+'**: '+(result.output||'noma’lum xato').slice(0,500)).join('\n');
    const block = textBlock('## Qurish to‘liq yakunlanmadi\n'+details+'\n\nStudio ulanishini tekshir. Bajarilgan qism Explorer’da qolishi mumkin; qayta urinayotganda mavjud obyektlar yangilanadi.');
    saveMessage(task.conversationId, 'assistant', block);
    emitText(userId, block);
    return;
  }
  const done = textBlock('## Quruvchi MAX — qurish yakunlandi\n- World Agent: Workspace/QuruvchiFreeWorld ichiga xarita joylandi.\n- UI Agent: StarterGui/QuruvchiMAXUI va alohida UIController LocalScript qo‘shildi.\n- Gameplay Agent: '+project.path+' ichiga skript joylandi.\n- QA Agent: Studio audit va Output jurnali tekshirildi.\n- Tool Scout: bepul Studio vositalari ustun qo‘yildi; uchinchi tomon assetlari avtomatik va ruxsatsiz kiritilmadi.\n\nEndi **Play** bosib o‘yin ichida tekshir.');
  saveMessage(task.conversationId, 'assistant', done);
  emitText(userId, done);
  emit(userId, 'message', {
    id:crypto.randomUUID(), kind:'choices',
    text:'Keyingi qadamni tanla:',
    options:[
      {label:'Do‘kon va vazifalar qo‘sh',prompt:'Ayni o‘yinga ishlaydigan do‘kon va vazifalar tizimini qo‘sh; mavjud xarita va gameplayni saqla.'},
      {label:'Progress saqlash qo‘sh',prompt:'Ayni o‘yinga Roblox DataStore orqali progress saqlash va qayta yuklashni qo‘sh.'},
      {label:'Xatolarni tekshir',prompt:'Xatolarni tekshir: Roblox Studio auditini va Output loglarini o‘qi.'}
    ]
  });
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
