import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const SEEDS = [2, 4, 6, 7, 9, 10, 13, 14, 15, 16];
const COUNTS = [2, 4, 6, 8, 10];
const YEARS = 120;
const CHECKPOINT_YEARS = 10;
const FINAL_WINDOW_YEARS = 20;
const INIT_AGE_SALT = 0x1b56c4e9;
const REPRODUCTION_MIN_HEALTH = 0.95;
const REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const REPRODUCTION_PARTNER_RADIUS = 3;

test('temporary compact founder Stage 2 trajectories', () => {
  const rows = [];

  for (const seed of SEEDS) {
    for (const count of COUNTS) {
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
      seedNaturalFounders(world, count);
      const rngBefore = world.rng.snapshot();
      const passableLandCells = world.tiles.filter((tile) => tile.passable).length;
      const totalDays = YEARS * world.config.daysPerYear;
      const finalWindowStart = (YEARS - FINAL_WINDOW_YEARS) * world.config.daysPerYear;
      let birthsAtFinalWindowStart = null;
      let replacementParentBirths = 0;
      let starvationDeaths = 0;
      let oldAgeDeaths = 0;
      let maxLiving = world.creatures.length;
      let minLivingAfterYear20 = Infinity;
      let everExtinct = false;
      const checkpoints = [checkpoint(world, count, starvationDeaths, oldAgeDeaths)];

      for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
        const eventIdBefore = world.nextEventId;
        tickWorld(world, 1);
        const events = newEventsSince(world, eventIdBefore);
        for (const event of events) {
          if (event.type === 'creature.died') {
            if (event.cause === 'starvation') starvationDeaths += 1;
            if (event.cause === 'old_age') oldAgeDeaths += 1;
          }
          if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > count)) {
            replacementParentBirths += 1;
          }
        }

        maxLiving = Math.max(maxLiving, world.creatures.length);
        if (world.day >= 20 * world.config.daysPerYear) {
          minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
        }
        if (world.creatures.length === 0) everExtinct = true;
        if (world.day === finalWindowStart) birthsAtFinalWindowStart = world.counters.creatureBirths;
        if (world.day % (CHECKPOINT_YEARS * world.config.daysPerYear) === 0) {
          checkpoints.push(checkpoint(world, count, starvationDeaths, oldAgeDeaths));
        }
      }

      assert.notEqual(birthsAtFinalWindowStart, null);
      assert.deepEqual(world.rng.snapshot(), rngBefore, `count ${count} seed ${seed} consumed sequential RNG`);
      assert.equal(checkpoints.length, YEARS / CHECKPOINT_YEARS + 1);

      const summary = summarizeWorld(world);
      const birthsFinal20Years = summary.creatureBirths - birthsAtFinalWindowStart;
      const passesGate = (
        !everExtinct
        && summary.grazers >= 10
        && birthsFinal20Years >= 5
        && replacementParentBirths > 0
        && maxLiving < passableLandCells
      );

      rows.push({
        seed,
        founders: count,
        passableLandCells,
        finalPopulation: summary.grazers,
        birthsFinal20Years,
        replacementParentBirths,
        starvationDeaths,
        oldAgeDeaths,
        maxLiving,
        minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
        everExtinct,
        passesGate,
        checkpoints
      });
    }
  }

  const bySeed = SEEDS.map((seed) => ({
    seed,
    counts: COUNTS.map((count) => {
      const row = rows.find((candidate) => candidate.seed === seed && candidate.founders === count);
      return {
        founders: count,
        passesGate: row.passesGate,
        finalPopulation: row.finalPopulation,
        birthsFinal20Years: row.birthsFinal20Years,
        starvationDeaths: row.starvationDeaths,
        oldAgeDeaths: row.oldAgeDeaths,
        checkpoints: row.checkpoints
      };
    })
  }));

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`GRAZER_COMPACT_SENSITIVITY_STAGE2 ${JSON.stringify({ bySeed })}`);
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
    const ageDays = keyedIndex(world.seed, futureCreatureId, 0, INIT_AGE_SALT, maxAgeDays + 1);
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, { x: tile.x, y: tile.y, ageDays, bornDay: -ageDays });
  }
}

function checkpoint(world, founderCount, starvationDeaths, oldAgeDeaths) {
  const summary = summarizeWorld(world);
  const eligible = world.creatures
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  const ages = world.creatures.map((grazer) => grazer.ageDays / world.config.daysPerYear);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    foundersAlive: world.creatures.filter((grazer) => grazer.id <= founderCount).length,
    births: summary.creatureBirths,
    starvationDeaths,
    oldAgeDeaths,
    vegetationUtilization: round(summary.vegetationUtilization),
    meanHunger: round(mean(world.creatures.map((grazer) => grazer.hunger))),
    reproductionEligible: eligible.length,
    eligiblePairEdges: eligiblePairEdges(eligible),
    occupiedCells: new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size,
    meanAgeYears: round(mean(ages))
  };
}

function isReproductionEligible(world, grazer) {
  if (!grazer.alive || grazer.species !== 'grazer') return false;
  if (grazer.ageDays < world.config.daysPerYear) return false;
  if (grazer.health < REPRODUCTION_MIN_HEALTH) return false;
  if (grazer.hunger > world.config.grazerHungryThreshold) return false;
  if (grazer.lastBirthDay !== null && world.day - grazer.lastBirthDay < world.config.daysPerYear) return false;
  return localVegetationUtilization(world, grazer.x, grazer.y) >= REPRODUCTION_MIN_LOCAL_VEGETATION_UTILIZATION;
}

function eligiblePairEdges(eligible) {
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

function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function mean(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
