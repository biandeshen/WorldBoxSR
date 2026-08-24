import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createGrazer } from '../engine/model/grazer.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [5, 20, 100, 300];
const YEARS = 5;
const CHECKPOINTS = new Set([1, 2, 3, 5]);
const SAMPLE_INTERVAL_DAYS = 30;
const SPAWN_CELL_CAP = 32;
const ARTIFACT_PATH = 'tmp-research/grazer-carrying-5y.json';

test('temporary 5-year grazer carrying-pressure bracket', () => {
  const rows = [];

  for (const seed of SEEDS) {
    for (const density of DENSITIES) {
      const world = createWorld({ seed, width: 24, height: 24, population: 0 });
      seedGrazers(world, density);
      const rngBefore = world.rng.snapshot();
      let minVegetationUtilization = Infinity;
      const checkpoints = [];
      const totalDays = YEARS * world.config.daysPerYear;

      for (let elapsed = 0; elapsed < totalDays; elapsed += SAMPLE_INTERVAL_DAYS) {
        const step = Math.min(SAMPLE_INTERVAL_DAYS, totalDays - elapsed);
        tickWorld(world, step);
        const summary = summarizeWorld(world);
        minVegetationUtilization = Math.min(minVegetationUtilization, summary.vegetationUtilization);
        const year = world.day / world.config.daysPerYear;
        if (CHECKPOINTS.has(year)) checkpoints.push(compactCheckpoint(world, summary, year));
      }

      const final = summarizeWorld(world);
      assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} density ${density} consumed sequential RNG`);
      rows.push({
        seed,
        initialGrazers: density,
        survivingGrazers: final.grazers,
        survivalShare: round(final.grazers / density),
        creatureDeaths: final.creatureDeaths,
        creatureMeals: final.creatureMeals,
        mealsPerInitialGrazer: round(final.creatureMeals / density),
        vegetation: round(final.vegetation),
        vegetationCapacity: round(final.vegetationCapacity),
        vegetationUtilization: round(final.vegetationUtilization),
        minVegetationUtilization: round(minVegetationUtilization),
        occupiedCells: occupiedCreatureCells(world),
        checkpoints
      });
    }
  }

  const result = { rows };
  assert.equal(rows.length, SEEDS.length * DENSITIES.length);
  assert.equal(rows.every((row) => row.checkpoints.length === CHECKPOINTS.size), true);
  mkdirSync('tmp-research', { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`GRAZER_CARRYING_5Y ${JSON.stringify(result)}`);
});

function seedGrazers(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, SPAWN_CELL_CAP);
  assert.ok(spawnTiles.length > 0, 'world must have land');

  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, { x: tile.x, y: tile.y });
  }
}

function compactCheckpoint(world, summary, year) {
  return {
    year,
    living: summary.grazers,
    deaths: summary.creatureDeaths,
    meals: summary.creatureMeals,
    vegetationUtilization: round(summary.vegetationUtilization),
    occupiedCells: occupiedCreatureCells(world)
  };
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((creature) => `${creature.x},${creature.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
