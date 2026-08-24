import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SEEDS = Array.from({ length: 30 }, (_, index) => index + 1);
const INITIAL_GRAZERS = 10;
const YEARS = 120;
const FINAL_WINDOW_YEARS = 20;
const VEGETATION_SAMPLE_DAYS = 30;
const CHECKPOINT_YEARS = 20;
const INIT_AGE_SALT = 0x1b56c4e9;


test('temporary natural grazer initialization Stage-2 broad validation', () => {
  const rows = [];

  for (const seed of SEEDS) {
    const world = createWorld({
      seed,
      width: 24,
      height: 24,
      population: 0,
      config: {
        grazerBirthChancePerEligiblePairPerDay: 0.001,
        grazerOldAgeMortalityEnabled: true
      }
    });
    seedNaturalFounders(world, INITIAL_GRAZERS);
    const rngBefore = world.rng.snapshot();
    const totalDays = YEARS * world.config.daysPerYear;
    const finalWindowStartDay = (YEARS - FINAL_WINDOW_YEARS) * world.config.daysPerYear;
    let birthsAtFinalWindowStart = null;
    let replacementParentBirths = 0;
    let starvationDeaths = 0;
    let oldAgeDeaths = 0;
    let maxLiving = world.creatures.length;
    let minLivingAfterYear20 = Infinity;
    let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
    let everExtinct = false;
    const checkpoints = [];

    for (let day = 0; day < totalDays; day += 1) {
      const eventIdBefore = world.nextEventId;
      tickWorld(world, 1);
      maxLiving = Math.max(maxLiving, world.creatures.length);
      if (world.day >= 20 * world.config.daysPerYear) {
        minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
      }
      if (world.creatures.length === 0) everExtinct = true;
      if (world.day === finalWindowStartDay) birthsAtFinalWindowStart = world.counters.creatureBirths;

      const eventCounts = countNewEvents(world, eventIdBefore, INITIAL_GRAZERS);
      replacementParentBirths += eventCounts.replacementBirths;
      starvationDeaths += eventCounts.starvationDeaths;
      oldAgeDeaths += eventCounts.oldAgeDeaths;

      if (world.day % VEGETATION_SAMPLE_DAYS === 0) {
        minVegetationUtilization = Math.min(
          minVegetationUtilization,
          summarizeWorld(world).vegetationUtilization
        );
      }
      if (world.day % (CHECKPOINT_YEARS * world.config.daysPerYear) === 0) {
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
    assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} consumed sequential RNG`);
    const summary = summarizeWorld(world);
    const birthsFinal20Years = summary.creatureBirths - birthsAtFinalWindowStart;
    rows.push({
      seed,
      initialGrazers: INITIAL_GRAZERS,
      survivingGrazers: summary.grazers,
      minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
      maxLiving,
      creatureBirths: summary.creatureBirths,
      birthsFinal20Years,
      replacementParentBirths,
      starvationDeaths,
      oldAgeDeaths,
      vegetationUtilization: round(summary.vegetationUtilization),
      minVegetationUtilization: round(minVegetationUtilization),
      occupiedCells: occupiedCreatureCells(world),
      everExtinct,
      passesNumericGate: (
        !everExtinct
        && summary.grazers >= 10
        && birthsFinal20Years >= 5
        && replacementParentBirths > 0
        && maxLiving < 300
      ),
      checkpoints
    });
  }

  assert.equal(rows.length, SEEDS.length);
  console.log(`NATURAL_GRAZER_INIT_STAGE2 ${JSON.stringify({ rows })}`);
});

function seedNaturalFounders(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const maxAgeDays = 6 * world.config.daysPerYear;

  for (let index = 0; index < count; index += 1) {
    const futureCreatureId = world.nextCreatureId;
    const ageDays = keyedIndex(
      world.seed,
      futureCreatureId,
      0,
      INIT_AGE_SALT,
      maxAgeDays + 1
    );
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays,
      bornDay: -ageDays
    });
  }
}

function countNewEvents(world, eventIdBefore, founderCount) {
  const counts = { replacementBirths: 0, starvationDeaths: 0, oldAgeDeaths: 0 };
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > founderCount)) {
      counts.replacementBirths += 1;
    }
    if (event.type === 'creature.died' && event.cause === 'starvation') counts.starvationDeaths += 1;
    if (event.type === 'creature.died' && event.cause === 'old_age') counts.oldAgeDeaths += 1;
  }
  return counts;
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
