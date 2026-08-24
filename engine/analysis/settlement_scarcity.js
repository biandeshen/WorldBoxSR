import { deriveSettlementResources } from './settlement_resources.js';

// Mirrors the existing literal meal gate in engine/systems/humans.js.
// This research layer is read-only; changing the gameplay threshold is out of scope.
export const MIN_EDIBLE_TILE_FOOD = 0.2;
const EPSILON = 1e-12;

/**
 * Derive settlement-local scarcity without mutating authoritative state.
 *
 * The result deliberately separates aggregate territorial shortage from the
 * one-step meal path available to hungry current members. A settlement may
 * therefore expose local blockage while still owning abundant food elsewhere.
 */
export function deriveSettlementScarcity(world) {
  const foodPerMeal = positiveFinite(world?.config?.foodPerMeal, 'world.config.foodPerMeal');
  const hungryThreshold = finiteNumber(world?.config?.hungryThreshold, 'world.config.hungryThreshold');
  const settlementsById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
  const humansById = new Map(
    world.entities
      .filter((entity) => entity.kind === 'human' && entity.alive)
      .map((human) => [human.id, human])
  );

  return deriveSettlementResources(world).map((resources) => {
    const settlement = settlementsById.get(resources.settlementId);
    let hungryMembers = 0;
    let blockedHungryMembers = 0;

    if (resources.active && settlement) {
      for (const humanId of settlement.memberIds ?? []) {
        const human = humansById.get(humanId);
        if (!human || human.hunger + EPSILON < hungryThreshold) continue;
        hungryMembers += 1;
        if (!hasEdibleFoodOnExistingMealPath(world, human)) blockedHungryMembers += 1;
      }
    }

    const population = resources.population;
    const territorialMealEquivalents = resources.food / foodPerMeal;
    const territorialMealCoveragePerMember = population > 0
      ? territorialMealEquivalents / population
      : null;
    const oneMealTerritorialShortage = population > 0 &&
      resources.food + EPSILON < population * foodPerMeal;
    const blockedHungryShare = hungryMembers > 0
      ? blockedHungryMembers / hungryMembers
      : null;
    const localMealPathBlocked = blockedHungryMembers > 0;
    const accessMismatch = localMealPathBlocked &&
      territorialMealCoveragePerMember !== null &&
      territorialMealCoveragePerMember + EPSILON >= 1;

    return {
      ...resources,
      territorialMealEquivalents,
      territorialMealCoveragePerMember,
      oneMealTerritorialShortage,
      hungryMembers,
      blockedHungryMembers,
      blockedHungryShare,
      localMealPathBlocked,
      accessMismatch
    };
  });
}

export function hasEdibleFoodOnExistingMealPath(world, human) {
  const current = tileAtSafe(world, human.x, human.y);
  if (current?.food + EPSILON >= MIN_EDIBLE_TILE_FOOD) return true;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const tile = tileAtSafe(world, human.x + dx, human.y + dy);
      if (!tile?.passable) continue;
      if (tile.food + EPSILON >= MIN_EDIBLE_TILE_FOOD) return true;
    }
  }
  return false;
}

function tileAtSafe(world, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null;
  return world.tiles[y * world.width + x] ?? null;
}

function positiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be > 0`);
  return value;
}

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}
