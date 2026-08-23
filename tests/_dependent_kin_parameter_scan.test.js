import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSpatialKin } from '../engine/core/kin_metrics.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

test('temporary seed45 200-year high-bias check', () => {
  const world = createWorld({
    seed: 45,
    width: 24,
    height: 24,
    population: 30,
    config: { dependentKinBiasChance: 0.8 }
  });
  tickWorld(world, 200 * world.config.daysPerYear);
  const s = summarizeWorld(world);
  const k = summarizeSpatialKin(world);
  console.log(`KIN_SEED45_HIGH ${JSON.stringify({
    population: s.population,
    births: s.births,
    deaths: s.deaths,
    foodRemaining: s.foodUtilization,
    activeSettlements: s.activeSettlements,
    parentWithin3: k.parentChildWithin3Share,
    minorWithin1: k.minorsParentWithin1Share,
    minorWithin3: k.minorsParentWithin3Share,
    parentDistance: k.medianParentChildDistance
  })}`);
  assert.ok(s.population >= 0);
});
