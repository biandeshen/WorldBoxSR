const RECOVERY_RADII = Object.freeze([4, 5, 6]);
const ELAPSED_WINDOWS = Object.freeze([
  { key: '0-30', min: 0, max: 30 },
  { key: '31-90', min: 31, max: 90 },
  { key: '91-180', min: 91, max: 180 },
  { key: '181-360', min: 181, max: 360 },
  { key: '>360', min: 361, max: Infinity }
]);

/**
 * Derived-only observer for humans after a distance-driven settlement leave.
 *
 * The observer remembers the former settlement externally while authoritative
 * `human.settlementId` remains null. It never changes world membership,
 * movement, settlement state, counters, snapshots, or RNG.
 */
export function createFormerHomeRecoveryTracker() {
  const humanStates = new Map();
  const adults = createAggregate();
  const reproductiveFemales = createAggregate();
  let observations = 0;
  let prunedHumanStates = 0;

  function observe(world) {
    observations += 1;
    const settlementById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
    const livingIds = new Set();

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      livingIds.add(human.id);

      const adult = isAdult(world, human);
      const reproductiveFemale = isReproductiveFemale(world, human);
      const currentSettlementId = activeSettlementId(settlementById, human.settlementId);
      let state = humanStates.get(human.id);
      if (!state) {
        state = {
          lastSettlementId: currentSettlementId,
          adultTrackingStarted: adult,
          activeLeave: null
        };
        humanStates.set(human.id, state);
      }

      if (!state.adultTrackingStarted && adult) {
        state.adultTrackingStarted = true;
        state.lastSettlementId = currentSettlementId;
      }

      if (state.adultTrackingStarted && adult) {
        processTransition(
          world,
          human,
          state,
          state.lastSettlementId,
          currentSettlementId,
          settlementById,
          reproductiveFemale
        );
        recordActiveLeaveDay(
          world,
          human,
          state,
          currentSettlementId,
          settlementById,
          reproductiveFemale
        );
      }

      state.lastSettlementId = currentSettlementId;
    }

    for (const [humanId, state] of humanStates) {
      if (livingIds.has(humanId)) continue;
      if (state.activeLeave) {
        finishEpisode(adults, state.activeLeave, 'human_lost', null);
        if (state.activeLeave.reproductiveFemaleAtLeave) {
          finishEpisode(reproductiveFemales, state.activeLeave, 'human_lost', null);
        }
      }
      humanStates.delete(humanId);
      prunedHumanStates += 1;
    }
  }

  function processTransition(
    world,
    human,
    state,
    previousSettlementId,
    currentSettlementId,
    settlementById,
    reproductiveFemale
  ) {
    if (previousSettlementId !== null && currentSettlementId === null) {
      const previous = settlementById.get(previousSettlementId);
      if (previous?.active) {
        const leave = {
          formerSettlementId: previousSettlementId,
          leaveDay: world.day,
          reproductiveFemaleAtLeave: reproductiveFemale,
          personDays: 0,
          within6Days: 0
        };
        state.activeLeave = leave;
        adults.distanceDrivenLeavesTracked += 1;
        if (reproductiveFemale) reproductiveFemales.distanceDrivenLeavesTracked += 1;
      }
      return;
    }

    if (!state.activeLeave || currentSettlementId === null) return;

    const sameFormer = currentSettlementId === state.activeLeave.formerSettlementId;
    const duration = Math.max(0, world.day - state.activeLeave.leaveDay);
    finishEpisode(adults, state.activeLeave, sameFormer ? 'same_rejoin' : 'other_join', duration);
    if (state.activeLeave.reproductiveFemaleAtLeave) {
      finishEpisode(reproductiveFemales, state.activeLeave, sameFormer ? 'same_rejoin' : 'other_join', duration);
    }
    state.activeLeave = null;
  }

  function recordActiveLeaveDay(
    world,
    human,
    state,
    currentSettlementId,
    settlementById,
    reproductiveFemale
  ) {
    const leave = state.activeLeave;
    if (!leave || currentSettlementId !== null) return;

    const former = settlementById.get(leave.formerSettlementId);
    if (!former?.active) {
      const duration = Math.max(0, world.day - leave.leaveDay);
      finishEpisode(adults, leave, 'former_abandoned', duration);
      if (leave.reproductiveFemaleAtLeave) {
        finishEpisode(reproductiveFemales, leave, 'former_abandoned', duration);
      }
      state.activeLeave = null;
      return;
    }

    const daysSinceLeave = Math.max(0, world.day - leave.leaveDay);
    const distance = chebyshevDistance(human.x, human.y, former.x, former.y);
    const nonHungry = human.hunger < world.config.hungryThreshold;

    recordPersonDay(adults, leave, daysSinceLeave, distance, nonHungry);
    if (reproductiveFemale) {
      recordPersonDay(reproductiveFemales, leave, daysSinceLeave, distance, nonHungry);
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
        activeLeaveStates: [...humanStates.values()].filter((state) => state.activeLeave).length,
        prunedHumanStates
      }
    };
  }

  return { observe, summarize };
}

