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

test('god tool selector exposes creation, destruction, and restoration flows including Meteor and Rain', () => {
  const html = readFileSync(indexPath, 'utf8');
  const main = readFileSync(mainPath, 'utf8');

  assert.match(html, /id=["']tool["']/);
  assert.match(html, /value=["']spawn_human["']/);
  assert.match(html, /value=["']spawn_grazer["']/);
  assert.match(html, /value=["']erase["']/);
  assert.match(html, /value=["']lightning["']/);
  assert.match(html, /value=["']meteor["']/);
  assert.match(html, /value=["']rain["']/);
  assert.match(html, /data-tool-button=["']meteor["']/);
  assert.match(html, /data-tool-button=["']rain["']/);
  assert.match(main, /querySelector\(['"]#tool['"]\)/);
  assert.match(main, /toolSelect\.value === ['"]spawn_grazer['"]/);
  assert.match(main, /type: ['"]spawn_creature['"]/);
  assert.match(main, /species: ['"]grazer['"]/);
  assert.match(main, /toolSelect\.value === ['"]erase['"]/);
  assert.match(main, /toolSelect\.value === ['"]lightning['"]/);
  assert.match(main, /toolSelect\.value === ['"]meteor['"]/);
  assert.match(main, /type: ['"]meteor['"]/);
  assert.match(main, /toolSelect\.value === ['"]rain['"]/);
  assert.match(main, /type: ['"]rain['"]/);
  assert.match(main, /shiftKey \? 10 : 1/);
});

test('browser entry renders, selects, resolves, and inspects typed creatures and renewable resources', () => {
  const main = readFileSync(mainPath, 'utf8');

  assert.match(main, /world\.creatures/);
  assert.match(main, /kind: ['"]creature['"]/);
  assert.match(main, /selection\.kind === ['"]creature['"]/);
  assert.match(main, /CREATURE #\$\{target\.id\}/);
  assert.match(main, /creature\.species !== ['"]grazer['"]/);
  assert.match(main, /food \$\{target\.food\.toFixed\(2\)\}/);
  assert.match(main, /vegetation \$\{target\.vegetation\.toFixed\(2\)\}/);
});
