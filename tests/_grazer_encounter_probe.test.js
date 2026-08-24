import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { keyedChance } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { regenerateFood, regenerateVegetation } from '../engine/systems/environment.js';
import { updateGrazers } from '../engine/systems/grazers.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [20, 100, 200];
const PARTNER_RADII = [1, 3];
const FOUNDER_AGE_YEARS = 2;
const YEARS = 30;
const SAMPLE_INTERVAL_DAYS = 30;
const MIN_HEALTH = 0.95;
const MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;
const BIRTH_CHANCE = 0.001;
const BIRTH_SALT = 0x5c47a1d3;
const ARTIFACT_PATH = 'tmp-research/grazer-encounter-stage3.json';

test('temporary no-senescence radius-3 compatibility comparison', () => {
  const rows = [];

  for (const density of DENSITIES) {
    for (const partnerRadius of PARTNER_RADII) {
      for (const seed of SEEDS) {
        const world = createWorld({
          seed,
          width: 24,
          height: 24,
          population: 0,
          config: { grazerBirthChancePerEligiblePairPerDay: 0 }
        });
        seedAdultGrazers(world, density);
        const rngBefore = world.rng.snapshot();
        let researchBirths = 0;
        let replacementParentBirths = 0;
        let maxLiving = world.creatures.length;
        let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
        const checkpoints = [];
        const totalDays = YEARS * world.config.daysPerYear;

        for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
          regenerateFood(world);
          regenerateVegetation(world);
          updateGrazers(world);
          world.day += 1;

          const birthResult = attemptResearchBirths(world, partnerRadius, density);
          researchBirths += birthResult.births;
          replacementParentBirths += birthResult.replacementParentBirths;
          maxLiving = Math.max(maxLiving, world.creatures.length);

          if (world.day % SAMPLE_INTERVAL_DAYS === 0 || world.day === totalDays) {
            minVegetationUtilization = Math.min(
              minVegetationUtilization,
              summarizeWorld(world).vegetationUtilization
            );
          }
          if (world.day % world.config.daysPerYear === 0) {
            checkpoints.push(compactCheckpoint(world, partnerRadius, researchBirths));
          }
        }

        const summary = summarizeWorld(world);
        assert.deepEqual(world.rng.snapshot(), rngBefore, `${density} r${partnerRadius} seed ${seed} consumed sequential RNG`);
        assert.equal(checkpoints.length, YEARS);
        rows.push({
          seed,
          initialGrazers: density,
          partnerRadius,
          survivingGrazers: summary.grazers,
          researchBirths,
          replacementParentBirths,
          starvationDeaths: summary.creatureDeaths,
          maxLiving,
          vegetationUtilization: round(summary.vegetationUtilization),
          minVegetationUtilization: round(minVegetationUtilization),
          occupiedCells: occupiedCreatureCells(world),
          checkpoints
        });
      }
    }
  }

  assert.equal(rows.length, DENSITIES.length * PARTNER_RADII.length * SEEDS.length);
  mkdirSync('tmp-research', { recursive: true });
  writeFileSync(ARTIFACT_PATH, `${JSON.stringify({ rows }, null, 2)}\n`);
  console.log(`GRAZER_ENCOUNTER_STAGE3 ${JSON.stringify({ rows })}`);
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

function attemptResearchBirths(world, partnerRadius, founderCount) {
  const eligible = [...world.creatures]
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  const usedToday = new Set();
  let births = 0;
  let replacementParentBirths = 0;

  for (const parentA of eligible) {
    if (usedToday.has(parentA.id) || !isReproductionEligible(world, parentA)) continue;
    const parentB = eligible.find((candidate) => (
      candidate.id > parentA.id
      && !usedToday.has(candidate.id)
      && chebyshevDistance(parentA, candidate) <= partnerRadius
      && isReproductionEligible(world, candidate)
    ));
    if (!parentB) continue;

    usedToday.add(parentA.id);
    usedToday.add(parentB.id);
    if (!keyedChance(world.seed, pairIdentity(parentA.id, parentB.id), world.day, BIRTH_SALT, BIRTH_CHANCE)) continue;

    createGrazer(world, { x: parentA.x, y: parentA.y });
    parentA.lastBirthDay = world.day;
    parentB.lastBirthDay = world.day;
    births += 1;
    if (parentA.id > founderCount || parentB.id > founderCount) replacementParentBirths += 1;
  }

  return { births, replacementParentBirths };
}

function isReproductionEligible(world, grazer) {
  if (!grazer.alive || grazer.species !== 'grazer') return false;
  if (grazer.ageDays < world.config.daysPerYear) return false;
  if (grazer.health < MIN_HEALTH) return false;
  if (grazer.hunger > world.config.grazerHungryThreshold) return false;
  if (grazer.lastBirthDay !== null && world.day - grazer.lastBirthDay < world.config.daysPerYear) return false;
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

function compactCheckpoint(world, partnerRadius, researchBirths) {
  const summary = summarizeWorld(world);
  const eligible = world.creatures.filter((grazer) => isReproductionEligible(world, grazer));
  return {
    year: world.day / world.config.daysPerYear,
    living: summary.grazers,
    births: researchBirths,
    starvationDeaths: summary.creatureDeaths,
    vegetationUtilization: round(summary.vegetationUtilization),
    resourceReady: eligible.length,
    eligiblePairs: stablePairableCount(eligible, partnerRadius),
    occupiedCells: occupiedCreatureCells(world)
  };
}

function stablePairableCount(grazers, partnerRadius) {
  const ordered = [...grazers].sort((a, b) => a.id - b.id);
  const used = new Set();
  let pairs = 0;
  for (const first of ordered) {
    if (used.has(first.id)) continue;
    const second = ordered.find((candidate) => (
      candidate.id > first.id
      && !used.has(candidate.id)
      && chebyshevDistance(first, candidate) <= partnerRadius
    ));
    if (!second) continue;
    used.add(first.id);
    used.add(second.id);
    pairs += 1;
  }
  return pairs;
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function pairIdentity(a, b) {
  const low = Math.min(a, b) >>> 0;
  const high = Math.max(a, b) >>> 0;
  return (Math.imul(low + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(high + 0x165667b1, 0xc2b2ae35)) >>> 0;
}

function occupiedCreatureCells(world) {
  return new Set(world.creatures.map((grazer) => `${grazer.x},${grazer.y}`)).size;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
