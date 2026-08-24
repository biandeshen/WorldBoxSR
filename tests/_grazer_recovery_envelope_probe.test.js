import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const YEARS = 300;
const CHECKPOINT_YEARS = 10;
const RECOVERY_ENVELOPE_YEARS = 40;
const INIT_AGE_SALT = 0x1b56c4e9;
const REPRODUCTION_MIN_HEALTH = 0.95;
const REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const REPRODUCTION_PARTNER_RADIUS = 3;
const SEEDS = Array.from({ length: 14 }, (_, index) => 17 + index);
const COUNTS = [2, 4, 6, 8, 10];

test('temporary unseen validation of 40-year compact recovery envelope', () => {
  const rows = [];
  for (const seed of SEEDS) {
    for (const founders of COUNTS) rows.push(runCase(seed, founders));
  }

  const falseSignals = rows.filter((row) => row.falseNonPersistenceSignal);
  const censored = rows.filter((row) => row.censoredAtYear300);
  const extinctions = rows.filter((row) => row.extinctionYear !== null);
  const flagged = rows.filter((row) => row.candidateStallYear !== null);

  const result = {
    worlds: rows.length,
    flagged: flagged.length,
    extinctions: extinctions.length,
    falseSignals: falseSignals.length,
    censored: censored.length,
    validationPassStage1: falseSignals.length === 0 && censored.length === 0,
    falseSignalCases: falseSignals.map(compactCase),
    censoredCases: censored.map(compactCase),
    flaggedCases: flagged.map(compactCase),
    rows
  };

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`GRAZER_RECOVERY_ENVELOPE_STAGE1 ${JSON.stringify(result)}`);
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
  const envelopeDays = RECOVERY_ENVELOPE_YEARS * world.config.daysPerYear;
  const birthTotals = new Map([[0, 0]]);
  const checkpoints = [checkpoint(world, null)];

  let extinctionDay = null;
  let currentBelow10Days = 0;
  let currentZeroBirthDays = 0;
  let longestBelow10Days = 0;
  let longestZeroBirthDays = 0;
  let firstLow40Day = null;
  let firstZeroBirth40Day = null;
  let candidateStallDay = null;
  let candidateStallCause = null;
  let meaningfulRecoveryYear = null;

  for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
    const birthsBefore = world.counters.creatureBirths;
    tickWorld(world, 1);
    const newBirths = world.counters.creatureBirths - birthsBefore;

    if (world.creatures.length === 0 && extinctionDay === null) extinctionDay = world.day;

    if (world.day >= 20 * world.config.daysPerYear) {
      if (world.creatures.length < 10) {
        currentBelow10Days += 1;
        longestBelow10Days = Math.max(longestBelow10Days, currentBelow10Days);
      } else {
        currentBelow10Days = 0;
      }

      if (newBirths === 0) {
        currentZeroBirthDays += 1;
        longestZeroBirthDays = Math.max(longestZeroBirthDays, currentZeroBirthDays);
      } else {
        currentZeroBirthDays = 0;
      }

      if (world.creatures.length > 0) {
        if (firstLow40Day === null && currentBelow10Days >= envelopeDays) firstLow40Day = world.day;
        if (firstZeroBirth40Day === null && currentZeroBirthDays >= envelopeDays) firstZeroBirth40Day = world.day;
        if (candidateStallDay === null && (currentBelow10Days >= envelopeDays || currentZeroBirthDays >= envelopeDays)) {
          candidateStallDay = world.day;
          candidateStallCause = currentBelow10Days >= envelopeDays && currentZeroBirthDays >= envelopeDays
            ? 'both'
            : currentBelow10Days >= envelopeDays ? 'population' : 'births';
        }
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
        candidateStallDay !== null
        && meaningfulRecoveryYear === null
        && world.day > candidateStallDay
        && cp.living >= 10
        && births20 >= 5
      ) meaningfulRecoveryYear = year;
    }
  }

  assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} founders ${founders} consumed sequential RNG`);
  assert.equal(checkpoints.length, YEARS / CHECKPOINT_YEARS + 1);

  const falseNonPersistenceSignal = candidateStallDay !== null && meaningfulRecoveryYear !== null;
  const censoredAtYear300 = candidateStallDay !== null && meaningfulRecoveryYear === null && extinctionDay === null;

  return {
    seed,
    founders,
    finalPopulation: world.creatures.length,
    totalBirths: world.counters.creatureBirths,
    extinctionYear: extinctionDay === null ? null : round(extinctionDay / world.config.daysPerYear),
    firstLow40Year: firstLow40Day === null ? null : round(firstLow40Day / world.config.daysPerYear),
    firstZeroBirth40Year: firstZeroBirth40Day === null ? null : round(firstZeroBirth40Day / world.config.daysPerYear),
    candidateStallYear: candidateStallDay === null ? null : round(candidateStallDay / world.config.daysPerYear),
    candidateStallCause,
    meaningfulRecoveryYear,
    falseNonPersistenceSignal,
    censoredAtYear300,
    longestBelow10Years: round(longestBelow10Days / world.config.daysPerYear),
    longestZeroBirthYears: round(longestZeroBirthDays / world.config.daysPerYear),
    checkpoints: checkpoints.map((cp) => [
      cp.year,
      cp.living,
      cp.births20,
      cp.vegetationUtilization,
      cp.reproductionEligible,
      cp.eligiblePairEdges
    ])
  };
}

function compactCase(row) {
  return {
    seed: row.seed,
    founders: row.founders,
    extinctionYear: row.extinctionYear,
    candidateStallYear: row.candidateStallYear,
    candidateStallCause: row.candidateStallCause,
    meaningfulRecoveryYear: row.meaningfulRecoveryYear,
    finalPopulation: row.finalPopulation,
    longestBelow10Years: row.longestBelow10Years,
    longestZeroBirthYears: row.longestZeroBirthYears
  };
}

function checkpoint(world, births20) {
  const summary = summarizeWorld(world);
  const eligible = world.creatures
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    births20,
    vegetationUtilization: round(summary.vegetationUtilization),
    reproductionEligible: eligible.length,
    eligiblePairEdges: countEligiblePairEdges(eligible)
  };
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
