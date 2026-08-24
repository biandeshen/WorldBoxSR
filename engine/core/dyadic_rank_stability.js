const DEFAULT_WINDOW_DAYS = 360;
const DEFAULT_MAX_PARTNERS_PER_FEMALE = 256;
const DEFAULT_TOP_K = 3;

/**
 * Derived-only windowed tracker for dyadic rank stability.
 *
 * Each focal female receives consecutive personal observation windows beginning
 * when she first enters the adult-through-fertility-end cohort. Encounter
 * partners are living adult males within Chebyshev radius 1, independent of
 * hunger and birth cooldown. Only complete, untruncated windows contribute to
 * rank-stability metrics. Tracker state remains outside authoritative world
 * state and consumes no RNG.
 */
export function createDyadicRankStabilityTracker({
  windowDays = DEFAULT_WINDOW_DAYS,
  maxPartnersPerFemale = DEFAULT_MAX_PARTNERS_PER_FEMALE,
  topK = DEFAULT_TOP_K
} = {}) {
  const normalizedWindowDays = positiveInteger(windowDays, 'windowDays');
  const partnerCap = positiveInteger(maxPartnersPerFemale, 'maxPartnersPerFemale');
  const normalizedTopK = positiveInteger(topK, 'topK');
  const femaleStates = new Map();
  const aggregate = createAggregate();
  let observations = 0;
  let partnerRecordsCreated = 0;
  let partnerRecordEvictions = 0;
  let femalesFinalized = 0;
  let maxCurrentFemaleStates = 0;
  let maxCurrentPartnerRecords = 0;
  let maxPartnersForOneWindow = 0;

  function observe(world) {
    observations += 1;
    const adultMalesByCell = new Map();
    const focalFemales = [];
    const focalFemaleIds = new Set();
    const windowsToFinalize = [];

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      if (isAdultMale(world, human)) addMaleToCell(adultMalesByCell, human);
      if (isFocalFemale(world, human)) {
        focalFemales.push(human);
        focalFemaleIds.add(human.id);
      }
    }

    for (const [femaleId, state] of femaleStates) {
      if (focalFemaleIds.has(femaleId)) continue;
      finalizeDepartedFemale(state);
      femaleStates.delete(femaleId);
      femalesFinalized += 1;
    }

    for (const female of focalFemales) {
      let state = femaleStates.get(female.id);
      if (!state) {
        state = createFemaleState(female.id, world.day);
        femaleStates.set(female.id, state);
        aggregate.focalFemalesObserved += 1;
      }

      refreshCoParentMaleIds(world, female, state);
      const current = state.currentWindow;
      current.daysObserved += 1;
      const males = collectNearbyAdultMales(world, adultMalesByCell, female.x, female.y);

      if (males.length > 0) {
        current.encounterDays += 1;
        current.pairDays += males.length;
        for (const male of males) {
          let pair = current.partners.get(male.id);
          if (!pair) {
            pair = {
              maleId: male.id,
              encounterDays: 0,
              lastEncounterDay: world.day,
              sameSettlementDays: 0,
              coParent: state.coParentMaleIds.has(male.id)
            };
            current.partners.set(male.id, pair);
            partnerRecordsCreated += 1;
          }
          pair.encounterDays += 1;
          pair.lastEncounterDay = world.day;
          if (sameSettlement(female, male)) pair.sameSettlementDays += 1;
        }
        enforcePartnerCap(current);
      }

      if (current.daysObserved === normalizedWindowDays) windowsToFinalize.push(state);
    }

    // Capture storage high-water while completed windows still contain their
    // pair maps. Resetting first would systematically under-report peak state.
    updateHighWater();
    for (const state of windowsToFinalize) finalizeCompleteWindow(state);
  }

  function enforcePartnerCap(window) {
    while (window.partners.size > partnerCap) {
      let victimId = null;
      let victim = null;
      for (const [maleId, pair] of window.partners) {
        if (!victim || weakerPair(pair, maleId, victim, victimId)) {
          victim = pair;
          victimId = maleId;
        }
      }
      window.partners.delete(victimId);
      window.truncated = true;
      window.evictedRecords += 1;
      partnerRecordEvictions += 1;
    }
  }

  function finalizeCompleteWindow(state) {
    const record = summarizeWindow(state.currentWindow, normalizedTopK);
    aggregate.completeWindows += 1;
    state.completeWindows += 1;

    if (record.truncated) {
      aggregate.truncatedCompleteWindows += 1;
      breakRankContinuity(state);
    } else {
      aggregate.untruncatedCompleteWindows += 1;
      addWindowMetrics(aggregate.windowMetrics, record);
      processRankRecord(state, record);
    }

    state.currentWindow = createWindow(state.currentWindow.startDay + normalizedWindowDays);
  }

  function processRankRecord(state, record) {
    if (record.topPartnerId === null) {
      aggregate.completeWindowsWithoutTopPartner += 1;
      breakRankContinuity(state);
      return;
    }

    const previous = state.recentValidWindows.at(-1) ?? null;
    if (previous) {
      aggregate.adjacent.comparisons += 1;
      const sameTop = previous.topPartnerId === record.topPartnerId;
      if (sameTop) aggregate.adjacent.sameTopPartner += 1;
      else aggregate.adjacent.turnovers += 1;

      addStat(aggregate.adjacent.top3Jaccard, jaccard(previous.topPartnerIds, record.topPartnerIds));
      addStat(
        sameTop ? aggregate.adjacent.laterTopShareStable : aggregate.adjacent.laterTopShareSwitched,
        record.topPartnerShare
      );
      addStat(
        sameTop ? aggregate.adjacent.laterTopCoParentStable : aggregate.adjacent.laterTopCoParentSwitched,
        record.topPartnerCoParent ? 1 : 0
      );
      if (record.topPartnerSameSettlementShare !== null) {
        addStat(
          sameTop ? aggregate.adjacent.laterTopSettlementShareStable : aggregate.adjacent.laterTopSettlementShareSwitched,
          record.topPartnerSameSettlementShare
        );
      }

      if (sameTop) {
        state.currentTopStreakLength += 1;
      } else {
        finalizeTopStreak(state);
        state.currentTopStreakId = record.topPartnerId;
        state.currentTopStreakLength = 1;
      }
    } else {
      state.currentTopStreakId = record.topPartnerId;
      state.currentTopStreakLength = 1;
    }

    state.recentValidWindows.push(record);
    if (state.recentValidWindows.length > 5) state.recentValidWindows.shift();

    if (state.recentValidWindows.length >= 3) {
      const triple = state.recentValidWindows.slice(-3);
      aggregate.runs.threeWindowComparisons += 1;
      if (allSameTop(triple)) {
        aggregate.runs.sameTopAcrossThree += 1;
        addStat(aggregate.runs.sameTopAcrossThreeCoParent, record.topPartnerCoParent ? 1 : 0);
      }
    }
    if (state.recentValidWindows.length >= 5) {
      const five = state.recentValidWindows.slice(-5);
      aggregate.runs.fiveWindowComparisons += 1;
      if (allSameTop(five)) {
        aggregate.runs.sameTopAcrossFive += 1;
        addStat(aggregate.runs.sameTopAcrossFiveCoParent, record.topPartnerCoParent ? 1 : 0);
      }
    }
  }

  function breakRankContinuity(state) {
    finalizeTopStreak(state);
    state.recentValidWindows = [];
    state.currentTopStreakId = null;
    state.currentTopStreakLength = 0;
  }

  function finalizeTopStreak(state) {
    if (state.currentTopStreakLength <= 0) return;
    addStat(aggregate.runs.topPartnerStreakLength, state.currentTopStreakLength);
    if (state.currentTopStreakLength >= 2) aggregate.runs.streaksAtLeast2 += 1;
    if (state.currentTopStreakLength >= 3) aggregate.runs.streaksAtLeast3 += 1;
    if (state.currentTopStreakLength >= 5) aggregate.runs.streaksAtLeast5 += 1;
    state.currentTopStreakId = null;
    state.currentTopStreakLength = 0;
  }

  function finalizeDepartedFemale(state) {
    if (state.currentWindow.daysObserved > 0) {
      aggregate.discardedPartialWindows += 1;
      addStat(aggregate.discardedPartialWindowDays, state.currentWindow.daysObserved);
    }
    finalizeTopStreak(state);
  }

  function updateHighWater() {
    let currentPartnerRecords = 0;
    for (const state of femaleStates.values()) {
      const count = state.currentWindow.partners.size;
      currentPartnerRecords += count;
      maxPartnersForOneWindow = Math.max(maxPartnersForOneWindow, count);
    }
    maxCurrentFemaleStates = Math.max(maxCurrentFemaleStates, femaleStates.size);
    maxCurrentPartnerRecords = Math.max(maxCurrentPartnerRecords, currentPartnerRecords);
  }

  function summarize(world) {
    let currentPartnerRecords = 0;
    const openPartialDays = createStats();
    const streakStats = cloneStats(aggregate.runs.topPartnerStreakLength);
    let openPartialWindows = 0;
    let activeStreaks = 0;
    let streaksAtLeast2 = aggregate.runs.streaksAtLeast2;
    let streaksAtLeast3 = aggregate.runs.streaksAtLeast3;
    let streaksAtLeast5 = aggregate.runs.streaksAtLeast5;

    for (const state of femaleStates.values()) {
      currentPartnerRecords += state.currentWindow.partners.size;
      if (state.currentWindow.daysObserved > 0) {
        openPartialWindows += 1;
        addStat(openPartialDays, state.currentWindow.daysObserved);
      }
      if (state.currentTopStreakLength > 0) {
        activeStreaks += 1;
        addStat(streakStats, state.currentTopStreakLength);
        if (state.currentTopStreakLength >= 2) streaksAtLeast2 += 1;
        if (state.currentTopStreakLength >= 3) streaksAtLeast3 += 1;
        if (state.currentTopStreakLength >= 5) streaksAtLeast5 += 1;
      }
    }

    return {
      observations,
      windowDays: normalizedWindowDays,
      topK: normalizedTopK,
      focalFemalesObserved: aggregate.focalFemalesObserved,
      completeWindows: aggregate.completeWindows,
      untruncatedCompleteWindows: aggregate.untruncatedCompleteWindows,
      truncatedCompleteWindows: aggregate.truncatedCompleteWindows,
      truncatedCompleteWindowShare: ratio(aggregate.truncatedCompleteWindows, aggregate.completeWindows),
      completeWindowsWithoutTopPartner: aggregate.completeWindowsWithoutTopPartner,
      discardedPartialWindows: aggregate.discardedPartialWindows,
      discardedPartialWindowDays: summarizeStats(aggregate.discardedPartialWindowDays),
      openPartialWindows,
      openPartialWindowDays: summarizeStats(openPartialDays),
      windows: summarizeWindowMetrics(aggregate.windowMetrics),
      adjacent: {
        comparisons: aggregate.adjacent.comparisons,
        sameTopPartner: aggregate.adjacent.sameTopPartner,
        sameTopPartnerShare: ratio(aggregate.adjacent.sameTopPartner, aggregate.adjacent.comparisons),
        turnovers: aggregate.adjacent.turnovers,
        turnoverRate: ratio(aggregate.adjacent.turnovers, aggregate.adjacent.comparisons),
        top3Jaccard: summarizeStats(aggregate.adjacent.top3Jaccard),
        laterTopShareWhenStable: summarizeStats(aggregate.adjacent.laterTopShareStable),
        laterTopShareWhenSwitched: summarizeStats(aggregate.adjacent.laterTopShareSwitched),
        laterTopCoParentShareWhenStable: meanOrZero(aggregate.adjacent.laterTopCoParentStable),
        laterTopCoParentShareWhenSwitched: meanOrZero(aggregate.adjacent.laterTopCoParentSwitched),
        laterTopSameSettlementShareWhenStable: summarizeStats(aggregate.adjacent.laterTopSettlementShareStable),
        laterTopSameSettlementShareWhenSwitched: summarizeStats(aggregate.adjacent.laterTopSettlementShareSwitched)
      },
      runs: {
        threeWindowComparisons: aggregate.runs.threeWindowComparisons,
        sameTopAcrossThree: aggregate.runs.sameTopAcrossThree,
        sameTopAcrossThreeShare: ratio(aggregate.runs.sameTopAcrossThree, aggregate.runs.threeWindowComparisons),
        sameTopAcrossThreeCoParentShare: meanOrZero(aggregate.runs.sameTopAcrossThreeCoParent),
        fiveWindowComparisons: aggregate.runs.fiveWindowComparisons,
        sameTopAcrossFive: aggregate.runs.sameTopAcrossFive,
        sameTopAcrossFiveShare: ratio(aggregate.runs.sameTopAcrossFive, aggregate.runs.fiveWindowComparisons),
        sameTopAcrossFiveCoParentShare: meanOrZero(aggregate.runs.sameTopAcrossFiveCoParent),
        topPartnerStreakLength: summarizeStats(streakStats),
        finalizedStreaks: aggregate.runs.topPartnerStreakLength.count,
        activeStreaks,
        streaksAtLeast2,
        streaksAtLeast3,
        streaksAtLeast5
      },
      storage: {
        maxPartnersPerFemaleWindow: partnerCap,
        currentFemaleStates: femaleStates.size,
        currentPartnerRecords,
        maxCurrentFemaleStates,
        maxCurrentPartnerRecords,
        maxPartnersForOneWindow,
        partnerRecordsCreated,
        partnerRecordEvictions,
        femalesFinalized
      },
      worldDay: world?.day ?? null
    };
  }

  return { observe, summarize };
}

