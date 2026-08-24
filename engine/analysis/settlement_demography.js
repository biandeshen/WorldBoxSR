import { isEligibleFemale, isEligibleMale } from '../core/reproduction_metrics.js';

/**
 * Pure settlement-level demographic snapshot using existing authoritative
 * membership and reproduction eligibility semantics.
 */
export function deriveSettlementDemography(world) {
  const activeById = new Map(
    world.settlements
      .filter((settlement) => settlement.active)
      .map((settlement) => [settlement.id, settlement])
  );
  const membersBySettlement = new Map(
    [...activeById.keys()].map((settlementId) => [settlementId, []])
  );
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const eligibleMales = livingHumans.filter((human) => isEligibleMale(world, human));

  for (const human of livingHumans) {
    if (activeById.has(human.settlementId)) membersBySettlement.get(human.settlementId).push(human);
  }

  return world.settlements.map((settlement) => {
    const members = settlement.active ? (membersBySettlement.get(settlement.id) ?? []) : [];
    const ages = members.map((human) => human.ageDays / world.config.daysPerYear);
    const adults = members.filter((human) => isAdult(world, human));
    const minors = members.length - adults.length;
    const females = members.filter((human) => human.sex === 'F').length;
    const males = members.filter((human) => human.sex === 'M').length;
    const reproductiveAgeFemales = members.filter((human) => isReproductiveAgeFemale(world, human));
    const adultMales = adults.filter((human) => human.sex === 'M');
    const eligibleFemales = members.filter((human) => isEligibleFemale(world, human));
    const eligibleSettlementMales = members.filter((human) => isEligibleMale(world, human));

    let eligibleFemalesWithLocalMaleOpportunity = 0;
    let localEligibleMaleLinks = 0;
    for (const female of eligibleFemales) {
      let nearby = 0;
      for (const male of eligibleMales) {
        if (chebyshevDistance(female, male) <= 1) nearby += 1;
      }
      if (nearby > 0) eligibleFemalesWithLocalMaleOpportunity += 1;
      localEligibleMaleLinks += nearby;
    }

    const eligibleFemalesWithoutLocalMaleOpportunity =
      eligibleFemales.length - eligibleFemalesWithLocalMaleOpportunity;

    return {
      settlementId: settlement.id,
      name: settlement.name,
      active: settlement.active,
      population: members.length,
      females,
      males,
      minors,
      adults: adults.length,
      dependentToAdultRatio: adults.length > 0 ? minors / adults.length : null,
      reproductiveAgeFemales: reproductiveAgeFemales.length,
      adultMales: adultMales.length,
      eligibleFemales: eligibleFemales.length,
      eligibleMales: eligibleSettlementMales.length,
      eligibleFemalesWithLocalMaleOpportunity,
      eligibleFemalesWithoutLocalMaleOpportunity,
      localReproductionOpportunityCoverage: eligibleFemales.length > 0
        ? eligibleFemalesWithLocalMaleOpportunity / eligibleFemales.length
        : null,
      averageLocalEligibleMalesPerEligibleFemale: eligibleFemales.length > 0
        ? localEligibleMaleLinks / eligibleFemales.length
        : null,
      meanAgeYears: ages.length > 0
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length
        : null,
      medianAgeYears: median(ages),
      ageBuckets: ageBuckets(world, members)
    };
  });
}

export function isAdult(world, human) {
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

export function isReproductiveAgeFemale(world, human) {
  if (!human.alive || human.kind !== 'human' || human.sex !== 'F') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function ageBuckets(world, members) {
  let minors = 0;
  let reproductiveAgeAdults = 0;
  let laterAdults = 0;
  for (const human of members) {
    const ageYears = human.ageDays / world.config.daysPerYear;
    if (ageYears < world.config.adultAgeYears) minors += 1;
    else if (ageYears <= world.config.femaleFertilityEndYears) reproductiveAgeAdults += 1;
    else laterAdults += 1;
  }
  return { minors, reproductiveAgeAdults, laterAdults };
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
