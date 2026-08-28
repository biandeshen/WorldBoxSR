import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('seed 45 regression records the deliberate recovery caused by settlement cohesion', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const populations = result.checkpoints.map((checkpoint) => checkpoint.population);
  const final = result.checkpoints.at(-1);
  const actual = JSON.stringify({ populations, ...final });

  // v1.1 reserves deliberately make owned territory a material-life input. Keep the
  // checkpoint sentinel pinned, and update the experiment note with every material change.
  assert.deepEqual(populations, [44, 35, 65, 125]);
  assert.equal(final.births, 184, `v1.1 seed45 metrics: ${actual}`);
  assert.equal(final.deaths, 86, `v1.1 seed45 metrics: ${actual}`);
  assert.ok(final.foodUtilization > 0.95, `v1.1 seed45 metrics: ${actual}`);
  assert.equal(final.settlements, 7, `v1.1 seed45 metrics: ${actual}`);
  assert.equal(final.settledPopulation, 104, `v1.1 seed45 metrics: ${actual}`);
});
