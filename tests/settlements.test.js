import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';

function firstLand(world) {
  const tile = world.tiles.find((candidate) => candidate.passable);
  assert.ok(tile);
  return tile;
}

const FAST_SETTLEMENT_CONFIG = {
  passiveMoveChance: 0,
  settlementCheckIntervalDays: 10,
  settlementMinAdults: 4,
  settlementFormationDays: 20,
  settlementMinSpacing: 4,
  settlementMembershipRadius: 2
};

test('stable adult clusters found deterministic settlements with stable membership', () => {
  const make = () => {
    const world = createWorld({ seed: 1234, width: 12, height: 12, population: 0, config: FAST_SETTLEMENT_CONFIG });
    const land = firstLand(world);
    applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 6 });
    tickWorld(world, 20);
    return world;
  };

  const a = make();
  const b = make();
  assert.equal(a.settlements.length, 1);
  assert.equal(a.settlements[0].id, 1);
  assert.ok(a.settlements[0].name.length > 0);
  assert.equal(a.settlements[0].population, 6);
  assert.ok(a.entities.every((human) => human.settlementId === 1));
  assert.ok(a.history.some((event) => event.type === 'settlement.founded'));
  assert.deepEqual(snapshotWorld(a), snapshotWorld(b));
});

test('clusters below the adult threshold do not form settlements', () => {
  const world = createWorld({ seed: 4321, width: 12, height: 12, population: 0, config: FAST_SETTLEMENT_CONFIG });
  const land = firstLand(world);
  applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 3 });
  tickWorld(world, 100);
  assert.equal(world.settlements.length, 0);
});

test('settlement state survives save/load continuation exactly', () => {
  const world = createWorld({ seed: 9876, width: 12, height: 12, population: 0, config: FAST_SETTLEMENT_CONFIG });
  const land = firstLand(world);
  applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 8 });
  tickWorld(world, 30);
  assert.ok(world.settlements.length > 0);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 150);
  tickWorld(restored, 150);
  assert.deepEqual(snapshotWorld(world), snapshotWorld(restored));
});

test('default worlds can form settlements without scripted placement', () => {
  const formed = [];
  for (const seed of [1, 7, 21, 42, 80]) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, world.config.daysPerYear * 30);
    formed.push(world.settlements.length);
  }
  assert.ok(formed.some((count) => count > 0), `expected at least one natural settlement, got ${formed.join(', ')}`);
});
