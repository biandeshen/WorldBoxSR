import { deriveSettlementScarcity } from '../analysis/settlement_scarcity.js';

const DEFAULT_SAMPLE_INTERVAL_DAYS = 30;
const DEFAULT_MAX_COMPLETED_EPISODES = 4096;
const EPISODE_TYPES = Object.freeze([
  'territorialShortage',
  'localBlockage',
  'accessMismatch'
]);

/**
 * Bounded, derived-only tracker for settlement scarcity episodes.
 *
 * The tracker lives entirely outside authoritative world state. It samples the
 * pure scarcity snapshot at a fixed cadence and retains only per-settlement
 * aggregates plus a bounded set of completed episode rows.
 */
export function createSettlementScarcityEpisodeTracker({
  sampleIntervalDays = DEFAULT_SAMPLE_INTERVAL_DAYS,
  maxCompletedEpisodes = DEFAULT_MAX_COMPLETED_EPISODES
} = {}) {
  const interval = positiveInteger(sampleIntervalDays, 'sampleIntervalDays');
  const completedCap = positiveInteger(maxCompletedEpisodes, 'maxCompletedEpisodes');
  const states = new Map();
  const completedEpisodes = [];

  let observations = 0;
  let skippedObservations = 0;
  let lastObservationDay = null;
  let completedEpisodeEvictions = 0;
  let maxSettlementStates = 0;
  let maxActiveEpisodes = 0;

  function observe(world) {
    if (!Number.isInteger(world?.day) || world.day < 0) {
      throw new RangeError('world.day must be a non-negative integer');
    }
    if (lastObservationDay !== null && world.day < lastObservationDay) {
      throw new RangeError('settlement scarcity observations must be monotonic in world.day');
    }
    if (world.day === 0 || world.day % interval !== 0 || world.day === lastObservationDay) {
      skippedObservations += 1;
      return false;
    }

    const rows = deriveSettlementScarcity(world);
    const settlementsById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
    lastObservationDay = world.day;
    observations += 1;

    for (const row of rows) {
      let state = states.get(row.settlementId);
      if (!state) {
        state = createSettlementState(row.settlementId);
        states.set(row.settlementId, state);
      }

      const settlement = settlementsById.get(row.settlementId);
      state.lastObservedDay = world.day;
      state.finalPopulation = row.population;

      if (!row.active) {
        markAbandoned(state, settlement?.abandonedDay ?? world.day);
        continue;
      }

      state.everActive = true;
      state.samplesObserved += 1;
      state.finalPopulation = row.population;
      addMinimum(state.minTerritorialMealCoveragePerMember, row.territorialMealCoveragePerMember);
      addMaximum(state.maxBlockedHungryShare, row.blockedHungryShare);

      const conditions = {
        territorialShortage: row.oneMealTerritorialShortage,
        localBlockage: row.localMealPathBlocked,
        accessMismatch: row.accessMismatch
      };

      if (conditions.territorialShortage) state.sampleCounts.territorialShortage += 1;
      if (conditions.localBlockage) state.sampleCounts.localBlockage += 1;
      if (conditions.accessMismatch) state.sampleCounts.accessMismatch += 1;

      for (const type of EPISODE_TYPES) updateEpisode(state, type, conditions[type], row, world.day);
    }

    maxSettlementStates = Math.max(maxSettlementStates, states.size);
    maxActiveEpisodes = Math.max(maxActiveEpisodes, countActiveEpisodes());
    return true;
  }

  function updateEpisode(state, type, condition, row, day) {
    let episode = state.activeEpisodes[type];

    if (!condition) {
      if (episode) {
        retainCompletedEpisode(state, finalizeEpisode(episode, false));
        state.activeEpisodes[type] = null;
      }
      return;
    }

    if (!episode) {
      episode = createEpisode(type, row, day);
      state.activeEpisodes[type] = episode;
      return;
    }

    episode.lastObservedDay = day;
    episode.samplesObserved += 1;
    episode.populationEnd = row.population;
    updateEpisodeExtremes(episode, row);
  }

  function markAbandoned(state, abandonedDay) {
    if (state.abandoned) return;
    state.abandoned = true;
    state.abandonedDay = abandonedDay;
    state.finalPopulation = 0;

    for (const type of EPISODE_TYPES) {
      const active = state.activeEpisodes[type];
      if (active) {
        retainCompletedEpisode(state, finalizeEpisode(active, true));
        state.activeEpisodes[type] = null;
      }
    }

    for (const episode of completedEpisodes) {
      if (episode.settlementId === state.settlementId) episode.settlementAbandonedLater = true;
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

  function countActiveEpisodes() {
    let count = 0;
    for (const state of states.values()) {
      for (const type of EPISODE_TYPES) if (state.activeEpisodes[type]) count += 1;
    }
    return count;
  }

  function summarize(world = null) {
    const settlementRows = [...states.values()]
      .filter((state) => state.everActive)
      .sort((a, b) => a.settlementId - b.settlementId)
      .map(summarizeSettlementState);
    const activeEpisodes = [];
    for (const state of states.values()) {
      for (const type of EPISODE_TYPES) {
        const episode = state.activeEpisodes[type];
        if (episode) activeEpisodes.push(materializeActiveEpisode(episode));
      }
    }

    const byType = {};
    for (const type of EPISODE_TYPES) {
      const retained = completedEpisodes.filter((episode) => episode.type === type);
      const active = activeEpisodes.filter((episode) => episode.type === type);
      const totalCompleted = settlementRows.reduce(
        (sum, settlement) => sum + settlement.episodeCounts[type],
        0
      );
      const completedBeforeAbandonment = settlementRows
        .filter((settlement) => settlement.abandoned)
        .reduce((sum, settlement) => sum + settlement.episodeCounts[type], 0);

      byType[type] = {
        completedEpisodes: totalCompleted,
        activeEpisodes: active.length,
        completedBeforeSettlementAbandonment: completedBeforeAbandonment,
        retainedCompletedRows: retained.length,
        observedDurationDays: stats(retained.map((episode) => episode.observedDurationDays)),
        populationDelta: stats(retained.map((episode) => episode.populationDelta)),
        minimumTerritorialMealCoveragePerMember: stats(
          retained
            .map((episode) => episode.minTerritorialMealCoveragePerMember)
            .filter((value) => value !== null)
        ),
        maximumBlockedHungryShare: stats(
          retained
            .map((episode) => episode.maxBlockedHungryShare)
            .filter((value) => value !== null)
        )
      };
    }

    const activeSettlementSamples = settlementRows.reduce((sum, row) => sum + row.samplesObserved, 0);
    const territorialShortageSamples = settlementRows.reduce(
      (sum, row) => sum + row.sampleCounts.territorialShortage,
      0
    );
    const localBlockageSamples = settlementRows.reduce(
      (sum, row) => sum + row.sampleCounts.localBlockage,
      0
    );
    const accessMismatchSamples = settlementRows.reduce(
      (sum, row) => sum + row.sampleCounts.accessMismatch,
      0
    );

    return {
      sampleIntervalDays: interval,
      observations,
      skippedObservations,
      lastObservationDay,
      settlementStates: states.size,
      settlementsObserved: settlementRows.length,
      activeSettlementSamples,
      territorialShortageSamples,
      territorialShortageSampleShare: ratio(territorialShortageSamples, activeSettlementSamples),
      localBlockageSamples,
      localBlockageSampleShare: ratio(localBlockageSamples, activeSettlementSamples),
      accessMismatchSamples,
      accessMismatchSampleShare: ratio(accessMismatchSamples, activeSettlementSamples),
      accessMismatchShareOfLocalBlockageSamples: ratio(accessMismatchSamples, localBlockageSamples),
      episodeTypes: byType,
      settlements: settlementRows,
      retainedCompletedEpisodes: completedEpisodes.map((episode) => ({ ...episode })),
      activeEpisodes,
      storage: {
        maxCompletedEpisodes: completedCap,
        retainedCompletedEpisodes: completedEpisodes.length,
        completedEpisodeEvictions,
        maxSettlementStates,
        maxActiveEpisodes
      },
      worldDay: world?.day ?? lastObservationDay
    };
  }

  return { observe, summarize };
}

function createSettlementState(settlementId) {
  return {
    settlementId,
    everActive: false,
    samplesObserved: 0,
    lastObservedDay: null,
    finalPopulation: 0,
    abandoned: false,
    abandonedDay: null,
    sampleCounts: {
      territorialShortage: 0,
      localBlockage: 0,
      accessMismatch: 0
    },
    completedEpisodeCounts: {
      territorialShortage: 0,
      localBlockage: 0,
      accessMismatch: 0
    },
    activeEpisodes: {
      territorialShortage: null,
      localBlockage: null,
      accessMismatch: null
    },
    minTerritorialMealCoveragePerMember: { value: null },
    maxBlockedHungryShare: { value: null }
  };
}

function createEpisode(type, row, day) {
  return {
    type,
    settlementId: row.settlementId,
    startDay: day,
    lastObservedDay: day,
    samplesObserved: 1,
    populationStart: row.population,
    populationEnd: row.population,
    minTerritorialMealCoveragePerMember: row.territorialMealCoveragePerMember,
    maxBlockedHungryShare: row.blockedHungryShare
  };
}

function updateEpisodeExtremes(episode, row) {
  if (row.territorialMealCoveragePerMember !== null) {
    episode.minTerritorialMealCoveragePerMember = episode.minTerritorialMealCoveragePerMember === null
      ? row.territorialMealCoveragePerMember
      : Math.min(episode.minTerritorialMealCoveragePerMember, row.territorialMealCoveragePerMember);
  }
  if (row.blockedHungryShare !== null) {
    episode.maxBlockedHungryShare = episode.maxBlockedHungryShare === null
      ? row.blockedHungryShare
      : Math.max(episode.maxBlockedHungryShare, row.blockedHungryShare);
  }
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

function summarizeSettlementState(state) {
  return {
    settlementId: state.settlementId,
    samplesObserved: state.samplesObserved,
    finalPopulation: state.finalPopulation,
    abandoned: state.abandoned,
    abandonedDay: state.abandonedDay,
    sampleCounts: { ...state.sampleCounts },
    sampleShares: {
      territorialShortage: ratio(state.sampleCounts.territorialShortage, state.samplesObserved),
      localBlockage: ratio(state.sampleCounts.localBlockage, state.samplesObserved),
      accessMismatch: ratio(state.sampleCounts.accessMismatch, state.samplesObserved)
    },
    episodeCounts: { ...state.completedEpisodeCounts },
    minTerritorialMealCoveragePerMember: state.minTerritorialMealCoveragePerMember.value,
    maxBlockedHungryShare: state.maxBlockedHungryShare.value
  };
}

function addMinimum(box, value) {
  if (value === null) return;
  box.value = box.value === null ? value : Math.min(box.value, value);
}

function addMaximum(box, value) {
  if (value === null) return;
  box.value = box.value === null ? value : Math.max(box.value, value);
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
  const median = sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    count: values.length,
    min: sorted[0],
    max: sorted.at(-1),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median
  };
}
