import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { keyedChance } from '../engine/core/keyed_random.js';
import { createGrazer } from '../engine/model/grazer.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [20, 100, 200];
const REPRODUCTION_MODES = [false, true];
const YEARS = 10;
const SAMPLE_INTERVAL_DAYS = 30;
const SPAWN_CELL_CAP = 32;
const MIN_ADULT_AGE_YEARS = 1;
const MIN_HEALTH = 0.95;
const MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const BIRTH_COOLDOWN_DAYS = 360;
const BIRTH_CHANCE_PER_ELIGIBLE_PAIR_PER_DAY = 0.001;
const BIRTH_SALT = 0x5c47a1d3;
const ARTIFACT_PATH = 'tmp-research/grazer-reproduction-10y.json';

test('temporary condition-gated grazer reproduction probe', () => {
  const rows = [];

  for (const seed of SEEDS) {
    for (const density of DENSITIES) {
      for (const reproductionEnabled of REPRODUCTION_MODES) {
        const world = createWorld({ seed, width: 24, height: 24, population: 0 });
        seedAdultGrazers(world, density);
        const rngBefore = world.rng.snapshot();
        const cooldowns = new Map();
        let researchBirths = 0;
        let maxLiving = world.creatures.length;
        let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
        const checkpoints = [];
        const totalDays = YEARS * world.config.daysPerYear;

        for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
          tickWorld(world, 1);
          if (reproductionEnabled) researchBirths += attemptResearchBirths(world, cooldowns);
          maxLiving = Math.max(maxLiving, world.creatures.length);

          if (world.day % SAMPLE_INTERVAL_DAYS === 0 || world.day === totalDays) {
            const summary = summarizeWorld(world);
            minVegetationUtilization = Math.min(minVegetationUtilization, summary.vegetationUtilization);
          }

          if (world.day % world.config.daysPerYear === 0) {
            checkpoints.push(compactCheckpoint(world, researchBirths));
          }
        }

        const final = summarizeWorld(world);
        assert.deepEqual(
          world.rng.snapshot(),
          rngBefore,
          `seed ${seed} density ${density} reproduction=${reproductionEnabled} consumed sequential RNG`
        );
        rows.push({
          seed,
          initialGrazers: density,
          reproductionEnabled,
          researchBirths,
          survivingGrazers: final.grazers,
          creatureDeaths: final.creatureDeaths,
          maxLiving,
          vegetationUtilization: round(final.vegetationUtilization),
          minVegetationUtilization: round(minVegetationUtilization),
          occupiedCells: occupiedCreatureCells(world),
          checkpoints
        });
      }
    }
  }

  assert.equal(rows.length, SEEDS.length * DENSITIES.length * REPRODUCTION_MODES.length);
  assert.equal(rows.every((row) => row.checkpoints.length === YEARS), true);
  mkdirSync('tmp-research', { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify({ rows }, null, 2)}\n`);
  console.log(`GRAZER_REPRODUCTION_10Y ${JSON.stringify({ rows })}`);
});

function seedAdultGrazers(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, SPAWN_CELL_CAP);
  assert.ok(spawnTiles.length > 0, 'world must have land');

  const adultAgeDays = 2 * world.config.daysPerYear;
  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays: adultAgeDays,
      bornDay: -adultAgeDays
    });
  }
}

function attemptResearchBirths(world, cooldowns) {
  const adults = [...world.creatures]
    .filter((grazer) => isResearchEligible(world, grazer, cooldowns))
    .sort((a, b) => a.id - b.id);
  const usedToday = new Set();
  let births = 0;

  for (const parentA of adults) {
    if (usedToday.has(parentA.id)) continue;
    if (!isResearchEligible(world, parentA, cooldowns)) continue;

    const parentB = adults.find((candidate) => (
      candidate.id > parentA.id
      && !usedToday.has(candidate.id)
      && isAdjacent(parentA, candidate)
      && isResearchEligible(world, candidate, cooldowns)
    ));
    if (!parentB) continue;

    usedToday.add(parentA.id);
    usedToday.add(parentB.id);
    const pairKey = pairIdentity(parentA.id, parentB.id);
    if (!keyedChance(
      world.seed,
      pairKey,
      world.day,
      BIRTH_SALT,
      BIRTH_CHANCE_PER_ELIGIBLE_PAIR_PER_DAY
    )) continue;

    createGrazer(world, { x: parentA.x, y: parentA.y });
    cooldowns.set(parentA.id, world.day);
    cooldowns.set(parentB.id, world.day);
    births += 1;
  }

  return births;
}

function isResearchEligible(world, grazer, cooldowns) {
  if (!grazer.alive || grazer.species !== 'grazer') return false;
  if (grazer.ageDays < MIN_ADULT_AGE_YEARS * world.config.daysPerYear) return false;
  if (grazer.health < MIN_HEALTH) return false;
  if (grazer.hunger > world.config.grazerHungryThreshold) return false;
  const lastBirthDay = cooldowns.get(grazer.id);
  if (lastBirthDay !== undefined && world.day - lastBirthDay < BIRTH_COOLDOWN_DAYS) return false;
  return localVegetationUtilization(world, grazer.x, grazer.y) >= MIN_LOCAL_VEGETATION_UTILIZATION;
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

function isAdjacent(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
}

function pairIdentity(a, b) {
  const low = Math.min(a, b) >>> 0;
  const high = Math.max(a, b) >>> 0;
  return (Math.imul(low + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(high + 0x165667b1, 0xc2b2ae35)) >>> 0;
}

function compactCheckpoint(world, researchBirths) {
  const summary = summarizeWorld(world);
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    births: researchBirths,
    deaths: summary.creatureDeaths,
    vegetationUtilization: round(summary.vegetationUtilization),
    occupiedCells: occupiedCreatureCells(world)
  };
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((creature) => `${creature.x},${creature.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
