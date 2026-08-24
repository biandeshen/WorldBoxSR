import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCoPresenceStabilityTracker } from '../engine/core/local_copresence_stability.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld(seed = 7501) {
  return createWorld({
    seed,
    width: 10,
    height: 10,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementCheckIntervalDays: 0
    }
  });
}

function addHuman(world, { x, y, settlementId = 1, ageYears = 25, sex = 'F' }) {
  return createHuman(world, { x, y, settlementId, ageYears, sex, hunger: 0.1 });
}

function near(human, x = 4, y = 4) {
  human.x = x;
  human.y = y;
}

function far(human) {
  human.x = 8;
  human.y = 8;
}

test('adjacent windows measure whole-set support, weighted overlap, retained mass, and settlement annotation', () => {
  const world = makeWorld();
  const focal = addHuman(world, { x: 4, y: 4, settlementId: 1 });
  const peerA = addHuman(world, { x: 4, y: 4, settlementId: 1, sex: 'M' });
  const peerB = addHuman(world, { x: 5, y: 4, settlementId: 1, sex: 'M' });
  const peerC = addHuman(world, { x: 8, y: 8, settlementId: 2, sex: 'M' });
  const tracker = createLocalCoPresenceStabilityTracker({
    windowDays: 2,
    topK: 2,
    focalHumanIds: [focal.id]
  });

  world.day = 0;
  tracker.observe(world); // A + B
  far(peerB);
  world.day = 1;
  tracker.observe(world); // A => window1 A:2, B:1

  near(peerB, 8, 8);
  near(peerC, 5, 4);
  world.day = 2;
  tracker.observe(world); // A + C
  far(peerA);
  world.day = 3;
  tracker.observe(world); // C => window2 A:1, C:2

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 2);
  assert.equal(summary.truncatedCompleteWindows, 0);
  assert.equal(summary.windows.peerDays.mean, 3);
  assert.equal(summary.windows.meanNearbyPeers.mean, 1.5);
  assert.equal(summary.windows.distinctPeers.mean, 2);
  assert.equal(summary.windows.daysWithPeersShare.mean, 1);
  assert.ok(Math.abs(summary.windows.coPresenceHhi.mean - (5 / 9)) < 1e-12);
  assert.ok(Math.abs(summary.windows.effectivePeerCount.mean - 1.8) < 1e-12);
  assert.ok(Math.abs(summary.windows.sameSettlementPeerDayShare.mean - (2 / 3)) < 1e-12);

  assert.equal(summary.adjacent.transitions, 1);
  assert.equal(summary.adjacent.bothOccupiedTransitions, 1);
  assert.ok(Math.abs(summary.adjacent.supportJaccard.mean - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(summary.adjacent.weightedJaccard.mean - (1 / 5)) < 1e-12);
  assert.ok(Math.abs(summary.adjacent.priorPeerMassRetained.mean - (2 / 3)) < 1e-12);
  assert.ok(Math.abs(summary.adjacent.currentPeerMassInherited.mean - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(summary.adjacent.topKPeerSetJaccard.mean - (1 / 3)) < 1e-12);
  assert.equal(summary.adjacent.inheritedCurrentMassSameSettlementShare.mean, 1);
  assert.equal(summary.adjacent.newCurrentMassSameSettlementShare.mean, 0);
});

test('three-window persistence measures set intersection and weighted persistent mass without a core threshold', () => {
  const world = makeWorld(7502);
  const focal = addHuman(world, { x: 4, y: 4 });
  const peerA = addHuman(world, { x: 4, y: 4, sex: 'M' });
  const peerB = addHuman(world, { x: 5, y: 4, sex: 'M' });
  const peerC = addHuman(world, { x: 8, y: 8, sex: 'M' });
  const peerD = addHuman(world, { x: 8, y: 8, sex: 'M' });
  const tracker = createLocalCoPresenceStabilityTracker({ windowDays: 1, focalHumanIds: [focal.id] });

  world.day = 0;
  tracker.observe(world); // A,B

  far(peerB);
  near(peerC, 5, 4);
  world.day = 1;
  tracker.observe(world); // A,C

  far(peerC);
  near(peerD, 5, 4);
  world.day = 2;
  tracker.observe(world); // A,D

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 3);
  assert.equal(summary.adjacent.transitions, 2);
  assert.ok(Math.abs(summary.adjacent.supportJaccard.mean - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(summary.adjacent.weightedJaccard.mean - (1 / 3)) < 1e-12);
  assert.equal(summary.adjacent.priorPeerMassRetained.mean, 0.5);
  assert.equal(summary.adjacent.currentPeerMassInherited.mean, 0.5);

  assert.equal(summary.threeWindow.comparisons, 1);
  assert.equal(summary.threeWindow.overlapComparisons, 1);
  assert.equal(summary.threeWindow.persistentPeerCount.mean, 1);
  assert.equal(summary.threeWindow.supportIntersectionOverUnion.mean, 0.25);
  assert.equal(summary.threeWindow.weightedMinOverMax.mean, 0.25);
  assert.equal(summary.threeWindow.currentMassFromPersistentPeers.mean, 0.5);
});

test('solo windows remain valid residential observations and transitions are reported separately', () => {
  const world = makeWorld(7503);
  const focal = addHuman(world, { x: 4, y: 4 });
  const peer = addHuman(world, { x: 8, y: 8, sex: 'M' });
  const tracker = createLocalCoPresenceStabilityTracker({ windowDays: 1, focalHumanIds: [focal.id] });

  world.day = 0;
  tracker.observe(world); // solo
  world.day = 1;
  tracker.observe(world); // solo
  near(peer);
  world.day = 2;
  tracker.observe(world); // occupied
  far(peer);
  world.day = 3;
  tracker.observe(world); // solo

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 4);
  assert.equal(summary.windows.soloWindows, 3);
  assert.equal(summary.windows.soloWindowShare, 0.75);
  assert.equal(summary.adjacent.transitions, 3);
  assert.equal(summary.adjacent.bothSoloTransitions, 1);
  assert.equal(summary.adjacent.soloToOccupiedTransitions, 1);
  assert.equal(summary.adjacent.occupiedToSoloTransitions, 1);
  assert.equal(summary.adjacent.bothOccupiedTransitions, 0);
  assert.equal(summary.adjacent.overlapComparisons, 2);
  assert.equal(summary.adjacent.supportJaccard.mean, 0);
  assert.equal(summary.adjacent.priorPeerMassRetained.mean, 0);
  assert.equal(summary.adjacent.currentPeerMassInherited.mean, 0);
});

