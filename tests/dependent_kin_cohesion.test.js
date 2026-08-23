import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeParentChildWorld(dependentKinBiasChance, { childAge = 10, childHunger = 0.1 } = {}) {
  const world = createWorld({
    seed: 424242,
    width: 8,
    height: 8,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 1,
      settlementHomeBiasChance: 0,
      dependentKinBiasChance,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementCheckIntervalDays: 0
    }
  });
  const parent = createHuman(world, { x: 2, y: 2, sex: 'M', ageYears: 35, hunger: 0.4 });
  const child = createHuman(world, {
    x: 5,
    y: 5,
    sex: 'F',
    ageYears: childAge,
    hunger: childHunger,
    lineageId: parent.lineageId,
    parentIds: [parent.id],
    generation: 1
  });
  parent.childIds.push(child.id);
  return { world, parent, child };
}

function distance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

test('dependent minor takes a homeward passive step when kin bias is certain', () => {
  const { world, parent, child } = makeParentChildWorld(1);
  const before = distance(parent, child);
  tickWorld(world, 1);
  assert.ok(distance(parent, child) < before);
});

test('hunger-driven food movement overrides dependent kin bias', () => {
  const { world, parent, child } = makeParentChildWorld(1, { childHunger: 0.4 });
  for (const tile of world.tiles) tile.food = 0;
  // Away from the parent, but deliberately the best adjacent food target.
  const away = world.tiles.find((tile) => tile.x === 6 && tile.y === 6);
  away.food = 10;
  const before = distance(parent, child);
  tickWorld(world, 1);
  assert.equal(child.x, 6);
  assert.equal(child.y, 6);
  assert.ok(distance(parent, child) > before);
});

test('adult humans are unaffected by dependent kin bias', () => {
  const a = makeParentChildWorld(0, { childAge: 20 });
  const b = makeParentChildWorld(1, { childAge: 20 });
  tickWorld(a.world, 1);
  tickWorld(b.world, 1);
  assert.deepEqual(a.world.entities, b.world.entities);
  assert.deepEqual(a.world.rng.snapshot(), b.world.rng.snapshot());
});

test('dependent kin override preserves the sequential RNG stream', () => {
  const baseline = makeParentChildWorld(0);
  const biased = makeParentChildWorld(1);
  tickWorld(baseline.world, 1);
  tickWorld(biased.world, 1);
  assert.deepEqual(biased.world.rng.snapshot(), baseline.world.rng.snapshot());
  assert.notDeepEqual(biased.world.entities, baseline.world.entities);
});

test('dependent kin cohesion remains deterministic across save/load', () => {
  const { world } = makeParentChildWorld(0.25);
  tickWorld(world, 40);
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 80);
  tickWorld(restored, 80);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});
