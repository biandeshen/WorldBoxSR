import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { regenerateVegetation } from '../engine/systems/environment.js';
import {
  initialVegetationForTile,
  vegetationCapacityForTile,
  vegetationRegrowthFactor
} from '../engine/world/vegetation.js';

test('vegetation capacity is a transparent moisture gradient and ocean stays zero', () => {
  const dry = { passable: true, moisture: 0.2, fertility: 0.5 };
  const wet = { passable: true, moisture: 0.8, fertility: 0.5 };
  const ocean = { passable: false, moisture: 1, fertility: 1 };

  assert.equal(vegetationCapacityForTile(dry), 3.6);
  assert.equal(vegetationCapacityForTile(wet), 8.4);
  assert.ok(vegetationCapacityForTile(wet) > vegetationCapacityForTile(dry));
  assert.equal(initialVegetationForTile(dry), 3.6 * 0.675);
  assert.equal(initialVegetationForTile(wet), 8.4 * 0.675);
  assert.equal(vegetationCapacityForTile(ocean), 0);
  assert.equal(initialVegetationForTile(ocean), 0);
  assert.equal(vegetationRegrowthFactor(ocean), 0);
});

test('generated vegetation is deterministic, bounded, and absent from ocean', () => {
  const first = createWorld({ seed: 8901, width: 16, height: 12, population: 0 });
  const second = createWorld({ seed: 8901, width: 16, height: 12, population: 0 });

  assert.deepEqual(
    first.tiles.map(({ vegetation, vegetationCapacity }) => ({ vegetation, vegetationCapacity })),
    second.tiles.map(({ vegetation, vegetationCapacity }) => ({ vegetation, vegetationCapacity }))
  );

  for (const tile of first.tiles) {
    assert.ok(tile.vegetation >= 0);
    assert.ok(tile.vegetation <= tile.vegetationCapacity + 1e-12);
    if (!tile.passable) {
      assert.equal(tile.vegetationCapacity, 0);
      assert.equal(tile.vegetation, 0);
    } else {
      assert.equal(tile.vegetationCapacity, 2 + 8 * tile.moisture);
    }
  }
});

test('vegetation regrowth is independent of food and RNG and clamps to capacity', () => {
  const world = createWorld({ seed: 8902, width: 12, height: 12, population: 0 });
  const land = world.tiles.find((tile) => tile.passable);
  const ocean = world.tiles.find((tile) => !tile.passable);
  assert.ok(land);
  assert.ok(ocean);

  land.vegetation = 0;
  ocean.vegetation = 5;
  const foodBefore = world.tiles.map((tile) => tile.food);
  const rngBefore = world.rng.snapshot();
  const expected = world.config.vegetationRegrowthPerDay * vegetationRegrowthFactor(land);

  regenerateVegetation(world);

  assert.ok(Math.abs(land.vegetation - expected) < 1e-12);
  assert.equal(ocean.vegetation, 0);
  assert.deepEqual(world.tiles.map((tile) => tile.food), foodBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  land.vegetation = land.vegetationCapacity - expected / 2;
  regenerateVegetation(world);
  assert.equal(land.vegetation, land.vegetationCapacity);
});

test('different vegetation trajectories leave human, food, settlement, history, and RNG behavior identical', () => {
  const base = {
    seed: 8903,
    width: 20,
    height: 20,
    population: 30
  };
  const slow = createWorld({ ...base, config: { vegetationRegrowthPerDay: 0 } });
  const fast = createWorld({ ...base, config: { vegetationRegrowthPerDay: 1 } });

  tickWorld(slow, slow.config.daysPerYear * 20);
  tickWorld(fast, fast.config.daysPerYear * 20);

  assert.deepEqual(behaviorFingerprint(fast), behaviorFingerprint(slow));
  assert.notDeepEqual(
    fast.tiles.map((tile) => tile.vegetation),
    slow.tiles.map((tile) => tile.vegetation),
    'the control must actually produce different vegetation trajectories'
  );
});

test('vegetation survives snapshot/save-load exactly under snapshot schema v9', () => {
  const world = createWorld({ seed: 8904, width: 12, height: 12, population: 12 });
  tickWorld(world, 500);
  const snapshot = snapshotWorld(world);
  assert.equal(snapshot.snapshotVersion, 9);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  tickWorld(world, 120);
  tickWorld(restored, 120);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('vegetation world metrics are exact and derived-only', () => {
  const world = createWorld({ seed: 8905, width: 10, height: 10, population: 0 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const expectedVegetation = world.tiles.reduce((sum, tile) => sum + tile.vegetation, 0);
  const expectedCapacity = world.tiles.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);

  const summary = summarizeWorld(world);

  assert.equal(summary.vegetation, expectedVegetation);
  assert.equal(summary.vegetationCapacity, expectedCapacity);
  assert.equal(summary.vegetationUtilization, expectedCapacity ? expectedVegetation / expectedCapacity : 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

function behaviorFingerprint(world) {
  return {
    rng: world.rng.snapshot(),
    day: world.day,
    nextEntityId: world.nextEntityId,
    nextSettlementId: world.nextSettlementId,
    nextLineageId: world.nextLineageId,
    nextUnionId: world.nextUnionId,
    nextEventId: world.nextEventId,
    entities: world.entities.map((entity) => ({ ...entity })),
    settlements: world.settlements.map((settlement) => ({ ...settlement, memberIds: [...settlement.memberIds] })),
    lineages: world.lineages.map((lineage) => ({ ...lineage, memberIds: [...lineage.memberIds], founderIds: [...lineage.founderIds] })),
    unions: world.unions.map((union) => ({ ...union, partnerIds: [...union.partnerIds], childIds: [...union.childIds] })),
    history: world.history.map((event) => ({ ...event })),
    counters: { ...world.counters },
    tileBehavior: world.tiles.map((tile) => ({
      food: tile.food,
      foodCapacity: tile.foodCapacity,
      ownerSettlementId: tile.ownerSettlementId,
      settlementCandidateDays: tile.settlementCandidateDays
    }))
  };
}
