import { deriveSettlementDemography } from '../analysis/settlement_demography.js';

const DEFAULT_SAMPLE_INTERVAL_DAYS = 30;
const DEFAULT_MAX_COMPLETED_EPISODES = 4096;
const EPISODE_TYPES = Object.freeze([
  'zeroLocalReproductionOpportunity',
  'noBirthReplacement',
  'netMembershipOutflow',
  'naturalReplacementDeficit'
]);

/**
 * Derived-only settlement demographic flow tracker.
 *
 * Every observation reconciles settlement stock change from stable human-ID
 * transitions. The tracker retains only one state per living human, one compact
 * aggregate per historical settlement, and bounded completed episode rows.
 */
export function createSettlementDemographicViabilityTracker({
  sampleIntervalDays = DEFAULT_SAMPLE_INTERVAL_DAYS,
  maxCompletedEpisodes = DEFAULT_MAX_COMPLETED_EPISODES
} = {}) {
  const interval = positiveInteger(sampleIntervalDays, 'sampleIntervalDays');
  const completedCap = positiveInteger(maxCompletedEpisodes, 'maxCompletedEpisodes');
  const settlementStates = new Map();
  const completedEpisodes = [];
  let previousHumans = new Map();
  let initialized = false;
  let lastObservationDay = null;
  let observations = 0;
  let skippedObservations = 0;
  let completedEpisodeEvictions = 0;
  let maxHumanStates = 0;
  let maxSettlementStates = 0;
  let maxActiveEpisodes = 0;

  function observe(world) {
    validateObservationDay(world?.day, lastObservationDay);
    if (world.day === 0 || world.day % interval !== 0 || world.day === lastObservationDay) {
      skippedObservations += 1;
      return false;
    }

    const demographyRows = deriveSettlementDemography(world);
    const settlementById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
    const currentHumans = snapshotLivingHumans(world, settlementById);
    lastObservationDay = world.day;
    observations += 1;

    if (!initialized) {
      for (const row of demographyRows) initializeSettlementState(row, world.day);
      previousHumans = currentHumans;
      initialized = true;
      updateHighWater();
      return true;
    }

    const flows = deriveFlows(previousHumans, currentHumans);
    for (const row of demographyRows) {
      let state = settlementStates.get(row.settlementId);
      if (!state) {
        state = createSettlementState(row.settlementId, row.name, 0, world.day - interval);
        settlementStates.set(row.settlementId, state);
      }
      applyObservation(
        state,
        row,
        flows.get(row.settlementId) ?? emptyFlow(),
        settlementById.get(row.settlementId),
        world.day
      );
    }

    previousHumans = currentHumans;
    updateHighWater();
    return true;
  }

  function initializeSettlementState(row, day) {
    const state = createSettlementState(row.settlementId, row.name, row.population, day);
    state.active = row.active;
    state.lastDemography = compactDemography(row);
    if (row.active) recordDemographySample(state, row);
    settlementStates.set(row.settlementId, state);
  }

  function applyObservation(state, row, flow, settlement, day) {
    // Historical abandoned settlements remain in world.settlements. Their first
    // inactive observation closes/reconciles the final interval; later samples
    // must not dilute active-condition denominators with years of empty ruins.
    if (state.abandoned && !row.active) {
      state.lastObservedDay = day;
      state.lastDemography = compactDemography(row);
      return;
    }

    const priorDemography = state.lastDemography;
    const previousPopulation = state.lastPopulation;
    const observedPopulationDelta = row.population - previousPopulation;
    const reconciledPopulationDelta = stockDelta(flow);
    const reconciliationError = observedPopulationDelta - reconciledPopulationDelta;

    state.active = row.active;
    state.lastObservedDay = day;
    state.lastPopulation = row.population;
    state.finalPopulation = row.population;
    state.intervalsObserved += 1;
    addFlow(state.flowTotals, flow);
    state.observedPopulationDelta += observedPopulationDelta;
    state.reconciledPopulationDelta += reconciledPopulationDelta;
    if (reconciliationError !== 0) {
      state.reconciliationErrorCount += 1;
      state.maxAbsoluteReconciliationError = Math.max(
        state.maxAbsoluteReconciliationError,
        Math.abs(reconciliationError)
      );
    }

    if (row.active) {
      state.activeIntervalsObserved += 1;
      recordDemographySample(state, row);
    }

    const nonDeathInflow = flow.entrantsFromNone + flow.switchesIn;
    const nonDeathOutflow = flow.exitsToNone + flow.switchesOut;
    const episodeConditions = {
      zeroLocalReproductionOpportunity: row.active &&
        row.eligibleFemales > 0 &&
        row.eligibleFemalesWithLocalMaleOpportunity === 0,
      // Birth production in this interval belongs to mothers' settlement
      // assignment at the prior sample, so the capacity/context test also uses
      // the prior sample rather than the post-interval stock.
      noBirthReplacement: row.active &&
        priorDemography?.active === true &&
        priorDemography.reproductiveAgeFemales > 0 &&
        flow.birthsProducedByPriorMembers === 0,
      netMembershipOutflow: row.active && nonDeathOutflow > nonDeathInflow,
      naturalReplacementDeficit: row.active && flow.deaths > flow.birthsProducedByPriorMembers
    };

    if (episodeConditions.zeroLocalReproductionOpportunity) state.conditionSamples.zeroLocalReproductionOpportunity += 1;
    if (episodeConditions.noBirthReplacement) state.conditionSamples.noBirthReplacement += 1;
    if (episodeConditions.netMembershipOutflow) state.conditionSamples.netMembershipOutflow += 1;
    if (episodeConditions.naturalReplacementDeficit) state.conditionSamples.naturalReplacementDeficit += 1;

    for (const type of EPISODE_TYPES) {
      updateEpisode(state, type, episodeConditions[type], row, flow, day);
    }

    state.lastDemography = compactDemography(row);

    if (!row.active && !state.abandoned) {
      state.abandoned = true;
      state.abandonedDay = settlement?.abandonedDay ?? day;
      state.finalPopulation = 0;
      closeEpisodesAtAbandonment(state);
      markRetainedEpisodesAsLaterAbandoned(state.settlementId);
    }
  }

  function deriveFlows(previous, current) {
    const bySettlement = new Map();
    const get = (settlementId) => {
      if (settlementId === null) return null;
      let flow = bySettlement.get(settlementId);
      if (!flow) {
        flow = emptyFlow();
        bySettlement.set(settlementId, flow);
      }
      return flow;
    };

    for (const [humanId, before] of previous) {
      const after = current.get(humanId);
      if (!after) {
        const flow = get(before.settlementId);
        if (flow) flow.deaths += 1;
        continue;
      }
      if (before.settlementId === after.settlementId) continue;

      if (before.settlementId === null && after.settlementId !== null) {
        get(after.settlementId).entrantsFromNone += 1;
      } else if (before.settlementId !== null && after.settlementId === null) {
        get(before.settlementId).exitsToNone += 1;
      } else if (before.settlementId !== null && after.settlementId !== null) {
        get(before.settlementId).switchesOut += 1;
        get(after.settlementId).switchesIn += 1;
      }
    }

    for (const [humanId, after] of current) {
      if (previous.has(humanId)) continue;
      if (after.settlementId !== null) {
        if (after.parentIds.length >= 2) get(after.settlementId).newbornAdditions += 1;
        else get(after.settlementId).externalSpawnAdditions += 1;
      }

      if (after.parentIds.length >= 2) {
        const priorMother = previous.get(after.parentIds[0]);
        if (priorMother?.settlementId !== null && priorMother?.settlementId !== undefined) {
          get(priorMother.settlementId).birthsProducedByPriorMembers += 1;
        }
      }
    }

    return bySettlement;
  }

  function updateEpisode(state, type, condition, row, flow, day) {
    const active = state.activeEpisodes[type];
    if (!condition) {
      if (active) {
        retainCompletedEpisode(state, finalizeEpisode(active, false));
        state.activeEpisodes[type] = null;
      }
      return;
    }

    if (!active) {
      state.activeEpisodes[type] = createEpisode(type, state.settlementId, row, flow, day);
      return;
    }

    active.lastObservedDay = day;
    active.samplesObserved += 1;
    active.populationEnd = row.population;
    active.birthsProduced += flow.birthsProducedByPriorMembers;
    active.deaths += flow.deaths;
    active.nonDeathInflow += flow.entrantsFromNone + flow.switchesIn;
    active.nonDeathOutflow += flow.exitsToNone + flow.switchesOut;
    active.newbornAdditions += flow.newbornAdditions;
    updateEpisodeDemography(active, row);
  }

  function closeEpisodesAtAbandonment(state) {
    for (const type of EPISODE_TYPES) {
      const active = state.activeEpisodes[type];
      if (!active) continue;
      retainCompletedEpisode(state, finalizeEpisode(active, true));
      state.activeEpisodes[type] = null;
    }
  }

  function markRetainedEpisodesAsLaterAbandoned(settlementId) {
    for (const episode of completedEpisodes) {
      if (episode.settlementId === settlementId) episode.settlementAbandonedLater = true;
    }
  }

  function retainCompletedEpisode(state, episode) {
    state.completedEpisodeCounts[episode.type] += 1;
    completedEpisodes.push(episode);
    while (completedEpisodes.length > completedCap) {
      completedEpisodes.shift();
      completedEpisodeEvictions += 1;
    }
  }

  function recordDemographySample(state, row) {
    state.activeSamples += 1;
    if (row.eligibleFemales > 0) state.samplesWithEligibleFemales += 1;
    state.demographySums.population += row.population;
    state.demographySums.minors += row.minors;
    state.demographySums.adults += row.adults;
    state.demographySums.reproductiveAgeFemales += row.reproductiveAgeFemales;
    state.demographySums.adultMales += row.adultMales;
    state.demographySums.eligibleFemales += row.eligibleFemales;
    state.demographySums.eligibleMales += row.eligibleMales;
    state.demographySums.eligibleFemalesWithLocalMaleOpportunity += row.eligibleFemalesWithLocalMaleOpportunity;
    if (row.localReproductionOpportunityCoverage !== null) {
      state.opportunityCoverageSamples += 1;
      state.opportunityCoverageSum += row.localReproductionOpportunityCoverage;
      state.minOpportunityCoverage = state.minOpportunityCoverage === null
        ? row.localReproductionOpportunityCoverage
        : Math.min(state.minOpportunityCoverage, row.localReproductionOpportunityCoverage);
    }
    state.minPopulation = state.minPopulation === null ? row.population : Math.min(state.minPopulation, row.population);
    state.maxPopulation = state.maxPopulation === null ? row.population : Math.max(state.maxPopulation, row.population);
  }

  function summarize(world = null) {
    const settlements = [...settlementStates.values()]
      .sort((a, b) => a.settlementId - b.settlementId)
      .map(summarizeSettlementState);
    const activeEpisodes = [];
    for (const state of settlementStates.values()) {
      for (const type of EPISODE_TYPES) {
        if (state.activeEpisodes[type]) activeEpisodes.push(materializeActiveEpisode(state.activeEpisodes[type]));
      }
    }

    const episodeTypes = {};
    for (const type of EPISODE_TYPES) {
      const retained = completedEpisodes.filter((episode) => episode.type === type);
      episodeTypes[type] = {
        completedEpisodes: settlements.reduce((sum, row) => sum + row.episodeCounts[type], 0),
        activeEpisodes: activeEpisodes.filter((episode) => episode.type === type).length,
        completedBeforeSettlementAbandonment: settlements
          .filter((row) => row.abandoned)
          .reduce((sum, row) => sum + row.episodeCounts[type], 0),
        retainedCompletedRows: retained.length,
        observedDurationDays: stats(retained.map((episode) => episode.observedDurationDays)),
        populationDelta: stats(retained.map((episode) => episode.populationDelta)),
        birthsProduced: stats(retained.map((episode) => episode.birthsProduced)),
        deaths: stats(retained.map((episode) => episode.deaths)),
        nonDeathNetFlow: stats(retained.map((episode) => episode.nonDeathInflow - episode.nonDeathOutflow))
      };
    }

    return {
      sampleIntervalDays: interval,
      observations,
      skippedObservations,
      lastObservationDay,
      settlements,
      episodeTypes,
      retainedCompletedEpisodes: completedEpisodes.map((episode) => ({ ...episode })),
      activeEpisodes,
      reconciliation: {
        errorIntervals: settlements.reduce((sum, row) => sum + row.reconciliationErrorCount, 0),
        maxAbsoluteError: settlements.reduce(
          (max, row) => Math.max(max, row.maxAbsoluteReconciliationError),
          0
        )
      },
      storage: {
        currentHumanStates: previousHumans.size,
        settlementStates: settlementStates.size,
        maxHumanStates,
        maxSettlementStates,
        maxCompletedEpisodes: completedCap,
        retainedCompletedEpisodes: completedEpisodes.length,
        completedEpisodeEvictions,
        maxActiveEpisodes
      },
      worldDay: world?.day ?? lastObservationDay
    };
  }

  function updateHighWater() {
    maxHumanStates = Math.max(maxHumanStates, previousHumans.size);
    maxSettlementStates = Math.max(maxSettlementStates, settlementStates.size);
    let active = 0;
    for (const state of settlementStates.values()) {
      for (const type of EPISODE_TYPES) if (state.activeEpisodes[type]) active += 1;
    }
    maxActiveEpisodes = Math.max(maxActiveEpisodes, active);
  }

  return { observe, summarize };
}

