import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, RAIN_RADIUS } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, tileAt, worldFromSnapshot } from '../engine/core/world.js';

function controlledRainWorld(seed = 1201) {
  const world = createWorld({ seed, width: 9, height: 9, population: 0, config: { waterLevel: -1 } });
  for (const tile of world.tiles) {
    tile.food = tile.foodCapacity;
    tile.vegetation = tile.vegetationCapacity;
  }

  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) {
      const tile = tileAt(world, x, y);
      tile.foodCapacity = 4;
      tile.food = 1;
      tile.vegetationCapacity = 5;
      tile.vegetation = 2;
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

  const outside = tileAt(world, 7, 7);
  outside.foodCapacity = 9;
  outside.food = 3;
  outside.vegetationCapacity = 8;
  outside.vegetation = 4;

  return world;
}

test('Rain saturates only passable radius-2 renewable resources without changing terrain semantics or RNG', () => {
  const world = controlledRainWorld();
  const rngBefore = world.rng.snapshot();
  const tileSemanticsBefore = world.tiles.map((tile) => ({
    x: tile.x,
    y: tile.y,
    biome: tile.biome,
    passable: tile.passable,
    elevation: tile.elevation,
    moisture: tile.moisture,
    fertility: tile.fertility,
    foodCapacity: tile.foodCapacity,
    vegetationCapacity: tile.vegetationCapacity,
    ownerSettlementId: tile.ownerSettlementId
  }));

  const result = applyCommand(world, { type: 'rain', x: 4, y: 4 });

  assert.equal(RAIN_RADIUS, 2);
  assert.equal(result.radius, 2);
  assert.equal(result.impactedTileCount, 25);
  assert.equal(result.passableTileCount, 24);
  assert.equal(result.vegetationAdded, 72);
  assert.equal(result.foodAdded, 72);
  assert.equal(result.noEffect, false);

  for (let y = 2; y <= 6; y += 1) {
    for (let x = 2; x <= 6; x += 1) {
      const tile = tileAt(world, x, y);
      assert.equal(tile.food, tile.foodCapacity, `food not saturated at ${x},${y}`);
      assert.equal(tile.vegetation, tile.vegetationCapacity, `vegetation not saturated at ${x},${y}`);
    }
  }
  assert.equal(tileAt(world, 7, 7).food, 3, 'food outside radius is unchanged');
  assert.equal(tileAt(world, 7, 7).vegetation, 4, 'vegetation outside radius is unchanged');
  assert.deepEqual(world.tiles.map((tile) => ({
    x: tile.x,
    y: tile.y,
    biome: tile.biome,
    passable: tile.passable,
    elevation: tile.elevation,
    moisture: tile.moisture,
    fertility: tile.fertility,
    foodCapacity: tile.foodCapacity,
    vegetationCapacity: tile.vegetationCapacity,
    ownerSettlementId: tile.ownerSettlementId
  })), tileSemanticsBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  const event = world.history.find((candidate) => candidate.type === 'god.rain');
  assert.ok(event);
  assert.equal(event.id, result.eventId);
  assert.equal(event.radius, 2);
  assert.equal(event.vegetationAdded, 72);
  assert.equal(event.foodAdded, 72);
  assert.equal(event.noEffect, false);
  assert.deepEqual(event.causes, [{ kind: 'command', id: 1, commandType: 'rain' }]);
});

test('Rain accepts a saturated area as truthful no-effect and clipped corners stay deterministic', () => {
  const world = createWorld({ seed: 1202, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of world.tiles) {
    tile.food = tile.foodCapacity;
    tile.vegetation = tile.vegetationCapacity;
  }
  const rngBefore = world.rng.snapshot();
  const commandIdBefore = world.nextCommandId;

  const result = applyCommand(world, { type: 'rain', x: 0, y: 0 });
  assert.equal(result.impactedTileCount, 9);
  assert.equal(result.vegetationAdded, 0);
  assert.equal(result.foodAdded, 0);
  assert.equal(result.noEffect, true);
  assert.equal(world.nextCommandId, commandIdBefore + 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.history.at(-1).type, 'god.rain');
  assert.equal(world.history.at(-1).noEffect, true);
});

test('Rain deterministically restores a Meteor-cleared footprint while invalid input consumes no command identity', () => {
  const base = createWorld({ seed: 1203, width: 9, height: 9, population: 0, config: { waterLevel: -1 } });
  for (const tile of base.tiles) {
    tile.food = tile.foodCapacity * 0.4;
    tile.vegetation = tile.vegetationCapacity;
  }
  applyCommand(base, { type: 'meteor', x: 4, y: 4 });
  const afterMeteor = snapshotWorld(base);
  const left = worldFromSnapshot(structuredClone(afterMeteor));
  const right = worldFromSnapshot(structuredClone(afterMeteor));

  const leftResult = applyCommand(left, { type: 'rain', x: 4, y: 4 });
  const rightResult = applyCommand(right, { type: 'rain', x: 4, y: 4 });
  assert.ok(leftResult.vegetationAdded > 0, 'Rain should visibly restore Meteor-cleared vegetation');
  assert.ok(leftResult.foodAdded > 0, 'Rain should replenish depleted food through the existing capacity contract');
  assert.deepEqual(leftResult, rightResult);
  assert.deepEqual(snapshotWorld(left), snapshotWorld(right));

  const commandIdBefore = left.nextCommandId;
  assert.throws(() => applyCommand(left, { type: 'rain', x: 9, y: 4 }), /x must be an integer/);
  assert.equal(left.nextCommandId, commandIdBefore);
});
