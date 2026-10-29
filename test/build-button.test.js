import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('build button remains clickable with an empty prompt and explains what to do', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /state\.busy\?stop:sendMessage,state\.busy\)/);
  assert.match(app, /Avval o‘yin g‘oyangni yoz/);
  assert.match(app, /root\.querySelector\('#prompt'\)/);
});

test('index references current cache-busted browser assets', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /app\.js\?v=20261029-max-auth-v7/);
});


test('external AI providers and API-key UI are removed', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');
  const agent = await readFile(new URL('../src/agent.js', import.meta.url), 'utf8');
  const config = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /API KALIT|ai-provider-form|openAiSettings|\/api\/ai\//);
  assert.doesNotMatch(server, /\/api\/ai\/providers|\/api\/ai\/credentials|providers\.js/);
  assert.doesNotMatch(agent, /getCredential|runLoop|createMessage|claude\.js/);
  assert.doesNotMatch(config, /ANTHROPIC_API_KEY|ANTHROPIC_BASE_URL|CLAUDE_MODEL/);
});

test('all chat builds use the local template generator', async () => {
  const agent = await readFile(new URL('../src/agent.js', import.meta.url), 'utf8');
  assert.match(agent, /task\.done = runFreeTask\(user\.id, task, text\)/);
  assert.match(agent, /buildFreeProject\(prompt, historyMessages\)/);
  assert.match(agent, /mahalliy bepul qurish rejimi/);
});

test('premium 3D world is present on the builder welcome screen and auth screen', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/style.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(app, /function createWorldVisual\(className\)/);
  assert.match(app, /createWorldVisual\('world-stage world-stage-inline'\)/);
  assert.match(app, /createWorldVisual\('world-stage world-stage-auth'\)/);
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.world-stage/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /20261029-max-auth-v7/);
});