function snapshotLivingHumans(world, settlementById) {
  const result = new Map();
  for (const human of world.entities) {
    if (human.kind !== 'human' || !human.alive) continue;
    const settlement = human.settlementId === null ? null : settlementById.get(human.settlementId);
    const settlementId = settlement?.active ? settlement.id : null;
    result.set(human.id, {
      settlementId,
      parentIds: [...(human.parentIds ?? [])]
    });
  }
  return result;
}

function createSettlementState(settlementId, name, population, day) {
  return {
    settlementId,
    name,
    active: false,
    firstObservedDay: day,
    lastObservedDay: day,
    lastPopulation: population,
    finalPopulation: population,
    minPopulation: null,
    maxPopulation: null,
    intervalsObserved: 0,
    activeIntervalsObserved: 0,
    activeSamples: 0,
    samplesWithEligibleFemales: 0,
    opportunityCoverageSamples: 0,
    opportunityCoverageSum: 0,
    minOpportunityCoverage: null,
    abandoned: false,
    abandonedDay: null,
    observedPopulationDelta: 0,
    reconciledPopulationDelta: 0,
    reconciliationErrorCount: 0,
    maxAbsoluteReconciliationError: 0,
    flowTotals: emptyFlow(),
    demographySums: {
      population: 0,
      minors: 0,
      adults: 0,
      reproductiveAgeFemales: 0,
      adultMales: 0,
      eligibleFemales: 0,
      eligibleMales: 0,
      eligibleFemalesWithLocalMaleOpportunity: 0
    },
    conditionSamples: Object.fromEntries(EPISODE_TYPES.map((type) => [type, 0])),
    completedEpisodeCounts: Object.fromEntries(EPISODE_TYPES.map((type) => [type, 0])),
    activeEpisodes: Object.fromEntries(EPISODE_TYPES.map((type) => [type, null])),
    lastDemography: null
  };
}

