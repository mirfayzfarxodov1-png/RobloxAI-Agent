import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build']);

function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectJavaScriptFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(absolute);
  }
  return files;
}

test('all repository JavaScript files pass Node syntax checking', () => {
  const files = collectJavaScriptFiles(root);
  assert.ok(files.length > 0, 'expected JavaScript files to be present');

  const failures = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: root,
      encoding: 'utf8',
      timeout: 15000
    });
    if (result.error || result.status !== 0) {
      failures.push({
        file: path.relative(root, file).replaceAll(path.sep, '/'),
        output: [result.stderr, result.stdout, result.error?.message].filter(Boolean).join('\n').trim()
      });
    }
  }

  assert.deepEqual(
    failures,
    [],
    failures.map(item => item.file + ':\n' + item.output).join('\n\n')
  );
});
