import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { aggregateRuns } from '../simulation_lab/aggregate.js';

test('world summary exposes lineage metrics without mutating world or RNG state', () => {
  const world = createWorld({ seed: 808, width: 12, height: 12, population: 16 });
  tickWorld(world, 720);
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const summary = summarizeWorld(world);

  assert.equal(summary.lineages, world.lineages.length);
  assert.ok(summary.maxGeneration >= 0);
  assert.ok(summary.averageLivingLineageSize >= 0);
  assert.ok(summary.averageHistoricalLineageSize >= summary.averageLivingLineageSize);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('Simulation Lab aggregates lineage extinction and orphan metrics', () => {
  const aggregate = aggregateRuns([
    {
      population: 10,
      lineages: 4,
      extinctLineages: 1,
      orphanedHumans: 2,
      maxGeneration: 3,
      averageLivingLineageSize: 2.25,
      averageHistoricalLineageSize: 5,
      maxLivingLineageSize: 5
    },
    {
      population: 20,
      lineages: 5,
      extinctLineages: 0,
      orphanedHumans: 1,
      maxGeneration: 4,
      averageLivingLineageSize: 4,
      averageHistoricalLineageSize: 8,
      maxLivingLineageSize: 9
    }
  ]);

  assert.equal(aggregate.lineages.median, 4.5);
  assert.equal(aggregate.extinctLineageShare.mean, 0.125);
  assert.equal(aggregate.orphanShare.mean, 0.125);
  assert.equal(aggregate.maxGeneration.max, 4);
  assert.equal(aggregate.maxLivingLineageSize.max, 9);
});
