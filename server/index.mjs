import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'quruvchi.sqlite');
const DAILY_LIMIT = Math.max(1, Number(process.env.DAILY_STEP_LIMIT || 300));
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest';
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.length < 32 || JWT_SECRET === 'local-development-secret-change-me')) throw new Error('Productionda kamida 32 belgili noyob JWT_SECRET belgilang.');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,login TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);' +
'CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ("user","assistant")),text TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);' +
'CREATE INDEX IF NOT EXISTS messages_user_created ON messages(user_id,created_at);' +
'CREATE TABLE IF NOT EXISTS pair_codes(code_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);' +
'CREATE TABLE IF NOT EXISTS studio_connections(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,place_name TEXT NOT NULL DEFAULT "",last_seen INTEGER NOT NULL,connected INTEGER NOT NULL DEFAULT 1);' +
'CREATE TABLE IF NOT EXISTS studio_tasks(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT "queued",result TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);' +
'CREATE TABLE IF NOT EXISTS usage(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,day TEXT NOT NULL,steps INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day));');

const streams = new Map(), running = new Map(), cancelled = new Set();
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
const randomToken = (n = 32) => crypto.randomBytes(n).toString('base64url');
const today = () => new Date().toISOString().slice(0, 10), now = () => Date.now();
const emit = (uid, event, data) => {
  const clients = streams.get(uid); if (!clients) return;
  const frame = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
  for (const res of clients) { try { res.write(frame); } catch { clients.delete(res); } }
};
const publish = (uid, role, text) => {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO messages(id,user_id,role,text) VALUES(?,?,?,?)').run(id, uid, role, text);
  emit(uid, 'message', { id, kind: role, text });
};
const usedSteps = (uid) => db.prepare('SELECT steps FROM usage WHERE user_id=? AND day=?').get(uid, today())?.steps || 0;
const addStep = (uid) => db.prepare('INSERT INTO usage(user_id,day,steps) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET steps=steps+1').run(uid, today());
function studioStatus(uid) {
  const row = db.prepare('SELECT place_name,last_seen,connected FROM studio_connections WHERE user_id=?').get(uid);
  const connected = Boolean(row && row.connected && now() - row.last_seen < 45000);
  if (row && !connected && row.connected) db.prepare('UPDATE studio_connections SET connected=0 WHERE user_id=?').run(uid);
  return { connected, placeName: row?.place_name || '' };
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const authLimit = rateLimit({ windowMs: 900000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.' } });
const chatLimit = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Juda tez yuboryapsiz. Biroz kuting.' } });
function setSession(res, user) {
  const token = jwt.sign({ sub: String(user.id), login: user.login }, JWT_SECRET, { expiresIn: '7d', issuer: 'quruvchi' });
  res.cookie('quruvchi_session', token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', maxAge: 604800000, path: '/' });
}
function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.quruvchi_session;
    if (!token) return res.status(401).json({ error: 'Davom etish uchun hisobingizga kiring.' });
    const p = jwt.verify(token, JWT_SECRET, { issuer: 'quruvchi' });
    const user = db.prepare('SELECT id,login FROM users WHERE id=?').get(Number(p.sub));
    if (!user) return res.status(401).json({ error: 'Hisob topilmadi. Qayta kiring.' });
    req.user = user; next();
  } catch { res.clearCookie('quruvchi_session', { path: '/' }); return res.status(401).json({ error: 'Sessiya tugagan. Qayta kiring.' }); }
}
function requireStudio(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Studio token talab qilinadi.' });
  const row = db.prepare('SELECT user_id FROM studio_connections WHERE token_hash=?').get(hash(token));
  if (!row) return res.status(401).json({ error: 'Studio token yaroqsiz. Qayta ulang.' });
  req.studioUserId = row.user_id;
  db.prepare('UPDATE studio_connections SET connected=1,last_seen=? WHERE user_id=?').run(now(), row.user_id);
  next();
}

app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'quruvchi-api', version: '0.3.0', aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY), time: new Date().toISOString() }));
app.post('/api/register', authLimit, async (req, res) => {
  const p = z.object({ login: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/), password: z.string().min(8).max(128), invite: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Login 3–32 belgi bo‘lsin; harf, raqam, _ . - ishlating. Parol kamida 8 belgi.' });
  if (process.env.INVITE_CODE && p.data.invite !== process.env.INVITE_CODE) return res.status(403).json({ error: 'Taklif kodi noto‘g‘ri yoki kiritilmagan.' });
  try {
    const r = db.prepare('INSERT INTO users(login,password_hash) VALUES(?,?)').run(p.data.login.toLowerCase(), await bcrypt.hash(p.data.password, 12));
    const user = { id: Number(r.lastInsertRowid), login: p.data.login.toLowerCase() }; setSession(res, user); res.status(201).json({ user: { login: user.login } });
  } catch (e) { if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Bu login band. Boshqa login tanlang.' }); console.error('[register]', e); res.status(500).json({ error: 'Hisob yaratilmadi.' }); }
});
app.post('/api/login', authLimit, async (req, res) => {
  const p = z.object({ login: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Login va parolni kiriting.' });
  const user = db.prepare('SELECT id,login,password_hash FROM users WHERE login=?').get(p.data.login.toLowerCase());
  if (!user || !(await bcrypt.compare(p.data.password, user.password_hash))) return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' });
  setSession(res, user); res.json({ user: { login: user.login } });
});
app.post('/api/logout', (_req, res) => { res.clearCookie('quruvchi_session', { path: '/' }); res.json({ ok: true }); });
app.get('/api/me', requireAuth, (req, res) => res.json({ user: { login: req.user.login }, steps: { used: usedSteps(req.user.id), limit: DAILY_LIMIT }, status: studioStatus(req.user.id), aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) }));
app.get('/api/chat/history', requireAuth, (req, res) => {
  const messages = db.prepare('SELECT id,role,text,created_at FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.user.id).reverse();
  res.json({ messages });
});
app.post('/api/chat/new', requireAuth, (req, res) => { db.prepare('DELETE FROM messages WHERE user_id=?').run(req.user.id); emit(req.user.id, 'reset', {}); res.json({ ok: true }); });
app.get('/api/stream', requireAuth, (req, res) => {
  res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.(); const uid = req.user.id;
  if (!streams.has(uid)) streams.set(uid, new Set()); streams.get(uid).add(res);
  res.write('event: status\ndata: ' + JSON.stringify(studioStatus(uid)) + '\n\n');
  res.write('event: state\ndata: ' + JSON.stringify({ running: running.has(uid), steps: { used: usedSteps(uid), limit: DAILY_LIMIT } }) + '\n\n');
  const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  req.on('close', () => { clearInterval(heartbeat); streams.get(uid)?.delete(res); if (!streams.get(uid)?.size) streams.delete(uid); });
});

const actionTool = {
  name: 'queue_studio_actions',
  description: 'Queue concrete Roblox Studio changes only when the user explicitly asks to create or modify their project. Avoid destructive changes.',
  input_schema: { type: 'object', properties: {
    summary: { type: 'string' },
    actions: { type: 'array', maxItems: 60, items: { type: 'object', properties: {
      type: { type: 'string', enum: ['create_part','create_script','create_folder','set_property'] },
      name: { type: 'string' }, parent: { type: 'string' }, scriptType: { type: 'string', enum: ['Script','LocalScript','ModuleScript'] },
      source: { type: 'string' }, className: { type: 'string' }, properties: { type: 'object' }
    }, required: ['type','name'], additionalProperties: false } }
  }, required: ['summary','actions'], additionalProperties: false }
};
const systemPrompt = 'Siz Quruvchi, Roblox Studio uchun senior game engineer va Luau mutaxassisisiz. Tabiiy, aniq o‘zbekcha javob bering; foydalanuvchi boshqa tilda yozsa, o‘sha tilda javob bering.\n' +
'1. Katta loyihani kichik, tekshiriladigan bosqichlarga bo‘ling; zarur talab yetishmasa bitta aniq savol bering.\n' +
'2. Roblox Luau yozing. Iqtisod, inventar, mukofot, DataStore va ruxsatlarni serverda tekshiring. RemoteEvent inputlarini validatsiya qiling va rate-limit qo‘shing.\n' +
'3. DataStore uchun pcall, xatolik handling va retry/backoff ishlating; sozlamasdan ishladi demang.\n' +
'4. Kod bilan birga qayerga qo‘yish, Script turi, test qilish va cheklovlarni tushuntiring. Secret/API keyni kodga qo‘shmang.\n' +
'5. Foydalanuvchi Studio’da yaratishni so‘rasa queue_studio_actions toolidan foydalaning. Faqat qo‘llab-quvvatlanadigan actionlar; aniq parent path va xavfsiz nomlar bering. Studio natijasisiz ish muvaffaqiyatli bo‘ldi demang.\n' +
'6. Exploit, hisob o‘g‘irlash yoki xavfsizlikni aylanib o‘tishga yordam bermang. O‘yin mexanikasi va ruxsatli admin tizimlariga yordam bering.\n' +
'7. Javob vazifaga mos, tekshiriladigan va aniq bo‘lsin. Xatoni yashirmang.';
async function runAI(uid, text) {
  if (!process.env.ANTHROPIC_API_KEY) return { text: 'AI serveri hali sozlanmagan: ANTHROPIC_API_KEY yo‘q. .env faylida kalitni server tomonda belgilang va serverni qayta ishga tushiring. Kalitni frontend yoki GitHub’ga joylamang.' };
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const history = db.prepare('SELECT role,text FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 16').all(uid).reverse().map(m => ({ role: m.role, content: m.text }));
  const response = await client.messages.create({ model: AI_MODEL, max_tokens: 5000, system: systemPrompt, tools: [actionTool], messages: history });
  const textParts = response.content.filter(p => p.type === 'text').map(p => p.text);
  const tool = response.content.find(p => p.type === 'tool_use' && p.name === 'queue_studio_actions');
  if (tool?.type === 'tool_use') {
    const input = tool.input, actions = Array.isArray(input.actions) ? input.actions : [], studio = studioStatus(uid);
    if (studio.connected && actions.length) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO studio_tasks(id,user_id,payload,status,created_at,updated_at) VALUES(?,?,?,"queued",?,?)').run(id, uid, JSON.stringify({ summary: String(input.summary || 'Studio yangilanishi'), actions }), now(), now());
      emit(uid, 'message', { id: crypto.randomUUID(), kind: 'tool', name: 'Studio vazifasi', summary: actions.length + ' ta amal navbatga qo‘yildi' });
      textParts.push('\n\nStudio vazifasi navbatga qo‘yildi (' + actions.length + ' amal). Plugin bajarib, natijani qaytargach holat ko‘rinadi.');
    } else textParts.push('\n\nStudio ulanmagan, shuning uchun loyihaga hech narsa yozilmadi. Studio pluginini ulang va keyin qayta so‘rang.');
  }
  return { text: textParts.join('\n\n').trim() || 'AI javobi bo‘sh qaytdi. Qayta urinib ko‘ring.' };
}
app.post('/api/chat', requireAuth, chatLimit, async (req, res) => {
  const p = z.object({ text: z.string().trim().min(1).max(12000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Xabar 1–12000 belgi oralig‘ida bo‘lishi kerak.' });
  const uid = req.user.id;
  if (running.has(uid)) return res.status(409).json({ error: 'Oldingi vazifa hali ishlayapti. Kuting yoki to‘xtating.' });
  if (usedSteps(uid) >= DAILY_LIMIT) return res.status(429).json({ error: 'Kunlik AI qadam limiti tugadi.' });
  running.set(uid, true); cancelled.delete(uid); publish(uid, 'user', p.data.text);
  emit(uid, 'state', { running: true, steps: { used: usedSteps(uid), limit: DAILY_LIMIT } });
  res.status(202).json({ accepted: true });
  try {
    const result = await runAI(uid, p.data.text);
    if (!cancelled.has(uid)) { publish(uid, 'assistant', result.text); addStep(uid); }
  } catch (e) {
    console.error('[AI chat]', e?.status || '', e?.message || e);
    if (!cancelled.has(uid)) emit(uid, 'message', { id: crypto.randomUUID(), kind: 'error', text: 'AI so‘rovi bajarilmadi. API kalit, model nomi, internet va provider limitlarini tekshiring. Maxfiy kalitlarni chatga yubormang.' });
  } finally {
    running.delete(uid); cancelled.delete(uid);
    emit(uid, 'state', { running: false, steps: { used: usedSteps(uid), limit: DAILY_LIMIT } });
  }
});
app.post('/api/stop', requireAuth, (req, res) => {
  cancelled.add(req.user.id);
  db.prepare('UPDATE studio_tasks SET status="cancelled",updated_at=? WHERE user_id=? AND status="queued"').run(now(), req.user.id);
  emit(req.user.id, 'state', { running: false, steps: { used: usedSteps(req.user.id), limit: DAILY_LIMIT } });
  res.json({ ok: true, note: 'Navbatdagi Studio vazifalari bekor qilindi. Provider so‘rovi darhol to‘xtamasligi mumkin.' });
});
app.post('/api/pair', requireAuth, (req, res) => {
  db.prepare('DELETE FROM pair_codes WHERE expires_at<?').run(now());
  const code = crypto.randomInt(0, 100000000).toString().padStart(8, '0'), expiresAt = now() + 600000;
  db.prepare('INSERT INTO pair_codes(code_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(hash(code), req.user.id, expiresAt, now());
  res.json({ code, expiresAt });
});
app.post('/api/studio/pair', (req, res) => {
  const p = z.object({ code: z.string().regex(/^\d{8}$/), placeName: z.string().max(120).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Ulash kodi 8 ta raqam bo‘lishi kerak.' });
  const codeHash = hash(p.data.code), pair = db.prepare('SELECT user_id,expires_at FROM pair_codes WHERE code_hash=?').get(codeHash);
  if (!pair || pair.expires_at < now()) { db.prepare('DELETE FROM pair_codes WHERE code_hash=?').run(codeHash); return res.status(400).json({ error: 'Kod noto‘g‘ri yoki muddati tugagan.' }); }
  db.prepare('DELETE FROM pair_codes WHERE code_hash=?').run(codeHash);
  const token = randomToken(36), place = p.data.placeName || 'Roblox Studio';
  db.prepare('INSERT INTO studio_connections(user_id,token_hash,place_name,last_seen,connected) VALUES(?,?,?,?,1) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,place_name=excluded.place_name,last_seen=excluded.last_seen,connected=1').run(pair.user_id, hash(token), place, now());
  emit(pair.user_id, 'status', { connected: true, placeName: place }); res.json({ token, pollAfterMs: 2000 });
});
app.get('/api/studio/poll', requireStudio, (req, res) => {
  const task = db.prepare('SELECT id,payload FROM studio_tasks WHERE user_id=? AND status="queued" ORDER BY created_at LIMIT 1').get(req.studioUserId);
  if (!task) return res.json({ task: null, pollAfterMs: 2000 });
  db.prepare('UPDATE studio_tasks SET status="running",updated_at=? WHERE id=?').run(now(), task.id);
  res.json({ task: { id: task.id, ...JSON.parse(task.payload) }, pollAfterMs: 1000 });
});
app.post('/api/studio/result', requireStudio, (req, res) => {
  const p = z.object({ taskId: z.string().uuid(), ok: z.boolean(), summary: z.string().max(4000), details: z.string().max(12000).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Natija formati noto‘g‘ri.' });
  const task = db.prepare('SELECT id FROM studio_tasks WHERE id=? AND user_id=?').get(p.data.taskId, req.studioUserId);
  if (!task) return res.status(404).json({ error: 'Vazifa topilmadi.' });
  db.prepare('UPDATE studio_tasks SET status=?,result=?,updated_at=? WHERE id=?').run(p.data.ok ? 'done' : 'failed', JSON.stringify(p.data), now(), p.data.taskId);
  emit(req.studioUserId, 'message', { id: crypto.randomUUID(), kind: 'tool_result', ok: p.data.ok, preview: p.data.summary });
  if (p.data.details) emit(req.studioUserId, 'message', { id: crypto.randomUUID(), kind: p.data.ok ? 'info' : 'error', text: p.data.details });
  res.json({ ok: true });
});
app.post('/api/studio/heartbeat', requireStudio, (req, res) => {
  const place = typeof req.body?.placeName === 'string' ? req.body.placeName.slice(0, 120) : '';
  db.prepare('UPDATE studio_connections SET connected=1,last_seen=?,place_name=CASE WHEN ?<>"" THEN ? ELSE place_name END WHERE user_id=?').run(now(), place, place, req.studioUserId);
  emit(req.studioUserId, 'status', studioStatus(req.studioUserId)); res.json({ ok: true });
});
const dist = path.resolve(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => { if (req.path.startsWith('/api/') || req.path === '/healthz') return next(); res.sendFile(path.join(dist, 'index.html')); });
}
app.use((err, _req, res, _next) => { console.error('[server error]', err); if (!res.headersSent) res.status(500).json({ error: 'Server ichki xatosi. Loglarni tekshiring.' }); });
const server = app.listen(PORT, () => console.log('[Quruvchi] API http://localhost:' + PORT + ' (' + (process.env.NODE_ENV || 'development') + ')'));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