function createAggregate() {
  return {
    distanceDrivenLeavesTracked: 0,
    postLeaveUnsettledPersonDays: 0,
    formerHomeActivePersonDays: 0,
    nonHungryPersonDays: 0,
    exactlyDistance4Days: 0,
    withinRadiusDays: Object.fromEntries(RECOVERY_RADII.map((radius) => [radius, 0])),
    distanceHistogram: null,
    windows: Object.fromEntries(ELAPSED_WINDOWS.map(({ key }) => [key, createWindowAggregate()])),
    sameRejoins: 0,
    otherJoins: 0,
    formerAbandonments: 0,
    humanLostEpisodes: 0,
    completedEpisodes: 0,
    rejoinDurations: [],
    completedNearHomeShareSum: 0,
    completedNearHomeShareCount: 0
  };
}

function createWindowAggregate() {
  return {
    personDays: 0,
    within4Days: 0,
    within5Days: 0,
    within6Days: 0,
    exactlyDistance4Days: 0,
    nonHungryDays: 0,
    distanceSum: 0,
    distanceMax: 0
  };
}

function recordPersonDay(aggregate, leave, daysSinceLeave, distance, nonHungry) {
  ensureDistanceHistogram(aggregate, distance);
  aggregate.postLeaveUnsettledPersonDays += 1;
  aggregate.formerHomeActivePersonDays += 1;
  if (nonHungry) aggregate.nonHungryPersonDays += 1;
  if (distance === 4) aggregate.exactlyDistance4Days += 1;
  for (const radius of RECOVERY_RADII) {
    if (distance <= radius) aggregate.withinRadiusDays[radius] += 1;
  }
  aggregate.distanceHistogram[distance] += 1;

  leave.personDays += 1;
  if (distance <= 6) leave.within6Days += 1;

  const window = elapsedWindow(daysSinceLeave);
  const bucket = aggregate.windows[window.key];
  bucket.personDays += 1;
  if (distance <= 4) bucket.within4Days += 1;
  if (distance <= 5) bucket.within5Days += 1;
  if (distance <= 6) bucket.within6Days += 1;
  if (distance === 4) bucket.exactlyDistance4Days += 1;
  if (nonHungry) bucket.nonHungryDays += 1;
  bucket.distanceSum += distance;
  bucket.distanceMax = Math.max(bucket.distanceMax, distance);
}

function finishEpisode(aggregate, leave, outcome, duration) {
  if (outcome === 'same_rejoin') {
    aggregate.sameRejoins += 1;
    if (duration !== null) aggregate.rejoinDurations.push(duration);
  } else if (outcome === 'other_join') {
    aggregate.otherJoins += 1;
  } else if (outcome === 'former_abandoned') {
    aggregate.formerAbandonments += 1;
  } else if (outcome === 'human_lost') {
    aggregate.humanLostEpisodes += 1;
  }

  aggregate.completedEpisodes += 1;
  if (leave.personDays > 0) {
    aggregate.completedNearHomeShareSum += leave.within6Days / leave.personDays;
    aggregate.completedNearHomeShareCount += 1;
  }
}