function emptyFlow() {
  return {
    newbornAdditions: 0,
    externalSpawnAdditions: 0,
    entrantsFromNone: 0,
    switchesIn: 0,
    deaths: 0,
    exitsToNone: 0,
    switchesOut: 0,
    birthsProducedByPriorMembers: 0
  };
}

function addFlow(target, source) {
  for (const key of Object.keys(target)) target[key] += source[key];
}

function stockDelta(flow) {
  return flow.newbornAdditions +
    flow.externalSpawnAdditions +
    flow.entrantsFromNone +
    flow.switchesIn -
    flow.deaths -
    flow.exitsToNone -
    flow.switchesOut;
}

function createEpisode(type, settlementId, row, flow, day) {
  return {
    type,
    settlementId,
    startDay: day,
    lastObservedDay: day,
    samplesObserved: 1,
    populationStart: row.population,
    populationEnd: row.population,
    birthsProduced: flow.birthsProducedByPriorMembers,
    deaths: flow.deaths,
    nonDeathInflow: flow.entrantsFromNone + flow.switchesIn,
    nonDeathOutflow: flow.exitsToNone + flow.switchesOut,
    newbornAdditions: flow.newbornAdditions,
    minOpportunityCoverage: row.localReproductionOpportunityCoverage,
    minEligibleFemales: row.eligibleFemales,
    minEligibleMales: row.eligibleMales
  };
}

