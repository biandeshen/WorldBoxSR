import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mainPath = fileURLToPath(new URL('../client/main.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('browser entry parses as valid JavaScript without requiring a browser test framework', () => {
  const result = spawnSync(process.execPath, ['--check', mainPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('history timeline DOM contract exists in the client shell', () => {
  const html = readFileSync(indexPath, 'utf8');
  const main = readFileSync(mainPath, 'utf8');
  const requiredIds = [
    'history-scope',
    'history-order',
    'history-scope-label',
    'history-list',
    'history-detail'
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id} in client/index.html`);
    assert.match(main, new RegExp(`#${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `client/main.js does not query #${id}`);
  }
});

test('god tool selector exposes spawn, erase, and lightning while browser entry consumes the selected tool', () => {
  const html = readFileSync(indexPath, 'utf8');
  const main = readFileSync(mainPath, 'utf8');

  assert.match(html, /id=["']tool["']/);
  assert.match(html, /value=["']spawn_human["']/);
  assert.match(html, /value=["']erase["']/);
  assert.match(html, /value=["']lightning["']/);
  assert.match(main, /querySelector\(['"]#tool['"]\)/);
  assert.match(main, /toolSelect\.value === ['"]erase['"]/);
  assert.match(main, /toolSelect\.value === ['"]lightning['"]/);
  assert.match(main, /type: ['"]erase['"]/);
  assert.match(main, /type: ['"]lightning['"]/);
  assert.match(main, /shiftKey \? 10 : 1/);
});
