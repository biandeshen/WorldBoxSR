import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { keyedUnit } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { regenerateFood, regenerateVegetation } from '../engine/systems/environment.js';
import { updateGrazerReproduction, updateGrazers } from '../engine/systems/grazers.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [100, 200];
const LIFESPAN_BAND = { minYears: 18, maxYears: 36 };
const FOUNDER_AGE_YEARS = 2;
const YEARS = 45;
const LIFESPAN_SALT = 0x718c3b2d;
const MIN_HEALTH = 0.95;
const MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const ARTIFACT_PATH = 'tmp-research/grazer-turnover-stage4-diagnostic.json';

test('temporary post-pressure reproduction bottleneck diagnostic', () => {
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
      seedAdultGrazers(world, density);
      const rngBefore = world.rng.snapshot();
      let oldAgeDeaths = 0;
      let founderExtinctionDay = null;
      const checkpoints = [];
      const totalDays = YEARS * world.config.daysPerYear;

      for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
        regenerateFood(world);
        regenerateVegetation(world);
        updateGrazers(world);
        world.day += 1;
        oldAgeDeaths += applyResearchSenescence(world);

        const foundersAlive = countFounders(world, density);
        if (foundersAlive === 0 && founderExtinctionDay === null) founderExtinctionDay = world.day;
        const diagnostic = reproductionDiagnostic(world);
        const birthsBefore = world.counters.creatureBirths;
        updateGrazerReproduction(world);
        const birthsToday = world.counters.creatureBirths - birthsBefore;

        if (world.day % world.config.daysPerYear === 0) {
          const summary = summarizeWorld(world);
          checkpoints.push({
            year: world.day / world.config.daysPerYear,
            living: summary.grazers,
            births: summary.creatureBirths,
            birthsToday,
            starvationDeaths: summary.creatureDeaths,
            oldAgeDeaths,
            foundersAlive,
            vegetationUtilization: round(summary.vegetationUtilization),
            ...diagnostic
          });
        }
      }

      assert.deepEqual(world.rng.snapshot(), rngBefore, `${density} seed ${seed} consumed sequential RNG`);
      assert.equal(checkpoints.length, YEARS);
      assert.notEqual(founderExtinctionDay, null);
      rows.push({
        seed,
        initialGrazers: density,
        founderExtinctionYear: round(founderExtinctionDay / world.config.daysPerYear),
        finalGrazers: world.creatures.length,
        totalBirths: world.counters.creatureBirths,
        starvationDeaths: world.counters.creatureDeaths,
        oldAgeDeaths,
        checkpoints
      });
    }
  }

  assert.equal(rows.length, DENSITIES.length * SEEDS.length);
  mkdirSync('tmp-research', { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify({ rows }, null, 2)}\n`);
  console.log(`GRAZER_TURNOVER_STAGE4 ${JSON.stringify({ rows })}`);
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
  const minDays = LIFESPAN_BAND.minYears * world.config.daysPerYear;
  const maxDays = LIFESPAN_BAND.maxYears * world.config.daysPerYear;
  const span = maxDays - minDays + 1;
  return minDays + Math.floor(keyedUnit(world.seed, creatureId, 0, LIFESPAN_SALT) * span);
}

function reproductionDiagnostic(world) {
  const matureHealthyFed = world.creatures
    .filter((grazer) => grazer.alive && grazer.species === 'grazer')
    .filter((grazer) => grazer.ageDays >= world.config.daysPerYear)
    .filter((grazer) => grazer.health >= MIN_HEALTH)
    .filter((grazer) => grazer.hunger <= world.config.grazerHungryThreshold);
  const cooldownReady = matureHealthyFed.filter((grazer) => (
    grazer.lastBirthDay === null || world.day - grazer.lastBirthDay >= world.config.daysPerYear
  ));
  const resourceReady = cooldownReady.filter((grazer) => (
    localVegetationUtilization(world, grazer.x, grazer.y) >= MIN_LOCAL_VEGETATION_UTILIZATION
  ));

  return {
    matureHealthyFed: matureHealthyFed.length,
    cooldownReady: cooldownReady.length,
    resourceReady: resourceReady.length,
    conditionPairablePairs: stablePairableCount(cooldownReady),
    resourcePairablePairs: stablePairableCount(resourceReady),
    occupiedCells: new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size
  };
}

function localVegetationUtilization(world, x, y) {
  const cells = [tileAt(world, x, y), ...passableNeighbors8(world, x, y)].filter((tile) => tile.passable);
  let vegetation = 0;
  let capacity = 0;
  for (const tile of cells) {
    vegetation += tile.vegetation;
    capacity += tile.vegetationCapacity;
  }
  return capacity > 0 ? vegetation / capacity : 0;
}

function stablePairableCount(grazers) {
  const ordered = [...grazers].sort((a, b) => a.id - b.id);
  const used = new Set();
  let pairs = 0;
  for (const first of ordered) {
    if (used.has(first.id)) continue;
    const second = ordered.find((candidate) => (
      candidate.id > first.id
      && !used.has(candidate.id)
      && Math.max(Math.abs(candidate.x - first.x), Math.abs(candidate.y - first.y)) <= 1
    ));
    if (!second) continue;
    used.add(first.id);
    used.add(second.id);
    pairs += 1;
  }
  return pairs;
}

function countFounders(world, founderCount) {
  return world.creatures.filter((grazer) => grazer.id <= founderCount).length;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
