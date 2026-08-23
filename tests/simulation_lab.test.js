import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRuns, runBatch } from '../simulation_lab/batch.js';

test('batch runner is deterministic', () => {
  const options = { startSeed: 10, seeds: 4, years: 5, width: 10, height: 10, population: 12 };
  assert.deepEqual(runBatch(options), runBatch(options));
});

test('aggregate statistics are stable and legible', () => {
  const result = aggregateRuns([
    { population: 0, births: 2, deaths: 3, foodUtilization: 0.5 },
    { population: 10, births: 20, deaths: 5, foodUtilization: 0.25 },
    { population: 20, births: 30, deaths: 8, foodUtilization: 0.75 }
  ]);
  assert.equal(result.runCount, 3);
  assert.equal(result.extinctionRate, 1 / 3);
  assert.equal(result.population.median, 10);
  assert.equal(result.population.mean, 10);
  assert.equal(result.foodUtilization.median, 0.5);
});