function createFemaleState(femaleId, startDay) {
  return {
    femaleId,
    currentWindow: createWindow(startDay),
    completeWindows: 0,
    coParentMaleIds: new Set(),
    knownUnionIds: new Set(),
    recentValidWindows: [],
    currentTopStreakId: null,
    currentTopStreakLength: 0
  };
}

function createWindow(startDay) {
  return {
    startDay,
    daysObserved: 0,
    encounterDays: 0,
    pairDays: 0,
    partners: new Map(),
    truncated: false,
    evictedRecords: 0
  };
}

function summarizeWindow(window, topK) {
  const pairs = [...window.partners.values()].sort((a, b) =>
    b.encounterDays - a.encounterDays || a.maleId - b.maleId
  );
  const top = pairs[0] ?? null;
  const top2Count = (pairs[0]?.encounterDays ?? 0) + (pairs[1]?.encounterDays ?? 0);
  const hhiSquares = pairs.reduce((sum, pair) => sum + pair.encounterDays * pair.encounterDays, 0);

  return {
    startDay: window.startDay,
    daysObserved: window.daysObserved,
    encounterDays: window.encounterDays,
    pairDays: window.pairDays,
    distinctPartners: pairs.length,
    topPartnerId: top?.maleId ?? null,
    topPartnerShare: ratio(top?.encounterDays ?? 0, window.pairDays),
    top2PartnerShare: ratio(top2Count, window.pairDays),
    hhi: window.pairDays ? hhiSquares / (window.pairDays * window.pairDays) : 0,
    topPartnerIds: pairs.slice(0, topK).map((pair) => pair.maleId),
    topPartnerSameSettlementShare: top ? ratio(top.sameSettlementDays, top.encounterDays) : null,
    topPartnerCoParent: Boolean(top?.coParent),
    truncated: window.truncated,
    evictedRecords: window.evictedRecords
  };
}

