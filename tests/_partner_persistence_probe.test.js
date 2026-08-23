import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerPersistenceTracker } from '../engine/core/partner_persistence.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [45, 80];
const caps = [8, 16];

test('temporary same-partner memory cap sensitivity check', () => {
  for (const seed of seeds) {
    for (const maxPartnersPerFemale of caps) {
      const world = createWorld({ seed, width: 24, height: 24, population: 30 });
      const tracker = createPartnerPersistenceTracker({ maxPartnersPerFemale });
      const days = 100 * world.config.daysPerYear;

      for (let day = 0; day < days; day += 1) {
        tracker.observe(world);
        tickWorld(world, 1);
      }

      const identity = tracker.summarize();
      console.log(`PARTNER_CAP_SENSITIVITY ${JSON.stringify({
        seed,
        maxPartnersPerFemale,
        eligibleDroughtShare: identity.eligibleDroughtShare,
        memory180Eligible: identity.memoryCoverageOfEligibleDroughtDays[180].rememberedEligible,
        memory360Eligible: identity.memoryCoverageOfEligibleDroughtDays[360].rememberedEligible,
        samePairReturnIntervals: identity.samePairReturnIntervals,
        storage: identity.storage
      })}`);

      assert.equal(identity.observations, days);
    }
  }
});
