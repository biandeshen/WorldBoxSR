import test from 'node:test';
import assert from 'node:assert/strict';
import { createDyadicRankStabilityTracker } from '../engine/core/dyadic_rank_stability.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { ensureParentalUnion } from '../engine/model/parental_union.js';

function makeWorld(seed = 7301) {
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

function addAdult(world, { x, y, sex, settlementId = 1 }) {
  return createHuman(world, {
    x,
    y,
    sex,
    ageYears: 25,
    settlementId,
    hunger: 0.1,
    birthCooldownDays: 0
  });
}

function placeNear(human) {
  human.x = 4;
  human.y = 4;
}

function placeFar(human) {
  human.x = 8;
  human.y = 8;
}

test('rank tracker measures adjacent turnover and 3/5-window top-identity stability', () => {
  const world = makeWorld();
  addAdult(world, { x: 4, y: 4, sex: 'F' });
  const maleA = addAdult(world, { x: 4, y: 4, sex: 'M' });
  const maleB = addAdult(world, { x: 8, y: 8, sex: 'M' });
  const tracker = createDyadicRankStabilityTracker({ windowDays: 1 });

  for (let day = 0; day < 6; day += 1) {
    world.day = day;
    if (day < 5) {
      placeNear(maleA);
      placeFar(maleB);
    } else {
      placeFar(maleA);
      placeNear(maleB);
    }
    tracker.observe(world);
  }

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 6);
  assert.equal(summary.untruncatedCompleteWindows, 6);
  assert.equal(summary.truncatedCompleteWindows, 0);
  assert.equal(summary.windows.distinctPartners.mean, 1);
  assert.equal(summary.windows.topPartnerPairDayShare.mean, 1);
  assert.equal(summary.adjacent.comparisons, 5);
  assert.equal(summary.adjacent.sameTopPartner, 4);
  assert.equal(summary.adjacent.sameTopPartnerShare, 0.8);
  assert.equal(summary.adjacent.turnovers, 1);
  assert.equal(summary.adjacent.turnoverRate, 0.2);
  assert.equal(summary.adjacent.top3Jaccard.mean, 0.8);
  assert.equal(summary.adjacent.laterTopShareWhenStable.mean, 1);
  assert.equal(summary.adjacent.laterTopShareWhenSwitched.mean, 1);
  assert.equal(summary.runs.threeWindowComparisons, 4);
  assert.equal(summary.runs.sameTopAcrossThree, 3);
  assert.equal(summary.runs.sameTopAcrossThreeShare, 0.75);
  assert.equal(summary.runs.fiveWindowComparisons, 2);
  assert.equal(summary.runs.sameTopAcrossFive, 1);
  assert.equal(summary.runs.sameTopAcrossFiveShare, 0.5);
  assert.deepEqual(summary.runs.topPartnerStreakLength, { count: 2, min: 1, mean: 3, max: 5 });
  assert.equal(summary.runs.streaksAtLeast5, 1);
});

test('complete no-contact windows break rank continuity and departure reports partial windows separately', () => {
  const world = makeWorld(7302);
  const female = addAdult(world, { x: 4, y: 4, sex: 'F' });
  const tracker = createDyadicRankStabilityTracker({ windowDays: 2 });

  world.day = 0;
  tracker.observe(world);
  world.day = 1;
  tracker.observe(world);

  let summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 1);
  assert.equal(summary.completeWindowsWithoutTopPartner, 1);
  assert.equal(summary.adjacent.comparisons, 0);
  assert.equal(summary.openPartialWindows, 0);

  world.day = 2;
  tracker.observe(world);
  female.ageDays = (world.config.femaleFertilityEndYears + 1) * world.config.daysPerYear;
  world.day = 3;
  tracker.observe(world);

  summary = tracker.summarize(world);
  assert.equal(summary.discardedPartialWindows, 1);
  assert.deepEqual(summary.discardedPartialWindowDays, { count: 1, min: 1, mean: 1, max: 1 });
  assert.equal(summary.openPartialWindows, 0);
  assert.equal(summary.storage.femalesFinalized, 1);
});

test('truncated complete windows are visible and excluded from rank comparisons', () => {
  const world = makeWorld(7303);
  addAdult(world, { x: 4, y: 4, sex: 'F' });
  const male1 = addAdult(world, { x: 4, y: 4, sex: 'M' });
  const male2 = addAdult(world, { x: 5, y: 4, sex: 'M' });
  const male3 = addAdult(world, { x: 4, y: 5, sex: 'M' });
  const tracker = createDyadicRankStabilityTracker({ windowDays: 1, maxPartnersPerFemale: 2 });

  world.day = 0;
  tracker.observe(world);

  placeNear(male1);
  placeFar(male2);
  placeFar(male3);
  world.day = 1;
  tracker.observe(world);

  const summary = tracker.summarize(world);
  assert.equal(summary.completeWindows, 2);
  assert.equal(summary.truncatedCompleteWindows, 1);
  assert.equal(summary.untruncatedCompleteWindows, 1);
  assert.equal(summary.truncatedCompleteWindowShare, 0.5);
  assert.equal(summary.windows.distinctPartners.count, 1);
  assert.equal(summary.adjacent.comparisons, 0);
  assert.equal(summary.storage.partnerRecordEvictions, 1);
  assert.equal(summary.storage.maxPartnersForOneWindow, 2);
  assert.ok(male1.id < male2.id && male2.id < male3.id);
});

test('stable top transitions expose co-parent and settlement enrichment without changing encounter rank', () => {
  const world = makeWorld(7304);
  const female = addAdult(world, { x: 4, y: 4, sex: 'F', settlementId: 1 });
  const maleA = addAdult(world, { x: 4, y: 4, sex: 'M', settlementId: 1 });
  const maleB = addAdult(world, { x: 8, y: 8, sex: 'M', settlementId: 2 });
  const tracker = createDyadicRankStabilityTracker({ windowDays: 1 });

  world.day = 0;
  tracker.observe(world);

  ensureParentalUnion(world, female, maleA);
  world.day = 1;
  tracker.observe(world);

  placeFar(maleA);
  placeNear(maleB);
  world.day = 2;
  tracker.observe(world);

  const summary = tracker.summarize(world);
  assert.equal(summary.adjacent.comparisons, 2);
  assert.equal(summary.adjacent.sameTopPartnerShare, 0.5);
  assert.equal(summary.adjacent.laterTopCoParentShareWhenStable, 1);
  assert.equal(summary.adjacent.laterTopCoParentShareWhenSwitched, 0);
  assert.equal(summary.adjacent.laterTopSameSettlementShareWhenStable.mean, 1);
  assert.equal(summary.adjacent.laterTopSameSettlementShareWhenSwitched.mean, 0);
  assert.equal(summary.windows.topPartnerCoParentShare, 1 / 3);
});

test('windowed rank observation is snapshot and RNG neutral', () => {
  const world = createWorld({ seed: 7305, width: 16, height: 16, population: 24 });
  const tracker = createDyadicRankStabilityTracker();
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  const summary = tracker.summarize(world);

  assert.ok(summary.focalFemalesObserved >= 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('rank tracker rejects invalid window, cap, and top-k settings', () => {
  assert.throws(() => createDyadicRankStabilityTracker({ windowDays: 0 }), /windowDays must be a positive integer/);
  assert.throws(() => createDyadicRankStabilityTracker({ maxPartnersPerFemale: 0 }), /maxPartnersPerFemale must be a positive integer/);
  assert.throws(() => createDyadicRankStabilityTracker({ topK: 0 }), /topK must be a positive integer/);
});
