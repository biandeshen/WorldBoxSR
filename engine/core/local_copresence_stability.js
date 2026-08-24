const DEFAULT_WINDOW_DAYS = 360;
const DEFAULT_MAX_PEERS_PER_HUMAN = 256;
const DEFAULT_TOP_K = 3;

/**
 * Derived-only tracker for local co-presence set stability.
 *
 * A focal human accumulates other living humans within Chebyshev radius 1 in
 * consecutive personal windows. No group identity is created: each window is
 * only a bounded map from peer ID -> co-presence-day count plus settlement
 * annotation. Complete, untruncated windows may be compared across time.
 */
export function createLocalCoPresenceStabilityTracker({
  windowDays = DEFAULT_WINDOW_DAYS,
  maxPeersPerHuman = DEFAULT_MAX_PEERS_PER_HUMAN,
  topK = DEFAULT_TOP_K,
  focalHumanIds = null
} = {}) {
  const normalizedWindowDays = positiveInteger(windowDays, 'windowDays');
  const peerCap = positiveInteger(maxPeersPerHuman, 'maxPeersPerHuman');
  const normalizedTopK = positiveInteger(topK, 'topK');
  const focalIdSet = normalizeOptionalIds(focalHumanIds);
  const states = new Map();
  const aggregate = createAggregate();

  let observations = 0;
  let windowPeerRecordsCreated = 0;
  let peerRecordEvictions = 0;
  let humansFinalized = 0;
  let maxCurrentHumanStates = 0;
  let maxCurrentWindowPeerRecords = 0;
  let maxRecentHistoryPeerRecords = 0;
  let maxTotalPeerRecords = 0;
  let maxRetainedPeersForOneWindow = 0;

  function observe(world) {
    observations += 1;
    const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
    const grid = buildHumanGrid(livingHumans);
    const focalHumans = livingHumans.filter((human) => focalIdSet === null || focalIdSet.has(human.id));
    const focalIds = new Set(focalHumans.map((human) => human.id));
    const windowsToFinalize = [];

    for (const [humanId, state] of states) {
      if (focalIds.has(humanId)) continue;
      finalizeDepartedHuman(state);
      states.delete(humanId);
      humansFinalized += 1;
    }

    for (const human of focalHumans) {
      let state = states.get(human.id);
      if (!state) {
        state = createHumanState(human.id, world.day);
        states.set(human.id, state);
        aggregate.focalHumansObserved += 1;
      }

      const current = state.currentWindow;
      current.daysObserved += 1;
      const peers = nearbyHumans(world, grid, human);
      if (peers.length > 0) {
        current.daysWithPeers += 1;
        current.peerDays += peers.length;
        for (const peer of peers) {
          let record = current.peers.get(peer.id);
          if (!record) {
            record = {
              peerId: peer.id,
              coPresenceDays: 0,
              sameSettlementDays: 0,
              lastCoPresenceDay: world.day
            };
            current.peers.set(peer.id, record);
            windowPeerRecordsCreated += 1;
          }
          record.coPresenceDays += 1;
          record.lastCoPresenceDay = world.day;
          if (sameSettlement(human, peer)) record.sameSettlementDays += 1;
        }
        enforcePeerCap(current);
      }

      if (current.daysObserved === normalizedWindowDays) windowsToFinalize.push(state);
    }

    // Sample completed current-window maps before they are reset, then sample
    // again after finalization so history-only high-water is also exact.
    updateStorageHighWater();
    for (const state of windowsToFinalize) finalizeCompleteWindow(state);
    if (windowsToFinalize.length > 0) updateStorageHighWater();
  }

  function enforcePeerCap(window) {
    while (window.peers.size > peerCap) {
      let victimId = null;
      let victim = null;
      for (const [peerId, record] of window.peers) {
        if (!victim || weakerPeer(record, peerId, victim, victimId)) {
          victimId = peerId;
          victim = record;
        }
      }
      window.peers.delete(victimId);
      window.truncated = true;
      window.evictedRecords += 1;
      peerRecordEvictions += 1;
    }
  }

  function finalizeCompleteWindow(state) {
    const record = summarizeWindow(state.currentWindow, normalizedWindowDays, normalizedTopK);
    aggregate.completeWindows += 1;

    if (record.truncated) {
      aggregate.truncatedCompleteWindows += 1;
      state.recentValidWindows = [];
    } else {
      aggregate.untruncatedCompleteWindows += 1;
      addWindowMetrics(aggregate.windows, record);
      processValidWindow(state, record);
    }

    state.currentWindow = createWindow(state.currentWindow.startDay + normalizedWindowDays);
  }

  function processValidWindow(state, record) {
    const previous = state.recentValidWindows.at(-1) ?? null;
    if (previous) processAdjacent(previous, record);

    const three = [...state.recentValidWindows, record].slice(-3);
    if (three.length === 3) processThreeWindows(three);

    // Adjacent + 3-window metrics require at most two prior complete maps.
    state.recentValidWindows.push(record);
    if (state.recentValidWindows.length > 2) state.recentValidWindows.shift();
  }

  function processAdjacent(previous, current) {
    aggregate.adjacent.transitions += 1;
    const previousEmpty = previous.peerDays === 0;
    const currentEmpty = current.peerDays === 0;

    if (previousEmpty && currentEmpty) aggregate.adjacent.bothSolo += 1;
    else if (previousEmpty) aggregate.adjacent.soloToOccupied += 1;
    else if (currentEmpty) aggregate.adjacent.occupiedToSolo += 1;
    else aggregate.adjacent.bothOccupied += 1;

    const comparison = comparePeerMaps(previous.peerCounts, current.peerCounts);
    if (comparison.supportUnion > 0) {
      aggregate.adjacent.overlapComparisons += 1;
      addStat(aggregate.adjacent.supportJaccard, comparison.supportJaccard);
      addStat(aggregate.adjacent.weightedJaccard, comparison.weightedJaccard);
    }
    if (previous.peerDays > 0) addStat(aggregate.adjacent.priorMassRetained, comparison.priorMassRetained);
    if (current.peerDays > 0) addStat(aggregate.adjacent.currentMassInherited, comparison.currentMassInherited);

    const topJaccard = setJaccard(previous.topPeerIds, current.topPeerIds);
    if (topJaccard !== null) addStat(aggregate.adjacent.topKJaccard, topJaccard);

    const inheritedSettlement = currentSettlementShareForPeerIds(current, comparison.intersectionIds);
    if (inheritedSettlement !== null) addStat(aggregate.adjacent.inheritedCurrentMassSameSettlementShare, inheritedSettlement);
    const newIds = new Set([...current.peerCounts.keys()].filter((peerId) => !previous.peerCounts.has(peerId)));
    const newSettlement = currentSettlementShareForPeerIds(current, newIds);
    if (newSettlement !== null) addStat(aggregate.adjacent.newCurrentMassSameSettlementShare, newSettlement);
  }

  function processThreeWindows(records) {
    aggregate.threeWindow.comparisons += 1;
    const comparison = compareThreePeerMaps(records.map((record) => record.peerCounts));
    if (comparison.supportUnion > 0) {
      aggregate.threeWindow.overlapComparisons += 1;
      addStat(aggregate.threeWindow.supportIntersectionOverUnion, comparison.supportIntersectionOverUnion);
      addStat(aggregate.threeWindow.weightedMinOverMax, comparison.weightedMinOverMax);
    } else {
      aggregate.threeWindow.allSolo += 1;
    }
    if (records[2].peerDays > 0) {
      addStat(aggregate.threeWindow.currentMassFromPersistentPeers, comparison.currentMassFromPersistentPeers);
    }
    addStat(aggregate.threeWindow.persistentPeerCount, comparison.persistentPeerCount);
  }

  function finalizeDepartedHuman(state) {
    if (state.currentWindow.daysObserved > 0) {
      aggregate.discardedPartialWindows += 1;
      addStat(aggregate.discardedPartialWindowDays, state.currentWindow.daysObserved);
    }
  }

  function updateStorageHighWater() {
    let currentWindowRecords = 0;
    let recentHistoryRecords = 0;
    for (const state of states.values()) {
      currentWindowRecords += state.currentWindow.peers.size;
      maxRetainedPeersForOneWindow = Math.max(maxRetainedPeersForOneWindow, state.currentWindow.peers.size);
      for (const record of state.recentValidWindows) recentHistoryRecords += record.peerCounts.size;
    }
    maxCurrentHumanStates = Math.max(maxCurrentHumanStates, states.size);
    maxCurrentWindowPeerRecords = Math.max(maxCurrentWindowPeerRecords, currentWindowRecords);
    maxRecentHistoryPeerRecords = Math.max(maxRecentHistoryPeerRecords, recentHistoryRecords);
    maxTotalPeerRecords = Math.max(maxTotalPeerRecords, currentWindowRecords + recentHistoryRecords);
  }

  function summarize(world) {
    let currentWindowPeerRecords = 0;
    let recentHistoryPeerRecords = 0;
    let openPartialWindows = 0;
    const openPartialWindowDays = createStats();

    for (const state of states.values()) {
      currentWindowPeerRecords += state.currentWindow.peers.size;
      for (const record of state.recentValidWindows) recentHistoryPeerRecords += record.peerCounts.size;
      if (state.currentWindow.daysObserved > 0) {
        openPartialWindows += 1;
        addStat(openPartialWindowDays, state.currentWindow.daysObserved);
      }
    }

    return {
      observations,
      windowDays: normalizedWindowDays,
      topK: normalizedTopK,
      focalHumansObserved: aggregate.focalHumansObserved,
      completeWindows: aggregate.completeWindows,
      untruncatedCompleteWindows: aggregate.untruncatedCompleteWindows,
      truncatedCompleteWindows: aggregate.truncatedCompleteWindows,
      truncatedCompleteWindowShare: ratio(aggregate.truncatedCompleteWindows, aggregate.completeWindows),
      discardedPartialWindows: aggregate.discardedPartialWindows,
      discardedPartialWindowDays: summarizeStats(aggregate.discardedPartialWindowDays),
      openPartialWindows,
      openPartialWindowDays: summarizeStats(openPartialWindowDays),
      windows: summarizeWindowMetrics(aggregate.windows),
      adjacent: {
        transitions: aggregate.adjacent.transitions,
        overlapComparisons: aggregate.adjacent.overlapComparisons,
        supportJaccard: summarizeStats(aggregate.adjacent.supportJaccard),
        weightedJaccard: summarizeStats(aggregate.adjacent.weightedJaccard),
        priorPeerMassRetained: summarizeStats(aggregate.adjacent.priorMassRetained),
        currentPeerMassInherited: summarizeStats(aggregate.adjacent.currentMassInherited),
        topKPeerSetJaccard: summarizeStats(aggregate.adjacent.topKJaccard),
        bothSoloTransitions: aggregate.adjacent.bothSolo,
        soloToOccupiedTransitions: aggregate.adjacent.soloToOccupied,
        occupiedToSoloTransitions: aggregate.adjacent.occupiedToSolo,
        bothOccupiedTransitions: aggregate.adjacent.bothOccupied,
        inheritedCurrentMassSameSettlementShare: summarizeStats(aggregate.adjacent.inheritedCurrentMassSameSettlementShare),
        newCurrentMassSameSettlementShare: summarizeStats(aggregate.adjacent.newCurrentMassSameSettlementShare)
      },
      threeWindow: {
        comparisons: aggregate.threeWindow.comparisons,
        overlapComparisons: aggregate.threeWindow.overlapComparisons,
        allSolo: aggregate.threeWindow.allSolo,
        supportIntersectionOverUnion: summarizeStats(aggregate.threeWindow.supportIntersectionOverUnion),
        weightedMinOverMax: summarizeStats(aggregate.threeWindow.weightedMinOverMax),
        persistentPeerCount: summarizeStats(aggregate.threeWindow.persistentPeerCount),
        currentMassFromPersistentPeers: summarizeStats(aggregate.threeWindow.currentMassFromPersistentPeers)
      },
      storage: {
        maxPeersPerHumanWindow: peerCap,
        currentHumanStates: states.size,
        currentWindowPeerRecords,
        recentHistoryPeerRecords,
        maxCurrentHumanStates,
        maxCurrentWindowPeerRecords,
        maxRecentHistoryPeerRecords,
        maxTotalPeerRecords,
        maxRetainedPeersForOneWindow,
        windowPeerRecordsCreated,
        peerRecordEvictions,
        humansFinalized
      },
      worldDay: world?.day ?? null
    };
  }

  return { observe, summarize };
}

