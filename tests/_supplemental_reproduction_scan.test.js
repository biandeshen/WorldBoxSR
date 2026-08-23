import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,98];
const cases = [
  { label: 'baseline', supplementalReproductionRadius: 1 },
  { label: 'r3-m0.02', supplementalReproductionRadius: 3, supplementalReproductionChanceMultiplier: 0.02 }
];

test('temporary supplemental reproduction 200-year candidate A/B', () => {
  for (const candidate of cases) {
    const rows = [];
    for (const seed of seeds) {
      const world = createWorld({
        seed,
        width: 24,
        height: 24,
        population: 30,
        config: {
          supplementalReproductionRadius: candidate.supplementalReproductionRadius,
          ...(candidate.supplementalReproductionChanceMultiplier === undefined
            ? {}
            : { supplementalReproductionChanceMultiplier: candidate.supplementalReproductionChanceMultiplier })
        }
      });
      tickWorld(world, 200 * world.config.daysPerYear);
      const s = summarizeWorld(world);
      rows.push({
        seed,
        population: s.population,
        births: s.births,
        deaths: s.deaths,
        foodRemaining: s.foodUtilization,
        activeSettlements: s.activeSettlements,
        abandonedSettlements: s.abandonedSettlements
      });
    }

    console.log(`SUPPLEMENTAL_REPRO_200Y ${JSON.stringify({
      label: candidate.label,
      radius: candidate.supplementalReproductionRadius,
      multiplier: candidate.supplementalReproductionChanceMultiplier ?? 0,
      population: stat(rows.map((row) => row.population)),
      births: stat(rows.map((row) => row.births)),
      deaths: stat(rows.map((row) => row.deaths)),
      foodRemaining: stat(rows.map((row) => row.foodRemaining)),
      activeSettlements: stat(rows.map((row) => row.activeSettlements)),
      abandonedSettlements: stat(rows.map((row) => row.abandonedSettlements)),
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
