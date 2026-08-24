import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCoPresenceStabilityTracker } from '../engine/core/local_copresence_stability.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 6-seed 100-year local co-presence stability probe', () => {
  const rows = [];

  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createLocalCoPresenceStabilityTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tickWorld(world, 1);
      tracker.observe(world);
    }

    const s = tracker.summarize(world);
    const population = world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length;
    rows.push({
      seed,
      population,
      births: world.counters.births,
      deaths: world.counters.deaths,
      focalHumans: s.focalHumansObserved,
      completeWindows: s.completeWindows,
      truncatedWindows: s.truncatedCompleteWindows,
      truncatedShare: round(s.truncatedCompleteWindowShare),
      discardedPartialWindows: s.discardedPartialWindows,
      openPartialWindows: s.openPartialWindows,
      daysWithPeersShareMean: round(s.windows.daysWithPeersShare.mean),
      meanNearbyPeers: round(s.windows.meanNearbyPeers.mean),
      distinctPeersMean: round(s.windows.distinctPeers.mean),
      effectivePeerCountMean: round(s.windows.effectivePeerCount.mean),
      hhiMean: round(s.windows.coPresenceHhi.mean),
      sameSettlementPeerDayShareMean: round(s.windows.sameSettlementPeerDayShare.mean),
      soloWindowShare: round(s.windows.soloWindowShare),
      adjacentTransitions: s.adjacent.transitions,
      supportJaccardMean: round(s.adjacent.supportJaccard.mean),
      weightedJaccardMean: round(s.adjacent.weightedJaccard.mean),
      priorMassRetainedMean: round(s.adjacent.priorPeerMassRetained.mean),
      currentMassInheritedMean: round(s.adjacent.currentPeerMassInherited.mean),
      topKJaccardMean: round(s.adjacent.topKPeerSetJaccard.mean),
      bothSoloTransitions: s.adjacent.bothSoloTransitions,
      soloToOccupiedTransitions: s.adjacent.soloToOccupiedTransitions,
      occupiedToSoloTransitions: s.adjacent.occupiedToSoloTransitions,
      inheritedMassSameSettlementShareMean: round(s.adjacent.inheritedCurrentMassSameSettlementShare.mean),
      newMassSameSettlementShareMean: round(s.adjacent.newCurrentMassSameSettlementShare.mean),
      threeWindowComparisons: s.threeWindow.comparisons,
      threeSupportIntersectionOverUnionMean: round(s.threeWindow.supportIntersectionOverUnion.mean),
      threeWeightedMinOverMaxMean: round(s.threeWindow.weightedMinOverMax.mean),
      persistentPeerCountMean: round(s.threeWindow.persistentPeerCount.mean),
      currentMassFromPersistentPeersMean: round(s.threeWindow.currentMassFromPersistentPeers.mean),
      maxPeersForOneWindow: s.storage.maxRetainedPeersForOneWindow,
      peerRecordEvictions: s.storage.peerRecordEvictions,
      maxCurrentWindowPeerRecords: s.storage.maxCurrentWindowPeerRecords,
      maxRecentHistoryPeerRecords: s.storage.maxRecentHistoryPeerRecords,
      maxTotalPeerRecords: s.storage.maxTotalPeerRecords
    });
  }

  const seed45 = rows.find((row) => row.seed === 45);
  assert.deepEqual(
    { population: seed45.population, births: seed45.births, deaths: seed45.deaths },
    { population: 35, births: 44, deaths: 39 }
  );
  assert.equal(rows.length, seeds.length);
  assert.equal(new Set(rows.map((row) => row.seed)).size, seeds.length);

  console.log(`LOCAL_COPRESENCE_STABILITY_100Y ${JSON.stringify({ rows })}`);
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
