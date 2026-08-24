import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const YEARS = 240;
const CHECKPOINT_YEARS = 10;
const INIT_AGE_SALT = 0x1b56c4e9;
const REPRODUCTION_MIN_HEALTH = 0.95;
const REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const REPRODUCTION_PARTNER_RADIUS = 3;

const CASES = [
  { category: 'alive-terminal-fail', seed: 2, founders: 4 },
  { category: 'alive-terminal-fail', seed: 2, founders: 6 },
  { category: 'alive-terminal-fail', seed: 2, founders: 10 },
  { category: 'alive-terminal-fail', seed: 4, founders: 8 },
  { category: 'alive-terminal-fail', seed: 6, founders: 8 },
  { category: 'alive-terminal-fail', seed: 6, founders: 10 },
  { category: 'alive-terminal-fail', seed: 7, founders: 10 },
  { category: 'alive-terminal-fail', seed: 16, founders: 6 },
  { category: 'true-extinction-control', seed: 6, founders: 6 },
  { category: 'true-extinction-control', seed: 9, founders: 2 },
  { category: 'true-extinction-control', seed: 10, founders: 4 },
  { category: 'true-extinction-control', seed: 13, founders: 2 },
  { category: 'true-extinction-control', seed: 14, founders: 2 },
  { category: 'true-extinction-control', seed: 15, founders: 2 },
  { category: 'passing-control', seed: 2, founders: 8 },
  { category: 'passing-control', seed: 4, founders: 4 },
  { category: 'passing-control', seed: 6, founders: 4 },
  { category: 'passing-control', seed: 7, founders: 8 }
];

test('temporary 240-year compact cycle-aware persistence probe', () => {
  const rows = CASES.map(runCase);

  const categorySummary = ['alive-terminal-fail', 'true-extinction-control', 'passing-control'].map((category) => {
    const subset = rows.filter((row) => row.category === category);
    return {
      category,
      worlds: subset.length,
      extinctions: subset.filter((row) => row.extinctionYear !== null).length,
      recoveredAfter120: subset.filter((row) => row.firstOldGatePassAfter120 !== null).length,
      medianLongestBelow10Years: round(median(subset.map((row) => row.longestBelow10Years))),
      medianLongestZeroBirthYears: round(median(subset.map((row) => row.longestZeroBirthYears))),
      medianGateFlips: median(subset.map((row) => row.oldGateFlipCount))
    };
  });

  assert.equal(rows.length, CASES.length);
  console.log(`GRAZER_CYCLE_PERSISTENCE_240Y ${JSON.stringify({ categorySummary, rows })}`);
});

