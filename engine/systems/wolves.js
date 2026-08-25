import { passableNeighbors8 } from '../core/world.js';
import { entityRef, eventRef, pushEvent } from '../model/events.js';
import { killCreature } from '../model/creature_lifecycle.js';

/**
 * Capability 3 Wolf behavior only: hunger, bounded prey-seeking movement,
 * one-grazer predation/feeding per day, health recovery and starvation.
 *
 * No sequential world RNG is consumed here. Wolf reproduction, old-age
 * mortality, packs and generalized predator/prey rules remain out of scope.
 */
export function updateWolves(world) {
  const wolves = world.creatures
    .filter((creature) => creature.alive && creature.species === 'wolf')
    .sort((a, b) => a.id - b.id);

  for (const wolf of wolves) {
    if (!wolf.alive) continue;

    wolf.ageDays += 1;
    wolf.hunger = clamp01(wolf.hunger + world.config.wolfHungerPerDay);

    if (wolf.hunger >= world.config.wolfHungryThreshold) {
      const prey = choosePrey(world, wolf);
      if (prey) {
        moveTowardPrey(world, wolf, prey);
        if (prey.alive && chebyshevDistance(wolf, prey) <= 1) {
          huntGrazer(world, wolf, prey);
        }
      }
    }

    updateWolfHealth(world, wolf);
  }

  world.creatures = world.creatures.filter((creature) => creature.alive);
}

export function choosePrey(world, wolf) {
  const radius = world.config.wolfPreySearchRadius;
  return world.creatures
    .filter((creature) => creature.alive && creature.species === 'grazer')
    .map((creature) => ({ creature, distance: chebyshevDistance(wolf, creature) }))
    .filter(({ distance }) => distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.creature.id - b.creature.id)[0]?.creature ?? null;
}

function moveTowardPrey(world, wolf, prey) {
  const currentDistance = chebyshevDistance(wolf, prey);
  if (currentDistance <= 1) return false;

  const candidates = passableNeighbors8(world, wolf.x, wolf.y)
    .map((tile) => ({
      tile,
      distance: chebyshevDistance(tile, prey),
      manhattan: manhattanDistance(tile, prey)
    }))
    .filter(({ distance }) => distance < currentDistance)
    .sort((a, b) => a.distance - b.distance || a.manhattan - b.manhattan || a.tile.y - b.tile.y || a.tile.x - b.tile.x);

  const chosen = candidates[0]?.tile;
  if (!chosen) return false;
  wolf.x = chosen.x;
  wolf.y = chosen.y;
  return true;
}

function huntGrazer(world, wolf, prey) {
  const hungerBefore = wolf.hunger;
  const hungerAfter = clamp01(hungerBefore - world.config.wolfFeedAmount);
  const predationEvent = pushEvent(world, {
    type: 'creature.predated',
    subject: entityRef('creature', prey.id),
    causes: [entityRef('creature', wolf.id)],
    predatorCreatureId: wolf.id,
    predatorSpecies: wolf.species,
    preyCreatureId: prey.id,
    preySpecies: prey.species,
    predatorHungerBefore: hungerBefore,
    predatorHungerAfter: hungerAfter,
    x: prey.x,
    y: prey.y
  });

  killCreature(world, prey, {
    cause: 'predation',
    causes: [eventRef(predationEvent.id)]
  });
  wolf.hunger = hungerAfter;
  world.counters.creatureMeals += 1;
  return predationEvent;
}

function updateWolfHealth(world, wolf) {
  if (!wolf.alive) return;
  if (wolf.hunger >= world.config.wolfStarvationThreshold) {
    wolf.health -= world.config.wolfStarvationDamagePerDay;
  } else if (wolf.hunger < 0.5) {
    wolf.health = Math.min(1, wolf.health + world.config.wolfRecoveryPerDay);
  }

  if (wolf.health <= 0) killCreature(world, wolf, { cause: 'starvation' });
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
