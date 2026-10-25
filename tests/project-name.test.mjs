import test from 'node:test';
import assert from 'node:assert/strict';
function validProjectName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 50 && !/[<>:"/\\|?*]/.test(name.trim()) && name.trim() !== '.' && name.trim() !== '..';
}
test('accepts normal project names', () => { assert.equal(validProjectName('Starter Meadow'), true); assert.equal(validProjectName('My_Game-01'), true); });
test('rejects unsafe names', () => { for (const value of ['', '  ', '../oops', 'a/b', 'a:b', 'name*', '.', '..']) assert.equal(validProjectName(value), false, String(value)); });
test('rejects names longer than 50 characters', () => { assert.equal(validProjectName('x'.repeat(51)), false); });
