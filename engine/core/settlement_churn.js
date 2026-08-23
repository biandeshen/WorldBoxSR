const EPISODE_THRESHOLDS = Object.freeze([30, 90, 180, 360, 720]);
const RETENTION_RADII = Object.freeze([4, 5, 6]);

/**
 * Derived-only observer for settlement membership churn and home-distance
 * excursions. It keeps one compact state record per living human plus
 * aggregate counters/histograms; no daily trajectory is retained.
 */
export function createSettlementChurnTracker() {
  const humanStates = new Map();
  const adults = createAggregate();
  const reproductiveFemales = createAggregate();
  let observations = 0;
  let humanStatesPruned = 0;

  function observe(world) {
    observations += 1;
    ensureDistanceHistograms(adults, world);
    ensureDistanceHistograms(reproductiveFemales, world);

    const settlementById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
    const livingIds = new Set();

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      livingIds.add(human.id);

      const currentAdult = isAdult(world, human);
      const currentReproductiveFemale = isReproductiveFemale(world, human);
      const currentSettlementId = activeSettlementId(settlementById, human.settlementId);
      let state = humanStates.get(human.id);

      if (!state) {
        state = createHumanState(currentSettlementId, currentReproductiveFemale);
        humanStates.set(human.id, state);
      }

      if (!state.adultTrackingStarted && currentAdult) {
        startAdultTracking(state, currentSettlementId, world.day);
      } else if (state.adultTrackingStarted && currentAdult && state.lastSettlementId !== currentSettlementId) {
        const femaleTransition = state.lastWasReproductiveFemale || currentReproductiveFemale;
        processMembershipTransition(
          world,
          human,
          state,
          state.lastSettlementId,
          currentSettlementId,
          settlementById,
          femaleTransition
        );
      }

      if (currentAdult) {
        recordAdultPersonDay(
          world,
          human,
          state,
          currentSettlementId,
          settlementById,
          currentReproductiveFemale
        );
      }

      state.lastSettlementId = currentSettlementId;
      state.lastWasReproductiveFemale = currentReproductiveFemale;
      state.lastHomeDistance = currentSettlementId === null
        ? null
        : distanceToSettlement(human, settlementById.get(currentSettlementId));
    }

    for (const [humanId] of humanStates) {
      if (!livingIds.has(humanId)) {
        humanStates.delete(humanId);
        humanStatesPruned += 1;
      }
    }
  }

  function processMembershipTransition(
    world,
    human,
    state,
    previousSettlementId,
    currentSettlementId,
    settlementById,
    femaleTransition
  ) {
    const previousSettlement = previousSettlementId === null ? null : settlementById.get(previousSettlementId);
    const currentSettlement = currentSettlementId === null ? null : settlementById.get(currentSettlementId);

    if (previousSettlementId === null && currentSettlementId !== null) {
      const firstJoin = !state.adultEverJoined;
      const sameRejoin = !firstJoin && state.adultLastNonNullSettlementId === currentSettlementId;
      const unsettledDuration = state.unsettledEpisodeStartDay === null
        ? null
        : world.day - state.unsettledEpisodeStartDay;

      recordJoinAggregate(adults, firstJoin, sameRejoin, unsettledDuration);
      if (femaleTransition) {
        recordJoinAggregate(reproductiveFemales, firstJoin, sameRejoin, unsettledDuration);
      }

      state.adultEverJoined = true;
      state.adultLastNonNullSettlementId = currentSettlementId;
      state.unsettledEpisodeStartDay = null;
      state.settledEpisodeStartDay = world.day;
      return;
    }

    if (previousSettlementId !== null && currentSettlementId === null) {
      const cause = previousSettlement?.active ? 'distance' : previousSettlement ? 'abandonment' : 'unknown';
      const currentDistance = previousSettlement ? distanceToSettlement(human, previousSettlement) : null;
      const settledDuration = state.settledEpisodeStartDay === null
        ? null
        : world.day - state.settledEpisodeStartDay;

      recordLeaveAggregate(
        adults,
        cause,
        state.lastHomeDistance,
        currentDistance,
        settledDuration
      );
      if (femaleTransition) {
        recordLeaveAggregate(
          reproductiveFemales,
          cause,
          state.lastHomeDistance,
          currentDistance,
          settledDuration
        );
      }

      state.settledEpisodeStartDay = null;
      state.unsettledEpisodeStartDay = world.day;
      return;
    }

    if (previousSettlementId !== null && currentSettlementId !== null) {
      const newDistance = currentSettlement ? distanceToSettlement(human, currentSettlement) : null;
      const settledDuration = state.settledEpisodeStartDay === null
        ? null
        : world.day - state.settledEpisodeStartDay;

      recordSwitchAggregate(adults, settledDuration);
      if (femaleTransition) recordSwitchAggregate(reproductiveFemales, settledDuration);

      state.adultLastNonNullSettlementId = currentSettlementId;
      state.settledEpisodeStartDay = world.day;
      state.unsettledEpisodeStartDay = null;
      if (newDistance !== null) state.lastHomeDistance = newDistance;
    }
  }

  function recordAdultPersonDay(
    world,
    human,
    state,
    currentSettlementId,
    settlementById,
    currentReproductiveFemale
  ) {
    const settlement = currentSettlementId === null ? null : settlementById.get(currentSettlementId);
    const distance = settlement ? distanceToSettlement(human, settlement) : null;

    if (state.adultEverJoined && !state.adultEverJoinedCounted) {
      state.adultEverJoinedCounted = true;
      adults.humansEverJoined += 1;
    }
    recordPersonDay(adults, state.adultEverJoined, distance, world.config.settlementMembershipRadius);

    if (currentReproductiveFemale) {
      if (currentSettlementId !== null && !state.reproductiveFemaleEverJoinedCounted) {
        state.reproductiveFemaleEverJoinedCounted = true;
        reproductiveFemales.humansEverJoined += 1;
      }
      recordPersonDay(
        reproductiveFemales,
        state.adultEverJoined,
        distance,
        world.config.settlementMembershipRadius
      );
    }
  }

  function summarize(worldOrConfig) {
    const daysPerYear = worldOrConfig?.config?.daysPerYear ?? worldOrConfig?.daysPerYear ?? 360;
    return {
      observations,
      adults: summarizeAggregate(adults, daysPerYear),
      reproductiveFemales: summarizeAggregate(reproductiveFemales, daysPerYear),
      storage: {
        currentHumanStates: humanStates.size,
        humanStatesPruned
      }
    };
  }

  return { observe, summarize };
}

