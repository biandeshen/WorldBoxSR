import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

test('world invariants survive a multi-decade run', () => {
  const world = createWorld({ seed: 42, width: 20, height: 20, population: 40 });
  tickWorld(world, world.config.daysPerYear * 40);

  const ids = new Set();
  for (const entity of world.entities) {
    assert.equal(entity.alive, true);
    assert.ok(!ids.has(entity.id), `duplicate entity id ${entity.id}`);
    ids.add(entity.id);
    assert.ok(entity.x >= 0 && entity.x < world.width);
    assert.ok(entity.y >= 0 && entity.y < world.height);
    assert.ok(Number.isFinite(entity.hunger) && entity.hunger >= 0 && entity.hunger <= 1);
    assert.ok(Number.isFinite(entity.health) && entity.health > 0 && entity.health <= 1);
    assert.ok(entity.ageDays >= 0);
  }

  for (const tile of world.tiles) {
    assert.ok(Number.isFinite(tile.food));
    assert.ok(tile.food >= -1e-10);
    assert.ok(tile.food <= tile.foodCapacity + 1e-10);
  }

  const summary = summarizeWorld(world);
  for (const value of Object.values(summary)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
});

test('event history remains bounded', () => {
  const world = createWorld({
    seed: 77,
    width: 8,
    height: 8,
    population: 50,
    config: { maxEventHistory: 25, birthChancePerEligiblePairPerDay: 0.02 }
  });
  tickWorld(world, 3_000);
  assert.ok(world.history.length <= 25);
});