function createHumanState(humanId, startDay) {
  return {
    humanId,
    currentWindow: createWindow(startDay),
    recentValidWindows: []
  };
}

function createWindow(startDay) {
  return {
    startDay,
    daysObserved: 0,
    daysWithPeers: 0,
    peerDays: 0,
    peers: new Map(),
    truncated: false,
    evictedRecords: 0
  };
}

function summarizeWindow(window, windowDays, topK) {
  const peers = [...window.peers.values()].sort((a, b) =>
    b.coPresenceDays - a.coPresenceDays || a.peerId - b.peerId
  );
  const peerCounts = new Map(peers.map((record) => [record.peerId, record.coPresenceDays]));
  const sameSettlementCounts = new Map(peers.map((record) => [record.peerId, record.sameSettlementDays]));
  const hhiSquares = peers.reduce((sum, record) => sum + record.coPresenceDays * record.coPresenceDays, 0);
  const hhi = window.peerDays ? hhiSquares / (window.peerDays * window.peerDays) : 0;
  const sameSettlementDays = peers.reduce((sum, record) => sum + record.sameSettlementDays, 0);

  return {
    startDay: window.startDay,
    daysObserved: window.daysObserved,
    daysWithPeers: window.daysWithPeers,
    daysWithPeersShare: ratio(window.daysWithPeers, windowDays),
    peerDays: window.peerDays,
    meanNearbyPeers: ratio(window.peerDays, windowDays),
    distinctPeers: peers.length,
    hhi,
    effectivePeerCount: hhi ? 1 / hhi : 0,
    sameSettlementPeerDayShare: ratio(sameSettlementDays, window.peerDays),
    topPeerIds: peers.slice(0, topK).map((record) => record.peerId),
    peerCounts,
    sameSettlementCounts,
    truncated: window.truncated,
    evictedRecords: window.evictedRecords
  };
}

