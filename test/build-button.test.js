import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('build button remains clickable with an empty prompt and explains what to do', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /state\.busy\?stop:sendMessage,state\.busy\)/);
  assert.match(app, /Avval o‘yin g‘oyangni yoz/);
  assert.match(app, /root\.querySelector\('#prompt'\)/);
});

test('index refreshes the browser JavaScript after the build-button fix', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /app\.js\?v=20261028-sendfix/);
});
