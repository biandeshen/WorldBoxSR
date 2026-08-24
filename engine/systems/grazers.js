import { entityRef, pushEvent } from '../model/events.js';
import { createGrazer } from '../model/grazer.js';
import { keyedChance, keyedIndex } from '../core/keyed_random.js';
import { passableNeighbors8, tileAt } from '../core/world.js';

const HUNGRY_MOVE_SALT = 0x4a7e21c3;
const PASSIVE_MOVE_CHANCE_SALT = 0x6d13f8a1;
const PASSIVE_MOVE_INDEX_SALT = 0x2bc58d07;
const BIRTH_SALT = 0x5c47a1d3;
const MIN_REPRODUCTION_AGE_YEARS = 1;
const MIN_REPRODUCTION_HEALTH = 0.95;
const MIN_LOCAL_VEGETATION_UTILIZATION = 0.5;

export function updateGrazers(world) {
  for (const grazer of world.creatures) {
    if (!grazer.alive || grazer.species !== 'grazer') continue;
    grazer.ageDays += 1;
    grazer.hunger = clamp01(grazer.hunger + world.config.grazerHungerPerDay);

    performGrazerAction(world, grazer);
    updateGrazerHealth(world, grazer);
  }
  world.creatures = world.creatures.filter((creature) => creature.alive);

  if (world.config.grazerBirthChancePerEligiblePairPerDay > 0) {
    reproduceGrazers(world);
  }
}

function performGrazerAction(world, grazer) {
  const current = tileAt(world, grazer.x, grazer.y);
  if (grazer.hunger >= world.config.grazerHungryThreshold) {
    if (current.vegetation >= world.config.grazerMinimumEdibleVegetation) {
      eatVegetation(world, grazer, current);
      return;
    }
    moveTowardVegetation(world, grazer);
    const destination = tileAt(world, grazer.x, grazer.y);
    if (destination.vegetation >= world.config.grazerMinimumEdibleVegetation) {
      eatVegetation(world, grazer, destination);
    }
    return;
  }

  if (keyedChance(
    world.seed,
    grazer.id,
    world.day,
    PASSIVE_MOVE_CHANCE_SALT,
    world.config.grazerPassiveMoveChance
  )) {
    keyedPassiveMove(world, grazer);
  }
}

function eatVegetation(world, grazer, tile) {
  const requested = Math.min(world.config.grazerVegetationPerMeal, tile.vegetation);
  tile.vegetation -= requested;
  grazer.hunger = clamp01(
    grazer.hunger - world.config.grazerEatAmount * (requested / world.config.grazerVegetationPerMeal)
  );
  world.counters.creatureMeals += 1;
}

function moveTowardVegetation(world, grazer) {
  const candidates = passableNeighbors8(world, grazer.x, grazer.y);
  if (candidates.length === 0) return;

  let bestVegetation = -Infinity;
  let best = [];
  for (const cell of candidates) {
    if (cell.vegetation > bestVegetation + 1e-12) {
      bestVegetation = cell.vegetation;
      best = [cell];
    } else if (Math.abs(cell.vegetation - bestVegetation) <= 1e-12) {
      best.push(cell);
    }
  }
  const chosen = best[keyedIndex(world.seed, grazer.id, world.day, HUNGRY_MOVE_SALT, best.length)];
  grazer.x = chosen.x;
  grazer.y = chosen.y;
}

function keyedPassiveMove(world, grazer) {
  const candidates = passableNeighbors8(world, grazer.x, grazer.y);
  if (candidates.length === 0) return;
  const chosen = candidates[keyedIndex(
    world.seed,
    grazer.id,
    world.day,
    PASSIVE_MOVE_INDEX_SALT,
    candidates.length
  )];
  grazer.x = chosen.x;
  grazer.y = chosen.y;
}

function updateGrazerHealth(world, grazer) {
  if (grazer.hunger >= world.config.grazerStarvationThreshold) {
    grazer.health -= world.config.grazerStarvationDamagePerDay;
  } else if (grazer.hunger < 0.5) {
    grazer.health = Math.min(1, grazer.health + world.config.grazerRecoveryPerDay);
  }

  if (grazer.health <= 0) killGrazer(world, grazer, 'starvation');
}

function reproduceGrazers(world) {
  const adults = world.creatures
    .filter((grazer) => isReproductionEligible(world, grazer))
    .sort((a, b) => a.id - b.id);
  const usedToday = new Set();

  for (const parentA of adults) {
    if (usedToday.has(parentA.id) || !isReproductionEligible(world, parentA)) continue;

    const parentB = adults.find((candidate) => (
      candidate.id > parentA.id
      && !usedToday.has(candidate.id)
      && isAdjacent(parentA, candidate)
      && isReproductionEligible(world, candidate)
    ));
    if (!parentB) continue;

    usedToday.add(parentA.id);
    usedToday.add(parentB.id);
    if (!keyedChance(
      world.seed,
      pairIdentity(parentA.id, parentB.id),
      world.day,
      BIRTH_SALT,
      world.config.grazerBirthChancePerEligiblePairPerDay
    )) continue;

    const child = createGrazer(world, {
      x: parentA.x,
      y: parentA.y,
      ageDays: 0,
      hunger: 0.1,
      health: 1,
      bornDay: world.day
    });
    parentA.lastBirthDay = world.day;
    parentB.lastBirthDay = world.day;
    world.counters.creatureBirths += 1;
    pushEvent(world, {
      type: 'creature.born',
      subject: entityRef('creature', child.id),
      causes: [entityRef('creature', parentA.id), entityRef('creature', parentB.id)],
      creatureId: child.id,
      species: child.species,
      parentIds: [parentA.id, parentB.id]
    });
  }
}

function isReproductionEligible(world, grazer) {
  if (!grazer.alive || grazer.species !== 'grazer') return false;
  if (grazer.ageDays < MIN_REPRODUCTION_AGE_YEARS * world.config.daysPerYear) return false;
  if (grazer.health < MIN_REPRODUCTION_HEALTH) return false;
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

function isAdjacent(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
}

function pairIdentity(a, b) {
  const low = Math.min(a, b) >>> 0;
  const high = Math.max(a, b) >>> 0;
  return (Math.imul(low + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(high + 0x165667b1, 0xc2b2ae35)) >>> 0;
}

function killGrazer(world, grazer, cause) {
  grazer.alive = false;
  grazer.causeOfDeath = cause;
  world.counters.creatureDeaths += 1;
  pushEvent(world, {
    type: 'creature.died',
    subject: entityRef('creature', grazer.id),
    creatureId: grazer.id,
    species: grazer.species,
    cause,
    ageDays: grazer.ageDays
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
