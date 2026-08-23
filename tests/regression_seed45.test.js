import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('seed 45 regression records the deliberate recovery caused by settlement cohesion', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const populations = result.checkpoints.map((checkpoint) => checkpoint.population);
  const final = result.checkpoints.at(-1);

  // Settlement cohesion intentionally changes the former collapse trajectory.
  // Update these values only with an experiment note explaining the causal mechanic.
  assert.deepEqual(populations, [44, 35, 65, 128]);
  assert.equal(final.births, 184);
  assert.equal(final.deaths, 86);
  assert.ok(final.foodUtilization > 0.95, 'seed 45 recovery should not depend on exhausting food capacity');
  assert.equal(final.settlements, 7);
  assert.equal(final.settledPopulation, 104);
});
