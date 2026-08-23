const DEFAULT_MAX_PARTNERS_PER_FEMALE = 256;
const PERSISTENCE_WINDOWS = Object.freeze([30, 90, 180, 360]);

/**
 * Derived-only bounded tracker for repeated adult dyadic encounters.
 *
 * Focal humans are living females from adult age through the configured female
 * fertility end age. Encounter partners are living adult males, independent of
 * hunger and birth cooldown, so social proximity is not conflated with
 * reproduction bookkeeping. A pair encounters on a day when Chebyshev distance
 * is <= 1.
 *
 * All state lives outside the authoritative world and no RNG is consumed.
 */
export function createDyadicEncounterTracker({
  maxPartnersPerFemale = DEFAULT_MAX_PARTNERS_PER_FEMALE
} = {}) {
  const cap = normalizeCap(maxPartnersPerFemale);
  const femaleStates = new Map();
  const completed = createAggregate();
  let observations = 0;
  let partnerRecordsCreated = 0;
  let partnerRecordEvictions = 0;
  let femaleStatesFinalized = 0;
  let maxCurrentFemaleStates = 0;
  let maxCurrentPartnerRecords = 0;
  let maxPartnersForOneFemale = 0;

  function observe(world) {
    observations += 1;
    const adultMalesByCell = new Map();
    const focalFemales = [];
    const focalFemaleIds = new Set();

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      if (isAdultMale(world, human)) addMaleToCell(world, adultMalesByCell, human);
      if (isFocalFemale(world, human)) {
        focalFemales.push(human);
        focalFemaleIds.add(human.id);
      }
    }

    for (const [femaleId, state] of femaleStates) {
      if (focalFemaleIds.has(femaleId)) continue;
      finalizeFemaleState(completed, state);
      femaleStates.delete(femaleId);
      femaleStatesFinalized += 1;
    }

    for (const female of focalFemales) {
      let state = femaleStates.get(female.id);
      if (!state) {
        state = createFemaleState(female);
        femaleStates.set(female.id, state);
      }

      refreshCoParentMaleIds(world, female, state);
      state.trackedDays += 1;
      const males = collectNearbyAdultMales(world, adultMalesByCell, female.x, female.y);
      if (males.length === 0) continue;

      state.encounterDays += 1;
      state.pairDays += males.length;
      for (const male of males) {
        const maleId = male.id;
        let pair = state.partners.get(maleId);
        if (!pair) {
          pair = createPairRecord(maleId, world.day, state.coParentMaleIds.has(maleId));
          state.partners.set(maleId, pair);
          partnerRecordsCreated += 1;
        }
        recordPairEncounter(pair, world.day, sameSettlement(female, male));
      }
      enforcePartnerCap(state);
    }

    updateHighWater();
  }

  function enforcePartnerCap(state) {
    while (state.partners.size > cap) {
      let victimId = null;
      let victim = null;
      for (const [maleId, pair] of state.partners) {
        if (!victim || weakerPair(pair, maleId, victim, victimId)) {
          victimId = maleId;
          victim = pair;
        }
      }
      state.partners.delete(victimId);
      state.evictedRecords += 1;
      state.evictedPairDays += victim.encounterDays;
      state.evictedHhiSquares += victim.encounterDays * victim.encounterDays;
      rememberEvictedTopCount(state, victim.encounterDays);
      partnerRecordEvictions += 1;
    }
  }

  function updateHighWater() {
    let currentPartnerRecords = 0;
    for (const state of femaleStates.values()) {
      currentPartnerRecords += state.partners.size;
      maxPartnersForOneFemale = Math.max(maxPartnersForOneFemale, state.partners.size);
    }
    maxCurrentFemaleStates = Math.max(maxCurrentFemaleStates, femaleStates.size);
    maxCurrentPartnerRecords = Math.max(maxCurrentPartnerRecords, currentPartnerRecords);
  }

  function summarize(world) {
    const aggregate = cloneAggregate(completed);
    for (const state of femaleStates.values()) finalizeFemaleState(aggregate, state);

    let currentPartnerRecords = 0;
    for (const state of femaleStates.values()) currentPartnerRecords += state.partners.size;

    return {
      observations,
      focalFemales: summarizeFemaleAggregate(aggregate.females),
      repeatedPairs: summarizePairAggregate(aggregate.repeatedPairs),
      coParentRepeatedPairs: summarizePairAggregate(aggregate.coParentRepeatedPairs),
      nonParentRepeatedPairs: summarizePairAggregate(aggregate.nonParentRepeatedPairs),
      persistence: Object.fromEntries(
        PERSISTENCE_WINDOWS.map((days) => [days, {
          repeatedPairsSpanningAtLeast: aggregate.persistenceAtLeast[days],
          shareOfRepeatedPairs: ratio(aggregate.persistenceAtLeast[days], aggregate.repeatedPairs.count)
        }])
      ),
      topPartnerCoParentShare: ratio(
        aggregate.femalesWithCoParentTopPartner,
        aggregate.femalesWithRetainedTopPartner
      ),
      coParentShareAmongRepeatedPairs: ratio(
        aggregate.coParentRepeatedPairs.count,
        aggregate.repeatedPairs.count
      ),
      storage: {
        maxPartnersPerFemale: cap,
        currentFemaleStates: femaleStates.size,
        currentPartnerRecords,
        maxCurrentFemaleStates,
        maxCurrentPartnerRecords,
        maxPartnersForOneFemale,
        partnerRecordsCreated,
        partnerRecordEvictions,
        femaleStatesFinalized,
        pairRecordsExcludedByCap: aggregate.pairRecordsExcludedByCap
      },
      worldDay: world?.day ?? null
    };
  }

  return { observe, summarize };
}

