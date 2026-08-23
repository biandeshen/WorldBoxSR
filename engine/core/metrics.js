export function summarizeWorld(world) {
  const humans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const ageTotal = humans.reduce((sum, human) => sum + human.ageDays / world.config.daysPerYear, 0);
  const hungerTotal = humans.reduce((sum, human) => sum + human.hunger, 0);
  const foodTotal = world.tiles.reduce((sum, tile) => sum + tile.food, 0);
  const capacityTotal = world.tiles.reduce((sum, tile) => sum + tile.foodCapacity, 0);
  const settledPopulation = humans.filter((human) => human.settlementId !== null).length;
  const activeSettlements = world.settlements.filter((settlement) => settlement.active).length;
  const passableTiles = world.tiles.filter((tile) => tile.passable).length;
  const claimedTerritoryCells = world.tiles.filter((tile) => tile.ownerSettlementId !== null).length;

  return {
    seed: world.seed,
    day: world.day,
    year: world.day / world.config.daysPerYear,
    population: humans.length,
    births: world.counters.births,
    deaths: world.counters.deaths,
    meals: world.counters.meals,
    settlements: world.settlements.length,
    activeSettlements,
    abandonedSettlements: world.settlements.length - activeSettlements,
    claimedTerritoryCells,
    unclaimedLandCells: passableTiles - claimedTerritoryCells,
    territoryCoverage: passableTiles ? claimedTerritoryCells / passableTiles : 0,
    settledPopulation,
    averageAgeYears: humans.length ? ageTotal / humans.length : 0,
    averageHunger: humans.length ? hungerTotal / humans.length : 0,
    food: foodTotal,
    foodCapacity: capacityTotal,
    foodUtilization: capacityTotal ? foodTotal / capacityTotal : 0
  };
}
