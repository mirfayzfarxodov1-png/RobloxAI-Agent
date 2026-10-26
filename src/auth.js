import crypto from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

const SESSION_COOKIE = 'qs';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
export { sha256, SESSION_COOKIE };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return 'scrypt$16384$8$1$' + salt.toString('base64url') + '$' + key.toString('base64url');
}
export function verifyPassword(password, stored) {
  try {
    const [kind, n, r, p, saltText, keyText] = stored.split('$');
    if (kind !== 'scrypt') return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return safeEqual(actual, expected);
  } catch { return false; }
}
export function verifyInvite(input) {
  if (!config.registrationInvite) return true;
  return safeEqual(sha256(input || ''), sha256(config.registrationInvite));
}
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)')
    .run(sha256(token), userId, now, now + SESSION_MS);
  return token;
}
export function sessionCookie(token) {
  return SESSION_COOKIE + '=' + token + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000' + (config.cookieSecure ? '; Secure' : '');
}
export function clearSessionCookie() {
  return SESSION_COOKIE + '=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' + (config.cookieSecure ? '; Secure' : '');
}
export function getUserFromRequest(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(SESSION_COOKIE + '='));
  if (!match) return null;
  let token;
  try { token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)); } catch { return null; }
  const row = db.prepare('SELECT u.id,u.login,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(sha256(token), Date.now());
  return row ? { id: row.id, login: row.login, tokenHash: row.token_hash } : null;
}
export function revokeSession(user) {
  if (user?.tokenHash) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(user.tokenHash);
}