function updateEpisodeDemography(episode, row) {
  if (row.localReproductionOpportunityCoverage !== null) {
    episode.minOpportunityCoverage = episode.minOpportunityCoverage === null
      ? row.localReproductionOpportunityCoverage
      : Math.min(episode.minOpportunityCoverage, row.localReproductionOpportunityCoverage);
  }
  episode.minEligibleFemales = Math.min(episode.minEligibleFemales, row.eligibleFemales);
  episode.minEligibleMales = Math.min(episode.minEligibleMales, row.eligibleMales);
}

function finalizeEpisode(episode, abandoned) {
  return {
    ...episode,
    endDay: episode.lastObservedDay,
    observedDurationDays: episode.lastObservedDay - episode.startDay,
    populationDelta: episode.populationEnd - episode.populationStart,
    settlementAbandonedLater: abandoned
  };
}

function materializeActiveEpisode(episode) {
  return {
    ...episode,
    endDay: null,
    observedDurationDays: episode.lastObservedDay - episode.startDay,
    populationDelta: episode.populationEnd - episode.populationStart,
    settlementAbandonedLater: false
  };
}

function compactDemography(row) {
  return {
    active: row.active,
    population: row.population,
    minors: row.minors,
    adults: row.adults,
    reproductiveAgeFemales: row.reproductiveAgeFemales,
    adultMales: row.adultMales,
    eligibleFemales: row.eligibleFemales,
    eligibleMales: row.eligibleMales,
    eligibleFemalesWithLocalMaleOpportunity: row.eligibleFemalesWithLocalMaleOpportunity,
    eligibleFemalesWithoutLocalMaleOpportunity: row.eligibleFemalesWithoutLocalMaleOpportunity,
    localReproductionOpportunityCoverage: row.localReproductionOpportunityCoverage,
    meanAgeYears: row.meanAgeYears,
    medianAgeYears: row.medianAgeYears,
    ageBuckets: { ...row.ageBuckets }
  };
}

