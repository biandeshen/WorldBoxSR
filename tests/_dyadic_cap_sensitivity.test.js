import test from 'node:test';
import assert from 'node:assert/strict';
import { createDyadicEncounterTracker } from '../engine/core/dyadic_encounters.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 98];
const caps = [256, 1024];

test('temporary dyadic partner-cap sensitivity on truncated worlds', () => {
  for (const seed of seeds) {
    for (const cap of caps) {
      const world = createWorld({ seed, width: 24, height: 24, population: 30 });
      const tracker = createDyadicEncounterTracker({ maxPartnersPerFemale: cap });
      const days = 100 * world.config.daysPerYear;
      for (let day = 0; day < days; day += 1) {
        tracker.observe(world);
        tickWorld(world, 1);
      }
      const s = tracker.summarize(world);
      console.log(`DYADIC_CAP_SENSITIVITY ${JSON.stringify({
        seed,
        cap,
        topPartnerShareMean: round(s.focalFemales.topPartnerPairDayShare.mean),
        top2ShareMean: round(s.focalFemales.top2PartnerPairDayShare.mean),
        hhiMean: round(s.focalFemales.encounterHhi.mean),
        repeated2Mean: round(s.focalFemales.partnersWithAtLeast2EncounterDays.mean),
        repeated5Mean: round(s.focalFemales.partnersWithAtLeast5EncounterDays.mean),
        repeated10Mean: round(s.focalFemales.partnersWithAtLeast10EncounterDays.mean),
        repeatedPairs: s.repeatedPairs.count,
        coParentShareAmongRepeatedPairs: round(s.coParentShareAmongRepeatedPairs),
        topPartnerCoParentShare: round(s.topPartnerCoParentShare),
        partnerRecordsCreated: s.storage.partnerRecordsCreated,
        evictions: s.storage.partnerRecordEvictions,
        excluded: s.storage.pairRecordsExcludedByCap,
        maxPartnersForOneFemale: s.storage.maxPartnersForOneFemale,
        maxCurrentPartnerRecords: s.storage.maxCurrentPartnerRecords
      })}`);
      assert.equal(s.storage.maxPartnersPerFemale, cap);
    }
  }
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