function createFemaleState(female) {
  return {
    femaleId: female.id,
    trackedDays: 0,
    encounterDays: 0,
    pairDays: 0,
    partners: new Map(),
    coParentMaleIds: new Set(),
    knownUnionIds: new Set(),
    evictedRecords: 0,
    evictedPairDays: 0,
    evictedHhiSquares: 0,
    evictedTopCounts: [0, 0]
  };
}

function createPairRecord(maleId, day, coParent) {
  return {
    maleId,
    encounterDays: 0,
    firstEncounterDay: day,
    lastEncounterDay: null,
    sameSettlementDays: 0,
    recurrenceCount: 0,
    recurrenceGapSum: 0,
    recurrenceGapMax: 0,
    coParent
  };
}

function recordPairEncounter(pair, day, sharedSettlement) {
  if (pair.lastEncounterDay === day) return;
  if (pair.lastEncounterDay !== null) {
    const gap = day - pair.lastEncounterDay;
    if (gap > 1) {
      pair.recurrenceCount += 1;
      pair.recurrenceGapSum += gap;
      pair.recurrenceGapMax = Math.max(pair.recurrenceGapMax, gap);
    }
  }
  pair.encounterDays += 1;
  pair.lastEncounterDay = day;
  if (sharedSettlement) pair.sameSettlementDays += 1;
}

function refreshCoParentMaleIds(world, female, state) {
  for (const unionId of female.unionIds ?? []) {
    if (state.knownUnionIds.has(unionId)) continue;
    state.knownUnionIds.add(unionId);
    const union = unionById(world, unionId);
    if (!union || union.kind !== 'parental_union') continue;
    const otherId = union.partnerIds[0] === female.id ? union.partnerIds[1] : union.partnerIds[0];
    state.coParentMaleIds.add(otherId);
    const pair = state.partners.get(otherId);
    if (pair) pair.coParent = true;
  }
}

function unionById(world, unionId) {
  const direct = world.unions[unionId - 1];
  if (direct?.id === unionId) return direct;
  return world.unions.find((union) => union.id === unionId) ?? null;
}

function createAggregate() {
  return {
    females: createFemaleAggregate(),
    repeatedPairs: createPairAggregate(),
    coParentRepeatedPairs: createPairAggregate(),
    nonParentRepeatedPairs: createPairAggregate(),
    persistenceAtLeast: Object.fromEntries(PERSISTENCE_WINDOWS.map((days) => [days, 0])),
    femalesWithRetainedTopPartner: 0,
    femalesWithCoParentTopPartner: 0,
    pairRecordsExcludedByCap: 0
  };
}

function createFemaleAggregate() {
  return {
    count: 0,
    withEncounters: 0,
    withCapEvictions: 0,
    trackedDays: createStats(),
    encounterDays: createStats(),
    pairDays: createStats(),
    partnerRecordSegmentsObserved: createStats(),
    distinctPartnersAmongUntruncated: createStats(),
    topPartnerShare: createStats(),
    top2PartnerShare: createStats(),
    hhi: createStats(),
    repeatedPartners2: createStats(),
    repeatedPartners5: createStats(),
    repeatedPartners10: createStats(),
    longestPairSpanDays: createStats()
  };
}

function createPairAggregate() {
  return {
    count: 0,
    encounterDays: createStats(),
    spanDays: createStats(),
    sameSettlementShare: createStats(),
    recurrenceCount: createStats(),
    recurrenceGapMean: createStats(),
    recurrenceGapMax: createStats()
  };
}

function createStats() {
  return { count: 0, sum: 0, min: Infinity, max: -Infinity };
}

