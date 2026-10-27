import crypto from 'node:crypto';
import { db, getTaskPause } from './db.js';
import { config } from './config.js';
import { sendJson } from './http-util.js';

const hubs = new Map();
const runningUsers = new Set();
export function setUserRunning(userId, running) { if (running) runningUsers.add(userId); else runningUsers.delete(userId); }
const now = () => Date.now();
function userHub(userId) {
  let hub = hubs.get(userId);
  if (!hub) { hub = { sseClients: new Set(), devices: new Map(), lastStatus: '' }; hubs.set(userId, hub); }
  return hub;
}
function hydrate(userId) {
  const hub = userHub(userId);
  const rows = db.prepare('SELECT id,user_id,place_name,place_id,last_seen_at,created_at FROM devices WHERE user_id=?').all(userId);
  for (const row of rows) {
    if (!hub.devices.has(row.id)) hub.devices.set(row.id, {
      id: row.id, userId, placeName: row.place_name || '', placeId: row.place_id || 0,
      createdAt: row.created_at, lastSeen: row.last_seen_at || 0,
      waiter: null, queue: [], inflight: new Map()
    });
  }
  return hub;
}
export function emit(userId, event, data) {
  const hub = hubs.get(userId); if (!hub) return;
  const frame = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
  for (const res of hub.sseClients) { try { res.write(frame); } catch { hub.sseClients.delete(res); } }
}
export function addDevice(row) {
  const hub = userHub(row.user_id);
  const device = { id: row.id, userId: row.user_id, placeName: row.place_name || '', placeId: row.place_id || 0,
    createdAt: row.created_at, lastSeen: now(), waiter: null, queue: [], inflight: new Map() };
  hub.devices.set(row.id, device);
  updateStatus(row.user_id);
  return device;
}
export function statusForUser(userId) {
  const hub = hydrate(userId);
  let active = null;
  for (const device of hub.devices.values()) {
    const connected = now() - device.lastSeen < 25000 || device.inflight.size > 0;
    if (connected && (!active || device.lastSeen > active.lastSeen)) active = device;
  }
  return active ? { connected: true, placeName: active.placeName || 'Roblox Studio', deviceId: active.id } : { connected: false, placeName: '', deviceId: null };
}
function updateStatus(userId) {
  const hub = userHub(userId);
  const status = statusForUser(userId);
  const signature = JSON.stringify(status);
  if (signature !== hub.lastStatus) {
    hub.lastStatus = signature;
    emit(userId, 'status', status);
    emit(userId, 'state', stateForUser(userId));
  }
}
export function stateForUser(userId) {
  const usage = db.prepare('SELECT steps FROM usage WHERE user_id=? AND day=?').get(userId, new Date().toISOString().slice(0, 10));
  const conversationId = db.prepare('SELECT id FROM conversations WHERE user_id=? AND archived=0 ORDER BY id DESC LIMIT 1').get(userId)?.id || null;
  return { running: runningUsers.has(userId), steps: { used: usage?.steps || 0, limit: config.dailyStepLimit }, conversationId, paused: getTaskPause(userId) };
}
export function attachSse(userId, req, res) {
  const hub = hydrate(userId);
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
  res.write('event: state\ndata: ' + JSON.stringify(stateForUser(userId)) + '\n\n');
  res.write('event: status\ndata: ' + JSON.stringify(statusForUser(userId)) + '\n\n');
  hub.sseClients.add(res);
  const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
  res.on('close', () => { clearInterval(heartbeat); hub.sseClients.delete(res); });
}
function reply(res, status, data) { if (!res.writableEnded) sendJson(res, status, data); }
function sendIdle(waiter) {
  if (!waiter) return;
  clearTimeout(waiter.timer);
  waiter.res.removeListener('close', waiter.onClose);
  reply(waiter.res, 200, { type: 'idle' });
}
function deliverNext(device) {
  if (!device.waiter || device.queue.length === 0) return;
  const waiter = device.waiter; device.waiter = null;
  const command = device.queue.shift();
  clearTimeout(waiter.timer); waiter.res.removeListener('close', waiter.onClose);
  reply(waiter.res, 200, { type: 'command', id: command.id, name: command.name, input: command.input });
}
export function pollDevice(userId, deviceId, req, res, waitSeconds) {
  const hub = hydrate(userId), device = hub.devices.get(deviceId);
  if (!device) return reply(res, 401, { error: 'Qurilma uzilgan' });
  device.lastSeen = now();
  const dbLast = db.prepare('SELECT last_seen_at FROM devices WHERE id=?').get(deviceId)?.last_seen_at || 0;
  if (now() - dbLast > 10000) db.prepare('UPDATE devices SET last_seen_at=? WHERE id=?').run(device.lastSeen, deviceId);
  updateStatus(userId);
  if (device.waiter) { const previous = device.waiter; device.waiter = null; sendIdle(previous); }
  if (device.queue.length) {
    const command = device.queue.shift();
    return reply(res, 200, { type: 'command', id: command.id, name: command.name, input: command.input });
  }
  const waiter = { req, res, timer: null, onClose: null };
  waiter.onClose = () => {
    clearTimeout(waiter.timer);
    if (device.waiter === waiter) device.waiter = null;
  };
  res.on('close', waiter.onClose);
  waiter.timer = setTimeout(() => {
    if (device.waiter === waiter) device.waiter = null;
    res.removeListener('close', waiter.onClose);
    reply(res, 200, { type: 'idle' });
  }, Math.max(0, Math.min(20, waitSeconds)) * 1000);
  device.waiter = waiter;
}
export function sendCommand(userId, name, input, signal) {
  const status = statusForUser(userId);
  if (!status.connected || status.deviceId == null) return Promise.resolve({ ok: false, output: 'Studio ulanmagan' });
  const device = userHub(userId).devices.get(status.deviceId);
  if (!device) return Promise.resolve({ ok: false, output: 'Studio ulanmagan' });
  if (signal?.aborted) return Promise.resolve({ ok: false, output: 'Foydalanuvchi to‘xtatdi', cancelled: true });
  const id = crypto.randomUUID();
  return new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return; settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      device.inflight.delete(id);
      updateStatus(userId);
      resolve(result);
    };
    const abort = () => {
      device.queue = device.queue.filter(c => c.id !== id);
      finish({ ok: false, output: 'Foydalanuvchi to‘xtatdi', cancelled: true });
    };
    const timer = setTimeout(() => finish({ ok: false, output: 'Plugin javob bermadi (timeout)' }), config.commandTimeoutMs);
    device.inflight.set(id, { finish, name });
    device.queue.push({ id, name, input });
    signal?.addEventListener('abort', abort, { once: true });
    deliverNext(device);
  });
}
export function receiveResult(userId, deviceId, id, ok, output) {
  const device = userHub(userId).devices.get(deviceId);
  const task = device?.inflight.get(id);
  if (!task) return { ignored: true };
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  task.finish({ ok: Boolean(ok), output: String(text).slice(0, 20000) });
  emit(userId, 'message', { kind: 'tool_result', toolId: id, ok: Boolean(ok), preview: String(text).slice(0, 300) });
  return { ignored: false };
}
export function listDevices(userId) {
  const hub = hydrate(userId);
  return db.prepare('SELECT id,place_name,created_at,last_seen_at FROM devices WHERE user_id=? ORDER BY id DESC').all(userId).map(row => {
    const device = hub.devices.get(row.id);
    const connected = Boolean(device && (now() - device.lastSeen < 25000 || device.inflight.size > 0));
    return { id: row.id, placeName: row.place_name || '', createdAt: row.created_at, lastSeenAt: device?.lastSeen || row.last_seen_at, connected };
  });
}
export function disconnectDevice(userId, deviceId) {
  const hub = hydrate(userId), device = hub.devices.get(deviceId);
  if (device) {
    if (device.waiter) {
      const waiter = device.waiter; device.waiter = null; clearTimeout(waiter.timer); waiter.req.removeListener('close', waiter.onClose);
      reply(waiter.res, 401, { error: 'Qurilma saytdan uzildi' });
    }
    for (const task of [...device.inflight.values()]) task.finish({ ok: false, output: 'Qurilma o‘chirildi' });
    device.queue.length = 0; hub.devices.delete(deviceId);
  }
  db.prepare('DELETE FROM devices WHERE id=? AND user_id=?').run(deviceId, userId);
  updateStatus(userId);
}
setInterval(() => {
  for (const [userId, hub] of hubs) {
    for (const device of hub.devices.values()) {
      if (now() - device.lastSeen > 25 * 60 * 60 * 1000 && !device.inflight.size) hub.devices.delete(device.id);
    }
    updateStatus(userId);
  }
}, 5000).unref();
