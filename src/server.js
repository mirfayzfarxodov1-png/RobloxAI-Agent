import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { config } from './config.js';
import { db, createConversation, currentConversation, getMessages, getUsage, cleanupExpired } from './db.js';
import { hashPassword, verifyPassword, verifyInvite, createSession, sessionCookie, clearSessionCookie, getUserFromRequest, revokeSession, sha256 } from './auth.js';
import { consumeLimit } from './ratelimit.js';
import { sendJson, readJson, checkCsrf, clientIp, serveStatic, securityHeaders } from './http-util.js';
import { attachSse, addDevice, pollDevice, receiveResult, listDevices, disconnectDevice, statusForUser, stateForUser, emit } from './hub.js';
import { startTask, stopTask, newConversation, isRunning, resumeTask } from './agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginFile = path.resolve(__dirname, '..', 'plugin', 'Quruvchi.lua');
const codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const json = (res, status, data, headers) => sendJson(res, status, data, headers);
function originCheck(req, res) {
  const result = checkCsrf(req);
  if (!result.ok) { json(res, result.status, { error: result.error }); return false; }
  return true;
}
function userOr401(req, res) {
  const user = getUserFromRequest(req);
  if (!user) json(res, 401, { error: 'Sessiya tugagan. Qayta kiring.' });
  return user;
}
function bodyError(res, error) {
  const status = error?.status || 400;
  json(res, status, { error: status === 413 ? 'So‘rov tanasi 64 KB dan oshmasin' : (error?.message || 'JSON formati noto‘g‘ri') });
}
async function getBody(req, res) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) { json(res, 415, { error:'Content-Type application/json bo‘lishi shart' }); return null; }
  try { return await readJson(req); } catch (error) { bodyError(res, error); return null; }
}
function publicMessage(row) {
  const blocks = Array.isArray(row.content) ? row.content : [];
  const text = blocks.filter(b => b?.type === 'text').map(b => String(b.text || '')).join('\n');
  if (!text) return null;
  return { id: row.id, role: row.role, text, created_at: row.created_at };
}
function issuePairCode(userId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM pairings WHERE user_id=? AND used_at IS NULL').run(userId);
    let code = '';
    for (let i = 0; i < 8; i++) code += codeAlphabet[crypto.randomInt(0, codeAlphabet.length)];
    const expiresAt = Date.now() + 600000;
    db.prepare('INSERT INTO pairings(code_hash,user_id,expires_at,used_at) VALUES(?,?,?,NULL)').run(sha256(code), userId, expiresAt);
    db.exec('COMMIT');
    return { code, expiresAt };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function apiError(error) {
  if (error?.name === 'AbortError') return { status: 499, error: 'To‘xtatildi' };
  if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404 || error?.status === 409 || error?.status === 412 || error?.status === 413 || error?.status === 415 || error?.status === 429 || error?.status === 503) return { status: error.status, error: error.message };
  return { status: 500, error: 'Server xatosi' };
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res, false);
  const method = req.method || 'GET';
  let url;
  try { url = new URL(req.url || '/', config.publicUrl); }
  catch { return json(res, 400, { error: 'URL formati noto‘g‘ri' }); }
  const pathname = url.pathname;

  try {
    if (method === 'GET' && pathname === '/healthz') return json(res, 200, { ok: true, service: 'quruvchi', version: '1.0.0' });

    // Public connection metadata only; never expose API keys or user data.
    if (method === 'GET' && pathname === '/server-info') return json(res, 200, { serverUrl: config.publicUrl, sharingMode: config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1') ? 'local-only' : 'network' });

    if (method === 'GET' && pathname === '/plugin.lua') {
      if (!fs.existsSync(pluginFile)) return json(res, 404, { error: 'Plugin fayli topilmadi' });
      const source = fs.readFileSync(pluginFile, 'utf8');
      if (!/^https?:\/\/[A-Za-z0-9._:/-]+$/.test(config.publicUrl)) return json(res, 500, { error: 'PUBLIC_URL noto‘g‘ri formatda' });
      // Roblox Studio may fail to resolve localhost consistently; use the IPv4 loopback for local-only installs.
      // The website may remain open at http://localhost:PORT; both addresses reach this same local server.
      const pluginServerUrl = config.publicUrl.replace(/^http:\/\/localhost(?=:\d+|$)/, 'http://127.0.0.1');
      const rendered = source.replaceAll('__SERVER_URL__', pluginServerUrl);
      res.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8', 'Content-Disposition':'attachment; filename="Quruvchi.lua"', 'Cache-Control':'no-store' });
      return res.end(rendered);
    }

    if (method === 'POST' && (pathname === '/api/register' || pathname === '/api/login')) {
      if (!originCheck(req, res)) return;
      const input = await getBody(req, res); if (!input) return;
      const ip = clientIp(req);
      if (pathname === '/api/register') {
        const limit = consumeLimit('registerIp', ip);
        if (!limit.allowed) return json(res, 429, { error:'Juda ko‘p urinish, keyinroq qayta urining' }, { 'Retry-After': String(limit.retryAfter) });
        const login = String(input.login || '').trim();
        const password = String(input.password || '');
        if (!/^[a-zA-Z0-9_]{3,32}$/.test(login)) return json(res, 400, { error:'Login 3–32 belgi, faqat harf, raqam va _ bo‘lsin' });
        if (password.length < 8 || password.length > 200) return json(res, 400, { error:'Parol 8–200 belgi bo‘lishi kerak' });
        const invite = String(input.invite || '').trim();
        const referrer = invite ? db.prepare('SELECT id FROM users WHERE referral_code=?').get(invite) : null;
        const validGlobalInvite = Boolean(config.registrationInvite && verifyInvite(invite));
        if ((invite && !referrer && !validGlobalInvite) || (config.registrationInvite && !referrer && !validGlobalInvite)) {
          return json(res, 403, { error:'Taklif havolasi yoki taklif kodi noto‘g‘ri' });
        }
        let referralCode;
        do { referralCode = crypto.randomBytes(8).toString('hex'); }
        while (db.prepare('SELECT 1 FROM users WHERE referral_code=?').get(referralCode));
        try {
          const result = db.prepare('INSERT INTO users(login,pass_hash,created_at,referral_code,referred_by) VALUES(?,?,?,?,?)')
            .run(login, hashPassword(password), Date.now(), referralCode, referrer ? referrer.id : null);
          const userId = Number(result.lastInsertRowid);
          createConversation(userId);
          const token = createSession(userId);
          return json(res, 201, { login }, { 'Set-Cookie': sessionCookie(token) });
        } catch (error) {
          if (String(error).includes('UNIQUE')) return json(res, 409, { error:'Bu login yoki taklif kodi band' });
          throw error;
        }
      }
      const login = String(input.login || '').trim();
      const ipLimit = consumeLimit('loginIp', ip);
      const nameLimit = consumeLimit('loginName', login.toLowerCase());
      if (!ipLimit.allowed || !nameLimit.allowed) {
        const retryAfter = Math.max(ipLimit.allowed ? 0 : ipLimit.retryAfter, nameLimit.allowed ? 0 : nameLimit.retryAfter);
        return json(res, 429, { error:'Juda ko‘p urinish, keyinroq qayta urining' }, { 'Retry-After': String(retryAfter) });
      }
      const user = db.prepare('SELECT id,login,pass_hash FROM users WHERE login=? COLLATE NOCASE').get(login);
      if (!user || !verifyPassword(String(input.password || ''), user.pass_hash)) return json(res, 401, { error:'Login yoki parol noto‘g‘ri' });
      const token = createSession(user.id);
      return json(res, 200, { login:user.login }, { 'Set-Cookie':sessionCookie(token) });
    }

    if (method === 'POST' && pathname === '/api/plugin/pair') {
      const input = await getBody(req, res); if (!input) return;
      const limit = consumeLimit('pairIp', clientIp(req));
      if (!limit.allowed) return json(res, 429, { error:'Juda ko‘p urinish, keyinroq qayta urining' }, { 'Retry-After':String(limit.retryAfter) });
      const code = String(input.code || '').toUpperCase().replace(/[\s-]/g, '');
      if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(code)) return json(res, 400, { error:'Kod noto‘g‘ri yoki muddati o‘tgan' });
      const placeName = String(input.placeName || 'Roblox Studio').slice(0, 200);
      const placeId = Number.isSafeInteger(Number(input.placeId)) && Number(input.placeId) > 0 ? Number(input.placeId) : null;
      let row, token;
      db.exec('BEGIN IMMEDIATE');
      try {
        row = db.prepare('SELECT user_id,expires_at,used_at FROM pairings WHERE code_hash=?').get(sha256(code));
        if (!row || row.expires_at < Date.now() || row.used_at !== null) {
          db.exec('ROLLBACK');
          return json(res, 400, { error:'Kod noto‘g‘ri yoki muddati o‘tgan' });
        }
        db.prepare('UPDATE pairings SET used_at=? WHERE code_hash=? AND used_at IS NULL').run(Date.now(), sha256(code));
        token = crypto.randomBytes(32).toString('base64url');
        const result = db.prepare('INSERT INTO devices(user_id,token_hash,place_name,place_id,created_at,last_seen_at) VALUES(?,?,?,?,?,?)')
          .run(row.user_id, sha256(token), placeName, placeId, Date.now(), Date.now());
        row.deviceId = Number(result.lastInsertRowid);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      addDevice({ id:row.deviceId, user_id:row.user_id, place_name:placeName, place_id:placeId, created_at:Date.now() });
      return json(res, 200, { token, deviceId:row.deviceId });
    }

    if (method === 'GET' && pathname === '/api/plugin/poll') {
      const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
      if (!bearer) return json(res, 401, { error:'Token talab qilinadi' });
      const device = db.prepare('SELECT id,user_id,place_name FROM devices WHERE token_hash=?').get(sha256(bearer));
      if (!device) return json(res, 401, { error:'Qurilma o‘chirilgan yoki token yaroqsiz' });
      const placeName = String(req.headers['x-place-name'] || '').slice(0, 200);
      if (placeName && placeName !== device.place_name) db.prepare('UPDATE devices SET place_name=? WHERE id=?').run(placeName, device.id);
      const wait = Number(url.searchParams.get('wait') || 12);
      return pollDevice(device.user_id, device.id, req, res, Number.isFinite(wait) ? Math.max(0, Math.min(20, wait)) : 12);
    }

    if (method === 'POST' && pathname === '/api/plugin/disconnect') {
      const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
      if (!bearer) return json(res, 401, { error:'Token talab qilinadi' });
      const device = db.prepare('SELECT id,user_id FROM devices WHERE token_hash=?').get(sha256(bearer));
      if (!device) return json(res, 401, { error:'Qurilma uzilgan' });
      disconnectDevice(device.user_id, device.id);
      return json(res, 200, { ok:true });
    }

    if (method === 'POST' && pathname === '/api/plugin/result') {
      const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
      if (!bearer) return json(res, 401, { error:'Token talab qilinadi' });
      const device = db.prepare('SELECT id,user_id FROM devices WHERE token_hash=?').get(sha256(bearer));
      if (!device) return json(res, 401, { error:'Qurilma o‘chirilgan yoki token yaroqsiz' });
      const input = await getBody(req, res); if (!input) return;
      if (typeof input.id !== 'string' || typeof input.ok !== 'boolean' || !('output' in input)) return json(res, 400, { error:'Natija formati noto‘g‘ri' });
      const result = receiveResult(device.user_id, device.id, input.id, input.ok, input.output);
      return json(res, 200, result);
    }

    if (method === 'POST' || method === 'DELETE') {
      if (!originCheck(req, res)) return;
    }

    if (pathname.startsWith('/api/')) {
      const user = userOr401(req, res); if (!user) return;

      if (method === 'POST' && pathname === '/api/logout') {
        revokeSession(user);
        return json(res, 200, { ok:true }, { 'Set-Cookie':clearSessionCookie() });
      }
      if (method === 'GET' && pathname === '/api/me') {
        const usage = getUsage(user.id);
        return json(res, 200, { login:user.login, steps:{ used:usage.steps, limit:config.dailyStepLimit }, running:isRunning(user.id), status:statusForUser(user.id), conversationId:currentConversation(user.id), paused:stateForUser(user.id).paused });
      }
      if (method === 'GET' && pathname === '/api/referral') {
        let account = db.prepare('SELECT referral_code FROM users WHERE id=?').get(user.id);
        if (!account) return json(res, 404, { error:'Hisob topilmadi' });
        if (!account.referral_code) {
          let referralCode;
          do { referralCode = crypto.randomBytes(8).toString('hex'); }
          while (db.prepare('SELECT 1 FROM users WHERE referral_code=?').get(referralCode));
          db.prepare('UPDATE users SET referral_code=? WHERE id=?').run(referralCode, user.id);
          account = { referral_code: referralCode };
        }
        const referrals = db.prepare('SELECT COUNT(*) AS total FROM users WHERE referred_by=?').get(user.id).total;
        const localOnly = config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1');
        return json(res, 200, {
          referralCode: account.referral_code,
          referralUrl: config.publicUrl + '/?ref=' + encodeURIComponent(account.referral_code),
          serverUrl: config.publicUrl,
          localOnly,
          referrals
        });
      }
      if (method === 'GET' && pathname === '/api/stream') return attachSse(user.id, req, res);
      if (method === 'POST' && pathname === '/api/pair') {
        const limit = consumeLimit('pairIp', clientIp(req) + ':user:' + user.id);
        if (!limit.allowed) return json(res, 429, { error:'Juda ko‘p kod so‘raldi, keyinroq qayta urining' }, { 'Retry-After':String(limit.retryAfter) });
        const code = issuePairCode(user.id);
        return json(res, 200, code);
      }
      if (method === 'GET' && pathname === '/api/devices') return json(res, 200, listDevices(user.id));
      const deleteMatch = pathname.match(/^\/api\/devices\/(\d+)$/);
      if (method === 'DELETE' && deleteMatch) {
        const deviceId = Number(deleteMatch[1]);
        const row = db.prepare('SELECT id FROM devices WHERE id=? AND user_id=?').get(deviceId, user.id);
        if (!row) return json(res, 404, { error:'Qurilma topilmadi' });
        disconnectDevice(user.id, deviceId);
        return json(res, 200, { ok:true });
      }
      if (method === 'POST' && pathname === '/api/chat') {
        const limit = consumeLimit('chatUser', String(user.id));
        if (!limit.allowed) return json(res, 429, { error:'Juda ko‘p xabar yuborildi', }, { 'Retry-After':String(limit.retryAfter) });
        const input = await getBody(req, res); if (!input) return;
        const result = await startTask(user, String(input.text || '').trim());
        if (!result.ok) return json(res, result.status, { error:result.error, ...(result.needPairing ? { needPairing:true } : {}) });
        return json(res, 202, { ok:true, paused:Boolean(result.paused), pause:result.paused || null });
      }
      if (method === 'POST' && pathname === '/api/resume') {
        const result = await resumeTask(user);
        if (!result.ok) return json(res, result.status, { error:result.error, ...(result.needPairing ? { needPairing:true } : {}), ...(result.paused ? { paused:result.paused } : {}) });
        return json(res, 202, { ok:true });
      }
      if (method === 'POST' && pathname === '/api/stop') {
        await stopTask(user.id);
        return json(res, 200, { ok:true });
      }
      if (method === 'POST' && pathname === '/api/chat/new') {
        const conversationId = await newConversation(user.id);
        return json(res, 200, { ok:true, conversationId });
      }
      if (method === 'GET' && pathname === '/api/chat/history') {
        const id = currentConversation(user.id);
        const messages = getMessages(id).map(publicMessage).filter(Boolean);
        return json(res, 200, { conversationId:id, messages });
      }
      return json(res, 404, { error:'Topilmadi' });
    }

    if (method === 'GET' || method === 'HEAD') {
      if (serveStatic(req, res)) return;
    }
    return json(res, 404, { error:'Topilmadi' });
  } catch (error) {
    if (res.writableEnded) return;
    console.error('[Quruvchi server]', error?.status || '', error?.message || error);
    const safe = apiError(error);
    return json(res, safe.status, { error:safe.error });
  }
});

const cleanupTimer = setInterval(cleanupExpired, 60 * 60 * 1000);
cleanupTimer.unref();
server.listen(config.port, () => console.log('[Quruvchi] http://localhost:' + config.port + ' · model=' + config.claudeModel));
function shutdown() {
  cleanupTimer.unref();
  server.close(() => { try { db.close(); } finally { process.exit(0); } });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