function createHumanState(currentSettlementId, currentReproductiveFemale) {
  return {
    lastSettlementId: currentSettlementId,
    adultTrackingStarted: false,
    adultEverJoined: false,
    adultLastNonNullSettlementId: null,
    settledEpisodeStartDay: null,
    unsettledEpisodeStartDay: null,
    lastWasReproductiveFemale: currentReproductiveFemale,
    lastHomeDistance: null,
    adultEverJoinedCounted: false,
    reproductiveFemaleEverJoinedCounted: false
  };
}

function createAggregate() {
  return {
    personDays: 0,
    settledPersonDays: 0,
    postFirstJoinPersonDays: 0,
    settledPostFirstJoinPersonDays: 0,
    unsettledPostFirstJoinPersonDays: 0,
    outsideRadiusSettledPersonDays: 0,
    humansEverJoined: 0,
    joinEvents: 0,
    firstJoinEvents: 0,
    leaveEvents: 0,
    switchEvents: 0,
    rejoinSameEvents: 0,
    rejoinOtherEvents: 0,
    distanceDrivenLeaves: 0,
    abandonmentLeaves: 0,
    unknownLeaves: 0,
    homeDistanceHistogram: null,
    homeDistanceCount: 0,
    homeDistanceSum: 0,
    homeDistanceMax: 0,
    preLossDistanceHistogram: null,
    lossDistanceHistogram: null,
    settledEpisodes: createEpisodeStats(),
    unsettledEpisodesAfterJoin: createEpisodeStats()
  };
}

function createEpisodeStats() {
  return {
    count: 0,
    sum: 0,
    max: 0,
    over: Object.fromEntries(EPISODE_THRESHOLDS.map((threshold) => [threshold, 0]))
  };
}

