import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
const COUNTS = [10, 20, 40];
const YEARS = 60;
const FINAL_WINDOW_YEARS = 20;
const VEGETATION_SAMPLE_DAYS = 30;
const INIT_AGE_SALT = 0x1b56c4e9;


test('temporary natural grazer initialization Stage-1 bracket', () => {
  const rows = [];

  for (const count of COUNTS) {
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
      seedNaturalFounders(world, count);
      const rngBefore = world.rng.snapshot();
      const totalDays = YEARS * world.config.daysPerYear;
      const finalWindowStartDay = (YEARS - FINAL_WINDOW_YEARS) * world.config.daysPerYear;
      let birthsAtFinalWindowStart = null;
      let replacementParentBirths = 0;
      let maxLiving = world.creatures.length;
      let minLivingAfterYear20 = Infinity;
      let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
      let everExtinct = false;

      for (let day = 0; day < totalDays; day += 1) {
        const eventIdBefore = world.nextEventId;
        tickWorld(world, 1);
        maxLiving = Math.max(maxLiving, world.creatures.length);
        if (world.day >= 20 * world.config.daysPerYear) {
          minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
        }
        if (world.creatures.length === 0) everExtinct = true;
        if (world.day === finalWindowStartDay) birthsAtFinalWindowStart = world.counters.creatureBirths;
        replacementParentBirths += countReplacementBirths(world, eventIdBefore, count);
        if (world.day % VEGETATION_SAMPLE_DAYS === 0) {
          minVegetationUtilization = Math.min(
            minVegetationUtilization,
            summarizeWorld(world).vegetationUtilization
          );
        }
      }

      assert.notEqual(birthsAtFinalWindowStart, null);
      assert.deepEqual(world.rng.snapshot(), rngBefore, `count ${count} seed ${seed} consumed sequential RNG`);
      const summary = summarizeWorld(world);
      const birthsFinal20Years = summary.creatureBirths - birthsAtFinalWindowStart;
      rows.push({
        seed,
        initialGrazers: count,
        survivingGrazers: summary.grazers,
        minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
        maxLiving,
        creatureBirths: summary.creatureBirths,
        birthsFinal20Years,
        replacementParentBirths,
        creatureDeaths: summary.creatureDeaths,
        vegetationUtilization: round(summary.vegetationUtilization),
        minVegetationUtilization: round(minVegetationUtilization),
        occupiedCells: occupiedCreatureCells(world),
        everExtinct,
        passesCandidateGate: (
          !everExtinct
          && summary.grazers >= 10
          && birthsFinal20Years >= 5
          && replacementParentBirths > 0
          && maxLiving < 300
        )
      });
    }
  }

  const candidate = COUNTS.find((count) => (
    rows.filter((row) => row.initialGrazers === count).every((row) => row.passesCandidateGate)
  )) ?? null;

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`NATURAL_GRAZER_INIT_STAGE1 ${JSON.stringify({ candidate, rows })}`);
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

function countReplacementBirths(world, eventIdBefore, founderCount) {
  let count = 0;
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    if (event.type !== 'creature.born') continue;
    if (event.parentCreatureIds?.some((id) => id > founderCount)) count += 1;
  }
  return count;
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
