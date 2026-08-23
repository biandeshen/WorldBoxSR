import test from 'node:test';
import assert from 'node:assert/strict';
import { createReproductionDroughtTracker } from '../engine/core/reproduction_droughts.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year reproduction opportunity drought probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createReproductionDroughtTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const drought = tracker.summarize();
    const summary = summarizeWorld(world);
    console.log(`REPRO_DROUGHT_100Y ${JSON.stringify({
      seed,
      population: summary.population,
      births: summary.births,
      deaths: summary.deaths,
      activeSettlements: summary.activeSettlements,
      eligibleFemaleDays: drought.eligibleFemaleDays,
      radius1OpportunityShare: drought.radius1OpportunityShare,
      radius3OpportunityShare: drought.radius3OpportunityShare,
      radius3RescueShare: drought.radius3RescueShareOfRadius1NoOpportunityDays,
      priorEncounterShare: drought.priorEncounterShareOfNoOpportunityDays,
      memory30AllNoOpportunity: drought.memoryCoverageOfNoOpportunityDays[30],
      memory90AllNoOpportunity: drought.memoryCoverageOfNoOpportunityDays[90],
      memory180AllNoOpportunity: drought.memoryCoverageOfNoOpportunityDays[180],
      memory30PriorEncounter: drought.memoryCoverageOfPriorEncounterNoOpportunityDays[30],
      memory90PriorEncounter: drought.memoryCoverageOfPriorEncounterNoOpportunityDays[90],
      memory180PriorEncounter: drought.memoryCoverageOfPriorEncounterNoOpportunityDays[180],
      averageDaysSinceLastOpportunity: drought.averageDaysSinceLastRadius1Opportunity,
      maxDaysSinceLastOpportunity: drought.maxDaysSinceLastRadius1Opportunity,
      streaks: drought.noOpportunityStreaks
    })}`);

    assert.equal(drought.observations, days);
  }
});
