import { summarizeLineages } from './lineage_metrics.js';
import { summarizeParentalUnions } from './union_metrics.js';

export function summarizeWorld(world) {
  const humans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const ageTotal = humans.reduce((sum, human) => sum + human.ageDays / world.config.daysPerYear, 0);
  const hungerTotal = humans.reduce((sum, human) => sum + human.hunger, 0);
  const foodTotal = world.tiles.reduce((sum, tile) => sum + tile.food, 0);
  const capacityTotal = world.tiles.reduce((sum, tile) => sum + tile.foodCapacity, 0);
  const vegetationTotal = world.tiles.reduce((sum, tile) => sum + tile.vegetation, 0);
  const vegetationCapacityTotal = world.tiles.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);
  const settledPopulation = humans.filter((human) => human.settlementId !== null).length;
  const activeSettlements = world.settlements.filter((settlement) => settlement.active).length;
  const passableTiles = world.tiles.filter((tile) => tile.passable).length;
  const claimedTerritoryCells = world.tiles.filter((tile) => tile.ownerSettlementId !== null).length;
  const lineageSummary = summarizeLineages(world);
  const unionSummary = summarizeParentalUnions(world);
  const livingLineageTotal = lineageSummary.lineages.reduce((sum, lineage) => sum + lineage.livingMembers, 0);
  const historicalLineageTotal = lineageSummary.lineages.reduce((sum, lineage) => sum + lineage.historicalMembers, 0);
  const maxLivingLineageSize = lineageSummary.lineages.reduce((max, lineage) => Math.max(max, lineage.livingMembers), 0);

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
    lineages: lineageSummary.lineageCount,
    extinctLineages: lineageSummary.extinctLineages,
    orphanedHumans: lineageSummary.orphanedHumans,
    maxGeneration: lineageSummary.maxGeneration,
    averageLivingLineageSize: lineageSummary.lineageCount ? livingLineageTotal / lineageSummary.lineageCount : 0,
    averageHistoricalLineageSize: lineageSummary.lineageCount ? historicalLineageTotal / lineageSummary.lineageCount : 0,
    maxLivingLineageSize,
    parentalUnions: unionSummary.unionCount,
    bothPartnersLivingParentalUnions: unionSummary.bothPartnersLivingUnions,
    partnerDeathRecordedParentalUnions: unionSummary.partnerDeathRecordedUnions,
    singleChildParentalUnions: unionSummary.singleChildUnions,
    multiChildParentalUnions: unionSummary.multiChildUnions,
    averageChildrenPerParentalUnion: unionSummary.averageChildrenPerUnion,
    maxChildrenPerParentalUnion: unionSummary.maxChildrenPerUnion,
    livingUnionParticipants: unionSummary.livingUnionParticipants,
    multiUnionLivingHumans: unionSummary.multiUnionLivingHumans,
    averageAgeYears: humans.length ? ageTotal / humans.length : 0,
    averageHunger: humans.length ? hungerTotal / humans.length : 0,
    food: foodTotal,
    foodCapacity: capacityTotal,
    foodUtilization: capacityTotal ? foodTotal / capacityTotal : 0,
    vegetation: vegetationTotal,
    vegetationCapacity: vegetationCapacityTotal,
    vegetationUtilization: vegetationCapacityTotal ? vegetationTotal / vegetationCapacityTotal : 0
  };
}
