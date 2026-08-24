import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const SEEDS = Array.from({ length: 30 }, (_, index) => index + 1);
const YEARS = 120;
const FINAL_WINDOW_YEARS = 20;
const FINAL_VEGETATION_WINDOW_YEARS = 5;
const INIT_AGE_SALT = 0x1b56c4e9;


test('temporary compact founder down-scaling Stage-1 validation', () => {
  const rows = [];
  const founders = founderCountForSize(SIZE, SIZE);
  assert.equal(founders, 4);

  for (const seed of SEEDS) {
    const world = createWorld({
      seed,
      width: SIZE,
      height: SIZE,
      population: 0,
      config: {
        grazerBirthChancePerEligiblePairPerDay: 0.001,
        grazerOldAgeMortalityEnabled: true
      }
    });
    seedNaturalFounders(world, founders);
    const rngBefore = world.rng.snapshot();
    const passableLandCells = world.tiles.filter((tile) => tile.passable).length;
    const totalDays = YEARS * world.config.daysPerYear;
    const finalBirthWindowStart = (YEARS - FINAL_WINDOW_YEARS) * world.config.daysPerYear;
    const finalVegetationWindowStart = (YEARS - FINAL_VEGETATION_WINDOW_YEARS) * world.config.daysPerYear;
    let birthsAtFinalWindowStart = null;
    let replacementParentBirths = 0;
    let maxLiving = world.creatures.length;
    let minLivingAfterYear20 = Infinity;
    let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
    let finalVegetationSampleSum = 0;
    let finalVegetationSamples = 0;
    let everExtinct = false;
    const checkpoints = [];

    for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
      const eventIdBefore = world.nextEventId;
      tickWorld(world, 1);
      maxLiving = Math.max(maxLiving, world.creatures.length);
      if (world.day >= 20 * world.config.daysPerYear) {
        minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
      }
      if (world.creatures.length === 0) everExtinct = true;
      if (world.day === finalBirthWindowStart) birthsAtFinalWindowStart = world.counters.creatureBirths;
      replacementParentBirths += countReplacementBirths(world, eventIdBefore, founders);

      if (world.day % 30 === 0 || world.day === totalDays) {
        const utilization = summarizeWorld(world).vegetationUtilization;
        minVegetationUtilization = Math.min(minVegetationUtilization, utilization);
        if (world.day > finalVegetationWindowStart) {
          finalVegetationSampleSum += utilization;
          finalVegetationSamples += 1;
        }
      }
      if (world.day % (10 * world.config.daysPerYear) === 0) {
        const checkpoint = summarizeWorld(world);
        checkpoints.push({
          year: world.day / world.config.daysPerYear,
          living: checkpoint.grazers,
          births: checkpoint.creatureBirths,
          vegetationUtilization: round(checkpoint.vegetationUtilization)
        });
      }
    }

    assert.notEqual(birthsAtFinalWindowStart, null);
    assert.ok(finalVegetationSamples > 0);
    assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} consumed sequential RNG`);
    const summary = summarizeWorld(world);
    const birthsFinal20Years = summary.creatureBirths - birthsAtFinalWindowStart;
    rows.push({
      size: SIZE,
      seed,
      founders,
      passableLandCells,
      survivingGrazers: summary.grazers,
      minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
      maxLiving,
      creatureBirths: summary.creatureBirths,
      birthsFinal20Years,
      replacementParentBirths,
      creatureDeaths: summary.creatureDeaths,
      vegetationUtilization: round(summary.vegetationUtilization),
      minVegetationUtilization: round(minVegetationUtilization),
      finalFiveYearMeanVegetationUtilization: round(finalVegetationSampleSum / finalVegetationSamples),
      occupiedCells: occupiedCreatureCells(world),
      everExtinct,
      passesGate: (
        !everExtinct
        && summary.grazers >= 10
        && birthsFinal20Years >= 5
        && replacementParentBirths > 0
        && maxLiving < passableLandCells
      ),
      checkpoints
    });
  }

  assert.equal(rows.length, SEEDS.length);
  console.log(`GRAZER_COMPACT_SCALING_STAGE1 ${JSON.stringify({ founders, rows })}`);
});

function founderCountForSize(width, height) {
  return Math.min(10, Math.max(2, Math.floor((10 * width * height) / (24 * 24))));
}

function seedNaturalFounders(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const maxAgeDays = 6 * world.config.daysPerYear;
  for (let index = 0; index < count; index += 1) {
    const futureCreatureId = world.nextCreatureId;
    const ageDays = keyedIndex(world.seed, futureCreatureId, 0, INIT_AGE_SALT, maxAgeDays + 1);
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, { x: tile.x, y: tile.y, ageDays, bornDay: -ageDays });
  }
}

function countReplacementBirths(world, eventIdBefore, founderCount) {
  let count = 0;
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > founderCount)) count += 1;
  }
  return count;
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
