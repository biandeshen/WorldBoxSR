import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('seed 45 remains an explicit abundant-food demographic-collapse design scenario', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const populations = result.checkpoints.map((checkpoint) => checkpoint.population);
  const final = result.checkpoints.at(-1);

  // These checkpoints intentionally mirror the pre-settlement baseline report.
  // If a future social/movement mechanic changes them, update this regression
  // together with an experiment note explaining why the change is desirable.
  assert.deepEqual(populations, [46, 23, 16, 8]);
  assert.equal(final.births, 41);
  assert.equal(final.deaths, 63);
  assert.ok(final.foodUtilization > 0.99, 'collapse must not be mistaken for a food shortage');
  assert.equal(final.settlements, 6);
  assert.equal(final.settledPopulation, 6);
});
