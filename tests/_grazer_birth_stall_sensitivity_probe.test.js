import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const YEARS = 300;
const START_YEAR = 20;
const INIT_AGE_SALT = 0x1b56c4e9;
const SEEDS = Array.from({ length: 30 }, (_, index) => 31 + index);
const COUNTS = [2, 4, 6, 8, 10];

test('temporary pre-extinction birth-stall sensitivity diagnostic', () => {
  const rows = [];
  for (const seed of SEEDS) {
    for (const founders of COUNTS) rows.push(runCase(seed, founders));
  }

  const earlyExtinctions = rows.filter((row) => row.extinctionYear !== null && row.extinctionYear < START_YEAR);
  const lateExtinctions = rows.filter((row) => row.extinctionYear !== null && row.extinctionYear >= START_YEAR);
  const survivors = rows.filter((row) => row.extinctionYear === null);

  const terminalGaps = lateExtinctions.map((row) => row.terminalBirthlessYears);
  const persistentObservedGaps = survivors.map((row) => Math.max(
    row.longestCompletedBirthGapYears,
    row.rightCensoredBirthGapYears
  ));

  const terminalSummary = summarize(terminalGaps);
  const persistentSummary = summarize(persistentObservedGaps);
  const minTerminal = terminalSummary.min;
  const maxPersistent = persistentSummary.max;
  const cleanSeparation = minTerminal !== null && maxPersistent !== null && maxPersistent < minTerminal;

  const overlapLateExtinctions = lateExtinctions
    .filter((row) => row.terminalBirthlessYears <= maxPersistent)
    .sort((a, b) => a.terminalBirthlessYears - b.terminalBirthlessYears)
    .map(compactCase);

  const result = {
    worlds: rows.length,
    survivors: survivors.length,
    earlyExtinctions: earlyExtinctions.length,
    lateExtinctions: lateExtinctions.length,
    terminalGapSummary: terminalSummary,
    persistentObservedGapSummary: persistentSummary,
    cleanSeparation,
    separatingIntervalYears: cleanSeparation ? [maxPersistent, minTerminal] : null,
    overlapLateExtinctionsCount: overlapLateExtinctions.length,
    overlapLateExtinctions,
    lateExtinctionCases: [...lateExtinctions]
      .sort((a, b) => a.terminalBirthlessYears - b.terminalBirthlessYears)
      .map(compactCase),
    longestPersistentGapCases: [...survivors]
      .sort((a, b) => (
        Math.max(b.longestCompletedBirthGapYears, b.rightCensoredBirthGapYears)
        - Math.max(a.longestCompletedBirthGapYears, a.rightCensoredBirthGapYears)
      ))
      .slice(0, 20)
      .map(compactCase),
    earlyExtinctionCases: earlyExtinctions.map(compactCase)
  };

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`GRAZER_BIRTH_STALL_SENSITIVITY ${JSON.stringify(result)}`);
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
  const startDay = START_YEAR * world.config.daysPerYear;

  let lastBirthDay = null;
  let births = 0;
  let extinctionDay = null;
  let longestCompletedBirthGapDays = 0;
  let longestBelow10Days = 0;
  let currentBelow10Days = 0;

  for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
    const birthsBefore = world.counters.creatureBirths;
    tickWorld(world, 1);
    const newBirths = world.counters.creatureBirths - birthsBefore;

    if (newBirths > 0) {
      births += newBirths;
      if (world.day >= startDay) {
        const gapStart = Math.max(lastBirthDay ?? startDay, startDay);
        longestCompletedBirthGapDays = Math.max(longestCompletedBirthGapDays, world.day - gapStart);
      }
      lastBirthDay = world.day;
    }

    if (world.day >= startDay) {
      if (world.creatures.length < 10) {
        currentBelow10Days += 1;
        longestBelow10Days = Math.max(longestBelow10Days, currentBelow10Days);
      } else {
        currentBelow10Days = 0;
      }
    }

    if (world.creatures.length === 0) {
      extinctionDay = world.day;
      break;
    }
  }

  assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} founders ${founders} consumed sequential RNG`);

  const endDay = extinctionDay ?? totalDays;
  const gapStart = Math.max(lastBirthDay ?? startDay, startDay);
  const terminalOrCensoredGapDays = Math.max(0, endDay - gapStart);
  const lateExtinction = extinctionDay !== null && extinctionDay >= startDay;

  return {
    seed,
    founders,
    births,
    extinctionYear: extinctionDay === null ? null : round(extinctionDay / world.config.daysPerYear),
    lastBirthYear: lastBirthDay === null ? null : round(lastBirthDay / world.config.daysPerYear),
    terminalBirthlessYears: lateExtinction ? round(terminalOrCensoredGapDays / world.config.daysPerYear) : null,
    longestCompletedBirthGapYears: round(longestCompletedBirthGapDays / world.config.daysPerYear),
    rightCensoredBirthGapYears: extinctionDay === null ? round(terminalOrCensoredGapDays / world.config.daysPerYear) : null,
    longestBelow10Years: round(longestBelow10Days / world.config.daysPerYear)
  };
}

function compactCase(row) {
  return {
    seed: row.seed,
    founders: row.founders,
    births: row.births,
    extinctionYear: row.extinctionYear,
    lastBirthYear: row.lastBirthYear,
    terminalBirthlessYears: row.terminalBirthlessYears,
    longestCompletedBirthGapYears: row.longestCompletedBirthGapYears,
    rightCensoredBirthGapYears: row.rightCensoredBirthGapYears,
    longestBelow10Years: row.longestBelow10Years
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

function summarize(values) {
  if (values.length === 0) return { n: 0, min: null, median: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    n: sorted.length,
    min: round(sorted[0]),
    median: round(median),
    max: round(sorted[sorted.length - 1])
  };
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