function summarizeSettlementState(state) {
  const activeSamples = state.activeSamples;
  return {
    settlementId: state.settlementId,
    name: state.name,
    active: state.active,
    firstObservedDay: state.firstObservedDay,
    lastObservedDay: state.lastObservedDay,
    intervalsObserved: state.intervalsObserved,
    activeIntervalsObserved: state.activeIntervalsObserved,
    activeSamples,
    finalPopulation: state.finalPopulation,
    minPopulation: state.minPopulation,
    maxPopulation: state.maxPopulation,
    abandoned: state.abandoned,
    abandonedDay: state.abandonedDay,
    flowTotals: { ...state.flowTotals },
    observedPopulationDelta: state.observedPopulationDelta,
    reconciledPopulationDelta: state.reconciledPopulationDelta,
    reconciliationErrorCount: state.reconciliationErrorCount,
    maxAbsoluteReconciliationError: state.maxAbsoluteReconciliationError,
    conditionSamples: { ...state.conditionSamples },
    conditionShares: Object.fromEntries(
      EPISODE_TYPES.map((type) => [type, ratio(state.conditionSamples[type], state.activeIntervalsObserved)])
    ),
    episodeCounts: { ...state.completedEpisodeCounts },
    averageDemography: {
      population: ratio(state.demographySums.population, activeSamples),
      minors: ratio(state.demographySums.minors, activeSamples),
      adults: ratio(state.demographySums.adults, activeSamples),
      reproductiveAgeFemales: ratio(state.demographySums.reproductiveAgeFemales, activeSamples),
      adultMales: ratio(state.demographySums.adultMales, activeSamples),
      eligibleFemales: ratio(state.demographySums.eligibleFemales, activeSamples),
      eligibleMales: ratio(state.demographySums.eligibleMales, activeSamples),
      eligibleFemalesWithLocalMaleOpportunity: ratio(
        state.demographySums.eligibleFemalesWithLocalMaleOpportunity,
        activeSamples
      )
    },
    samplesWithEligibleFemales: state.samplesWithEligibleFemales,
    meanOpportunityCoverageWhenDefined: state.opportunityCoverageSamples > 0
      ? state.opportunityCoverageSum / state.opportunityCoverageSamples
      : null,
    minOpportunityCoverage: state.minOpportunityCoverage,
    lastDemography: state.lastDemography
      ? { ...state.lastDemography, ageBuckets: { ...state.lastDemography.ageBuckets } }
      : null
  };
}

function validateObservationDay(day, lastObservationDay) {
  if (!Number.isInteger(day) || day < 0) throw new RangeError('world.day must be a non-negative integer');
  if (lastObservationDay !== null && day < lastObservationDay) {
    throw new RangeError('settlement demographic observations must be monotonic in world.day');
  }
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function stats(values) {
  if (values.length === 0) return { count: 0, min: null, max: null, mean: null, median: null };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    count: values.length,
    min: sorted[0],
    max: sorted.at(-1),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median
  };
}
