import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { aggregateRuns } from '../simulation_lab/aggregate.js';

test('world summary exposes household metrics without mutating world or RNG state', () => {
  const world = createWorld({ seed: 808, width: 12, height: 12, population: 16 });
  tickWorld(world, 720);
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const summary = summarizeWorld(world);

  assert.equal(summary.households, world.households.length);
  assert.ok(summary.maxGeneration >= 0);
  assert.ok(summary.averageLivingHouseholdSize >= 0);
  assert.ok(summary.averageHistoricalHouseholdSize >= summary.averageLivingHouseholdSize);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('Simulation Lab aggregates household and orphan metrics', () => {
  const aggregate = aggregateRuns([
    {
      population: 10,
      households: 4,
      emptyHouseholds: 1,
      orphanedHumans: 2,
      maxGeneration: 3,
      averageLivingHouseholdSize: 2.25,
      averageHistoricalHouseholdSize: 5,
      maxLivingHouseholdSize: 5
    },
    {
      population: 20,
      households: 5,
      emptyHouseholds: 0,
      orphanedHumans: 1,
      maxGeneration: 4,
      averageLivingHouseholdSize: 4,
      averageHistoricalHouseholdSize: 8,
      maxLivingHouseholdSize: 9
    }
  ]);

  assert.equal(aggregate.households.median, 4.5);
  assert.equal(aggregate.emptyHouseholdShare.mean, 0.125);
  assert.equal(aggregate.orphanShare.mean, 0.125);
  assert.equal(aggregate.maxGeneration.max, 4);
  assert.equal(aggregate.maxLivingHouseholdSize.max, 9);
});
