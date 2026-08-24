import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedChance } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { regenerateFood, regenerateVegetation } from '../engine/systems/environment.js';
import { updateGrazerReproduction, updateGrazers } from '../engine/systems/grazers.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [20, 100, 200];
const YEARS = 120;
const SAMPLE_INTERVAL_DAYS = 30;
const CHECKPOINT_INTERVAL_YEARS = 5;
const HAZARD_START_YEARS = 12;
const HAZARD_BASE_ANNUAL = 0.01;
const HAZARD_DOUBLING_YEARS = 3;
const HAZARD_ANNUAL_CAP = 0.50;
const HAZARD_SALT = 0x27d4eb2f;


test('temporary 120-year gradual grazer mortality-hazard validation', () => {
  const rows = [];

  for (const density of DENSITIES) {
    for (const seed of SEEDS) {
      const world = createWorld({
        seed,
        width: 24,
        height: 24,
        population: 0,
        config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
      });
      seedAgeTwoFounders(world, density);
      const rngBefore = world.rng.snapshot();
      const totalDays = YEARS * world.config.daysPerYear;
      const finalWindowStart = (YEARS - 20) * world.config.daysPerYear;
      const oldAgeDeathAges = [];
      let oldAgeDeaths = 0;
      let founderExtinctionDay = null;
      let replacementParentBirths = 0;
      let birthsAfterFoundersGone = 0;
      let birthsFinal20Years = 0;
      let maxLiving = world.creatures.length;
      let minLivingAfterYear20 = Infinity;
      let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
      const checkpoints = [];

      for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
        regenerateFood(world);
        regenerateVegetation(world);
        updateGrazers(world);
        world.day += 1;
        oldAgeDeaths += applyResearchHazard(world, oldAgeDeathAges);

        const foundersAlive = countFounders(world, density);
        if (foundersAlive === 0 && founderExtinctionDay === null) founderExtinctionDay = world.day;

        const birthsBefore = world.counters.creatureBirths;
        const eventIdBefore = world.nextEventId;
        updateGrazerReproduction(world);
        const newBirths = world.counters.creatureBirths - birthsBefore;
        if (newBirths > 0) {
          if (foundersAlive === 0) birthsAfterFoundersGone += newBirths;
          if (world.day > finalWindowStart) birthsFinal20Years += newBirths;
          replacementParentBirths += countReplacementParentBirthEvents(world, eventIdBefore, density);
        }

        maxLiving = Math.max(maxLiving, world.creatures.length);
        if (world.day >= 20 * world.config.daysPerYear) {
          minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
        }

        if (world.day % SAMPLE_INTERVAL_DAYS === 0 || world.day === totalDays) {
          minVegetationUtilization = Math.min(
            minVegetationUtilization,
            summarizeWorld(world).vegetationUtilization
          );
        }
        if (world.day % (CHECKPOINT_INTERVAL_YEARS * world.config.daysPerYear) === 0) {
          checkpoints.push(compactCheckpoint(world, density, oldAgeDeaths));
        }
      }

      const summary = summarizeWorld(world);
      assert.deepEqual(world.rng.snapshot(), rngBefore, `density ${density} seed ${seed} consumed sequential RNG`);
      assert.equal(checkpoints.length, YEARS / CHECKPOINT_INTERVAL_YEARS);

      rows.push({
        seed,
        initialGrazers: density,
        survivingGrazers: summary.grazers,
        maxLiving,
        minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
        creatureBirths: summary.creatureBirths,
        birthsFinal20Years,
        birthsAfterFoundersGone,
        replacementParentBirths,
        starvationDeaths: summary.creatureDeaths,
        oldAgeDeaths,
        founderExtinctionYear: founderExtinctionDay === null ? null : round(founderExtinctionDay / world.config.daysPerYear),
        oldAgeDeathAgeYears: summarizeValues(oldAgeDeathAges),
        vegetationUtilization: round(summary.vegetationUtilization),
        minVegetationUtilization: round(minVegetationUtilization),
        livingAgeYears: summarizeValues(world.creatures.map((grazer) => grazer.ageDays / world.config.daysPerYear)),
        checkpoints
      });
    }
  }

  assert.equal(rows.length, SEEDS.length * DENSITIES.length);
  console.log(`GRAZER_MORTALITY_HAZARD_120Y ${JSON.stringify({ rows })}`);
});

function seedAgeTwoFounders(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const ageDays = 2 * world.config.daysPerYear;
  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays,
      bornDay: -ageDays
    });
  }
}

function applyResearchHazard(world, deathAges) {
  let deaths = 0;
  for (const grazer of world.creatures) {
    if (!grazer.alive || grazer.species !== 'grazer') continue;
    const ageYears = grazer.ageDays / world.config.daysPerYear;
    if (ageYears < HAZARD_START_YEARS) continue;
    const annualProbability = Math.min(
      HAZARD_ANNUAL_CAP,
      HAZARD_BASE_ANNUAL * (2 ** ((ageYears - HAZARD_START_YEARS) / HAZARD_DOUBLING_YEARS))
    );
    const dailyProbability = 1 - ((1 - annualProbability) ** (1 / world.config.daysPerYear));
    if (!keyedChance(world.seed, grazer.id, world.day, HAZARD_SALT, dailyProbability)) continue;
    grazer.alive = false;
    grazer.causeOfDeath = 'old_age';
    deathAges.push(ageYears);
    deaths += 1;
  }
  if (deaths > 0) world.creatures = world.creatures.filter((grazer) => grazer.alive);
  return deaths;
}

function countFounders(world, founderCount) {
  return world.creatures.filter((grazer) => grazer.id <= founderCount).length;
}

function countReplacementParentBirthEvents(world, eventIdBefore, founderCount) {
  let count = 0;
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    if (event.type !== 'creature.born') continue;
    if (event.parentCreatureIds?.some((id) => id > founderCount)) count += 1;
  }
  return count;
}

function compactCheckpoint(world, founderCount, oldAgeDeaths) {
  const summary = summarizeWorld(world);
  const ages = world.creatures.map((grazer) => grazer.ageDays / world.config.daysPerYear);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    births: summary.creatureBirths,
    starvationDeaths: summary.creatureDeaths,
    oldAgeDeaths,
    foundersAlive: countFounders(world, founderCount),
    vegetationUtilization: round(summary.vegetationUtilization),
    ageYears: summarizeValues(ages)
  };
}

function summarizeValues(values) {
  if (values.length === 0) return { min: null, mean: null, median: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    min: round(sorted[0]),
    mean: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    median: round(median),
    max: round(sorted[sorted.length - 1])
  };
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
