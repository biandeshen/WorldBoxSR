import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, tickWorld, tileAt } from '../engine/core/world.js';

function firstTile(world, predicate) {
  const tile = world.tiles.find(predicate);
  assert.ok(tile, 'expected matching tile');
  return tile;
}

test('same seed produces the same land-water map and different seeds diverge', () => {
  const a = createWorld({ seed: 31415, width: 24, height: 18, population: 0 });
  const b = createWorld({ seed: 31415, width: 24, height: 18, population: 0 });
  const c = createWorld({ seed: 27182, width: 24, height: 18, population: 0 });

  assert.deepEqual(a.tiles.map((tile) => tile.biome), b.tiles.map((tile) => tile.biome));
  assert.notDeepEqual(a.tiles.map((tile) => tile.biome), c.tiles.map((tile) => tile.biome));
  assert.deepEqual(snapshotWorld(a), snapshotWorld(b));
});

test('water is impassable and has no food capacity', () => {
  const world = createWorld({ seed: 42, width: 24, height: 24, population: 30 });
  const water = firstTile(world, (tile) => tile.biome === 'ocean');
  const land = firstTile(world, (tile) => tile.biome === 'land');

  assert.equal(water.passable, false);
  assert.equal(water.foodCapacity, 0);
  assert.equal(water.food, 0);
  assert.equal(land.passable, true);
  assert.ok(land.foodCapacity > 0);
  assert.ok(world.entities.every((human) => tileAt(world, human.x, human.y).passable));
});

test('god spawn command rejects water and accepts land', () => {
  const world = createWorld({ seed: 99, width: 20, height: 20, population: 0 });
  const water = firstTile(world, (tile) => tile.biome === 'ocean');
  const land = firstTile(world, (tile) => tile.biome === 'land');

  assert.throws(
    () => applyCommand(world, { type: 'spawn_human', x: water.x, y: water.y, count: 1 }),
    /impassable/
  );
  applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 3 });
  assert.equal(world.entities.length, 3);
  assert.ok(world.entities.every((human) => human.x === land.x && human.y === land.y));
});

test('humans never enter water during long movement runs', () => {
  for (const seed of [2, 7, 19, 42, 88]) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, world.config.daysPerYear * 30);
    assert.ok(world.entities.length > 0, `seed ${seed} should retain a founder population`);
    assert.ok(
      world.entities.every((human) => tileAt(world, human.x, human.y).passable),
      `seed ${seed} placed a human on water`
    );
  }
});
