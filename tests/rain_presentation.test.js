import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../engine/core/world.js';
import { applyGodTool } from '../client/presentation/world_adapter.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const controlsPath = fileURLToPath(new URL('../client/presentation/ui_controls.js', import.meta.url));
const phaserPath = fileURLToPath(new URL('../client/phaser_main.js', import.meta.url));
const legacyPath = fileURLToPath(new URL('../client/main.js', import.meta.url));

test('presentation adapter returns authoritative Rain restoration and saturation outcomes', () => {
  const hitWorld = createWorld({ seed: 1301, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of hitWorld.tiles) {
    tile.food = tile.foodCapacity;
    tile.vegetation = tile.vegetationCapacity;
  }
  const center = hitWorld.tiles[3 * hitWorld.width + 3];
  center.food = 0;
  center.vegetation = 0;
  const result = applyGodTool(hitWorld, 'rain', 3, 3);
  assert.equal(result.accepted, true);
  assert.equal(result.effect, 'rain');
  assert.equal(result.noEffect, false);
  assert.equal(result.radius, 2);
  assert.ok(result.foodAdded > 0);
  assert.ok(result.vegetationAdded > 0);
  assert.equal(center.food, center.foodCapacity);
  assert.equal(center.vegetation, center.vegetationCapacity);

  const saturatedWorld = createWorld({ seed: 1302, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of saturatedWorld.tiles) {
    tile.food = tile.foodCapacity;
    tile.vegetation = tile.vegetationCapacity;
  }
  const noEffect = applyGodTool(saturatedWorld, 'rain', 0, 0);
  assert.equal(noEffect.accepted, true);
  assert.equal(noEffect.effect, 'rain');
  assert.equal(noEffect.noEffect, true);
});

test('Rain is a first-class power button, hotkey, legacy command, and truthful Phaser feedback path', () => {
  const html = readFileSync(indexPath, 'utf8');
  const controls = readFileSync(controlsPath, 'utf8');
  const phaser = readFileSync(phaserPath, 'utf8');
  const legacy = readFileSync(legacyPath, 'utf8');

  assert.match(html, /data-tool-button=["']rain["']/);
  assert.match(html, /Rain · radius 2 · key 6/);
  assert.match(controls, /['"]6['"]:\s*['"]rain['"]/);
  assert.match(controls, /Rain · radius 2/);
  assert.match(phaser, /result\.effect === ['"]rain['"]/);
  assert.match(phaser, /area already saturated/);
  assert.match(phaser, /vegetationAdded\.toFixed\(1\)/);
  assert.match(phaser, /foodAdded\.toFixed\(1\)/);
  assert.match(phaser, /food \$\{target\.food\.toFixed\(2\)\}/);
  assert.match(legacy, /toolSelect\.value === ['"]rain['"]/);
  assert.match(legacy, /type: ['"]rain['"]/);
});
