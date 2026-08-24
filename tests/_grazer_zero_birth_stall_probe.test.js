import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const YEARS = 300;
const CHECKPOINT_YEARS = 10;
const STALL_YEARS = 40;
const INIT_AGE_SALT = 0x1b56c4e9;
const REPRODUCTION_MIN_HEALTH = 0.95;
const REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const REPRODUCTION_PARTNER_RADIUS = 3;
const SEEDS = Array.from({ length: 30 }, (_, index) => 31 + index);
const COUNTS = [2, 4, 6, 8, 10];

test('temporary fresh validation of 40-year zero-birth stall', () => {
  const rows = [];
  for (const seed of SEEDS) {
    for (const founders of COUNTS) rows.push(runCase(seed, founders));
  }

  const flagged = rows.filter((row) => row.stallYear !== null);
  const falseSignals = flagged.filter((row) => row.falseNonRecoverySignal);
  const censored = flagged.filter((row) => row.censoredAtYear300);
  const extinctions = rows.filter((row) => row.extinctionYear !== null);
  const alive = rows.filter((row) => row.extinctionYear === null);
  const longestAlive = [...alive]
    .sort((a, b) => b.longestZeroBirthYears - a.longestZeroBirthYears)
    .slice(0, 10)
    .map(compactCase);

  const result = {
    worlds: rows.length,
    flagged: flagged.length,
    extinctions: extinctions.length,
    falseSignals: falseSignals.length,
    censored: censored.length,
    validationPassStage1: falseSignals.length === 0 && censored.length === 0,
    flaggedCases: flagged.map((row) => ({ ...compactCase(row), checkpoints: row.checkpoints })),
    falseSignalCases: falseSignals.map((row) => ({ ...compactCase(row), checkpoints: row.checkpoints })),
    censoredCases: censored.map((row) => ({ ...compactCase(row), checkpoints: row.checkpoints })),
    extinctionCases: extinctions.map(compactCase),
    longestZeroBirthAmongAlive: longestAlive
  };

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`GRAZER_ZERO_BIRTH_STALL_STAGE1 ${JSON.stringify(result)}`);
});

function runCase(seed, founders) {
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
  const totalDays = YEARS * world.config.daysPerYear;
  const stallDays = STALL_YEARS * world.config.daysPerYear;
  const birthTotals = new Map([[0, 0]]);
  const checkpoints = [checkpoint(world, null)];

  let extinctionDay = null;
  let currentZeroBirthDays = 0;
  let longestZeroBirthDays = 0;
  let currentBelow10Days = 0;
  let longestBelow10Days = 0;
  let stallDay = null;
  let meaningfulRecoveryYear = null;

  for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
    const birthsBefore = world.counters.creatureBirths;
    tickWorld(world, 1);
    const newBirths = world.counters.creatureBirths - birthsBefore;

    if (world.creatures.length === 0 && extinctionDay === null) extinctionDay = world.day;

    if (world.day >= 20 * world.config.daysPerYear) {
      if (newBirths === 0) {
        currentZeroBirthDays += 1;
        longestZeroBirthDays = Math.max(longestZeroBirthDays, currentZeroBirthDays);
      } else {
        currentZeroBirthDays = 0;
      }

      if (world.creatures.length < 10) {
        currentBelow10Days += 1;
        longestBelow10Days = Math.max(longestBelow10Days, currentBelow10Days);
      } else {
        currentBelow10Days = 0;
      }

      if (world.creatures.length > 0 && stallDay === null && currentZeroBirthDays >= stallDays) {
        stallDay = world.day;
      }
    }

    if (world.day % (CHECKPOINT_YEARS * world.config.daysPerYear) === 0) {
      const year = world.day / world.config.daysPerYear;
      birthTotals.set(year, world.counters.creatureBirths);
      const births20 = year >= 20
        ? world.counters.creatureBirths - birthTotals.get(year - 20)
        : null;
      const cp = checkpoint(world, births20);
      checkpoints.push(cp);

      if (
        stallDay !== null
        && meaningfulRecoveryYear === null
        && world.day > stallDay
        && world.creatures.length > 0
        && births20 >= 5
      ) meaningfulRecoveryYear = year;
    }
  }

  assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} founders ${founders} consumed sequential RNG`);
  assert.equal(checkpoints.length, YEARS / CHECKPOINT_YEARS + 1);

  const falseNonRecoverySignal = stallDay !== null && meaningfulRecoveryYear !== null;
  const censoredAtYear300 = stallDay !== null && meaningfulRecoveryYear === null && extinctionDay === null;

  return {
    seed,
    founders,
    finalPopulation: world.creatures.length,
    totalBirths: world.counters.creatureBirths,
    extinctionYear: extinctionDay === null ? null : round(extinctionDay / world.config.daysPerYear),
    stallYear: stallDay === null ? null : round(stallDay / world.config.daysPerYear),
    meaningfulRecoveryYear,
    falseNonRecoverySignal,
    censoredAtYear300,
    longestZeroBirthYears: round(longestZeroBirthDays / world.config.daysPerYear),
    longestBelow10Years: round(longestBelow10Days / world.config.daysPerYear),
    checkpoints
  };
}

function compactCase(row) {
  return {
    seed: row.seed,
    founders: row.founders,
    finalPopulation: row.finalPopulation,
    extinctionYear: row.extinctionYear,
    stallYear: row.stallYear,
    meaningfulRecoveryYear: row.meaningfulRecoveryYear,
    longestZeroBirthYears: row.longestZeroBirthYears,
    longestBelow10Years: row.longestBelow10Years
  };
}

function checkpoint(world, births20) {
  const summary = summarizeWorld(world);
  const eligible = world.creatures
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  return [
    world.day / world.config.daysPerYear,
    summary.grazers,
    births20,
    round(summary.vegetationUtilization),
    eligible.length,
    countEligiblePairEdges(eligible)
  ];
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

function isReproductionEligible(world, grazer) {
  if (!grazer.alive || grazer.species !== 'grazer') return false;
  if (grazer.ageDays < world.config.daysPerYear) return false;
  if (grazer.health < REPRODUCTION_MIN_HEALTH) return false;
  if (grazer.hunger > world.config.grazerHungryThreshold) return false;
  if (grazer.lastBirthDay !== null && world.day - grazer.lastBirthDay < world.config.daysPerYear) return false;
  return localVegetationUtilization(world, grazer.x, grazer.y) >= REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION;
}

function countEligiblePairEdges(eligible) {
  let edges = 0;
  for (let i = 0; i < eligible.length; i += 1) {
    for (let j = i + 1; j < eligible.length; j += 1) {
      if (Math.max(Math.abs(eligible[i].x - eligible[j].x), Math.abs(eligible[i].y - eligible[j].y)) <= REPRODUCTION_PARTNER_RADIUS) edges += 1;
    }
  }
  return edges;
}

function localVegetationUtilization(world, x, y) {
  const cells = [tileAt(world, x, y), ...passableNeighbors8(world, x, y)].filter((tile) => tile.passable);
  const vegetation = cells.reduce((sum, tile) => sum + tile.vegetation, 0);
  const capacity = cells.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);
  return capacity > 0 ? vegetation / capacity : 0;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
