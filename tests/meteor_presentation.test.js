import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createHuman } from '../engine/model/human.js';
import { applyGodTool } from '../client/presentation/world_adapter.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const controlsPath = fileURLToPath(new URL('../client/presentation/ui_controls.js', import.meta.url));
const phaserPath = fileURLToPath(new URL('../client/phaser_main.js', import.meta.url));
const legacyPath = fileURLToPath(new URL('../client/main.js', import.meta.url));

test('presentation adapter returns authoritative Meteor hit and no-effect outcomes without a second simulation', () => {
  const hitWorld = createWorld({ seed: 1101, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of hitWorld.tiles) tile.vegetation = 0;
  hitWorld.tiles[3 * hitWorld.width + 3].vegetation = 2;
  createHuman(hitWorld, { x: 3, y: 3, ageYears: 30, sex: 'F', lineageId: null, settlementId: null });
  createGrazer(hitWorld, { x: 4, y: 4 });
  const result = applyGodTool(hitWorld, 'meteor', 3, 3);
  assert.equal(result.accepted, true);
  assert.equal(result.effect, 'meteor');
  assert.equal(result.noEffect, false);
  assert.equal(result.radius, 2);
  assert.equal(result.humanIds.length, 1);
  assert.equal(result.creatureIds.length, 1);
  assert.equal(result.vegetationRemoved, 2);

  const emptyWorld = createWorld({ seed: 1102, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of emptyWorld.tiles) tile.vegetation = 0;
  const noEffect = applyGodTool(emptyWorld, 'meteor', 0, 0);
  assert.equal(noEffect.accepted, true);
  assert.equal(noEffect.noEffect, true);
});

test('Meteor is a first-class power button, hotkey, legacy command, and truthful Phaser feedback path', () => {
  const html = readFileSync(indexPath, 'utf8');
  const controls = readFileSync(controlsPath, 'utf8');
  const phaser = readFileSync(phaserPath, 'utf8');
  const legacy = readFileSync(legacyPath, 'utf8');

  assert.match(html, /data-tool-button=["']meteor["']/);
  assert.match(html, /Meteor · radius 2 · key 5/);
  assert.match(controls, /['"]5['"]:\s*['"]meteor['"]/);
  assert.match(controls, /Meteor · radius 2/);
  assert.match(phaser, /result\.noEffect/);
  assert.match(phaser, /vegetationRemoved\.toFixed\(1\)/);
  assert.match(phaser, /Meteor impact/);
  assert.match(legacy, /toolSelect\.value === ['"]meteor['"]/);
  assert.match(legacy, /type: ['"]meteor['"]/);
});
