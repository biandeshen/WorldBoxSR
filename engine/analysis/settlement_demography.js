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
  const eligibleMaleCountsByCell = new Map();

  for (const human of livingHumans) {
    if (activeById.has(human.settlementId)) membersBySettlement.get(human.settlementId).push(human);
    if (isEligibleMale(world, human)) {
      const index = human.y * world.width + human.x;
      eligibleMaleCountsByCell.set(index, (eligibleMaleCountsByCell.get(index) ?? 0) + 1);
    }
  }

  return world.settlements.map((settlement) => {
    const members = settlement.active ? (membersBySettlement.get(settlement.id) ?? []) : [];
    const ages = members.map((human) => human.ageDays / world.config.daysPerYear);
    const adults = members.filter((human) => isAdult(world, human));
    const minorFemales = members.filter((human) => human.sex === 'F' && !isAdult(world, human));
    const minorMales = members.filter((human) => human.sex === 'M' && !isAdult(world, human));
    const minors = minorFemales.length + minorMales.length;
    const females = members.filter((human) => human.sex === 'F').length;
    const males = members.filter((human) => human.sex === 'M').length;
    const reproductiveAgeFemales = members.filter((human) => isReproductiveAgeFemale(world, human));
    const reproductiveAgeMales = members.filter((human) => isReproductiveAgeMale(world, human));
    const laterAdultFemales = adults.filter(
      (human) => human.sex === 'F' && human.ageDays / world.config.daysPerYear > world.config.femaleFertilityEndYears
    );
    const laterAdultMales = adults.filter(
      (human) => human.sex === 'M' && human.ageDays / world.config.daysPerYear > world.config.femaleFertilityEndYears
    );
    const adultMales = adults.filter((human) => human.sex === 'M');
    const eligibleFemales = members.filter((human) => isEligibleFemale(world, human));
    const eligibleSettlementMales = members.filter((human) => isEligibleMale(world, human));

    let eligibleFemalesWithLocalMaleOpportunity = 0;
    let localEligibleMaleLinks = 0;
    for (const female of eligibleFemales) {
      const nearby = countEligibleMalesRadius1(world, female, eligibleMaleCountsByCell);
      if (nearby > 0) eligibleFemalesWithLocalMaleOpportunity += 1;
      localEligibleMaleLinks += nearby;
    }

    const eligibleFemalesWithoutLocalMaleOpportunity =
      eligibleFemales.length - eligibleFemalesWithLocalMaleOpportunity;
    const femaleReplacementPipelineMembers = minorFemales.length + reproductiveAgeFemales.length;

    return {
      settlementId: settlement.id,
      name: settlement.name,
      active: settlement.active,
      population: members.length,
      females,
      males,
      minors,
      minorFemales: minorFemales.length,
      minorMales: minorMales.length,
      adults: adults.length,
      dependentToAdultRatio: adults.length > 0 ? minors / adults.length : null,
      reproductiveAgeFemales: reproductiveAgeFemales.length,
      reproductiveAgeMales: reproductiveAgeMales.length,
      laterAdultFemales: laterAdultFemales.length,
      laterAdultMales: laterAdultMales.length,
      femaleReplacementPipelineMembers,
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

export function isReproductiveAgeMale(world, human) {
  if (!human.alive || human.kind !== 'human' || human.sex !== 'M') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function countEligibleMalesRadius1(world, female, eligibleMaleCountsByCell) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = female.x + dx;
      const y = female.y + dy;
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      count += eligibleMaleCountsByCell.get(y * world.width + x) ?? 0;
    }
  }
  return count;
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

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
