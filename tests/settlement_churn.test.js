import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlementChurnTracker } from '../engine/core/settlement_churn.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld() {
  return createWorld({
    seed: 5353,
    width: 10,
    height: 8,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementCheckIntervalDays: 0,
      settlementMembershipRadius: 3
    }
  });
}

function addSettlement(world, id, x, y) {
  world.settlements.push({
    id,
    kind: 'settlement',
    name: `S${id}`,
    x,
    y,
    foundedDay: 0,
    active: true,
    emptyDays: 0,
    abandonedDay: null,
    population: 0,
    memberIds: []
  });
  world.nextSettlementId = Math.max(world.nextSettlementId, id + 1);
  return world.settlements.at(-1);
}

test('tracker records first join, stale outside-radius membership, distance leave, and same rejoin', () => {
  const world = makeWorld();
  addSettlement(world, 1, 2, 2);
  const female = createHuman(world, {
    x: 7, y: 2, sex: 'F', ageYears: 24, hunger: 0.1, settlementId: null
  });
  const tracker = createSettlementChurnTracker();

  tracker.observe(world); // adult starts unsettled

  tickWorld(world, 1);
  female.x = 2;
  female.settlementId = 1;
  tracker.observe(world); // first adult join on day 1

  tickWorld(world, 1);
  female.x = 6; // distance 4 > membership radius, but ID remains stale until a membership update
  tracker.observe(world);

  tickWorld(world, 1);
  female.settlementId = null;
  tracker.observe(world); // distance-driven leave on day 3

  tickWorld(world, 3);
  female.x = 3;
  female.settlementId = 1;
  tracker.observe(world); // same-settlement rejoin on day 6

  const summary = tracker.summarize(world);
  for (const view of [summary.adults, summary.reproductiveFemales]) {
    assert.equal(view.joinEvents, 2);
    assert.equal(view.firstJoinEvents, 1);
    assert.equal(view.leaveEvents, 1);
    assert.equal(view.rejoinSameEvents, 1);
    assert.equal(view.rejoinOtherEvents, 0);
    assert.equal(view.distanceDrivenLeaves, 1);
    assert.equal(view.abandonmentLeaves, 0);
    assert.equal(view.outsideRadiusShareOfSettledDays, 1 / 3);
    assert.deepEqual(view.preLossDistance, {
      count: 1,
      mean: 4,
      median: 4,
      p90: 4,
      max: 4
    });
    assert.deepEqual(view.lossDistance, {
      count: 1,
      mean: 4,
      median: 4,
      p90: 4,
      max: 4
    });
    assert.deepEqual(view.leaveRetentionCounterfactual, { 4: 1, 5: 1, 6: 1 });
    assert.equal(view.settledEpisodes.count, 1);
    assert.equal(view.settledEpisodes.mean, 2);
    assert.equal(view.unsettledEpisodesAfterJoin.count, 1);
    assert.equal(view.unsettledEpisodesAfterJoin.mean, 3);
  }
});

test('leave caused by an inactive prior settlement is classified separately from distance loss', () => {
  const world = makeWorld();
  const settlement = addSettlement(world, 1, 2, 2);
  const human = createHuman(world, {
    x: 2, y: 2, sex: 'M', ageYears: 30, hunger: 0.1, settlementId: 1
  });
  const tracker = createSettlementChurnTracker();

  tracker.observe(world);
  tickWorld(world, 1);
  settlement.active = false;
  human.settlementId = null;
  tracker.observe(world);

  const adults = tracker.summarize(world).adults;
  assert.equal(adults.leaveEvents, 1);
  assert.equal(adults.abandonmentLeaves, 1);
  assert.equal(adults.distanceDrivenLeaves, 0);
});

test('direct settlement switch is not miscounted as a leave plus rejoin', () => {
  const world = makeWorld();
  addSettlement(world, 1, 2, 2);
  addSettlement(world, 2, 7, 2);
  const human = createHuman(world, {
    x: 2, y: 2, sex: 'M', ageYears: 30, hunger: 0.1, settlementId: 1
  });
  const tracker = createSettlementChurnTracker();

  tracker.observe(world);
  tickWorld(world, 1);
  human.x = 7;
  human.settlementId = 2;
  tracker.observe(world);

  const adults = tracker.summarize(world).adults;
  assert.equal(adults.switchEvents, 1);
  assert.equal(adults.leaveEvents, 0);
  assert.equal(adults.joinEvents, 0);
  assert.equal(adults.lossDistance.count, 0);
});

test('settlement churn observation is snapshot and RNG neutral', () => {
  const world = makeWorld();
  addSettlement(world, 1, 2, 2);
  createHuman(world, { x: 2, y: 2, sex: 'F', ageYears: 24, hunger: 0.1, settlementId: 1 });
  const tracker = createSettlementChurnTracker();
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
