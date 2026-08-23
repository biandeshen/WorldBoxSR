import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormerHomeRecoveryTracker } from '../engine/core/former_home_recovery.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld() {
  const world = createWorld({
    seed: 5757,
    width: 14,
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
  addSettlement(world, 1, 2, 2);
  return world;
}

function addSettlement(world, id, x, y, active = true) {
  world.settlements.push({
    id,
    kind: 'settlement',
    name: `S${id}`,
    x,
    y,
    foundedDay: 0,
    active,
    emptyDays: 0,
    abandonedDay: active ? null : world.day,
    population: 0,
    memberIds: []
  });
  world.nextSettlementId = Math.max(world.nextSettlementId, id + 1);
  return world.settlements.at(-1);
}

function advance(world, tracker, human, changes = {}) {
  tickWorld(world, 1);
  Object.assign(human, changes);
  tracker.observe(world);
}

test('tracker measures a former-home recovery corridor through a natural same-settlement rejoin', () => {
  const world = makeWorld();
  const human = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createFormerHomeRecoveryTracker();
  tracker.observe(world);

  advance(world, tracker, human, { x: 6, y: 2, settlementId: null }); // distance 4, leave day
  advance(world, tracker, human, { x: 7, y: 2 }); // distance 5
  advance(world, tracker, human, { x: 9, y: 2 }); // distance 7
  advance(world, tracker, human, { x: 5, y: 2 }); // distance 3
  advance(world, tracker, human, { x: 4, y: 2, settlementId: 1 }); // same-home rejoin

  const summary = tracker.summarize(world);
  for (const view of [summary.adults, summary.reproductiveFemales]) {
    assert.equal(view.distanceDrivenLeavesTracked, 1);
    assert.equal(view.postLeaveUnsettledPersonDays, 4);
    assert.equal(view.withinFormerHomeRadiusShare[4], 0.5);
    assert.equal(view.withinFormerHomeRadiusShare[5], 0.75);
    assert.equal(view.withinFormerHomeRadiusShare[6], 0.75);
    assert.equal(view.exactlyDistance4Share, 0.25);
    assert.equal(view.nonHungryShare, 1);
    assert.deepEqual(view.distance, {
      count: 4,
      mean: 4.75,
      median: 4,
      p90: 7,
      max: 7
    });
    assert.equal(view.sameRejoins, 1);
    assert.equal(view.otherJoins, 0);
    assert.equal(view.sameRejoinShareOfResolvedJoins, 1);
    assert.equal(view.rejoinDurations.median, 4);
    assert.equal(view.meanCompletedEpisodeWithinRadius6Share, 0.75);
    assert.equal(view.elapsedWindows['0-30'].personDays, 4);
  }
});

test('other settlement joins and former-settlement abandonment resolve tracked leave episodes distinctly', () => {
  const world = makeWorld();
  addSettlement(world, 2, 10, 2);
  const first = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'M',
    ageYears: 30,
    hunger: 0.1,
    settlementId: 1
  });
  const second = createHuman(world, {
    x: 2,
    y: 3,
    sex: 'F',
    ageYears: 25,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createFormerHomeRecoveryTracker();
  tracker.observe(world);

  advance(world, tracker, first, { x: 6, y: 2, settlementId: null });
  second.x = 6;
  second.y = 3;
  second.settlementId = null;
  tracker.observe(world);

  advance(world, tracker, first, { x: 9, y: 2, settlementId: 2 });
  world.settlements[0].active = false;
  tracker.observe(world);

  const summary = tracker.summarize(world);
  assert.equal(summary.adults.otherJoins, 1);
  assert.equal(summary.adults.formerAbandonments, 1);
  assert.equal(summary.reproductiveFemales.formerAbandonments, 1);
  assert.equal(summary.reproductiveFemales.otherJoins, 0);
});

test('elapsed leave windows and long-tail accounting remain bounded and interpretable', () => {
  const world = makeWorld();
  const human = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createFormerHomeRecoveryTracker();
  tracker.observe(world);

  advance(world, tracker, human, { x: 6, y: 2, settlementId: null });
  for (let day = 0; day < 400; day += 1) {
    advance(world, tracker, human, { x: 9, y: 2 });
  }

  const female = tracker.summarize(world).reproductiveFemales;
  assert.ok(female.elapsedWindows['181-360'].personDays > 0);
  assert.ok(female.elapsedWindows['>360'].personDays > 0);
  assert.equal(female.longTailOver180Days.within6Share, 0);
  assert.equal(female.longTailOver180Days.meanDistance, 7);
});

test('former-home recovery observation is snapshot and RNG neutral', () => {
  const world = makeWorld();
  createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createFormerHomeRecoveryTracker();
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);

  assert.deepEqual(snapshotWorld(world), snapshotBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
