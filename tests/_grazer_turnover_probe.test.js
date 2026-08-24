import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { keyedUnit } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { regenerateFood, regenerateVegetation } from '../engine/systems/environment.js';
import { updateGrazerReproduction, updateGrazers } from '../engine/systems/grazers.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [100, 200];
const MODES = [
  { name: 'none', lifespan: null },
  { name: '18-24', lifespan: { minYears: 18, maxYears: 24 } }
];
const FOUNDER_AGE_YEARS = 2;
const YEARS = 30;
const SAMPLE_INTERVAL_DAYS = 30;
const LIFESPAN_SALT = 0x718c3b2d;
const ARTIFACT_PATH = 'tmp-research/grazer-turnover-stage2.json';

test('temporary 18-24 year grazer turnover carrying-pressure check', () => {
  const rows = [];

  for (const density of DENSITIES) {
    for (const mode of MODES) {
      for (const seed of SEEDS) {
        const world = createWorld({
          seed,
          width: 24,
          height: 24,
          population: 0,
          config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
        });
        seedAdultGrazers(world, density);
        const rngBefore = world.rng.snapshot();
        let oldAgeDeaths = 0;
        let birthsAfterFoundersGone = 0;
        let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
        let founderExtinctionDay = null;
        const checkpoints = [];
        const totalDays = YEARS * world.config.daysPerYear;

        for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
          regenerateFood(world);
          regenerateVegetation(world);
          updateGrazers(world);
          world.day += 1;
          if (mode.lifespan) oldAgeDeaths += applyResearchSenescence(world, mode.lifespan);

          const foundersAlive = countFounders(world, density);
          if (foundersAlive === 0 && founderExtinctionDay === null) founderExtinctionDay = world.day;
          const birthsBefore = world.counters.creatureBirths;
          updateGrazerReproduction(world);
          if (foundersAlive === 0) birthsAfterFoundersGone += world.counters.creatureBirths - birthsBefore;

          if (world.day % SAMPLE_INTERVAL_DAYS === 0 || world.day === totalDays) {
            minVegetationUtilization = Math.min(
              minVegetationUtilization,
              summarizeWorld(world).vegetationUtilization
            );
          }
          if (world.day % world.config.daysPerYear === 0) {
            checkpoints.push(compactCheckpoint(world, density, oldAgeDeaths));
          }
        }

        const summary = summarizeWorld(world);
        const livingAges = world.creatures.map((grazer) => grazer.ageDays / world.config.daysPerYear);
        const replacementParentBirths = world.history.filter((event) => (
          event.type === 'creature.born'
          && Array.isArray(event.parentCreatureIds)
          && event.parentCreatureIds.some((id) => id > density)
        )).length;

        assert.deepEqual(world.rng.snapshot(), rngBefore, `${density} ${mode.name} seed ${seed} consumed sequential RNG`);
        assert.equal(checkpoints.length, YEARS);
        if (mode.lifespan) {
          assert.notEqual(founderExtinctionDay, null, `${density} ${mode.name} seed ${seed} founders must turn over`);
        }
        rows.push({
          mode: mode.name,
          seed,
          initialGrazers: density,
          survivingGrazers: summary.grazers,
          creatureBirths: summary.creatureBirths,
          starvationDeaths: summary.creatureDeaths,
          oldAgeDeaths,
          birthsAfterFoundersGone,
          replacementParentBirths,
          founderExtinctionDay,
          founderExtinctionYear: founderExtinctionDay === null ? null : round(founderExtinctionDay / world.config.daysPerYear),
          vegetationUtilization: round(summary.vegetationUtilization),
          minVegetationUtilization: round(minVegetationUtilization),
          meanLivingAgeYears: livingAges.length ? round(livingAges.reduce((a, b) => a + b, 0) / livingAges.length) : null,
          oldestLivingAgeYears: livingAges.length ? round(Math.max(...livingAges)) : null,
          checkpoints
        });
      }
    }
  }

  assert.equal(rows.length, DENSITIES.length * MODES.length * SEEDS.length);
  mkdirSync('tmp-research', { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify({ rows }, null, 2)}\n`);
  console.log(`GRAZER_TURNOVER_STAGE2 ${JSON.stringify({ rows })}`);
});

function seedAdultGrazers(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const ageDays = FOUNDER_AGE_YEARS * world.config.daysPerYear;
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

function applyResearchSenescence(world, band) {
  let deaths = 0;
  for (const grazer of world.creatures) {
    if (!grazer.alive || grazer.species !== 'grazer') continue;
    if (grazer.ageDays < lifespanDays(world, grazer.id, band)) continue;
    grazer.alive = false;
    grazer.causeOfDeath = 'old_age';
    deaths += 1;
  }
  if (deaths > 0) world.creatures = world.creatures.filter((grazer) => grazer.alive);
  return deaths;
}

function lifespanDays(world, creatureId, band) {
  const minDays = band.minYears * world.config.daysPerYear;
  const maxDays = band.maxYears * world.config.daysPerYear;
  const span = maxDays - minDays + 1;
  return minDays + Math.floor(keyedUnit(world.seed, creatureId, 0, LIFESPAN_SALT) * span);
}

function countFounders(world, founderCount) {
  return world.creatures.filter((grazer) => grazer.id <= founderCount).length;
}

function compactCheckpoint(world, founderCount, oldAgeDeaths) {
  const summary = summarizeWorld(world);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    births: summary.creatureBirths,
    starvationDeaths: summary.creatureDeaths,
    oldAgeDeaths,
    foundersAlive: countFounders(world, founderCount),
    vegetationUtilization: round(summary.vegetationUtilization)
  };
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
