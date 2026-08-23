import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSpatialKin } from '../engine/core/kin_metrics.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 45, 98];
const chances = [0, 0.05, 0.1, 0.2, 0.4, 0.8];

test('temporary dependent-kin parameter scan', () => {
  for (const seed of seeds) {
    for (const dependentKinBiasChance of chances) {
      const world = createWorld({
        seed,
        width: 24,
        height: 24,
        population: 30,
        config: { dependentKinBiasChance }
      });
      tickWorld(world, 100 * world.config.daysPerYear);
      const s = summarizeWorld(world);
      const k = summarizeSpatialKin(world);
      console.log(`KIN_SCAN ${JSON.stringify({
        seed,
        chance: dependentKinBiasChance,
        population: s.population,
        births: s.births,
        deaths: s.deaths,
        parentChildWithin1Share: k.parentChildWithin1Share,
        parentChildWithin3Share: k.parentChildWithin3Share,
        medianParentChildDistance: k.medianParentChildDistance,
        minorsParentWithin1Share: k.minorsParentWithin1Share,
        minorsParentWithin3Share: k.minorsParentWithin3Share,
        dependentMinors: k.dependentMinors
      })}`);
      assert.ok(s.population >= 0);
    }
  }
});