function finalizeFemaleState(aggregate, state) {
  const femaleAgg = aggregate.females;
  femaleAgg.count += 1;
  if (state.encounterDays > 0) femaleAgg.withEncounters += 1;
  if (state.evictedRecords > 0) femaleAgg.withCapEvictions += 1;
  addStat(femaleAgg.trackedDays, state.trackedDays);
  addStat(femaleAgg.encounterDays, state.encounterDays);
  addStat(femaleAgg.pairDays, state.pairDays);
  addStat(femaleAgg.partnerRecordSegmentsObserved, state.partners.size + state.evictedRecords);
  if (state.evictedRecords === 0) addStat(femaleAgg.distinctPartnersAmongUntruncated, state.partners.size);

  const retained = [...state.partners.values()];
  const counts = retained.map((pair) => pair.encounterDays);
  counts.push(...state.evictedTopCounts.filter((value) => value > 0));
  counts.sort((a, b) => b - a);
  const top = counts[0] ?? 0;
  const top2 = top + (counts[1] ?? 0);
  addStat(femaleAgg.topPartnerShare, ratio(top, state.pairDays));
  addStat(femaleAgg.top2PartnerShare, ratio(top2, state.pairDays));

  let hhiSquares = state.evictedHhiSquares;
  for (const pair of retained) hhiSquares += pair.encounterDays * pair.encounterDays;
  addStat(femaleAgg.hhi, state.pairDays ? hhiSquares / (state.pairDays * state.pairDays) : 0);
  addStat(femaleAgg.repeatedPartners2, retained.filter((pair) => pair.encounterDays >= 2).length);
  addStat(femaleAgg.repeatedPartners5, retained.filter((pair) => pair.encounterDays >= 5).length);
  addStat(femaleAgg.repeatedPartners10, retained.filter((pair) => pair.encounterDays >= 10).length);
  addStat(
    femaleAgg.longestPairSpanDays,
    retained.reduce((max, pair) => Math.max(max, pairSpanDays(pair)), 0)
  );

  if (retained.length > 0) {
    let topPair = retained[0];
    for (const pair of retained) {
      if (pair.encounterDays > topPair.encounterDays ||
          (pair.encounterDays === topPair.encounterDays && pair.maleId < topPair.maleId)) {
        topPair = pair;
      }
    }
    aggregate.femalesWithRetainedTopPartner += 1;
    if (topPair.coParent) aggregate.femalesWithCoParentTopPartner += 1;
  }

  for (const pair of retained) {
    if (pair.encounterDays < 2) continue;
    addPair(aggregate.repeatedPairs, pair);
    addPair(pair.coParent ? aggregate.coParentRepeatedPairs : aggregate.nonParentRepeatedPairs, pair);
    const span = pairSpanDays(pair);
    for (const window of PERSISTENCE_WINDOWS) {
      if (span >= window) aggregate.persistenceAtLeast[window] += 1;
    }
  }
  aggregate.pairRecordsExcludedByCap += state.evictedRecords;
}

function addPair(aggregate, pair) {
  aggregate.count += 1;
  addStat(aggregate.encounterDays, pair.encounterDays);
  addStat(aggregate.spanDays, pairSpanDays(pair));
  addStat(aggregate.sameSettlementShare, ratio(pair.sameSettlementDays, pair.encounterDays));
  addStat(aggregate.recurrenceCount, pair.recurrenceCount);
  addStat(aggregate.recurrenceGapMean, ratio(pair.recurrenceGapSum, pair.recurrenceCount));
  addStat(aggregate.recurrenceGapMax, pair.recurrenceGapMax);
}

function pairSpanDays(pair) {
  if (pair.lastEncounterDay === null) return 0;
  return Math.max(0, pair.lastEncounterDay - pair.firstEncounterDay);
}

function summarizeFemaleAggregate(aggregate) {
  return {
    count: aggregate.count,
    withEncounters: aggregate.withEncounters,
    encounterParticipationShare: ratio(aggregate.withEncounters, aggregate.count),
    femalesWithCapEvictions: aggregate.withCapEvictions,
    capTruncatedFemaleShare: ratio(aggregate.withCapEvictions, aggregate.count),
    trackedDays: summarizeStats(aggregate.trackedDays),
    encounterDays: summarizeStats(aggregate.encounterDays),
    pairDays: summarizeStats(aggregate.pairDays),
    partnerRecordSegmentsObserved: summarizeStats(aggregate.partnerRecordSegmentsObserved),
    distinctPartnersAmongUntruncated: summarizeStats(aggregate.distinctPartnersAmongUntruncated),
    topPartnerPairDayShare: summarizeStats(aggregate.topPartnerShare),
    top2PartnerPairDayShare: summarizeStats(aggregate.top2PartnerShare),
    encounterHhi: summarizeStats(aggregate.hhi),
    partnersWithAtLeast2EncounterDays: summarizeStats(aggregate.repeatedPartners2),
    partnersWithAtLeast5EncounterDays: summarizeStats(aggregate.repeatedPartners5),
    partnersWithAtLeast10EncounterDays: summarizeStats(aggregate.repeatedPartners10),
    longestPairSpanDays: summarizeStats(aggregate.longestPairSpanDays)
  };
}