test('cap-truncated windows are explicit, excluded from overlap, and break continuity', () => {
  const world = makeWorld(7504);
  const focal = addHuman(world, { x: 4, y: 4 });
  const peer1 = addHuman(world, { x: 4, y: 4, sex: 'M' });
  const peer2 = addHuman(world, { x: 5, y: 4, sex: 'M' });
  const peer3 = addHuman(world, { x: 4, y: 5, sex: 'M' });
  const tracker = createLocalCoPresenceStabilityTracker({
    windowDays: 1,
    maxPeersPerHuman: 2,
    focalHumanIds: [focal.id]
  });

  world.day = 0;
  tracker.observe(world); // 3 peers -> truncated

  far(peer2);
  far(peer3);
  world.day = 1;
  tracker.observe(world); // only peer1 -> valid

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 2);
  assert.equal(summary.truncatedCompleteWindows, 1);
  assert.equal(summary.untruncatedCompleteWindows, 1);
  assert.equal(summary.truncatedCompleteWindowShare, 0.5);
  assert.equal(summary.windows.distinctPeers.count, 1);
  assert.equal(summary.windows.distinctPeers.mean, 1);
  assert.equal(summary.adjacent.transitions, 0);
  assert.equal(summary.storage.peerRecordEvictions, 1);
  assert.equal(summary.storage.maxRetainedPeersForOneWindow, 2);
  assert.equal(summary.storage.windowPeerRecordsCreated, 4);
  assert.ok(peer1.id < peer2.id && peer2.id < peer3.id);
});

test('death finalizes a partial personal window without mutating world or RNG state', () => {
  const world = makeWorld(7505);
  const focal = addHuman(world, { x: 4, y: 4 });
  addHuman(world, { x: 4, y: 4, sex: 'M' });
  const tracker = createLocalCoPresenceStabilityTracker({ windowDays: 2, focalHumanIds: [focal.id] });

  world.day = 0;
  tracker.observe(world);
  focal.alive = false;
  world.day = 1;
  tracker.observe(world);

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 0);
  assert.equal(summary.discardedPartialWindows, 1);
  assert.deepEqual(summary.discardedPartialWindowDays, { count: 1, min: 1, mean: 1, max: 1 });
  assert.equal(summary.storage.humansFinalized, 1);

  const neutralWorld = createWorld({ seed: 7506, width: 16, height: 16, population: 24 });
  const neutralTracker = createLocalCoPresenceStabilityTracker();
  const before = snapshotWorld(neutralWorld);
  const rngBefore = neutralWorld.rng.snapshot();
  neutralTracker.observe(neutralWorld);
  neutralTracker.summarize(neutralWorld);
  assert.deepEqual(snapshotWorld(neutralWorld), before);
  assert.deepEqual(neutralWorld.rng.snapshot(), rngBefore);
});

test('local co-presence tracker validates caps, windows, top-k, and optional focal IDs', () => {
  assert.throws(() => createLocalCoPresenceStabilityTracker({ windowDays: 0 }), /windowDays must be a positive integer/);
  assert.throws(() => createLocalCoPresenceStabilityTracker({ maxPeersPerHuman: 0 }), /maxPeersPerHuman must be a positive integer/);
  assert.throws(() => createLocalCoPresenceStabilityTracker({ topK: 0 }), /topK must be a positive integer/);
  assert.throws(() => createLocalCoPresenceStabilityTracker({ focalHumanIds: 'bad' }), /array, Set, or null/);
  assert.throws(() => createLocalCoPresenceStabilityTracker({ focalHumanIds: [0] }), /positive integer IDs/);
});