function runCase(spec) {
  const world = createWorld({
    seed: spec.seed,
    width: SIZE,
    height: SIZE,
    population: 0,
    config: {
      grazerBirthChancePerEligiblePairPerDay: 0.001,
      grazerOldAgeMortalityEnabled: true
    }
  });
  seedNaturalFounders(world, spec.founders);
  const rngBefore = world.rng.snapshot();
  const passableLandCells = world.tiles.filter((tile) => tile.passable).length;
  const totalDays = YEARS * world.config.daysPerYear;
  const checkpoints = [];
  const checkpointBirthTotals = new Map();
  let replacementParentBirths = 0;
  let starvationDeaths = 0;
  let oldAgeDeaths = 0;
  let maxLiving = world.creatures.length;
  let minLivingAfterYear20 = Infinity;
  let extinctionDay = null;
  let currentBelow10Days = 0;
  let longestBelow10Days = 0;
  let currentZeroBirthDays = 0;
  let longestZeroBirthDays = 0;
  let below10 = false;
  const recoveryDays = [];
  const oldGateStates = [];
  let firstOldGatePassAfter120 = null;

  checkpointBirthTotals.set(0, 0);
  checkpoints.push(compactCheckpoint(world, spec.founders, starvationDeaths, oldAgeDeaths, null, null));

  for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
    const eventIdBefore = world.nextEventId;
    const birthsBefore = world.counters.creatureBirths;
    tickWorld(world, 1);
    const newBirths = world.counters.creatureBirths - birthsBefore;
    const events = newEventsSince(world, eventIdBefore);

    for (const event of events) {
      if (event.type === 'creature.died') {
        if (event.cause === 'starvation') starvationDeaths += 1;
        if (event.cause === 'old_age') oldAgeDeaths += 1;
      }
      if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > spec.founders)) {
        replacementParentBirths += 1;
      }
    }

    maxLiving = Math.max(maxLiving, world.creatures.length);
    if (world.creatures.length === 0 && extinctionDay === null) extinctionDay = world.day;

    if (world.day >= 20 * world.config.daysPerYear) {
      minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);

      if (world.creatures.length < 10) {
        currentBelow10Days += 1;
        longestBelow10Days = Math.max(longestBelow10Days, currentBelow10Days);
        below10 = true;
      } else {
        if (below10) recoveryDays.push(world.day);
        currentBelow10Days = 0;
        below10 = false;
      }

      if (newBirths === 0) {
        currentZeroBirthDays += 1;
        longestZeroBirthDays = Math.max(longestZeroBirthDays, currentZeroBirthDays);
      } else {
        currentZeroBirthDays = 0;
      }
    }

    if (world.day % (CHECKPOINT_YEARS * world.config.daysPerYear) === 0) {
      const year = world.day / world.config.daysPerYear;
      checkpointBirthTotals.set(year, world.counters.creatureBirths);
      const births20 = year >= 20
        ? world.counters.creatureBirths - checkpointBirthTotals.get(year - 20)
        : null;
      const oldGatePass = year >= 40
        ? oldTerminalGate(world, births20, replacementParentBirths, maxLiving, passableLandCells, extinctionDay)
        : null;
      if (oldGatePass !== null) {
        oldGateStates.push(oldGatePass);
        if (year > 120 && oldGatePass && firstOldGatePassAfter120 === null) firstOldGatePassAfter120 = year;
      }
      checkpoints.push(compactCheckpoint(
        world,
        spec.founders,
        starvationDeaths,
        oldAgeDeaths,
        births20,
        oldGatePass
      ));
    }
  }

  assert.deepEqual(world.rng.snapshot(), rngBefore, `${spec.seed}/${spec.founders} consumed sequential RNG`);
  assert.equal(checkpoints.length, YEARS / CHECKPOINT_YEARS + 1);

  return {
    ...spec,
    passableLandCells,
    finalPopulation: world.creatures.length,
    totalBirths: world.counters.creatureBirths,
    starvationDeaths,
    oldAgeDeaths,
    maxLiving,
    minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
    extinctionYear: extinctionDay === null ? null : round(extinctionDay / world.config.daysPerYear),
    longestBelow10Years: round(longestBelow10Days / world.config.daysPerYear),
    longestZeroBirthYears: round(longestZeroBirthDays / world.config.daysPerYear),
    recoveriesFromBelow10: recoveryDays.map((day) => round(day / world.config.daysPerYear)),
    oldGateFlipCount: adjacentTransitions(oldGateStates),
    firstOldGatePassAfter120,
    oldGatePassYears: checkpoints.filter((cp) => cp.oldGatePass === true).map((cp) => cp.year),
    checkpoints: checkpoints.map((cp) => [
      cp.year,
      cp.living,
      cp.births20,
      cp.vegetationUtilization,
      cp.reproductionEligible,
      cp.eligiblePairEdges,
      cp.oldGatePass
    ])
  };
}

function oldTerminalGate(world, births20, replacementParentBirths, maxLiving, passableLandCells, extinctionDay) {
  return (
    extinctionDay === null
    && world.creatures.length >= 10
    && births20 >= 5
    && replacementParentBirths > 0
    && maxLiving < passableLandCells
  );
}

function compactCheckpoint(world, founderCount, starvationDeaths, oldAgeDeaths, births20, oldGatePass) {
  const summary = summarizeWorld(world);
  const eligible = world.creatures
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    foundersAlive: world.creatures.filter((grazer) => grazer.id <= founderCount).length,
    births: summary.creatureBirths,
    births20,
    starvationDeaths,
    oldAgeDeaths,
    vegetationUtilization: round(summary.vegetationUtilization),
    reproductionEligible: eligible.length,
    eligiblePairEdges: countEligiblePairEdges(eligible),
    oldGatePass
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
      if (chebyshev(eligible[i], eligible[j]) <= REPRODUCTION_PARTNER_RADIUS) edges += 1;
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

function newEventsSince(world, eventIdBefore) {
  const events = [];
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    events.push(event);
  }
  return events;
}

function adjacentTransitions(values) {
  let count = 0;
  for (let index = 1; index < values.length; index += 1) if (values[index] !== values[index - 1]) count += 1;
  return count;
}

function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function median(values) {
  assert.ok(values.length > 0);
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
