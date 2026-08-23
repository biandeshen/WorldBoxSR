import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const probes = [45, 80, 98];

test('temporary family baseline probe for structural seeds', () => {
  for (const seed of probes) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, 200 * world.config.daysPerYear);
    const summary = summarizeWorld(world);
    console.log(`FAMILY_PROBE ${JSON.stringify({
      seed,
      population: summary.population,
      households: summary.households,
      emptyHouseholds: summary.emptyHouseholds,
      orphanedHumans: summary.orphanedHumans,
      maxGeneration: summary.maxGeneration,
      averageLivingHouseholdSize: summary.averageLivingHouseholdSize,
      averageHistoricalHouseholdSize: summary.averageHistoricalHouseholdSize,
      maxLivingHouseholdSize: summary.maxLivingHouseholdSize,
      settlements: summary.settlements,
      abandonedSettlements: summary.abandonedSettlements,
      foodUtilization: summary.foodUtilization
    })}`);
    assert.ok(summary.households >= 30);
  }
});
