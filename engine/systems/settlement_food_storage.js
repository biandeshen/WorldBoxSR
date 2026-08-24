const EXPERIMENT_DEFAULT_CAPACITY = 8;
const EXPERIMENT_DEFAULT_RESERVE_FRACTION = 0.85;
const EXPERIMENT_DEFAULT_DEPOSIT_FRACTION = 0.25;
const EPSILON = 1e-12;

export function isSettlementFoodStorageEnabled(world) {
  return world.config.settlementFoodStorageEnabled === true;
}

/**
 * Add optional authoritative storage fields only when the experiment is
 * explicitly enabled. Disabled/default worlds keep their historical settlement
 * object shape unchanged.
 */
export function initializeSettlementFoodStorage(world, settlement) {
  if (!isSettlementFoodStorageEnabled(world)) return settlement;
  if (hasStorageState(settlement)) return settlement;

  const config = storageConfig(world);
  settlement.foodStorage = 0;
  settlement.foodStorageCapacity = config.capacity;
  settlement.foodStorageDeposited = 0;
  settlement.foodStorageWithdrawn = 0;
  settlement.foodStorageMeals = 0;
  settlement.foodStorageStrandedAtAbandonment = null;
  settlement.foodStorageAbandonedDay = null;
  return settlement;
}

/**
 * Deposit a conservative fraction of territorial surplus into active stores.
 *
 * This is called only from the existing settlement update cadence after
 * territory ownership is authoritative. Food is transferred, never created:
 * every deposited unit is removed from owned tiles first. Surplus is sampled
 * above a configured reserve fraction and the target transfer is distributed
 * proportionally across surplus tiles so tile iteration order does not create a
 * large spatial extraction bias.
 */
export function updateSettlementFoodStorage(world) {
  if (!isSettlementFoodStorageEnabled(world)) return;
  const config = storageConfig(world);
  const active = world.settlements
    .filter((settlement) => settlement.active)
    .sort((a, b) => a.id - b.id);

  for (const settlement of active) {
    initializeSettlementFoodStorage(world, settlement);
    const remainingCapacity = Math.max(0, settlement.foodStorageCapacity - settlement.foodStorage);
    if (remainingCapacity <= EPSILON) continue;

    const surplusTiles = [];
    let totalSurplus = 0;
    for (const tile of world.tiles) {
      if (tile.ownerSettlementId !== settlement.id || !tile.passable || tile.foodCapacity <= 0) continue;
      const reserve = tile.foodCapacity * config.reserveFraction;
      const surplus = Math.max(0, tile.food - reserve);
      if (surplus <= EPSILON) continue;
      surplusTiles.push({ tile, surplus });
      totalSurplus += surplus;
    }

    if (totalSurplus <= EPSILON) continue;
    const target = Math.min(remainingCapacity, totalSurplus * config.depositFraction);
    if (target <= EPSILON) continue;

    let remainingTarget = target;
    let remainingSurplus = totalSurplus;
    let deposited = 0;

    for (let index = 0; index < surplusTiles.length; index += 1) {
      const { tile, surplus } = surplusTiles[index];
      const isLast = index === surplusTiles.length - 1;
      const proportional = isLast
        ? remainingTarget
        : remainingTarget * (surplus / remainingSurplus);
      const amount = Math.min(surplus, Math.max(0, proportional));
      if (amount > 0) {
        tile.food = Math.max(0, tile.food - amount);
        remainingTarget -= amount;
        deposited += amount;
      }
      remainingSurplus -= surplus;
    }

    if (deposited <= EPSILON) continue;
    settlement.foodStorage = Math.min(settlement.foodStorageCapacity, settlement.foodStorage + deposited);
    settlement.foodStorageDeposited += deposited;
  }
}

/**
 * Supply one existing meal from the current member's active settlement store.
 * Callers are responsible for invoking this only after the normal local eating
 * path has failed. No movement, hunger threshold, reproduction, or RNG logic is
 * changed here.
 */
export function tryEatFromSettlementFoodStorage(world, human, { minimumFoodForMeal = 0.2 } = {}) {
  if (!isSettlementFoodStorageEnabled(world)) return false;
  if (human.settlementId === null || human.settlementId === undefined) return false;
  if (!Number.isFinite(minimumFoodForMeal) || minimumFoodForMeal < 0) {
    throw new RangeError('minimumFoodForMeal must be a finite non-negative number');
  }

  const settlement = settlementById(world, human.settlementId);
  if (!settlement?.active) return false;
  initializeSettlementFoodStorage(world, settlement);
  if (settlement.foodStorage + EPSILON < minimumFoodForMeal) return false;

  const requested = Math.min(world.config.foodPerMeal, settlement.foodStorage);
  if (requested <= EPSILON) return false;

  settlement.foodStorage = Math.max(0, settlement.foodStorage - requested);
  settlement.foodStorageWithdrawn += requested;
  settlement.foodStorageMeals += 1;
  human.hunger = clamp01(
    human.hunger - world.config.eatAmount * (requested / world.config.foodPerMeal)
  );
  world.counters.meals += 1;
  return true;
}

