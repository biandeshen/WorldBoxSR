import { createHuman } from '../model/human.js';
import { entityRef, pushEvent } from '../model/events.js';
import { passableNeighbors8, tileAt } from '../core/world.js';
import { keyedChance, keyedIndex } from '../core/keyed_random.js';

export function updateHumans(world) {
  const humans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingById = new Map(humans.map((human) => [human.id, human]));

  for (const human of humans) {
    updateNeeds(world, human);
    if (!human.alive) continue;
    chooseAndPerformAction(world, human, livingById);
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

function chooseAndPerformAction(world, human, livingById) {
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

  if (world.rng.chance(world.config.passiveMoveChance)) randomMove(world, human, livingById);
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

function randomMove(world, human, livingById) {
  const candidates = passableNeighbors8(world, human.x, human.y);
  if (candidates.length === 0) return;

  // Always consume the original sequential destination draw. Optional social
  // overrides use keyed randomness so merely enabling them cannot shift the
  // authoritative RNG stream by adding extra draws.
  const baseline = candidates[world.rng.int(candidates.length)];

  const ageYears = human.ageDays / world.config.daysPerYear;
  if (ageYears < world.config.adultAgeYears) {
    const parent = nearestLivingParent(human, livingById);
    if (parent && keyedChance(world.seed, human.id, world.day, 0x9c6ef372, world.config.dependentKinBiasChance)) {
      const currentDistance = chebyshevDistance(human.x, human.y, parent.x, parent.y);
      const closer = candidates.filter((cell) => chebyshevDistance(cell.x, cell.y, parent.x, parent.y) < currentDistance);
      if (closer.length > 0) {
        const index = keyedIndex(world.seed, human.id, world.day, 0xbb67ae85, closer.length);
        const chosen = closer[index];
        human.x = chosen.x;
        human.y = chosen.y;
      }
      return;
    }
  }

  const home = human.settlementId === null
    ? null
    : world.settlements.find((settlement) => settlement.id === human.settlementId && settlement.active);

  if (home && keyedChance(world.seed, human.id, world.day, 0x51ed270b, world.config.settlementHomeBiasChance)) {
    const currentDistance = chebyshevDistance(human.x, human.y, home.x, home.y);
    const closer = candidates.filter((cell) => chebyshevDistance(cell.x, cell.y, home.x, home.y) < currentDistance);
    if (closer.length > 0) {
      const index = keyedIndex(world.seed, human.id, world.day, 0xa54ff53a, closer.length);
      const chosen = closer[index];
      human.x = chosen.x;
      human.y = chosen.y;
    }
    return;
  }

  human.x = baseline.x;
  human.y = baseline.y;
}

function nearestLivingParent(human, livingById) {
  let best = null;
  let bestDistance = Infinity;
  for (const parentId of human.parentIds) {
    const parent = livingById.get(parentId);
    if (!parent?.alive) continue;
    const distance = chebyshevDistance(human.x, human.y, parent.x, parent.y);
    if (distance < bestDistance || (distance === bestDistance && parent.id < best.id)) {
      best = parent;
      bestDistance = distance;
    }
  }
  return best;
}

function chebyshevDistance(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
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
    const generation = Math.max(mother.generation ?? 0, father.generation ?? 0) + 1;
    const child = createHuman(world, {
      x: mother.x,
      y: mother.y,
      ageYears: 0,
      hunger: 0.1,
      health: 1,
      birthCooldownDays: world.config.birthCooldownDays,
      bornDay: world.day,
      lineageId: mother.lineageId,
      parentIds: [mother.id, father.id],
      generation
    });
    mother.childIds.push(child.id);
    father.childIds.push(child.id);
    world.counters.births += 1;
    pushEvent(world, {
      type: 'human.born',
      subject: entityRef('human', child.id),
      causes: [entityRef('human', mother.id), entityRef('human', father.id)],
      entityId: child.id,
      motherId: mother.id,
      fatherId: father.id,
      lineageId: child.lineageId,
      generation: child.generation
    });
  }
}

function kill(world, human, cause) {
  if (!human.alive) return;
  human.alive = false;
  human.causeOfDeath = cause;
  world.counters.deaths += 1;
  pushEvent(world, {
    type: 'human.died',
    subject: entityRef('human', human.id),
    entityId: human.id,
    cause,
    ageYears: human.ageDays / world.config.daysPerYear
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
