import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerPersistenceTracker } from '../engine/core/partner_persistence.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year same-partner persistence probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createPartnerPersistenceTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const identity = tracker.summarize();
    const summary = summarizeWorld(world);
    console.log(`PARTNER_PERSISTENCE_100Y ${JSON.stringify({
      seed,
      population: summary.population,
      births: summary.births,
      deaths: summary.deaths,
      eligibleFemaleDays: identity.eligibleFemaleDays,
      eligibleDroughtShare: identity.eligibleDroughtShare,
      memory30: identity.memoryCoverageOfEligibleDroughtDays[30],
      memory90: identity.memoryCoverageOfEligibleDroughtDays[90],
      memory180: identity.memoryCoverageOfEligibleDroughtDays[180],
      memory360: identity.memoryCoverageOfEligibleDroughtDays[360],
      samePairReturnIntervals: identity.samePairReturnIntervals,
      storage: identity.storage
    })}`);

    assert.equal(identity.observations, days);
  }
});
