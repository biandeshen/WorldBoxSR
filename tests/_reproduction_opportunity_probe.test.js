import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReproductionOpportunity } from '../engine/core/reproduction_metrics.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,80,98];

test('temporary reproduction-opportunity probe at years 100 and 200', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, 100 * world.config.daysPerYear);
    emit(seed, 100, world);
    tickWorld(world, 100 * world.config.daysPerYear);
    emit(seed, 200, world);
  }
});

function emit(seed, year, world) {
  const opportunity = summarizeReproductionOpportunity(world);
  const summary = summarizeWorld(world);
  console.log(`REPRO_OPPORTUNITY ${JSON.stringify({
    seed,
    year,
    population: summary.population,
    activeSettlements: summary.activeSettlements,
    ...opportunity
  })}`);
  assert.ok(opportunity.eligibleFemales >= 0);
  assert.ok(opportunity.eligibleMales >= 0);
}
