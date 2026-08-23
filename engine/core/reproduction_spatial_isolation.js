import { isEligibleFemale, isEligibleMale } from './reproduction_metrics.js';

const PARTNER_RETENTION_DAYS = 360;
const MAX_PARTNERS_PER_FEMALE = 8;

/**
 * Derived-only observer that decomposes reproduction-opportunity droughts by
 * authoritative settlement membership and static passable-land topology.
 */
export function createReproductionSpatialIsolationTracker() {
  let topology = null;
  const partnerMemory = new Map();
  let distanceHistogram = null;
  let distanceCount = 0;
  let distanceSum = 0;
  let distanceMax = 0;

  let observations = 0;
  let observationsWithActiveSettlement = 0;
  let eligibleFemaleDays = 0;
  let eligibleFemaleDaysWithActiveSettlement = 0;
  let settledEligibleFemaleDays = 0;
  let unsettledEligibleFemaleDays = 0;
  let eligibleMaleDays = 0;
  let settledEligibleMaleDays = 0;
  let unsettledEligibleMaleDays = 0;
  let droughtFemaleDays = 0;
  let droughtDaysWithActiveSettlement = 0;
  let droughtDaysWithoutActiveSettlement = 0;
  let settledDroughtDays = 0;
  let unsettledDroughtDays = 0;
  let noEligibleMaleAnywhereDays = 0;
  let sameComponentMaleDays = 0;
  let crossComponentOnlyDays = 0;
  let settledWithSameSettlementMaleDays = 0;
  let settledWithoutSameSettlementMaleDays = 0;
  let rememberedEligiblePartnerDays = 0;
  let rememberedSameSettlementDays = 0;
  let rememberedOtherSettlementDays = 0;
  let rememberedMaleUnsettledDays = 0;
  let rememberedFemaleUnsettledMaleSettledDays = 0;
  let rememberedSameComponentDays = 0;
  let rememberedCrossComponentDays = 0;
  let maxTrackedPartnerRecords = 0;
  let partnerRecordEvictions = 0;
  let stalePartnerRecordsPruned = 0;

  const nearestRelationCounts = {
    sameSettlement: 0,
    otherSettlement: 0,
    maleUnsettled: 0,
    femaleUnsettledMaleSettled: 0
  };

  function observe(world) {
    observations += 1;
    ensureTopology(world);
    pruneDeadFemaleMemory(world);

    const activeSettlementIds = new Set(
      world.settlements.filter((settlement) => settlement.active).map((settlement) => settlement.id)
    );
    const hasActiveSettlement = activeSettlementIds.size > 0;
    if (hasActiveSettlement) observationsWithActiveSettlement += 1;

    const eligibleMales = [];
    const eligibleMaleById = new Map();
    const eligibleMalesByCell = new Map();
    const eligibleMalesBySettlement = new Map();
    const eligibleMalesByComponent = new Map();
    const encounterTrackableFemales = [];

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;

      if (isEligibleMale(world, human)) {
        eligibleMales.push(human);
        eligibleMaleById.set(human.id, human);
        eligibleMaleDays += 1;
        const settlementId = activeSettlementIds.has(human.settlementId) ? human.settlementId : null;
        if (settlementId === null) {
          unsettledEligibleMaleDays += 1;
        } else {
          settledEligibleMaleDays += 1;
          addToMapArray(eligibleMalesBySettlement, settlementId, human);
        }
        addToMapArray(eligibleMalesByCell, human.y * world.width + human.x, human);
        addToMapArray(eligibleMalesByComponent, topology.componentByTile[human.y * world.width + human.x], human);
      }

      if (isEncounterTrackableFemale(world, human)) encounterTrackableFemales.push(human);
    }

    for (const female of encounterTrackableFemales) {
      const localMales = collectLocalMales(world, eligibleMalesByCell, female.x, female.y);
      if (localMales.length > 0) rememberPartners(female.id, localMales, world.day);
      pruneStalePartners(female.id, world.day);

      if (!isEligibleFemale(world, female)) continue;
      eligibleFemaleDays += 1;
      const femaleSettlementId = activeSettlementIds.has(female.settlementId) ? female.settlementId : null;
      if (hasActiveSettlement) eligibleFemaleDaysWithActiveSettlement += 1;
      if (femaleSettlementId === null) unsettledEligibleFemaleDays += 1;
      else settledEligibleFemaleDays += 1;

      if (localMales.length > 0) continue;

      droughtFemaleDays += 1;
      if (hasActiveSettlement) droughtDaysWithActiveSettlement += 1;
      else droughtDaysWithoutActiveSettlement += 1;
      const femaleComponent = topology.componentByTile[female.y * world.width + female.x];

      if (femaleSettlementId === null) {
        unsettledDroughtDays += 1;
      } else {
        settledDroughtDays += 1;
        const sameSettlementMales = eligibleMalesBySettlement.get(femaleSettlementId) ?? [];
        if (sameSettlementMales.length > 0) {
          settledWithSameSettlementMaleDays += 1;
        } else {
          settledWithoutSameSettlementMaleDays += 1;
        }
      }

      if (eligibleMales.length === 0) {
        noEligibleMaleAnywhereDays += 1;
      } else {
        const sameComponentMales = eligibleMalesByComponent.get(femaleComponent) ?? [];
        if (sameComponentMales.length > 0) {
          sameComponentMaleDays += 1;
        } else {
          crossComponentOnlyDays += 1;
        }

        const nearest = nearestMale(female, eligibleMales);
        recordDistance(nearest.distance);
        nearestRelationCounts[classifySettlementRelation(femaleSettlementId, nearest.male, activeSettlementIds)] += 1;
      }

      const remembered = mostRecentEligibleRememberedPartner(
        female.id,
        eligibleMaleById,
        world.day
      );
      if (remembered) {
        rememberedEligiblePartnerDays += 1;
        const relation = classifySettlementRelation(femaleSettlementId, remembered.male, activeSettlementIds);
        if (relation === 'sameSettlement') rememberedSameSettlementDays += 1;
        else if (relation === 'otherSettlement') rememberedOtherSettlementDays += 1;
        else if (relation === 'maleUnsettled') rememberedMaleUnsettledDays += 1;
        else rememberedFemaleUnsettledMaleSettledDays += 1;

        const maleComponent = topology.componentByTile[remembered.male.y * world.width + remembered.male.x];
        if (maleComponent === femaleComponent) rememberedSameComponentDays += 1;
        else rememberedCrossComponentDays += 1;
      }
    }

    updateStorageHighWaterMark();
  }

  function ensureTopology(world) {
    if (topology && topology.seed === world.seed && topology.width === world.width && topology.height === world.height) return;
    topology = buildPassableComponents(world);
    distanceHistogram = new Uint32Array(Math.max(world.width, world.height));
  }

  function pruneDeadFemaleMemory(world) {
    const livingFemaleIds = new Set(
      world.entities
        .filter((human) => human.kind === 'human' && human.alive && human.sex === 'F')
        .map((human) => human.id)
    );
    for (const femaleId of partnerMemory.keys()) {
      if (!livingFemaleIds.has(femaleId)) partnerMemory.delete(femaleId);
    }
  }

  function rememberPartners(femaleId, localMales, day) {
    let state = partnerMemory.get(femaleId);
    if (!state) partnerMemory.set(femaleId, state = new Map());
    for (const male of localMales) state.set(male.id, day);

    while (state.size > MAX_PARTNERS_PER_FEMALE) {
      let oldestId = null;
      let oldestDay = Infinity;
      for (const [maleId, lastDay] of state) {
        if (lastDay < oldestDay || (lastDay === oldestDay && (oldestId === null || maleId < oldestId))) {
          oldestId = maleId;
          oldestDay = lastDay;
        }
      }
      state.delete(oldestId);
      partnerRecordEvictions += 1;
    }
  }

  function pruneStalePartners(femaleId, day) {
    const state = partnerMemory.get(femaleId);
    if (!state) return;
    for (const [maleId, lastDay] of state) {
      if (day - lastDay > PARTNER_RETENTION_DAYS) {
        state.delete(maleId);
        stalePartnerRecordsPruned += 1;
      }
    }
    if (state.size === 0) partnerMemory.delete(femaleId);
  }

  function mostRecentEligibleRememberedPartner(femaleId, eligibleMaleById, day) {
    const state = partnerMemory.get(femaleId);
    if (!state) return null;
    let bestMale = null;
    let bestEncounterDay = -Infinity;
    for (const [maleId, lastEncounterDay] of state) {
      if (day - lastEncounterDay > PARTNER_RETENTION_DAYS) continue;
      const male = eligibleMaleById.get(maleId);
      if (!male) continue;
      if (lastEncounterDay > bestEncounterDay ||
          (lastEncounterDay === bestEncounterDay && (bestMale === null || male.id < bestMale.id))) {
        bestMale = male;
        bestEncounterDay = lastEncounterDay;
      }
    }
    return bestMale ? { male: bestMale, lastEncounterDay: bestEncounterDay } : null;
  }

  function recordDistance(distance) {
    distanceHistogram[distance] += 1;
    distanceCount += 1;
    distanceSum += distance;
    distanceMax = Math.max(distanceMax, distance);
  }

  function updateStorageHighWaterMark() {
    let total = 0;
    for (const state of partnerMemory.values()) total += state.size;
    maxTrackedPartnerRecords = Math.max(maxTrackedPartnerRecords, total);
  }

  function summarize() {
    const unsettledEligibleFemaleDaysWhenSettlementsExist = Math.max(
      0,
      eligibleFemaleDaysWithActiveSettlement - settledEligibleFemaleDays
    );
    const unsettledDroughtDaysWhenSettlementsExist = Math.max(
      0,
      droughtDaysWithActiveSettlement - settledDroughtDays
    );

    return {
      observations,
      observationsWithActiveSettlement,
      eligibleFemaleDays,
      eligibleFemaleDaysWithActiveSettlement,
      settledEligibleFemaleDays,
      unsettledEligibleFemaleDays,
      settledEligibleFemaleShare: ratio(settledEligibleFemaleDays, eligibleFemaleDays),
      settledEligibleFemaleShareWhenSettlementsExist: ratio(
        settledEligibleFemaleDays,
        eligibleFemaleDaysWithActiveSettlement
      ),
      unsettledEligibleFemaleShareWhenSettlementsExist: ratio(
        unsettledEligibleFemaleDaysWhenSettlementsExist,
        eligibleFemaleDaysWithActiveSettlement
      ),
      eligibleMaleDays,
      settledEligibleMaleDays,
      unsettledEligibleMaleDays,
      settledEligibleMaleShare: ratio(settledEligibleMaleDays, eligibleMaleDays),
      droughtFemaleDays,
      droughtShare: ratio(droughtFemaleDays, eligibleFemaleDays),
      droughtDaysWithActiveSettlement,
      droughtDaysWithoutActiveSettlement,
      preSettlementShareOfDroughtDays: ratio(droughtDaysWithoutActiveSettlement, droughtFemaleDays),
      settledDroughtDays,
      unsettledDroughtDays,
      settledShareOfDroughtDays: ratio(settledDroughtDays, droughtFemaleDays),
      unsettledShareOfDroughtDays: ratio(unsettledDroughtDays, droughtFemaleDays),
      settledShareOfDroughtDaysWhenSettlementsExist: ratio(
        settledDroughtDays,
        droughtDaysWithActiveSettlement
      ),
      unsettledShareOfDroughtDaysWhenSettlementsExist: ratio(
        unsettledDroughtDaysWhenSettlementsExist,
        droughtDaysWithActiveSettlement
      ),
      settledFemaleDroughtRate: ratio(settledDroughtDays, settledEligibleFemaleDays),
      unsettledFemaleDroughtRate: ratio(unsettledDroughtDays, unsettledEligibleFemaleDays),
      noEligibleMaleAnywhereDays,
      noEligibleMaleAnywhereShare: ratio(noEligibleMaleAnywhereDays, droughtFemaleDays),
      sameComponentMaleDays,
      sameComponentMaleShare: ratio(sameComponentMaleDays, droughtFemaleDays),
      crossComponentOnlyDays,
      crossComponentOnlyShare: ratio(crossComponentOnlyDays, droughtFemaleDays),
      settledWithSameSettlementMaleDays,
      settledWithoutSameSettlementMaleDays,
      sameSettlementMaleShareOfSettledDroughtDays: ratio(
        settledWithSameSettlementMaleDays,
        settledDroughtDays
      ),
      zeroMaleSettlementShareOfSettledDroughtDays: ratio(
        settledWithoutSameSettlementMaleDays,
        settledDroughtDays
      ),
      nearestEligibleMaleDistance: summarizeHistogram(
        distanceHistogram,
        distanceCount,
        distanceSum,
        distanceMax
      ),
      nearestEligibleMaleRelation: Object.fromEntries(
        Object.entries(nearestRelationCounts).map(([key, value]) => [key, {
          days: value,
          share: ratio(value, droughtFemaleDays - noEligibleMaleAnywhereDays)
        }])
      ),
      rememberedEligiblePartnerDays,
      rememberedEligiblePartnerShare: ratio(rememberedEligiblePartnerDays, droughtFemaleDays),
      rememberedEligiblePartnerRelation: {
        sameSettlement: ratio(rememberedSameSettlementDays, rememberedEligiblePartnerDays),
        otherSettlement: ratio(rememberedOtherSettlementDays, rememberedEligiblePartnerDays),
        maleUnsettled: ratio(rememberedMaleUnsettledDays, rememberedEligiblePartnerDays),
        femaleUnsettledMaleSettled: ratio(
          rememberedFemaleUnsettledMaleSettledDays,
          rememberedEligiblePartnerDays
        ),
        sameComponent: ratio(rememberedSameComponentDays, rememberedEligiblePartnerDays),
        crossComponent: ratio(rememberedCrossComponentDays, rememberedEligiblePartnerDays)
      },
      topology: {
        componentCount: topology?.componentCount ?? 0,
        passableTiles: topology?.passableTiles ?? 0,
        largestComponentTiles: topology?.largestComponentTiles ?? 0,
        largestComponentShare: ratio(topology?.largestComponentTiles ?? 0, topology?.passableTiles ?? 0)
      },
      storage: {
        retentionDays: PARTNER_RETENTION_DAYS,
        maxPartnersPerFemale: MAX_PARTNERS_PER_FEMALE,
        maxTrackedPartnerRecords,
        partnerRecordEvictions,
        stalePartnerRecordsPruned
      }
    };
  }

  return { observe, summarize };
}