function summarizeAggregate(aggregate, daysPerYear) {
  const personDays = aggregate.postLeaveUnsettledPersonDays;
  const distance = summarizeHistogram(aggregate.distanceHistogram);
  const rejoinDurations = summarizeValues(aggregate.rejoinDurations);

  return {
    distanceDrivenLeavesTracked: aggregate.distanceDrivenLeavesTracked,
    postLeaveUnsettledPersonDays: personDays,
    postLeaveUnsettledPersonYears: personDays / daysPerYear,
    formerHomeActiveShare: ratio(aggregate.formerHomeActivePersonDays, personDays),
    nonHungryShare: ratio(aggregate.nonHungryPersonDays, personDays),
    exactlyDistance4Share: ratio(aggregate.exactlyDistance4Days, personDays),
    withinFormerHomeRadiusShare: Object.fromEntries(
      RECOVERY_RADII.map((radius) => [radius, ratio(aggregate.withinRadiusDays[radius], personDays)])
    ),
    distance,
    elapsedWindows: Object.fromEntries(
      ELAPSED_WINDOWS.map(({ key }) => [key, summarizeWindow(aggregate.windows[key])])
    ),
    sameRejoins: aggregate.sameRejoins,
    otherJoins: aggregate.otherJoins,
    formerAbandonments: aggregate.formerAbandonments,
    humanLostEpisodes: aggregate.humanLostEpisodes,
    completedEpisodes: aggregate.completedEpisodes,
    sameRejoinShareOfResolvedJoins: ratio(
      aggregate.sameRejoins,
      aggregate.sameRejoins + aggregate.otherJoins
    ),
    sameRejoinsPer100TrackedLeaves: ratio(
      aggregate.sameRejoins * 100,
      aggregate.distanceDrivenLeavesTracked
    ),
    rejoinDurations,
    meanCompletedEpisodeWithinRadius6Share: ratio(
      aggregate.completedNearHomeShareSum,
      aggregate.completedNearHomeShareCount
    ),
    longTailOver180Days: summarizeLongTail(aggregate.windows)
  };
}

function summarizeWindow(window) {
  return {
    personDays: window.personDays,
    within4Share: ratio(window.within4Days, window.personDays),
    within5Share: ratio(window.within5Days, window.personDays),
    within6Share: ratio(window.within6Days, window.personDays),
    exactlyDistance4Share: ratio(window.exactlyDistance4Days, window.personDays),
    nonHungryShare: ratio(window.nonHungryDays, window.personDays),
    meanDistance: ratio(window.distanceSum, window.personDays),
    maxDistance: window.distanceMax
  };
}

function summarizeLongTail(windows) {
  const keys = ['181-360', '>360'];
  let personDays = 0;
  let within6Days = 0;
  let distanceSum = 0;
  for (const key of keys) {
    const window = windows[key];
    personDays += window.personDays;
    within6Days += window.within6Days;
    distanceSum += window.distanceSum;
  }
  return {
    personDays,
    within6Share: ratio(within6Days, personDays),
    meanDistance: ratio(distanceSum, personDays)
  };
}

function ensureDistanceHistogram(aggregate, distance) {
  const needed = Math.max(1, Math.floor(distance) + 1);
  if (!aggregate.distanceHistogram) {
    aggregate.distanceHistogram = new Uint32Array(needed);
    return;
  }
  if (aggregate.distanceHistogram.length >= needed) return;
  const expanded = new Uint32Array(needed);
  expanded.set(aggregate.distanceHistogram);
  aggregate.distanceHistogram = expanded;
}

function summarizeHistogram(histogram) {
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
  if (count === 0) return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  return {
    count,
    mean: sum / count,
    median: histogramPercentile(histogram, count, 0.5),
    p90: histogramPercentile(histogram, count, 0.9),
    max
  };
}

function summarizeValues(values) {
  if (values.length === 0) return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted.at(-1)
  };
}

function elapsedWindow(daysSinceLeave) {
  return ELAPSED_WINDOWS.find(({ min, max }) => daysSinceLeave >= min && daysSinceLeave <= max) ?? ELAPSED_WINDOWS.at(-1);
}

function activeSettlementId(settlementById, settlementId) {
  if (settlementId === null || settlementId === undefined) return null;
  const settlement = settlementById.get(settlementId);
  return settlement?.active ? settlement.id : null;
}

function isAdult(world, human) {
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

function isReproductiveFemale(world, human) {
  if (human.sex !== 'F') return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function chebyshevDistance(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
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

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
