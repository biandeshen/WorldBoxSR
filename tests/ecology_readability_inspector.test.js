import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { creatureInspectorText } from '../client/presentation/ecology_readability.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createWolf } from '../engine/model/wolf.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/ecology_readability_runtime.js', import.meta.url));

test('creature inspector text is a pure current-authority projection', () => {
  const world = createWorld({ seed: 2321, width: 8, height: 8, population: 0, config: { waterLevel: -1 } });
  const wolf = createWolf(world, { x: 2, y: 3, ageDays: 180, hunger: 0.10, health: 1 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  assert.equal(creatureInspectorText(wolf, world.config), [
    `Wolf #${wolf.id}`,
    'behavior resting',
    'age 0.5y',
    'health 100% · hunger 10%',
    'tile 2,3'
  ].join('\n'));

  wolf.ageDays = 216;
  wolf.hunger = world.config.wolfHungryThreshold;
  wolf.health = 0.84;
  wolf.x = 3;
  wolf.y = 4;
  assert.equal(creatureInspectorText(wolf, world.config), [
    `Wolf #${wolf.id}`,
    'behavior seeking grazers',
    'age 0.6y',
    'health 84% · hunger 35%',
    'tile 3,4'
  ].join('\n'));

  wolf.ageDays = before.creatures[0].ageDays;
  wolf.hunger = before.creatures[0].hunger;
  wolf.health = before.creatures[0].health;
  wolf.x = before.creatures[0].x;
  wolf.y = before.creatures[0].y;
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('readability runtime refreshes selected creature on existing HUD cadence only', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  assert.match(runtime, /creatureInspectorText/);
  assert.match(runtime, /statsObserver/);
  assert.match(runtime, /renderCurrentCreatureInspector\(scene, inspector\)/);
  assert.match(runtime, /not currently present/);
  assert.doesNotMatch(runtime, /setInterval|requestAnimationFrame/);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent|killCreature|engine\//);
});
