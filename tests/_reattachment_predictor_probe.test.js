import test from 'node:test';
import assert from 'node:assert/strict';
import { createReattachmentPredictorTracker } from '../engine/core/reattachment_predictors.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year reattachment predictor probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createReattachmentPredictorTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const worldSummary = summarizeWorld(world);
    const female = tracker.summarize(world).reproductiveFemales;
    console.log(`REATTACHMENT_PREDICTORS ${JSON.stringify({
      seed,
      population: worldSummary.population,
      births: worldSummary.births,
      deaths: worldSummary.deaths,
      episodes: female.episodes,
      outcomes: female.outcomes,
      fast: pickGroup(female.fastVsLong.fastSameHome),
      long: pickGroup(female.fastVsLong.longSameHome),
      unresolved180Plus: pickGroup(female.fastVsLong.unresolved180Plus)
    })}`);

    assert.ok(female.episodes >= 0);
  }
});

function pickGroup(group) {
  return {
    episodes: group.episodes,
    duration: pickStat(group.durationDays),
    age: pickStat(group.ageYearsAtLeave),
    remainingReproYears: pickStat(group.remainingFemaleReproductiveYears),
    formerPopulation: pickStat(group.formerSettlementPopulation),
    formerFoodRemaining: pickStat(group.formerSettlementFoodRemainingFraction),
    formerFoodCapacityPerMember: pickStat(group.formerSettlementFoodCapacityPerMember),
    formerPassableShare: pickStat(group.formerSettlementLocalPassableShare),
    d30: pickStat(group.first30MeanFormerHomeDistance),
    within4_30: pickStat(group.first30Within4Share),
    within6_30: pickStat(group.first30Within6Share),
    maleR1_30: pickStat(group.first30Radius1MaleOpportunityShare),
    maleR3_30: pickStat(group.first30Radius3MaleOpportunityShare),
    otherCloser30: pickStat(group.first30OtherSettlementCloserShare),
    tileFood30: pickStat(group.first30MeanTileFoodFraction),
    d90: pickStat(group.first90MeanFormerHomeDistance),
    within6_90: pickStat(group.first90Within6Share),
    maleR3_90: pickStat(group.first90Radius3MaleOpportunityShare),
    otherCloser90: pickStat(group.first90OtherSettlementCloserShare)
  };
}

function pickStat(stat) {
  return {
    n: stat.count,
    median: round(stat.median),
    mean: round(stat.mean)
  };
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
