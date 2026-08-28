import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('seed 45 regression records the deliberate v1.1 reserve trajectory', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const populations = result.checkpoints.map((checkpoint) => checkpoint.population);
  const final = result.checkpoints.at(-1);

  // Settlement Food Reserves deliberately make owned territory a material-life input.
  // Update these values only with an experiment note explaining the causal mechanic.
  assert.deepEqual(populations, [44, 35, 65, 125]);
  assert.equal(final.births, 180);
  assert.equal(final.deaths, 85);
  assert.ok(final.foodUtilization > 0.95, 'seed 45 should remain resource-abundant rather than food-capacity limited');
  assert.equal(final.settlements, 7);
  assert.equal(final.settledPopulation, 91);
});