function createAggregate() {
  return {
    focalFemalesObserved: 0,
    completeWindows: 0,
    untruncatedCompleteWindows: 0,
    truncatedCompleteWindows: 0,
    completeWindowsWithoutTopPartner: 0,
    discardedPartialWindows: 0,
    discardedPartialWindowDays: createStats(),
    windowMetrics: createWindowMetrics(),
    adjacent: {
      comparisons: 0,
      sameTopPartner: 0,
      turnovers: 0,
      top3Jaccard: createStats(),
      laterTopShareStable: createStats(),
      laterTopShareSwitched: createStats(),
      laterTopCoParentStable: createStats(),
      laterTopCoParentSwitched: createStats(),
      laterTopSettlementShareStable: createStats(),
      laterTopSettlementShareSwitched: createStats()
    },
    runs: {
      threeWindowComparisons: 0,
      sameTopAcrossThree: 0,
      sameTopAcrossThreeCoParent: createStats(),
      fiveWindowComparisons: 0,
      sameTopAcrossFive: 0,
      sameTopAcrossFiveCoParent: createStats(),
      topPartnerStreakLength: createStats(),
      streaksAtLeast2: 0,
      streaksAtLeast3: 0,
      streaksAtLeast5: 0
    }
  };
}

function createWindowMetrics() {
  return {
    encounterDays: createStats(),
    pairDays: createStats(),
    distinctPartners: createStats(),
    topPartnerShare: createStats(),
    top2PartnerShare: createStats(),
    hhi: createStats(),
    topPartnerSameSettlementShare: createStats(),
    topPartnerCoParent: createStats()
  };
}

