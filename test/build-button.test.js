import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('build button remains clickable with an empty prompt and explains what to do', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /state\.busy\?stop:sendMessage,state\.busy\)/);
  assert.match(app, /Avval o‘yin g‘oyangni yoz/);
  assert.match(app, /root\.querySelector\('#prompt'\)/);
});

test('index refreshes browser assets after the 3D visual update', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /app\.js\?v=20261028-optin-free/);
});


test('API-free mode does not redirect chat errors into mandatory API-key setup', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const config = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
  const agent = await readFile(new URL('../src/agent.js', import.meta.url), 'utf8');
  assert.match(app, /API kaliti majburiy emas/);
  assert.doesNotMatch(app, /else if\(error\.status===503\)\{openAiSettings\(\)/);
  assert.match(config, /Tashqi AI faqat foydalanuvchi sozlamada API kalitini ixtiyoriy ulaganda ishlaydi/);
  assert.match(agent, /getCredential\(user\.id\)\s*\?\s*runLoop\(user\.id, task\)\s*:\s*runFreeTask\(user\.id, task, text\)/);
});


test('external AI is opt-in and removing a key returns the account to free mode', async () => {
  const providers = await readFile(new URL('../src/providers.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(providers, /if\(!row\)\s*\{/);
  assert.doesNotMatch(providers, /return config\.anthropicApiKey \?/);
  assert.match(app, /Ixtiyoriy: tashqi AI API sozlamalari/);
  assert.match(app, /API kalit o‘chirildi\. Quruvchi endi bepul API-kalitsiz rejimda ishlaydi\./);
  assert.match(app, /Odatiy rejimda tashqi AI API ishlatilmaydi/);
  assert.doesNotMatch(app, /Boshqa AI provayderini ulash/);
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
  assert.match(html, /20261028-3d-world/);
});