function summarizePairAggregate(aggregate) {
  return {
    count: aggregate.count,
    encounterDays: summarizeStats(aggregate.encounterDays),
    spanDays: summarizeStats(aggregate.spanDays),
    sameSettlementShare: summarizeStats(aggregate.sameSettlementShare),
    recurrenceCount: summarizeStats(aggregate.recurrenceCount),
    recurrenceGapMean: summarizeStats(aggregate.recurrenceGapMean),
    recurrenceGapMax: summarizeStats(aggregate.recurrenceGapMax)
  };
}

function addStat(stats, value) {
  if (!Number.isFinite(value)) return;
  stats.count += 1;
  stats.sum += value;
  stats.min = Math.min(stats.min, value);
  stats.max = Math.max(stats.max, value);
}

function summarizeStats(stats) {
  if (stats.count === 0) return { count: 0, min: 0, mean: 0, max: 0 };
  return {
    count: stats.count,
    min: stats.min,
    mean: stats.sum / stats.count,
    max: stats.max
  };
}

function cloneAggregate(source) {
  return {
    females: cloneFemaleAggregate(source.females),
    repeatedPairs: clonePairAggregate(source.repeatedPairs),
    coParentRepeatedPairs: clonePairAggregate(source.coParentRepeatedPairs),
    nonParentRepeatedPairs: clonePairAggregate(source.nonParentRepeatedPairs),
    persistenceAtLeast: { ...source.persistenceAtLeast },
    femalesWithRetainedTopPartner: source.femalesWithRetainedTopPartner,
    femalesWithCoParentTopPartner: source.femalesWithCoParentTopPartner,
    pairRecordsExcludedByCap: source.pairRecordsExcludedByCap
  };
}

function cloneFemaleAggregate(source) {
  return {
    count: source.count,
    withEncounters: source.withEncounters,
    withCapEvictions: source.withCapEvictions,
    trackedDays: { ...source.trackedDays },
    encounterDays: { ...source.encounterDays },
    pairDays: { ...source.pairDays },
    partnerRecordSegmentsObserved: { ...source.partnerRecordSegmentsObserved },
    distinctPartnersAmongUntruncated: { ...source.distinctPartnersAmongUntruncated },
    topPartnerShare: { ...source.topPartnerShare },
    top2PartnerShare: { ...source.top2PartnerShare },
    hhi: { ...source.hhi },
    repeatedPartners2: { ...source.repeatedPartners2 },
    repeatedPartners5: { ...source.repeatedPartners5 },
    repeatedPartners10: { ...source.repeatedPartners10 },
    longestPairSpanDays: { ...source.longestPairSpanDays }
  };
}

function clonePairAggregate(source) {
  return {
    count: source.count,
    encounterDays: { ...source.encounterDays },
    spanDays: { ...source.spanDays },
    sameSettlementShare: { ...source.sameSettlementShare },
    recurrenceCount: { ...source.recurrenceCount },
    recurrenceGapMean: { ...source.recurrenceGapMean },
    recurrenceGapMax: { ...source.recurrenceGapMax }
  };
}

function weakerPair(candidate, candidateId, current, currentId) {
  if (candidate.encounterDays !== current.encounterDays) return candidate.encounterDays < current.encounterDays;
  if (candidate.lastEncounterDay !== current.lastEncounterDay) return candidate.lastEncounterDay < current.lastEncounterDay;
  return candidateId > currentId;
}

function rememberEvictedTopCount(state, count) {
  const values = [...state.evictedTopCounts, count].sort((a, b) => b - a);
  state.evictedTopCounts = values.slice(0, 2);
}

function addMaleToCell(world, cells, male) {
  const index = male.y * world.width + male.x;
  let males = cells.get(index);
  if (!males) cells.set(index, males = []);
  males.push(male);
}

function collectNearbyAdultMales(world, cells, x, y) {
  const males = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const cellMales = cells.get(ny * world.width + nx);
      if (cellMales) males.push(...cellMales);
    }
  }
  return males;
}

function isFocalFemale(world, human) {
  if (human.kind !== 'human' || !human.alive || human.sex !== 'F') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function isAdultMale(world, human) {
  if (human.kind !== 'human' || !human.alive || human.sex !== 'M') return false;
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

function sameSettlement(first, second) {
  return first.settlementId !== null && first.settlementId === second.settlementId;
}

function normalizeCap(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError('maxPartnersPerFemale must be a positive integer');
  }
  return value;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
