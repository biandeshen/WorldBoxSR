import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const bootstrap = readFileSync(join(root, 'client', 'bootstrap.js'), 'utf8');
const indexHtml = readFileSync(join(root, 'client', 'index.html'), 'utf8');
const adapter = readFileSync(join(root, 'client', 'presentation', 'world_adapter.js'), 'utf8');
const warbandLayer = readFileSync(join(root, 'client', 'presentation', 'warband_layer.js'), 'utf8');
const viteConfig = readFileSync(join(root, 'vite.config.js'), 'utf8');

test('v0.2 pins the accepted Phaser and Vite spike versions', () => {
  assert.equal(packageJson.dependencies?.phaser, '4.2.1');
  assert.equal(packageJson.devDependencies?.vite, '8.1.0');
  assert.equal(packageJson.scripts?.dev, 'vite');
  assert.equal(packageJson.scripts?.build, 'vite build');
  assert.equal(packageJson.scripts?.['pages:build'], 'vite build && node tools/build-pages.js');
});

test('Phaser is default while the legacy renderer remains an explicit comparison path', () => {
  assert.match(bootstrap, /renderer.*=== ['"]legacy['"] \? ['"]legacy['"] : ['"]phaser['"]/s);
  assert.match(bootstrap, /\.\/phaser_main\.js/);
  assert.match(bootstrap, /\.\/main\.js/);
  assert.match(indexHtml, /id=["']phaser-root["']/);
  assert.match(indexHtml, /renderer=legacy/);
  assert.match(indexHtml, /src=["']\.\/bootstrap\.js["']/);
});

test('Vite builds the client as the WorldBoxSR GitHub Pages project site', () => {
  assert.match(viteConfig, /root:\s*['"]client['"]/);
  assert.match(viteConfig, /['"]\/WorldBoxSR\/['"]/);
  assert.match(viteConfig, /outDir:\s*['"]\.\.\/\.pages['"]/);
});

test('presentation adapter uses authoritative engine commands without importing Phaser', () => {
  assert.match(adapter, /engine\/core\/commands\.js/);
  assert.match(adapter, /engine\/core\/world\.js/);
  assert.match(adapter, /applyCommand/);
  assert.doesNotMatch(adapter, /from ['"]phaser['"]/);
});

test('warband presentation consumes authority without creating a second simulation', () => {
  assert.match(adapter, /world\.warbands/);
  assert.match(warbandLayer, /view\.warbands/);
  assert.match(warbandLayer, /polityColor/);
  assert.doesNotMatch(warbandLayer, /engine\/systems\/warbands|tickWorld|applyCommand/);
});

test('authoritative engine remains presentation-framework independent', () => {
  for (const path of walk(join(root, 'engine'))) {
    if (!path.endsWith('.js')) continue;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /from\s+['"]phaser['"]|import\s*\(['"]phaser['"]\)/, `Phaser leaked into ${path}`);
    assert.doesNotMatch(source, /from\s+['"]vite['"]|import\s*\(['"]vite['"]\)/, `Vite leaked into ${path}`);
  }
});

test('new presentation modules are syntax-valid before browser bundling', () => {
  const files = [
    'client/bootstrap.js',
    'client/phaser_main.js',
    'client/presentation/world_adapter.js',
    'client/presentation/terrain_layer.js',
    'client/presentation/entity_layer.js',
    'client/presentation/settlement_layer.js',
    'client/presentation/warband_layer.js',
    'client/presentation/effects_layer.js',
    'vite.config.js'
  ];

  for (const relative of files) {
    const result = spawnSync(process.execPath, ['--check', join(root, relative)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${relative}: ${result.stderr || result.stdout}`);
  }
});

function walk(directory) {
  const paths = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) paths.push(...walk(path));
    else paths.push(path);
  }
  return paths;
}
