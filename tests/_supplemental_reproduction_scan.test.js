import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,98];
const multipliers = [0.015, 0.020, 0.025];

test('temporary narrow supplemental reproduction multiplier scan', () => {
  for (const multiplier of multipliers) {
    const rows = [];
    for (const seed of seeds) {
      const world = createWorld({
        seed,
        width: 24,
        height: 24,
        population: 30,
        config: {
          supplementalReproductionRadius: 3,
          supplementalReproductionChanceMultiplier: multiplier
        }
      });
      tickWorld(world, 100 * world.config.daysPerYear);
      const s = summarizeWorld(world);
      rows.push({
        seed,
        population: s.population,
        births: s.births,
        deaths: s.deaths,
        foodRemaining: s.foodUtilization,
        activeSettlements: s.activeSettlements
      });
    }

    console.log(`SUPPLEMENTAL_REPRO_NARROW ${JSON.stringify({
      multiplier,
      population: stat(rows.map((row) => row.population)),
      births: stat(rows.map((row) => row.births)),
      deaths: stat(rows.map((row) => row.deaths)),
      foodRemaining: stat(rows.map((row) => row.foodRemaining)),
      seed45: rows.find((row) => row.seed === 45),
      seed98: rows.find((row) => row.seed === 98),
      rows
    })}`);
    assert.equal(rows.length, seeds.length);
  }
});

function stat(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: sorted.at(-1)
  };
}
