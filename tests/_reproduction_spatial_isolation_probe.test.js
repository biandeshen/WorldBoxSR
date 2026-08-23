import test from 'node:test';
import assert from 'node:assert/strict';
import { createReproductionSpatialIsolationTracker } from '../engine/core/reproduction_spatial_isolation.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year reproduction spatial isolation probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createReproductionSpatialIsolationTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const spatial = tracker.summarize();
    const summary = summarizeWorld(world);
    console.log(`REPRO_SPATIAL_ISOLATION_100Y ${JSON.stringify({
      seed,
      population: summary.population,
      births: summary.births,
      deaths: summary.deaths,
      activeSettlements: summary.activeSettlements,
      droughtShare: spatial.droughtShare,
      settledShareOfDroughtDays: spatial.settledShareOfDroughtDays,
      unsettledShareOfDroughtDays: spatial.unsettledShareOfDroughtDays,
      sameSettlementMaleShareOfSettledDroughtDays: spatial.sameSettlementMaleShareOfSettledDroughtDays,
      zeroMaleSettlementShareOfSettledDroughtDays: spatial.zeroMaleSettlementShareOfSettledDroughtDays,
      noEligibleMaleAnywhereShare: spatial.noEligibleMaleAnywhereShare,
      sameComponentMaleShare: spatial.sameComponentMaleShare,
      crossComponentOnlyShare: spatial.crossComponentOnlyShare,
      nearestEligibleMaleDistance: spatial.nearestEligibleMaleDistance,
      nearestEligibleMaleRelation: spatial.nearestEligibleMaleRelation,
      rememberedEligiblePartnerShare: spatial.rememberedEligiblePartnerShare,
      rememberedEligiblePartnerRelation: spatial.rememberedEligiblePartnerRelation,
      topology: spatial.topology,
      storage: spatial.storage
    })}`);

    assert.equal(spatial.observations, days);
  }
});
