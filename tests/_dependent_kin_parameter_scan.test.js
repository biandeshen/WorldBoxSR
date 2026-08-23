import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSpatialKin } from '../engine/core/kin_metrics.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,98];
const chances = [0, 0.4, 0.8];

test('temporary dependent-kin distribution scan', () => {
  for (const dependentKinBiasChance of chances) {
    const rows = [];
    for (const seed of seeds) {
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
      rows.push({
        seed,
        population: s.population,
        births: s.births,
        deaths: s.deaths,
        parentWithin3: k.parentChildWithin3Share,
        minorWithin1: k.minorsParentWithin1Share,
        minorWithin3: k.minorsParentWithin3Share,
        parentDistance: k.medianParentChildDistance
      });
    }

    const result = {
      chance: dependentKinBiasChance,
      population: stat(rows.map((row) => row.population)),
      births: stat(rows.map((row) => row.births)),
      deaths: stat(rows.map((row) => row.deaths)),
      parentWithin3: stat(rows.map((row) => row.parentWithin3)),
      minorWithin1: stat(rows.map((row) => row.minorWithin1)),
      minorWithin3: stat(rows.map((row) => row.minorWithin3)),
      parentDistance: stat(rows.map((row) => row.parentDistance)),
      seed45: rows.find((row) => row.seed === 45),
      seed98: rows.find((row) => row.seed === 98)
    };
    console.log(`KIN_DISTRIBUTION ${JSON.stringify(result)}`);
    assert.equal(rows.length, seeds.length);
  }
});

function stat(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: sorted.at(-1)
  };
}
