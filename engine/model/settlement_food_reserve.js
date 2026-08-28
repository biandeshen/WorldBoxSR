export const SETTLEMENT_FOOD_RESERVE_BASE_CAPACITY = 2;
export const SETTLEMENT_FOOD_RESERVE_PER_RESIDENT = 2;
export const SETTLEMENT_FOOD_RESERVE_HARVEST_FLOOR_RATIO = 0.65;
export const SETTLEMENT_FOOD_RESERVE_HARVEST_PER_RESIDENT = 0.5;

export function settlementFoodReserveCapacity(populationOrSettlement) {
  const population = typeof populationOrSettlement === 'object'
    ? populationOrSettlement?.population
    : populationOrSettlement;
  const residents = Number.isFinite(population) ? Math.max(0, Math.floor(population)) : 0;
  return SETTLEMENT_FOOD_RESERVE_BASE_CAPACITY + SETTLEMENT_FOOD_RESERVE_PER_RESIDENT * residents;
}

export function normalizedSettlementFoodStored(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
