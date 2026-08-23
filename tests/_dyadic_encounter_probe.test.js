import test from 'node:test';
import assert from 'node:assert/strict';
import { createDyadicEncounterTracker } from '../engine/core/dyadic_encounters.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 6-seed 100-year dyadic encounter concentration probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createDyadicEncounterTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const s = tracker.summarize(world);
    const population = world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length;
    console.log(`DYADIC_ENCOUNTERS_100Y ${JSON.stringify({
      seed,
      population,
      births: world.counters.births,
      deaths: world.counters.deaths,
      focalFemales: s.focalFemales.count,
      encounterParticipation: round(s.focalFemales.encounterParticipationShare),
      capTruncatedFemaleShare: round(s.focalFemales.capTruncatedFemaleShare),
      distinctPartnersMean: round(s.focalFemales.distinctPartnersAmongUntruncated.mean),
      topPartnerShareMean: round(s.focalFemales.topPartnerPairDayShare.mean),
      top2ShareMean: round(s.focalFemales.top2PartnerPairDayShare.mean),
      hhiMean: round(s.focalFemales.encounterHhi.mean),
      repeated2Mean: round(s.focalFemales.partnersWithAtLeast2EncounterDays.mean),
      repeated5Mean: round(s.focalFemales.partnersWithAtLeast5EncounterDays.mean),
      repeated10Mean: round(s.focalFemales.partnersWithAtLeast10EncounterDays.mean),
      longestSpanMeanDays: round(s.focalFemales.longestPairSpanDays.mean),
      longestSpanMaxDays: round(s.focalFemales.longestPairSpanDays.max),
      repeatedPairs: s.repeatedPairs.count,
      repeatedPairEncounterDaysMean: round(s.repeatedPairs.encounterDays.mean),
      repeatedPairSpanMeanDays: round(s.repeatedPairs.spanDays.mean),
      repeatedPairSpanMaxDays: round(s.repeatedPairs.spanDays.max),
      repeatedPairSameSettlementShareMean: round(s.repeatedPairs.sameSettlementShare.mean),
      span30Share: round(s.persistence[30].shareOfRepeatedPairs),
      span90Share: round(s.persistence[90].shareOfRepeatedPairs),
      span180Share: round(s.persistence[180].shareOfRepeatedPairs),
      span360Share: round(s.persistence[360].shareOfRepeatedPairs),
      coParentRepeatedPairs: s.coParentRepeatedPairs.count,
      coParentEncounterDaysMean: round(s.coParentRepeatedPairs.encounterDays.mean),
      coParentSpanMeanDays: round(s.coParentRepeatedPairs.spanDays.mean),
      coParentSameSettlementShareMean: round(s.coParentRepeatedPairs.sameSettlementShare.mean),
      nonParentRepeatedPairs: s.nonParentRepeatedPairs.count,
      nonParentEncounterDaysMean: round(s.nonParentRepeatedPairs.encounterDays.mean),
      nonParentSpanMeanDays: round(s.nonParentRepeatedPairs.spanDays.mean),
      nonParentSameSettlementShareMean: round(s.nonParentRepeatedPairs.sameSettlementShare.mean),
      coParentShareAmongRepeatedPairs: round(s.coParentShareAmongRepeatedPairs),
      topPartnerCoParentShare: round(s.topPartnerCoParentShare),
      storage: s.storage
    })}`);

    assert.ok(s.focalFemales.count > 0);
    assert.equal(s.storage.partnerRecordEvictions, 0);
    assert.equal(s.focalFemales.capTruncatedFemaleShare, 0);
  }
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