function ensureDistanceHistograms(aggregate, world) {
  if (aggregate.homeDistanceHistogram) return;
  const length = Math.max(world.width, world.height) + 1;
  aggregate.homeDistanceHistogram = new Uint32Array(length);
  aggregate.preLossDistanceHistogram = new Uint32Array(length);
  aggregate.lossDistanceHistogram = new Uint32Array(length);
}

function startAdultTracking(state, currentSettlementId, day) {
  state.adultTrackingStarted = true;
  if (currentSettlementId !== null) {
    state.adultEverJoined = true;
    state.adultLastNonNullSettlementId = currentSettlementId;
    state.settledEpisodeStartDay = day;
  }
}

function recordJoinAggregate(aggregate, firstJoin, sameRejoin, unsettledDuration) {
  aggregate.joinEvents += 1;
  if (firstJoin) {
    aggregate.firstJoinEvents += 1;
  } else if (sameRejoin) {
    aggregate.rejoinSameEvents += 1;
  } else {
    aggregate.rejoinOtherEvents += 1;
  }
  if (unsettledDuration !== null) addEpisode(aggregate.unsettledEpisodesAfterJoin, unsettledDuration);
}

function recordLeaveAggregate(aggregate, cause, preLossDistance, currentDistance, settledDuration) {
  aggregate.leaveEvents += 1;
  if (cause === 'distance') aggregate.distanceDrivenLeaves += 1;
  else if (cause === 'abandonment') aggregate.abandonmentLeaves += 1;
  else aggregate.unknownLeaves += 1;

  recordDistance(aggregate.preLossDistanceHistogram, preLossDistance);
  recordDistance(aggregate.lossDistanceHistogram, currentDistance);
  if (settledDuration !== null) addEpisode(aggregate.settledEpisodes, settledDuration);
}

function recordSwitchAggregate(aggregate, settledDuration) {
  aggregate.switchEvents += 1;
  if (settledDuration !== null) addEpisode(aggregate.settledEpisodes, settledDuration);
}

function recordPersonDay(aggregate, afterFirstJoin, distance, membershipRadius) {
  aggregate.personDays += 1;
  const settled = distance !== null;
  if (settled) {
    aggregate.settledPersonDays += 1;
    recordHomeDistance(aggregate, distance);
    if (distance > membershipRadius) aggregate.outsideRadiusSettledPersonDays += 1;
  }

  if (afterFirstJoin) {
    aggregate.postFirstJoinPersonDays += 1;
    if (settled) aggregate.settledPostFirstJoinPersonDays += 1;
    else aggregate.unsettledPostFirstJoinPersonDays += 1;
  }
}

function recordHomeDistance(aggregate, distance) {
  if (distance === null || !Number.isFinite(distance)) return;
  const index = Math.max(0, Math.min(aggregate.homeDistanceHistogram.length - 1, Math.floor(distance)));
  aggregate.homeDistanceHistogram[index] += 1;
  aggregate.homeDistanceCount += 1;
  aggregate.homeDistanceSum += distance;
  aggregate.homeDistanceMax = Math.max(aggregate.homeDistanceMax, distance);
}

function recordDistance(histogram, distance) {
  if (!histogram || distance === null || !Number.isFinite(distance)) return;
  const index = Math.max(0, Math.min(histogram.length - 1, Math.floor(distance)));
  histogram[index] += 1;
}

function addEpisode(stats, duration) {
  if (!Number.isFinite(duration) || duration < 0) return;
  stats.count += 1;
  stats.sum += duration;
  stats.max = Math.max(stats.max, duration);
  for (const threshold of EPISODE_THRESHOLDS) {
    if (duration > threshold) stats.over[threshold] += 1;
  }
}

