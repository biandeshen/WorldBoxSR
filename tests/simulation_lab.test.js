import test from 'node:test';
import assert from 'node:assert/strict';
import { runBatch } from '../simulation_lab/batch.js';
import { aggregateRuns } from '../simulation_lab/aggregate.js';

test('batch runner is deterministic', () => {
  const options = { startSeed: 10, seeds: 4, years: 5, width: 10, height: 10, population: 12 };
  assert.deepEqual(runBatch(options), runBatch(options));
});

test('aggregate statistics are stable and legible', () => {
  const result = aggregateRuns([
    { population: 0, births: 2, deaths: 3, foodUtilization: 0.5, settlements: 2, activeSettlements: 0, abandonedSettlements: 2, settledPopulation: 0, claimedTerritoryCells: 0, territoryCoverage: 0 },
    { population: 10, births: 20, deaths: 5, foodUtilization: 0.25, settlements: 4, activeSettlements: 3, abandonedSettlements: 1, settledPopulation: 6, claimedTerritoryCells: 40, territoryCoverage: 0.5 },
    { population: 20, births: 30, deaths: 8, foodUtilization: 0.75, settlements: 6, activeSettlements: 5, abandonedSettlements: 1, settledPopulation: 15, claimedTerritoryCells: 70, territoryCoverage: 0.8 }
  ]);
  assert.equal(result.runCount, 3);
  assert.equal(result.extinctionRate, 1 / 3);
  assert.equal(result.population.median, 10);
  assert.equal(result.population.mean, 10);
  assert.equal(result.foodUtilization.median, 0.5);
  assert.equal(result.settlements.median, 4);
  assert.equal(result.activeSettlements.median, 3);
  assert.equal(result.abandonedSettlements.median, 1);
  assert.equal(result.settledPopulation.median, 6);
  assert.equal(result.settledPopulationShare.median, 0.6);
  assert.equal(result.territoryCoverage.median, 0.5);
});
