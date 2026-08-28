import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('lineage history layer preserves the post-cohesion seed 45 demographic sentinel', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const final = result.checkpoints.at(-1);
  const actual = JSON.stringify(final);

  assert.equal(final.population, 125);
  assert.equal(final.births, 184, `v1.1 seed45 metrics: ${actual}`);
  assert.equal(final.deaths, 86, `v1.1 seed45 metrics: ${actual}`);
  assert.ok(final.foodUtilization > 0.96, `v1.1 seed45 metrics: ${actual}`);
});