function summarizeAggregate(aggregate, daysPerYear) {
  const membershipChanges = aggregate.joinEvents + aggregate.leaveEvents + aggregate.switchEvents;
  return {
    personDays: aggregate.personDays,
    settledPersonDays: aggregate.settledPersonDays,
    settledShare: ratio(aggregate.settledPersonDays, aggregate.personDays),
    postFirstJoinPersonDays: aggregate.postFirstJoinPersonDays,
    settledPostFirstJoinShare: ratio(
      aggregate.settledPostFirstJoinPersonDays,
      aggregate.postFirstJoinPersonDays
    ),
    unsettledPostFirstJoinShare: ratio(
      aggregate.unsettledPostFirstJoinPersonDays,
      aggregate.postFirstJoinPersonDays
    ),
    outsideRadiusShareOfSettledDays: ratio(
      aggregate.outsideRadiusSettledPersonDays,
      aggregate.settledPersonDays
    ),
    humansEverJoined: aggregate.humansEverJoined,
    joinEvents: aggregate.joinEvents,
    firstJoinEvents: aggregate.firstJoinEvents,
    leaveEvents: aggregate.leaveEvents,
    switchEvents: aggregate.switchEvents,
    membershipChanges,
    rejoinSameEvents: aggregate.rejoinSameEvents,
    rejoinOtherEvents: aggregate.rejoinOtherEvents,
    sameSettlementRejoinShare: ratio(
      aggregate.rejoinSameEvents,
      aggregate.rejoinSameEvents + aggregate.rejoinOtherEvents
    ),
    distanceDrivenLeaves: aggregate.distanceDrivenLeaves,
    abandonmentLeaves: aggregate.abandonmentLeaves,
    unknownLeaves: aggregate.unknownLeaves,
    distanceDrivenLeaveShare: ratio(aggregate.distanceDrivenLeaves, aggregate.leaveEvents),
    leaveEventsPer100PersonYears: ratio(
      aggregate.leaveEvents * daysPerYear * 100,
      aggregate.personDays
    ),
    membershipChangesPer100PersonYears: ratio(
      membershipChanges * daysPerYear * 100,
      aggregate.personDays
    ),
    homeDistance: summarizeHistogram(
      aggregate.homeDistanceHistogram,
      aggregate.homeDistanceCount,
      aggregate.homeDistanceSum,
      aggregate.homeDistanceMax
    ),
    preLossDistance: summarizeHistogramFromCounts(aggregate.preLossDistanceHistogram),
    lossDistance: summarizeHistogramFromCounts(aggregate.lossDistanceHistogram),
    leaveRetentionCounterfactual: Object.fromEntries(
      RETENTION_RADII.map((radius) => [radius, histogramShareAtOrBelow(aggregate.lossDistanceHistogram, radius)])
    ),
    settledEpisodes: summarizeEpisodes(aggregate.settledEpisodes),
    unsettledEpisodesAfterJoin: summarizeEpisodes(aggregate.unsettledEpisodesAfterJoin)
  };
}

function summarizeEpisodes(stats) {
  return {
    count: stats.count,
    mean: ratio(stats.sum, stats.count),
    max: stats.max,
    sharesOverDays: Object.fromEntries(
      EPISODE_THRESHOLDS.map((threshold) => [threshold, ratio(stats.over[threshold], stats.count)])
    )
  };
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

function summarizeHistogramFromCounts(histogram) {
  if (!histogram) return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  let count = 0;
  let sum = 0;
  let max = 0;
  for (let distance = 0; distance < histogram.length; distance += 1) {
    const frequency = histogram[distance];
    if (!frequency) continue;
    count += frequency;
    sum += frequency * distance;
    max = distance;
  }
  return summarizeHistogram(histogram, count, sum, max);
}

function histogramShareAtOrBelow(histogram, radius) {
  if (!histogram) return 0;
  let total = 0;
  let retained = 0;
  for (let distance = 0; distance < histogram.length; distance += 1) {
    const frequency = histogram[distance];
    total += frequency;
    if (distance <= radius) retained += frequency;
  }
  return ratio(retained, total);
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

function activeSettlementId(settlementById, settlementId) {
  if (settlementId === null || settlementId === undefined) return null;
  const settlement = settlementById.get(settlementId);
  return settlement?.active ? settlement.id : null;
}

function distanceToSettlement(human, settlement) {
  if (!settlement) return null;
  return Math.max(Math.abs(human.x - settlement.x), Math.abs(human.y - settlement.y));
}

function isAdult(world, human) {
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

function isReproductiveFemale(world, human) {
  if (human.sex !== 'F') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