function addWindowMetrics(aggregate, record) {
  addStat(aggregate.encounterDays, record.encounterDays);
  addStat(aggregate.pairDays, record.pairDays);
  addStat(aggregate.distinctPartners, record.distinctPartners);
  addStat(aggregate.topPartnerShare, record.topPartnerShare);
  addStat(aggregate.top2PartnerShare, record.top2PartnerShare);
  addStat(aggregate.hhi, record.hhi);
  if (record.topPartnerSameSettlementShare !== null) {
    addStat(aggregate.topPartnerSameSettlementShare, record.topPartnerSameSettlementShare);
    addStat(aggregate.topPartnerCoParent, record.topPartnerCoParent ? 1 : 0);
  }
}

function summarizeWindowMetrics(aggregate) {
  return {
    encounterDays: summarizeStats(aggregate.encounterDays),
    pairDays: summarizeStats(aggregate.pairDays),
    distinctPartners: summarizeStats(aggregate.distinctPartners),
    topPartnerPairDayShare: summarizeStats(aggregate.topPartnerShare),
    top2PartnerPairDayShare: summarizeStats(aggregate.top2PartnerShare),
    encounterHhi: summarizeStats(aggregate.hhi),
    topPartnerSameSettlementShare: summarizeStats(aggregate.topPartnerSameSettlementShare),
    topPartnerCoParentShare: meanOrZero(aggregate.topPartnerCoParent)
  };
}

