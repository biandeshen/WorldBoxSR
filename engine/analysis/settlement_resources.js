/**
 * Derived-only settlement resource accounting.
 *
 * This module must never mutate world state or consume RNG. It translates the
 * current authoritative territory + settlement membership into an observable
 * resource snapshot that can be used by research tools and the client.
 */
export function deriveSettlementResources(world) {
  const byId = new Map();
  for (const settlement of world.settlements) {
    byId.set(settlement.id, {
      settlementId: settlement.id,
      name: settlement.name,
      active: settlement.active,
      population: settlement.active ? settlement.population : 0,
      ownedCells: 0,
      food: 0,
      foodCapacity: 0
    });
  }

  for (const tile of world.tiles) {
    if (tile.ownerSettlementId === null) continue;
    const account = byId.get(tile.ownerSettlementId);
    if (!account?.active) continue;
    account.ownedCells += 1;
    account.food += tile.food;
    account.foodCapacity += tile.foodCapacity;
  }

  return [...byId.values()].map(finalizeAccount).sort((a, b) => a.settlementId - b.settlementId);
}

export function deriveSettlementResource(world, settlementId) {
  return deriveSettlementResources(world).find((account) => account.settlementId === settlementId) ?? null;
}

export function summarizeSettlementResourceDistribution(world) {
  const active = deriveSettlementResources(world).filter((account) => account.active);
  return {
    activeSettlements: active.length,
    ownedCells: stats(active.map((account) => account.ownedCells)),
    population: stats(active.map((account) => account.population)),
    foodRemainingFraction: stats(active.map((account) => account.foodRemainingFraction)),
    foodCapacityPerMember: stats(active.map((account) => account.foodCapacityPerMember ?? 0)),
    foodPerMember: stats(active.map((account) => account.foodPerMember ?? 0))
  };
}

function finalizeAccount(account) {
  const foodRemainingFraction = account.foodCapacity > 0 ? account.food / account.foodCapacity : 0;
  const hasMembers = account.population > 0;
  return {
    ...account,
    foodRemainingFraction,
    foodCapacityPerMember: hasMembers ? account.foodCapacity / account.population : null,
    foodPerMember: hasMembers ? account.food / account.population : null
  };
}

function stats(values) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    min: sorted[0],
    max: sorted.at(-1),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median
  };
}