function buildPassableComponents(world) {
  const componentByTile = new Int32Array(world.tiles.length);
  componentByTile.fill(-1);
  let componentCount = 0;
  let passableTiles = 0;
  let largestComponentTiles = 0;

  for (let index = 0; index < world.tiles.length; index += 1) {
    if (!world.tiles[index].passable) continue;
    passableTiles += 1;
    if (componentByTile[index] !== -1) continue;

    const queue = [index];
    componentByTile[index] = componentCount;
    let head = 0;
    let size = 0;

    while (head < queue.length) {
      const current = queue[head++];
      size += 1;
      const x = current % world.width;
      const y = Math.floor(current / world.width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
          const next = ny * world.width + nx;
          if (!world.tiles[next].passable || componentByTile[next] !== -1) continue;
          componentByTile[next] = componentCount;
          queue.push(next);
        }
      }
    }

    largestComponentTiles = Math.max(largestComponentTiles, size);
    componentCount += 1;
  }

  return {
    seed: world.seed,
    width: world.width,
    height: world.height,
    componentByTile,
    componentCount,
    passableTiles,
    largestComponentTiles
  };
}

function collectLocalMales(world, malesByCell, x, y) {
  const males = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const cell = malesByCell.get(ny * world.width + nx);
      if (cell) males.push(...cell);
    }
  }
  return males;
}