function refreshCoParentMaleIds(world, female, state) {
  for (const unionId of female.unionIds ?? []) {
    if (state.knownUnionIds.has(unionId)) continue;
    state.knownUnionIds.add(unionId);
    const union = unionById(world, unionId);
    if (!union || union.kind !== 'parental_union') continue;
    const otherId = union.partnerIds[0] === female.id ? union.partnerIds[1] : union.partnerIds[0];
    state.coParentMaleIds.add(otherId);
    const currentPair = state.currentWindow.partners.get(otherId);
    if (currentPair) currentPair.coParent = true;
  }
}

function unionById(world, unionId) {
  const direct = world.unions[unionId - 1];
  if (direct?.id === unionId) return direct;
  return world.unions.find((union) => union.id === unionId) ?? null;
}

function addMaleToCell(grid, male) {
  const key = `${male.x},${male.y}`;
  const group = grid.get(key);
  if (group) group.push(male);
  else grid.set(key, [male]);
}

function collectNearbyAdultMales(world, grid, x, y) {
  const males = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const group = grid.get(`${nx},${ny}`);
      if (group) males.push(...group);
    }
  }
  return males;
}

function isFocalFemale(world, human) {
  if (human.sex !== 'F' || !human.alive || human.kind !== 'human') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function isAdultMale(world, human) {
  if (human.sex !== 'M' || !human.alive || human.kind !== 'human') return false;
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

function sameSettlement(first, second) {
  return first.settlementId !== null && first.settlementId === second.settlementId;
}

function weakerPair(candidate, candidateId, incumbent, incumbentId) {
  if (candidate.encounterDays !== incumbent.encounterDays) {
    return candidate.encounterDays < incumbent.encounterDays;
  }
  if (candidate.lastEncounterDay !== incumbent.lastEncounterDay) {
    return candidate.lastEncounterDay < incumbent.lastEncounterDay;
  }
  return candidateId > incumbentId;
}

function allSameTop(records) {
  const first = records[0]?.topPartnerId ?? null;
  return first !== null && records.every((record) => record.topPartnerId === first);
}

function jaccard(first, second) {
  const a = new Set(first);
  const b = new Set(second);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const id of a) if (b.has(id)) intersection += 1;
  return intersection / union.size;
}

function createStats() {
  return { count: 0, sum: 0, min: Infinity, max: -Infinity };
}

function cloneStats(stats) {
  return { ...stats };
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

function meanOrZero(stats) {
  return stats.count ? stats.sum / stats.count : 0;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  return value;
}
