import { createHuman } from '../model/human.js';
import { pushEvent } from '../model/events.js';
import { passableNeighbors8, tileAt } from '../core/world.js';

export function updateHumans(world) {
  const humans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);

  for (const human of humans) {
    updateNeeds(world, human);
    if (!human.alive) continue;
    chooseAndPerformAction(world, human);
    updateAgeAndHealth(world, human);
  }

  reproduce(world);
  world.entities = world.entities.filter((entity) => entity.alive);
}

function updateNeeds(world, human) {
  human.ageDays += 1;
  human.hunger = clamp01(human.hunger + world.config.hungerPerDay);
  human.birthCooldownDays = Math.max(0, human.birthCooldownDays - 1);
}

function chooseAndPerformAction(world, human) {
  const current = tileAt(world, human.x, human.y);

  if (human.hunger >= world.config.hungryThreshold && current.food >= 0.2) {
    eat(world, human, current);
    return;
  }

  if (human.hunger >= world.config.hungryThreshold) {
    moveTowardFood(world, human);
    const destination = tileAt(world, human.x, human.y);
    if (destination.food >= 0.2) eat(world, human, destination);
    return;
  }

  if (world.rng.chance(world.config.passiveMoveChance)) randomMove(world, human);
}

function eat(world, human, tile) {
  const requested = Math.min(world.config.foodPerMeal, tile.food);
  tile.food -= requested;
  human.hunger = clamp01(human.hunger - world.config.eatAmount * (requested / world.config.foodPerMeal));
  world.counters.meals += 1;
}

function moveTowardFood(world, human) {
  const candidates = passableNeighbors8(world, human.x, human.y);
  if (candidates.length === 0) return;

  let bestFood = -Infinity;
  let best = [];
  for (const cell of candidates) {
    if (cell.food > bestFood + 1e-12) {
      bestFood = cell.food;
      best = [cell];
    } else if (Math.abs(cell.food - bestFood) <= 1e-12) {
      best.push(cell);
    }
  }
  const chosen = best[world.rng.int(best.length)];
  human.x = chosen.x;
  human.y = chosen.y;
}

function randomMove(world, human) {
  const candidates = passableNeighbors8(world, human.x, human.y);
  if (candidates.length === 0) return;
  const chosen = candidates[world.rng.int(candidates.length)];
  human.x = chosen.x;
  human.y = chosen.y;
}

function updateAgeAndHealth(world, human) {
  if (human.hunger >= world.config.starvationThreshold) {
    human.health -= world.config.starvationDamagePerDay;
  } else if (human.hunger < 0.5) {
    human.health = Math.min(1, human.health + world.config.recoveryPerDay);
  }

  const ageYears = human.ageDays / world.config.daysPerYear;
  if (ageYears >= world.config.hardMaxAgeYears) {
    kill(world, human, 'old_age');
    return;
  }

  if (ageYears >= world.config.oldAgeYears) {
    const progress = (ageYears - world.config.oldAgeYears) /
      (world.config.hardMaxAgeYears - world.config.oldAgeYears);
    const dailyRisk = 0.00005 + progress * progress * 0.003;
    if (world.rng.chance(dailyRisk)) {
      kill(world, human, 'old_age');
      return;
    }
  }

  if (human.health <= 0) kill(world, human, 'starvation');
}

function reproduce(world) {
  const adultsByCell = new Map();
  const eligibleFemales = [];
  const daysPerYear = world.config.daysPerYear;

  for (const human of world.entities) {
    if (!human.alive || human.kind !== 'human') continue;
    const ageYears = human.ageDays / daysPerYear;
    if (ageYears < world.config.adultAgeYears || human.hunger >= 0.55 || human.birthCooldownDays > 0) continue;
    const key = `${human.x},${human.y}`;
    let group = adultsByCell.get(key);
    if (!group) adultsByCell.set(key, group = { females: [], males: [] });
    (human.sex === 'F' ? group.females : group.males).push(human);
    if (human.sex === 'F' && ageYears <= world.config.femaleFertilityEndYears) eligibleFemales.push(human);
  }

  const births = [];
  for (const mother of eligibleFemales) {
    const nearbyMales = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = mother.x + dx;
        const y = mother.y + dy;
        if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
        const group = adultsByCell.get(`${x},${y}`);
        if (group) nearbyMales.push(...group.males);
      }
    }
    if (nearbyMales.length === 0) continue;
    if (!world.rng.chance(world.config.birthChancePerEligiblePairPerDay)) continue;
    const father = nearbyMales[world.rng.int(nearbyMales.length)];
    births.push({ mother, father });
    mother.birthCooldownDays = world.config.birthCooldownDays;
    father.birthCooldownDays = Math.max(father.birthCooldownDays, 30);
  }

  for (const { mother, father } of births) {
    const child = createHuman(world, {
      x: mother.x,
      y: mother.y,
      ageYears: 0,
      hunger: 0.1,
      health: 1,
      birthCooldownDays: world.config.birthCooldownDays,
      bornDay: world.day
    });
    world.counters.births += 1;
    pushEvent(world, { type: 'human.born', entityId: child.id, motherId: mother.id, fatherId: father.id });
  }
}

function kill(world, human, cause) {
  if (!human.alive) return;
  human.alive = false;
  human.causeOfDeath = cause;
  world.counters.deaths += 1;
  pushEvent(world, {
    type: 'human.died',
    entityId: human.id,
    cause,
    ageYears: human.ageDays / world.config.daysPerYear
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