function nearestMale(female, males) {
  let bestMale = null;
  let bestDistance = Infinity;
  for (const male of males) {
    const distance = Math.max(Math.abs(female.x - male.x), Math.abs(female.y - male.y));
    if (distance < bestDistance ||
        (distance === bestDistance && (bestMale === null || male.id < bestMale.id))) {
      bestMale = male;
      bestDistance = distance;
    }
  }
  return { male: bestMale, distance: bestDistance };
}

function classifySettlementRelation(femaleSettlementId, male, activeSettlementIds) {
  const maleSettlementId = activeSettlementIds.has(male.settlementId) ? male.settlementId : null;
  if (femaleSettlementId !== null && maleSettlementId === femaleSettlementId) return 'sameSettlement';
  if (femaleSettlementId !== null && maleSettlementId !== null) return 'otherSettlement';
  if (maleSettlementId === null) return 'maleUnsettled';
  return 'femaleUnsettledMaleSettled';
}

function isEncounterTrackableFemale(world, human) {
  if (human.kind !== 'human' || !human.alive || human.sex !== 'F' || human.hunger >= 0.55) return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function addToMapArray(map, key, value) {
  let values = map.get(key);
  if (!values) map.set(key, values = []);
  values.push(value);
}

function summarizeHistogram(histogram, count, sum, max) {
  if (!histogram || count === 0) return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  return {
    count,
    mean: sum / count,
    median: histogramPercentile(histogram, count, 0.5),
    p90: histogramPercentile(histogram, count, 0.9),
    max
  };
}

function histogramPercentile(histogram, count, fraction) {
  const target = Math.ceil(count * fraction);
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= target) return value;
  }
  return histogram.length - 1;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
