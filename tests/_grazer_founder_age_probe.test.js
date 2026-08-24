import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedUnit } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { regenerateFood, regenerateVegetation } from '../engine/systems/environment.js';
import { updateGrazerReproduction, updateGrazers } from '../engine/systems/grazers.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [100, 200];
const COHORTS = ['age2', 'heterogeneous-0-6'];
const YEARS = 60;
const SAMPLE_INTERVAL_DAYS = 30;
const CHECKPOINT_INTERVAL_YEARS = 5;
const LIFESPAN_MIN_YEARS = 12;
const LIFESPAN_MAX_YEARS = 18;
const LIFESPAN_SALT = 0x718c3b2d;
const FOUNDER_AGE_SALT = 0x39b5e217;

test('temporary founder-age synchronization A/B under fixed 12-18y mortality', () => {
  const rows = [];

  for (const cohort of COHORTS) {
    for (const density of DENSITIES) {
      for (const seed of SEEDS) {
        const world = createWorld({
          seed,
          width: 24,
          height: 24,
          population: 0,
          config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
        });
        const founderAges = seedFounders(world, density, cohort);
        const rngBefore = world.rng.snapshot();
        const totalDays = YEARS * world.config.daysPerYear;
        let oldAgeDeaths = 0;
        let founderExtinctionDay = null;
        let birthsAfterFoundersGone = 0;
        let replacementParentBirths = 0;
        let minLivingAfterFoundersGone = Infinity;
        let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
        const checkpoints = [];

        for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
          regenerateFood(world);
          regenerateVegetation(world);
          updateGrazers(world);
          world.day += 1;
          oldAgeDeaths += applyResearchSenescence(world);

          const foundersAlive = countFounders(world, density);
          if (foundersAlive === 0 && founderExtinctionDay === null) founderExtinctionDay = world.day;

          const birthsBefore = world.counters.creatureBirths;
          const eventIdBefore = world.nextEventId;
          updateGrazerReproduction(world);
          const newBirths = world.counters.creatureBirths - birthsBefore;
          if (foundersAlive === 0) birthsAfterFoundersGone += newBirths;
          if (newBirths > 0) {
            for (const event of world.history) {
              if (event.id < eventIdBefore || event.type !== 'creature.born') continue;
              if (event.parentCreatureIds?.some((id) => id > density)) replacementParentBirths += 1;
            }
          }

          if (founderExtinctionDay !== null) {
            minLivingAfterFoundersGone = Math.min(minLivingAfterFoundersGone, world.creatures.length);
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
        const livingAges = world.creatures.map((grazer) => grazer.ageDays / world.config.daysPerYear);
        assert.deepEqual(world.rng.snapshot(), rngBefore, `${cohort} ${density} seed ${seed} consumed sequential RNG`);
        assert.equal(checkpoints.length, YEARS / CHECKPOINT_INTERVAL_YEARS);

        rows.push({
          cohort,
          seed,
          initialGrazers: density,
          founderAgeYears: summarizeValues(founderAges.map((days) => days / world.config.daysPerYear)),
          survivingGrazers: summary.grazers,
          creatureBirths: summary.creatureBirths,
          starvationDeaths: summary.creatureDeaths,
          oldAgeDeaths,
          founderExtinctionYear: founderExtinctionDay === null ? null : round(founderExtinctionDay / world.config.daysPerYear),
          birthsAfterFoundersGone,
          replacementParentBirths,
          minLivingAfterFoundersGone: Number.isFinite(minLivingAfterFoundersGone) ? minLivingAfterFoundersGone : null,
          vegetationUtilization: round(summary.vegetationUtilization),
          minVegetationUtilization: round(minVegetationUtilization),
          meanLivingAgeYears: livingAges.length ? round(livingAges.reduce((a, b) => a + b, 0) / livingAges.length) : null,
          oldestLivingAgeYears: livingAges.length ? round(Math.max(...livingAges)) : null,
          checkpoints
        });
      }
    }
  }

  assert.equal(rows.length, COHORTS.length * DENSITIES.length * SEEDS.length);
  console.log(`GRAZER_FOUNDER_AGE_AB ${JSON.stringify({ rows })}`);
});

function seedFounders(world, count, cohort) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const ages = [];

  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    const creatureId = world.nextCreatureId;
    const ageDays = cohort === 'age2'
      ? 2 * world.config.daysPerYear
      : keyedFounderAgeDays(world, creatureId);
    ages.push(ageDays);
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays,
      bornDay: -ageDays
    });
  }
  return ages;
}

function keyedFounderAgeDays(world, creatureId) {
  const maxDays = 6 * world.config.daysPerYear;
  return Math.floor(keyedUnit(world.seed, creatureId, 0, FOUNDER_AGE_SALT) * (maxDays + 1));
}

function applyResearchSenescence(world) {
  let deaths = 0;
  for (const grazer of world.creatures) {
    if (!grazer.alive || grazer.species !== 'grazer') continue;
    if (grazer.ageDays < lifespanDays(world, grazer.id)) continue;
    grazer.alive = false;
    grazer.causeOfDeath = 'old_age';
    deaths += 1;
  }
  if (deaths > 0) world.creatures = world.creatures.filter((grazer) => grazer.alive);
  return deaths;
}

function lifespanDays(world, creatureId) {
  const minDays = LIFESPAN_MIN_YEARS * world.config.daysPerYear;
  const maxDays = LIFESPAN_MAX_YEARS * world.config.daysPerYear;
  const span = maxDays - minDays + 1;
  return minDays + Math.floor(keyedUnit(world.seed, creatureId, 0, LIFESPAN_SALT) * span);
}

function countFounders(world, founderCount) {
  return world.creatures.filter((grazer) => grazer.id <= founderCount).length;
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
    meanAgeYears: ages.length ? round(ages.reduce((a, b) => a + b, 0) / ages.length) : null
  };
}

function summarizeValues(values) {
  if (values.length === 0) return { min: null, mean: null, max: null };
  return {
    min: round(Math.min(...values)),
    mean: round(values.reduce((a, b) => a + b, 0) / values.length),
    max: round(Math.max(...values))
  };
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