function createAggregate() {
  return {
    focalHumansObserved: 0,
    completeWindows: 0,
    untruncatedCompleteWindows: 0,
    truncatedCompleteWindows: 0,
    discardedPartialWindows: 0,
    discardedPartialWindowDays: createStats(),
    windows: createWindowMetrics(),
    adjacent: {
      transitions: 0,
      overlapComparisons: 0,
      supportJaccard: createStats(),
      weightedJaccard: createStats(),
      priorMassRetained: createStats(),
      currentMassInherited: createStats(),
      topKJaccard: createStats(),
      bothSolo: 0,
      soloToOccupied: 0,
      occupiedToSolo: 0,
      bothOccupied: 0,
      inheritedCurrentMassSameSettlementShare: createStats(),
      newCurrentMassSameSettlementShare: createStats()
    },
    threeWindow: {
      comparisons: 0,
      overlapComparisons: 0,
      allSolo: 0,
      supportIntersectionOverUnion: createStats(),
      weightedMinOverMax: createStats(),
      persistentPeerCount: createStats(),
      currentMassFromPersistentPeers: createStats()
    }
  };
}

function createWindowMetrics() {
  return {
    daysWithPeersShare: createStats(),
    peerDays: createStats(),
    meanNearbyPeers: createStats(),
    distinctPeers: createStats(),
    hhi: createStats(),
    effectivePeerCount: createStats(),
    sameSettlementPeerDayShare: createStats(),
    soloWindows: 0
  };
}

