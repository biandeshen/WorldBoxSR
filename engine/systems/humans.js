import { createHuman } from '../model/human.js';
import { entityRef, pushEvent } from '../model/events.js';
import { passableNeighbors8, tileAt } from '../core/world.js';
import { keyedChance, keyedIndex } from '../core/keyed_random.js';

const SUPPLEMENTAL_BIRTH_ATTEMPT_SALT = 0x510e527f;
const SUPPLEMENTAL_FATHER_SALT = 0x9b05688c;
const SUPPLEMENTAL_CHILD_SEX_SALT = 0x1f83d9ab;

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

  const baseline = candidates[world.rng.int(candidates.length)];
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
  const supplementalRadius = Math.max(1, Math.floor(world.config.supplementalReproductionRadius ?? 1));
  const supplementalChanceMultiplier = clamp01(world.config.supplementalReproductionChanceMultiplier ?? 1);

  for (const mother of eligibleFemales) {
    const nearbyMales = collectNearbyMales(world, adultsByCell, mother.x, mother.y, 1);

    if (nearbyMales.length > 0) {
      if (!world.rng.chance(world.config.birthChancePerEligiblePairPerDay)) continue;
      const father = nearbyMales[world.rng.int(nearbyMales.length)];
      births.push({ mother, father, supplementalRadius: null, childSex: null });
      applyParentCooldowns(world, mother, father);
      continue;
    }

    if (supplementalRadius <= 1 || supplementalChanceMultiplier <= 0) continue;
    const supplementalMales = collectNearbyMales(world, adultsByCell, mother.x, mother.y, supplementalRadius);
    if (supplementalMales.length === 0) continue;

    const supplementalChance = world.config.birthChancePerEligiblePairPerDay * supplementalChanceMultiplier;
    if (!keyedChance(
      world.seed,
      mother.id,
      world.day,
      SUPPLEMENTAL_BIRTH_ATTEMPT_SALT,
      supplementalChance
    )) continue;

    const fatherIndex = keyedIndex(
      world.seed,
      mother.id,
      world.day,
      SUPPLEMENTAL_FATHER_SALT,
      supplementalMales.length
    );
    const father = supplementalMales[fatherIndex];
    const childSex = keyedChance(
      world.seed,
      mother.id,
      world.day,
      SUPPLEMENTAL_CHILD_SEX_SALT,
      0.5
    ) ? 'F' : 'M';

    births.push({ mother, father, supplementalRadius, childSex });
    applyParentCooldowns(world, mother, father);
  }

  for (const { mother, father, supplementalRadius: birthRadius, childSex } of births) {
    const generation = Math.max(mother.generation ?? 0, father.generation ?? 0) + 1;
    const childOverrides = {
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
    };
    if (childSex !== null) childOverrides.sex = childSex;

    const child = createHuman(world, childOverrides);
    mother.childIds.push(child.id);
    father.childIds.push(child.id);
    world.counters.births += 1;

    const event = {
      type: 'human.born',
      subject: entityRef('human', child.id),
      causes: [entityRef('human', mother.id), entityRef('human', father.id)],
      entityId: child.id,
      motherId: mother.id,
      fatherId: father.id,
      lineageId: child.lineageId,
      generation: child.generation
    };
    if (birthRadius !== null) event.supplementalReproductionRadius = birthRadius;
    pushEvent(world, event);
  }
}

function collectNearbyMales(world, adultsByCell, x, y, radius) {
  const males = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const group = adultsByCell.get(`${nx},${ny}`);
      if (group) males.push(...group.males);
    }
  }
  return males;
}

function applyParentCooldowns(world, mother, father) {
  mother.birthCooldownDays = world.config.birthCooldownDays;
  father.birthCooldownDays = Math.max(father.birthCooldownDays, 30);
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