/**
 * Abandonment strands any stored food in the historical settlement record.
 * Nothing is returned to tiles or transferred to another settlement, and the
 * inactive settlement can no longer deposit or serve meals.
 */
export function recordSettlementFoodStorageAbandonment(world, settlement) {
  if (!isSettlementFoodStorageEnabled(world)) return;
  initializeSettlementFoodStorage(world, settlement);
  if (settlement.foodStorageStrandedAtAbandonment !== null) return;
  settlement.foodStorageStrandedAtAbandonment = settlement.foodStorage;
  settlement.foodStorageAbandonedDay = world.day;
}

export function summarizeSettlementFoodStorage(world) {
  const settlements = world.settlements.map((settlement) => {
    const hasState = hasStorageState(settlement);
    return {
      settlementId: settlement.id,
      active: settlement.active,
      storedFood: hasState ? settlement.foodStorage : 0,
      capacity: hasState ? settlement.foodStorageCapacity : 0,
      deposited: hasState ? settlement.foodStorageDeposited : 0,
      withdrawn: hasState ? settlement.foodStorageWithdrawn : 0,
      storeMeals: hasState ? settlement.foodStorageMeals : 0,
      strandedAtAbandonment: hasState ? settlement.foodStorageStrandedAtAbandonment : null,
      abandonedDay: hasState ? settlement.foodStorageAbandonedDay : null
    };
  });

  const totalStored = settlements.reduce((sum, settlement) => sum + settlement.storedFood, 0);
  const totalCapacity = settlements.reduce((sum, settlement) => sum + settlement.capacity, 0);
  const totalDeposited = settlements.reduce((sum, settlement) => sum + settlement.deposited, 0);
  const totalWithdrawn = settlements.reduce((sum, settlement) => sum + settlement.withdrawn, 0);
  const storeMeals = settlements.reduce((sum, settlement) => sum + settlement.storeMeals, 0);
  const strandedFood = settlements.reduce(
    (sum, settlement) => sum + (settlement.strandedAtAbandonment ?? 0),
    0
  );

  return {
    enabled: isSettlementFoodStorageEnabled(world),
    settlements,
    settlementsWithStorage: settlements.filter((settlement) => settlement.storedFood > EPSILON).length,
    totalStored,
    totalCapacity,
    capacityUtilization: totalCapacity ? totalStored / totalCapacity : 0,
    totalDeposited,
    totalWithdrawn,
    storeMeals,
    strandedFood
  };
}

function storageConfig(world) {
  const capacity = world.config.settlementFoodStorageCapacity ?? EXPERIMENT_DEFAULT_CAPACITY;
  const reserveFraction = world.config.settlementFoodStorageReserveFraction ?? EXPERIMENT_DEFAULT_RESERVE_FRACTION;
  const depositFraction = world.config.settlementFoodStorageDepositFraction ?? EXPERIMENT_DEFAULT_DEPOSIT_FRACTION;

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new RangeError('settlementFoodStorageCapacity must be a finite positive number');
  }
  if (!Number.isFinite(reserveFraction) || reserveFraction < 0 || reserveFraction > 1) {
    throw new RangeError('settlementFoodStorageReserveFraction must be between 0 and 1');
  }
  if (!Number.isFinite(depositFraction) || depositFraction < 0 || depositFraction > 1) {
    throw new RangeError('settlementFoodStorageDepositFraction must be between 0 and 1');
  }

  return { capacity, reserveFraction, depositFraction };
}

function settlementById(world, settlementId) {
  const direct = world.settlements[settlementId - 1];
  if (direct?.id === settlementId) return direct;
  return world.settlements.find((settlement) => settlement.id === settlementId) ?? null;
}

function hasStorageState(settlement) {
  return Number.isFinite(settlement.foodStorage) &&
    Number.isFinite(settlement.foodStorageCapacity) &&
    Number.isFinite(settlement.foodStorageDeposited) &&
    Number.isFinite(settlement.foodStorageWithdrawn) &&
    Number.isInteger(settlement.foodStorageMeals);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