function addWindowMetrics(aggregate, record) {
  addStat(aggregate.daysWithPeersShare, record.daysWithPeersShare);
  addStat(aggregate.peerDays, record.peerDays);
  addStat(aggregate.meanNearbyPeers, record.meanNearbyPeers);
  addStat(aggregate.distinctPeers, record.distinctPeers);
  addStat(aggregate.hhi, record.hhi);
  addStat(aggregate.effectivePeerCount, record.effectivePeerCount);
  addStat(aggregate.sameSettlementPeerDayShare, record.sameSettlementPeerDayShare);
  if (record.peerDays === 0) aggregate.soloWindows += 1;
}

function summarizeWindowMetrics(aggregate) {
  return {
    daysWithPeersShare: summarizeStats(aggregate.daysWithPeersShare),
    peerDays: summarizeStats(aggregate.peerDays),
    meanNearbyPeers: summarizeStats(aggregate.meanNearbyPeers),
    distinctPeers: summarizeStats(aggregate.distinctPeers),
    coPresenceHhi: summarizeStats(aggregate.hhi),
    effectivePeerCount: summarizeStats(aggregate.effectivePeerCount),
    sameSettlementPeerDayShare: summarizeStats(aggregate.sameSettlementPeerDayShare),
    soloWindows: aggregate.soloWindows,
    soloWindowShare: ratio(aggregate.soloWindows, aggregate.distinctPeers.count)
  };
}

