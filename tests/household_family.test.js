import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFamilies } from '../engine/core/family_metrics.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

test('founders receive deterministic persistent households without RNG side effects', () => {
  const world = createWorld({ seed: 1234, width: 12, height: 12, population: 4 });
  assert.equal(world.households.length, 4);
  assert.equal(world.nextHouseholdId, 5);

  for (const human of world.entities) {
    const household = world.households.find((candidate) => candidate.id === human.householdId);
    assert.ok(household);
    assert.deepEqual(human.parentIds, []);
    assert.deepEqual(human.childIds, []);
    assert.equal(human.generation, 0);
    assert.deepEqual(household.founderIds, [human.id]);
    assert.deepEqual(household.memberIds, [human.id]);
  }
});

test('birth records two-parent lineage and inherits the maternal household', () => {
  const world = createWorld({
    seed: 99,
    width: 10,
    height: 10,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 1,
      settlementCheckIntervalDays: 0
    }
  });
  const tile = world.tiles.find((candidate) => candidate.passable);
  const mother = createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 24, hunger: 0.1 });
  const father = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 25, hunger: 0.1 });
  const maternalHouseholdId = mother.householdId;

  tickWorld(world, 1);

  const child = world.entities.find((human) => human.parentIds.length === 2);
  assert.ok(child);
  assert.deepEqual(child.parentIds, [mother.id, father.id]);
  assert.equal(child.householdId, maternalHouseholdId);
  assert.equal(child.generation, 1);
  assert.ok(mother.childIds.includes(child.id));
  assert.ok(father.childIds.includes(child.id));

  const household = world.households.find((candidate) => candidate.id === maternalHouseholdId);
  assert.ok(household.memberIds.includes(child.id));
  assert.equal(household.maxGeneration, 1);
});

test('household and lineage state survives deterministic save/load continuation', () => {
  const world = createWorld({ seed: 707, width: 12, height: 12, population: 12 });
  tickWorld(world, 400);
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));

  tickWorld(world, 120);
  tickWorld(restored, 120);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('family metrics are derived-only and preserve world and RNG state', () => {
  const world = createWorld({ seed: 314, width: 12, height: 12, population: 8 });
  tickWorld(world, 100);
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const summary = summarizeFamilies(world);

  assert.equal(summary.householdCount, world.households.length);
  assert.ok(summary.maxGeneration >= 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
