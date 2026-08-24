import test from 'node:test';
import { createLocalCoPresenceStabilityTracker } from '../engine/core/local_copresence_stability.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

test('temporary seed98 local co-presence cap sensitivity', () => {
  const rows = [];
  for (const cap of [512, 1024]) {
    const world = createWorld({ seed: 98, width: 24, height: 24, population: 30 });
    const tracker = createLocalCoPresenceStabilityTracker({ maxPeersPerHuman: cap });
    const days = 100 * world.config.daysPerYear;
    for (let day = 0; day < days; day += 1) {
      tickWorld(world, 1);
      tracker.observe(world);
    }
    const s = tracker.summarize(world);
    rows.push({
      cap,
      completeWindows: s.completeWindows,
      truncatedWindows: s.truncatedCompleteWindows,
      truncatedShare: round(s.truncatedCompleteWindowShare),
      supportJaccardMean: round(s.adjacent.supportJaccard.mean),
      weightedJaccardMean: round(s.adjacent.weightedJaccard.mean),
      priorMassRetainedMean: round(s.adjacent.priorPeerMassRetained.mean),
      currentMassInheritedMean: round(s.adjacent.currentPeerMassInherited.mean),
      threeSupportIntersectionOverUnionMean: round(s.threeWindow.supportIntersectionOverUnion.mean),
      threeWeightedMinOverMaxMean: round(s.threeWindow.weightedMinOverMax.mean),
      currentMassFromPersistentPeersMean: round(s.threeWindow.currentMassFromPersistentPeers.mean),
      inheritedMassSameSettlementShareMean: round(s.adjacent.inheritedCurrentMassSameSettlementShare.mean),
      newMassSameSettlementShareMean: round(s.adjacent.newCurrentMassSameSettlementShare.mean),
      maxPeersForOneWindow: s.storage.maxRetainedPeersForOneWindow,
      peerRecordEvictions: s.storage.peerRecordEvictions,
      maxTotalPeerRecords: s.storage.maxTotalPeerRecords
    });
  }
  console.log(`LOCAL_COPRESENCE_CAP_SENSITIVITY ${JSON.stringify({ rows })}`);
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
