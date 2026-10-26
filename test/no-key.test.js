import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('website starts and serves HTML without an AI API key', async t => {
  const port = await freePort();
  const base = 'http://127.0.0.1:' + port;
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'quruvchi-no-key-'));
  const child = spawn(process.execPath, ['--experimental-sqlite', path.join(projectRoot, 'src', 'server.js')], {
    cwd: dataDir,
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port), PUBLIC_URL: base, DATA_DIR: dataDir, ANTHROPIC_API_KEY: '', COOKIE_SECURE: 'false', INVITE_CODE: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => output += chunk.toString());
  child.stderr.on('data', chunk => output += chunk.toString());
  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1500);
    });
    await rm(dataDir, { recursive: true, force: true });
  });
  let response;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Server stopped: ' + output);
    try { response = await fetch(base + '/'); if (response.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(response?.ok, 'home page should load without an API key; server output: ' + output);
  assert.match(await response.text(), /Quruvchi/);
  const health = await fetch(base + '/healthz');
  assert.equal(health.status, 200);
});
