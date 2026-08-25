import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, METEOR_RADIUS } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, tileAt, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createHuman } from '../engine/model/human.js';

function controlledMeteorWorld(seed = 1001) {
  const world = createWorld({ seed, width: 9, height: 9, population: 0, config: { waterLevel: -1 } });
  for (const tile of world.tiles) tile.vegetation = 0;

  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) {
      const tile = tileAt(world, x, y);
      tile.vegetationCapacity = Math.max(1, tile.vegetationCapacity);
      tile.vegetation = 1;
    }
  }

  const water = tileAt(world, 3, 3);
  water.biome = 'ocean';
  water.passable = false;
  water.fertility = 0;
  water.food = 0;
  water.foodCapacity = 0;
  water.vegetation = 0;
  water.vegetationCapacity = 0;

  const outsideVegetation = tileAt(world, 7, 7);
  outsideVegetation.vegetationCapacity = Math.max(2, outsideVegetation.vegetationCapacity);
  outsideVegetation.vegetation = 2;

  const centerHuman = createHuman(world, { x: 4, y: 4, ageYears: 30, sex: 'F', lineageId: null, settlementId: null });
  const edgeHuman = createHuman(world, { x: 6, y: 6, ageYears: 31, sex: 'M', lineageId: null, settlementId: null });
  const outsideHuman = createHuman(world, { x: 7, y: 4, ageYears: 32, sex: 'F', lineageId: null, settlementId: null });
  const impactedGrazer = createGrazer(world, { x: 2, y: 2 });
  const outsideGrazer = createGrazer(world, { x: 1, y: 4 });

  return { world, centerHuman, edgeHuman, outsideHuman, impactedGrazer, outsideGrazer };
}

test('meteor applies exact radius-2 cross-kind destruction without changing food, terrain, or sequential RNG', () => {
  const { world, centerHuman, edgeHuman, outsideHuman, impactedGrazer, outsideGrazer } = controlledMeteorWorld();
  const rngBefore = world.rng.snapshot();
  const foodBefore = world.tiles.map((tile) => tile.food);
  const passabilityBefore = world.tiles.map((tile) => tile.passable);
  const biomeBefore = world.tiles.map((tile) => tile.biome);

  const result = applyCommand(world, { type: 'meteor', x: 4, y: 4 });

  assert.equal(METEOR_RADIUS, 2);
  assert.equal(result.radius, 2);
  assert.equal(result.impactedTileCount, 25);
  assert.equal(result.passableTileCount, 24);
  assert.equal(result.vegetationRemoved, 24);
  assert.deepEqual(result.humanIds, [centerHuman.id, edgeHuman.id]);
  assert.deepEqual(result.creatureIds, [impactedGrazer.id]);
  assert.equal(result.noEffect, false);

  assert.deepEqual(world.entities.map((human) => human.id), [outsideHuman.id]);
  assert.deepEqual(world.creatures.map((creature) => creature.id), [outsideGrazer.id]);
  assert.equal(tileAt(world, 7, 7).vegetation, 2, 'vegetation outside Chebyshev radius 2 is unchanged');
  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) {
      const tile = tileAt(world, x, y);
      if (tile.passable) assert.equal(tile.vegetation, 0, `impact vegetation remained at ${x},${y}`);
    }
  }

  assert.deepEqual(world.tiles.map((tile) => tile.food), foodBefore);
  assert.deepEqual(world.tiles.map((tile) => tile.passable), passabilityBefore);
  assert.deepEqual(world.tiles.map((tile) => tile.biome), biomeBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.counters.deaths, 2);
  assert.equal(world.counters.creatureDeaths, 1);

  const meteor = world.history.find((event) => event.type === 'god.meteor');
  assert.ok(meteor);
  assert.equal(meteor.id, result.eventId);
  assert.equal(meteor.radius, 2);
  assert.equal(meteor.impactedTileCount, 25);
  assert.equal(meteor.vegetationRemoved, 24);
  assert.deepEqual(meteor.entityIds, result.humanIds);
  assert.deepEqual(meteor.creatureIds, result.creatureIds);

  const humanDeaths = world.history.filter((event) => event.type === 'human.died' && event.cause === 'meteor');
  assert.equal(humanDeaths.length, 2);
  for (const event of humanDeaths) {
    assert.ok(event.causes.some((reference) => reference.kind === 'event' && reference.id === meteor.id));
  }
  const creatureDeath = world.history.find((event) => event.type === 'creature.died' && event.cause === 'meteor');
  assert.ok(creatureDeath);
  assert.ok(creatureDeath.causes.some((reference) => reference.kind === 'event' && reference.id === meteor.id));
});

test('meteor accepts an empty clipped impact as a truthful deterministic no-effect action', () => {
  const world = createWorld({ seed: 1002, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of world.tiles) tile.vegetation = 0;
  const rngBefore = world.rng.snapshot();
  const commandIdBefore = world.nextCommandId;

  const result = applyCommand(world, { type: 'meteor', x: 0, y: 0 });

  assert.equal(result.impactedTileCount, 9, 'corner impact is clipped to the world rather than rejected');
  assert.equal(result.vegetationRemoved, 0);
  assert.deepEqual(result.humanIds, []);
  assert.deepEqual(result.creatureIds, []);
  assert.equal(result.noEffect, true);
  assert.equal(world.nextCommandId, commandIdBefore + 1, 'accepted no-effect actions still receive command identity');
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.history.at(-1).type, 'god.meteor');
  assert.equal(world.history.at(-1).noEffect, true);
});

test('meteor outcome is byte-deterministic from identical snapshots and invalid coordinates consume no command ID', () => {
  const { world } = controlledMeteorWorld(1003);
  const snapshot = snapshotWorld(world);
  const left = worldFromSnapshot(structuredClone(snapshot));
  const right = worldFromSnapshot(structuredClone(snapshot));

  const leftResult = applyCommand(left, { type: 'meteor', x: 4, y: 4 });
  const rightResult = applyCommand(right, { type: 'meteor', x: 4, y: 4 });
  assert.deepEqual(leftResult, rightResult);
  assert.deepEqual(snapshotWorld(left), snapshotWorld(right));

  const commandIdBefore = left.nextCommandId;
  assert.throws(() => applyCommand(left, { type: 'meteor', x: -1, y: 4 }), /x must be an integer/);
  assert.equal(left.nextCommandId, commandIdBefore);
});
