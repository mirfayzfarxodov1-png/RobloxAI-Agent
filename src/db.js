import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(config.dataDir, 'quruvchi.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, login TEXT NOT NULL UNIQUE COLLATE NOCASE,
 pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pairings (
 code_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE TABLE IF NOT EXISTS devices (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE, place_name TEXT, place_id INTEGER,
 created_at INTEGER NOT NULL, last_seen_at INTEGER
);
CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL,
 steps INTEGER NOT NULL DEFAULT 0, input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day)
);
CREATE TABLE IF NOT EXISTS task_pauses (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 reason TEXT NOT NULL,
 retry_at INTEGER,
 details TEXT,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id,id);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`);
const version = db.prepare('SELECT value FROM meta WHERE key=?').get('schema_version');
if (!version) db.prepare('INSERT INTO meta(key,value) VALUES(?,?)').run('schema_version', '1');

export function createConversation(userId) {
  const result = db.prepare('INSERT INTO conversations(user_id,created_at,archived) VALUES(?,?,0)').run(userId, Date.now());
  return Number(result.lastInsertRowid);
}
export function currentConversation(userId) {
  let row = db.prepare('SELECT id FROM conversations WHERE user_id=? AND archived=0 ORDER BY id DESC LIMIT 1').get(userId);
  if (!row) return createConversation(userId);
  return row.id;
}
export function saveMessage(conversationId, role, content) {
  const result = db.prepare('INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,?,?,?)')
    .run(conversationId, role, JSON.stringify(content), Date.now());
  return Number(result.lastInsertRowid);
}
export function getMessages(conversationId) {
  return db.prepare('SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY id').all(conversationId)
    .map(row => ({ ...row, content: JSON.parse(row.content) }));
}
export function addUsage(userId, steps = 0, inputTokens = 0, outputTokens = 0) {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare('INSERT INTO usage(user_id,day,steps,input_tokens,output_tokens) VALUES(?,?,?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET steps=steps+excluded.steps,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens')
    .run(userId, day, steps, inputTokens, outputTokens);
}
export function getUsage(userId) {
  const day = new Date().toISOString().slice(0, 10);
  return db.prepare('SELECT steps,input_tokens,output_tokens FROM usage WHERE user_id=? AND day=?').get(userId, day) || { steps: 0, input_tokens: 0, output_tokens: 0 };
}
export function getTaskPause(userId) {
  const row = db.prepare('SELECT conversation_id,reason,retry_at,details,created_at,updated_at FROM task_pauses WHERE user_id=?').get(userId);
  return row ? { conversationId: row.conversation_id, reason: row.reason, retryAt: row.retry_at, details: row.details || '', createdAt: row.created_at, updatedAt: row.updated_at } : null;
}
export function setTaskPause(userId, conversationId, reason, retryAt = null, details = '') {
  const timestamp = Date.now();
  db.prepare(`INSERT INTO task_pauses(user_id,conversation_id,reason,retry_at,details,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET conversation_id=excluded.conversation_id,reason=excluded.reason,retry_at=excluded.retry_at,details=excluded.details,updated_at=excluded.updated_at`)
    .run(userId, conversationId, reason, retryAt, String(details).slice(0, 500), timestamp, timestamp);
  return getTaskPause(userId);
}
export function clearTaskPause(userId) {
  db.prepare('DELETE FROM task_pauses WHERE user_id=?').run(userId);
}
export function cleanupExpired() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(now);
  db.prepare('DELETE FROM pairings WHERE expires_at<? OR used_at IS NOT NULL').run(now);
}
