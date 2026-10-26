import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const plugin = await readFile(new URL('../roblox-plugin/QuruvchiBridge.plugin.lua', import.meta.url), 'utf8');
const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');

test('server exposes the API contracts used by the website', () => {
  for (const route of ['/healthz', '/api/register', '/api/login', '/api/logout', '/api/me', '/api/chat/history', '/api/chat/new', '/api/stream', '/api/chat', '/api/stop', '/api/pair', '/api/studio/pair', '/api/studio/poll', '/api/studio/result', '/api/studio/heartbeat']) {
    assert.ok(server.includes("'" + route + "'"), 'missing route ' + route);
  }
  for (const endpoint of ['/api/me', '/api/login', '/api/register', '/api/chat', '/api/pair']) assert.ok(app.includes(endpoint), 'frontend should call ' + endpoint);
});

test('authentication and persistence use password hashing and signed sessions', () => {
  assert.ok(server.includes('bcrypt.hash('));
  assert.ok(server.includes('bcrypt.compare('));
  assert.ok(server.includes('jwt.sign('));
  assert.ok(server.includes('jwt.verify('));
  assert.ok(server.includes('httpOnly: true'));
  assert.ok(server.includes('rateLimit('));
});

test('provider secret is server-side and configuration template has no live key', () => {
  assert.ok(server.includes('process.env.ANTHROPIC_API_KEY'));
  assert.ok(!app.includes('ANTHROPIC_API_KEY'));
  assert.match(envExample, /^ANTHROPIC_API_KEY=$/m);
});

test('Studio bridge uses one-time codes and a bearer token, and limits actions', () => {
  assert.ok(server.includes('expires_at'));
  assert.ok(server.includes("req.headers.authorization"));
  assert.ok(plugin.includes('/api/studio/pair'));
  assert.ok(plugin.includes('/api/studio/poll'));
  assert.ok(plugin.includes('/api/studio/result'));
  assert.ok(plugin.includes('create_part'));
  assert.ok(plugin.includes('create_script'));
  assert.ok(plugin.includes('create_folder'));
  assert.ok(plugin.includes('set_property'));
  assert.ok(!plugin.includes('loadstring('));
});
