import { entityRef, pushEvent } from '../model/events.js';
import { keyedChance, keyedIndex } from '../core/keyed_random.js';
import { passableNeighbors8, tileAt } from '../core/world.js';

const HUNGRY_MOVE_SALT = 0x4a7e21c3;
const PASSIVE_MOVE_CHANCE_SALT = 0x6d13f8a1;
const PASSIVE_MOVE_INDEX_SALT = 0x2bc58d07;

export function updateGrazers(world) {
  for (const grazer of world.creatures) {
    if (!grazer.alive || grazer.species !== 'grazer') continue;
    grazer.ageDays += 1;
    grazer.hunger = clamp01(grazer.hunger + world.config.grazerHungerPerDay);

    performGrazerAction(world, grazer);
    updateGrazerHealth(world, grazer);
  }
  world.creatures = world.creatures.filter((creature) => creature.alive);
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
