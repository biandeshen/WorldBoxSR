export function summarizeReproductionOpportunity(world) {
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const eligibleMales = livingHumans.filter((human) => isEligibleMale(world, human));
  const eligibleFemales = livingHumans.filter((human) => isEligibleFemale(world, human));

  let radius1 = 0;
  let radius3 = 0;
  let radius5 = 0;
  let sameSettlement = 0;
  let sameLineage = 0;
  let radius1MaleCount = 0;
  let radius3MaleCount = 0;
  let radius5MaleCount = 0;
  let settlementMaleCount = 0;

  for (const female of eligibleFemales) {
    let r1 = 0;
    let r3 = 0;
    let r5 = 0;
    let settlement = 0;
    let lineage = 0;

    for (const male of eligibleMales) {
      const distance = chebyshevDistance(female, male);
      if (distance <= 1) r1 += 1;
      if (distance <= 3) r3 += 1;
      if (distance <= 5) r5 += 1;
      if (female.settlementId !== null && male.settlementId === female.settlementId) settlement += 1;
      if (female.lineageId !== null && male.lineageId === female.lineageId) lineage += 1;
    }

    radius1 += Number(r1 > 0);
    radius3 += Number(r3 > 0);
    radius5 += Number(r5 > 0);
    sameSettlement += Number(settlement > 0);
    sameLineage += Number(lineage > 0);
    radius1MaleCount += r1;
    radius3MaleCount += r3;
    radius5MaleCount += r5;
    settlementMaleCount += settlement;
  }

  const activeSettlementIds = new Set(
    world.settlements.filter((settlement) => settlement.active).map((settlement) => settlement.id)
  );
  const settlementPools = new Map();
  for (const settlementId of activeSettlementIds) {
    settlementPools.set(settlementId, { eligibleFemales: 0, eligibleMales: 0 });
  }
  for (const female of eligibleFemales) {
    if (settlementPools.has(female.settlementId)) settlementPools.get(female.settlementId).eligibleFemales += 1;
  }
  for (const male of eligibleMales) {
    if (settlementPools.has(male.settlementId)) settlementPools.get(male.settlementId).eligibleMales += 1;
  }

  const poolsWithFemales = [...settlementPools.values()].filter((pool) => pool.eligibleFemales > 0);
  const poolsWithoutMales = poolsWithFemales.filter((pool) => pool.eligibleMales === 0);

  return {
    eligibleFemales: eligibleFemales.length,
    eligibleMales: eligibleMales.length,
    femaleOpportunityRadius1Share: ratio(radius1, eligibleFemales.length),
    femaleOpportunityRadius3Share: ratio(radius3, eligibleFemales.length),
    femaleOpportunityRadius5Share: ratio(radius5, eligibleFemales.length),
    femaleOpportunitySameSettlementShare: ratio(sameSettlement, eligibleFemales.length),
    femaleOpportunitySameLineageShare: ratio(sameLineage, eligibleFemales.length),
    averageEligibleMalesRadius1: ratio(radius1MaleCount, eligibleFemales.length),
    averageEligibleMalesRadius3: ratio(radius3MaleCount, eligibleFemales.length),
    averageEligibleMalesRadius5: ratio(radius5MaleCount, eligibleFemales.length),
    averageEligibleMalesSameSettlement: ratio(settlementMaleCount, eligibleFemales.length),
    activeSettlementsWithEligibleFemales: poolsWithFemales.length,
    activeSettlementsWithEligibleFemalesAndNoMales: poolsWithoutMales.length,
    settlementFemalePoolWithoutMaleShare: ratio(poolsWithoutMales.length, poolsWithFemales.length)
  };
}

export function isEligibleFemale(world, human) {
  if (!baseReproductionEligible(world, human) || human.sex !== 'F') return false;
  return human.ageDays / world.config.daysPerYear <= world.config.femaleFertilityEndYears;
}

export function isEligibleMale(world, human) {
  return baseReproductionEligible(world, human) && human.sex === 'M';
}

function baseReproductionEligible(world, human) {
  if (!human.alive || human.kind !== 'human') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && human.hunger < 0.55 && human.birthCooldownDays === 0;
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
