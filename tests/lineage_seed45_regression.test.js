import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('lineage history layer preserves the post-cohesion seed 45 demographic sentinel', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const final = result.checkpoints.at(-1);

  assert.equal(final.population, 128);
  assert.equal(final.births, 184);
  assert.equal(final.deaths, 86);
  assert.ok(final.foodUtilization > 0.96);
});
