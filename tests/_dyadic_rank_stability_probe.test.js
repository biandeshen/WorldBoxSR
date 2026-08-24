import test from 'node:test';
import assert from 'node:assert/strict';
import { createDyadicRankStabilityTracker } from '../engine/core/dyadic_rank_stability.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 6-seed 100-year dyadic rank-stability probe', () => {
  const rows = [];

  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createDyadicRankStabilityTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tickWorld(world, 1);
      tracker.observe(world);
    }

    const s = tracker.summarize(world);
    const population = world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length;
    rows.push({
      seed,
      population,
      births: world.counters.births,
      deaths: world.counters.deaths,
      focalFemales: s.focalFemalesObserved,
      completeWindows: s.completeWindows,
      truncatedWindows: s.truncatedCompleteWindows,
      truncatedShare: round(s.truncatedCompleteWindowShare),
      discardedPartialWindows: s.discardedPartialWindows,
      openPartialWindows: s.openPartialWindows,
      distinctPartnersPerWindowMean: round(s.windows.distinctPartners.mean),
      topPartnerShareMean: round(s.windows.topPartnerPairDayShare.mean),
      top2ShareMean: round(s.windows.top2PartnerPairDayShare.mean),
      hhiMean: round(s.windows.encounterHhi.mean),
      topPartnerCoParentShare: round(s.windows.topPartnerCoParentShare),
      topPartnerSameSettlementShareMean: round(s.windows.topPartnerSameSettlementShare.mean),
      adjacentComparisons: s.adjacent.comparisons,
      sameTopAdjacentShare: round(s.adjacent.sameTopPartnerShare),
      turnoverRate: round(s.adjacent.turnoverRate),
      top3JaccardMean: round(s.adjacent.top3Jaccard.mean),
      stableLaterTopShareMean: round(s.adjacent.laterTopShareWhenStable.mean),
      switchedLaterTopShareMean: round(s.adjacent.laterTopShareWhenSwitched.mean),
      stableTopCoParentShare: round(s.adjacent.laterTopCoParentShareWhenStable),
      switchedTopCoParentShare: round(s.adjacent.laterTopCoParentShareWhenSwitched),
      stableTopSettlementShareMean: round(s.adjacent.laterTopSameSettlementShareWhenStable.mean),
      switchedTopSettlementShareMean: round(s.adjacent.laterTopSameSettlementShareWhenSwitched.mean),
      threeWindowComparisons: s.runs.threeWindowComparisons,
      sameTopAcrossThreeShare: round(s.runs.sameTopAcrossThreeShare),
      fiveWindowComparisons: s.runs.fiveWindowComparisons,
      sameTopAcrossFiveShare: round(s.runs.sameTopAcrossFiveShare),
      streakLengthMean: round(s.runs.topPartnerStreakLength.mean),
      streakLengthMax: s.runs.topPartnerStreakLength.max,
      streaksAtLeast2: s.runs.streaksAtLeast2,
      streaksAtLeast3: s.runs.streaksAtLeast3,
      streaksAtLeast5: s.runs.streaksAtLeast5,
      maxPartnersForOneWindow: s.storage.maxPartnersForOneWindow,
      partnerRecordEvictions: s.storage.partnerRecordEvictions,
      maxCurrentPartnerRecords: s.storage.maxCurrentPartnerRecords
    });
  }

  const seed45 = rows.find((row) => row.seed === 45);
  assert.deepEqual(
    { population: seed45.population, births: seed45.births, deaths: seed45.deaths },
    { population: 35, births: 44, deaths: 39 }
  );
  assert.equal(rows.length, seeds.length);
  assert.equal(new Set(rows.map((row) => row.seed)).size, seeds.length);

  console.log(`DYADIC_RANK_STABILITY_100Y ${JSON.stringify({ rows })}`);
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