function comparePeerMaps(previous, current) {
  const allIds = new Set([...previous.keys(), ...current.keys()]);
  const intersectionIds = new Set();
  let weightedMin = 0;
  let weightedMax = 0;
  let previousMass = 0;
  let currentMass = 0;
  let previousRetainedMass = 0;
  let currentInheritedMass = 0;

  for (const peerId of allIds) {
    const prior = previous.get(peerId) ?? 0;
    const next = current.get(peerId) ?? 0;
    previousMass += prior;
    currentMass += next;
    weightedMin += Math.min(prior, next);
    weightedMax += Math.max(prior, next);
    if (prior > 0 && next > 0) {
      intersectionIds.add(peerId);
      previousRetainedMass += prior;
      currentInheritedMass += next;
    }
  }

  return {
    supportUnion: allIds.size,
    intersectionIds,
    supportJaccard: allIds.size ? intersectionIds.size / allIds.size : 0,
    weightedJaccard: weightedMax ? weightedMin / weightedMax : 0,
    priorMassRetained: ratio(previousRetainedMass, previousMass),
    currentMassInherited: ratio(currentInheritedMass, currentMass)
  };
}

function compareThreePeerMaps(maps) {
  const allIds = new Set(maps.flatMap((map) => [...map.keys()]));
  const persistentIds = new Set();
  let weightedMin = 0;
  let weightedMax = 0;
  let currentMass = 0;
  let currentPersistentMass = 0;

  for (const peerId of allIds) {
    const counts = maps.map((map) => map.get(peerId) ?? 0);
    weightedMin += Math.min(...counts);
    weightedMax += Math.max(...counts);
    currentMass += counts[2];
    if (counts.every((count) => count > 0)) {
      persistentIds.add(peerId);
      currentPersistentMass += counts[2];
    }
  }

  return {
    supportUnion: allIds.size,
    persistentPeerCount: persistentIds.size,
    supportIntersectionOverUnion: allIds.size ? persistentIds.size / allIds.size : 0,
    weightedMinOverMax: weightedMax ? weightedMin / weightedMax : 0,
    currentMassFromPersistentPeers: ratio(currentPersistentMass, currentMass)
  };
}

function currentSettlementShareForPeerIds(record, peerIds) {
  let peerDays = 0;
  let sameSettlementDays = 0;
  for (const peerId of peerIds) {
    peerDays += record.peerCounts.get(peerId) ?? 0;
    sameSettlementDays += record.sameSettlementCounts.get(peerId) ?? 0;
  }
  return peerDays ? sameSettlementDays / peerDays : null;
}

function setJaccard(first, second) {
  const a = new Set(first);
  const b = new Set(second);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return null;
  let intersection = 0;
  for (const id of a) if (b.has(id)) intersection += 1;
  return intersection / union.size;
}

function buildHumanGrid(humans) {
  const grid = new Map();
  for (const human of humans) {
    const key = `${human.x},${human.y}`;
    const group = grid.get(key);
    if (group) group.push(human);
    else grid.set(key, [human]);
  }
  return grid;
}

function nearbyHumans(world, grid, focal) {
  const peers = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = focal.x + dx;
      const y = focal.y + dy;
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      const group = grid.get(`${x},${y}`);
      if (!group) continue;
      for (const human of group) if (human.id !== focal.id) peers.push(human);
    }
  }
  return peers;
}

function sameSettlement(first, second) {
  return first.settlementId !== null && first.settlementId === second.settlementId;
}

function weakerPeer(candidate, candidateId, incumbent, incumbentId) {
  if (candidate.coPresenceDays !== incumbent.coPresenceDays) {
    return candidate.coPresenceDays < incumbent.coPresenceDays;
  }
  if (candidate.lastCoPresenceDay !== incumbent.lastCoPresenceDay) {
    return candidate.lastCoPresenceDay < incumbent.lastCoPresenceDay;
  }
  return candidateId > incumbentId;
}

function createStats() {
  return { count: 0, sum: 0, min: Infinity, max: -Infinity };
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

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function normalizeOptionalIds(ids) {
  if (ids === null || ids === undefined) return null;
  const values = ids instanceof Set ? [...ids] : ids;
  if (!Array.isArray(values)) throw new TypeError('focalHumanIds must be an array, Set, or null');
  const result = new Set();
  for (const id of values) {
    if (!Number.isInteger(id) || id < 1) throw new RangeError('focalHumanIds must contain positive integer IDs');
    result.add(id);
  }
  return result;
}
