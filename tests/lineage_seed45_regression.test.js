import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, runScenario } from '../simulation_lab/scenarios.js';

test('lineage history layer preserves the v1.1 settlement-reserve seed 45 demographic sentinel', () => {
  const result = runScenario(SCENARIOS.seed45DemographicCollapse);
  const final = result.checkpoints.at(-1);

  assert.equal(final.population, 125);
  assert.equal(final.births, 180);
  assert.equal(final.deaths, 85);
  assert.equal(final.settledPopulation, 91);
  assert.ok(final.foodUtilization > 0.95);
});
