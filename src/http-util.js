import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };

export function securityHeaders(res, api = false) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (api) res.setHeader('Cache-Control', 'no-store');
}
export function sendJson(res, status, data, extraHeaders = {}) {
  securityHeaders(res, true);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(data));
}
export function readJson(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, tooLarge = false;
    req.on('data', chunk => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) { tooLarge = true; chunks.length = 0; return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) { reject(Object.assign(new Error('Body juda katta'), { status: 413 })); return; }
      if (!chunks.length) { resolve({}); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('JSON formati noto‘g‘ri'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
export function checkCsrf(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) return { ok: false, status: 415, error: 'Content-Type application/json bo‘lishi shart' };
  let origin;
  try { origin = new URL(req.headers.origin || '').origin; } catch { origin = ''; }
  if (origin !== config.publicUrl) {
    // Local Windows users may open the same server as localhost or 127.0.0.1.
    // Permit only HTTP loopback aliases on the same port; production origins stay strict.
    let localAlias = false;
    try {
      const actual = new URL(origin);
      const configured = new URL(config.publicUrl);
      const loopbacks = new Set(['localhost', '127.0.0.1', '[::1]']);
      localAlias = actual.protocol === 'http:' && configured.protocol === 'http:' &&
        actual.port === configured.port && loopbacks.has(actual.hostname) &&
        loopbacks.has(configured.hostname);
    } catch {}
    if (!localAlias) return { ok: false, status: 403, error: 'Origin tekshiruvidan o‘tmadi' };
  }
  return { ok: true };
}
export function clientIp(req) {
  if (config.trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim().slice(0, 80);
  return String(req.socket.remoteAddress || 'unknown').slice(0, 80);
}
export function serveStatic(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, config.publicUrl).pathname); } catch { return false; }
  if (pathname === '/') pathname = '/index.html';
  const fullPath = path.resolve(publicDir, '.' + pathname);
  if (!fullPath.startsWith(publicDir + path.sep) && fullPath !== path.join(publicDir, 'index.html')) return false;
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return false;
  securityHeaders(res, false);
  res.setHeader('Cache-Control', pathname === '/index.html' ? 'no-store' : 'public, max-age=300');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fullPath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
  return true;
}
export function parseCookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    try { result[key] = decodeURIComponent(part.slice(i + 1).trim()); } catch {}
  }
  return result;
}
