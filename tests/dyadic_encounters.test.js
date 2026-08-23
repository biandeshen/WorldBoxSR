import test from 'node:test';
import assert from 'node:assert/strict';
import { createDyadicEncounterTracker } from '../engine/core/dyadic_encounters.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { ensureParentalUnion } from '../engine/model/parental_union.js';

function makeWorld(seed = 7101) {
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

function addAdult(world, { x, y, sex, idHint = null, settlementId = 1, hunger = 0.1, birthCooldownDays = 0 }) {
  void idHint;
  return createHuman(world, {
    x,
    y,
    sex,
    ageYears: 25,
    settlementId,
    hunger,
    birthCooldownDays
  });
}

test('dyadic tracker measures dominant-partner concentration and co-parent identity without behavior', () => {
  const world = makeWorld();
  const female = addAdult(world, { x: 4, y: 4, sex: 'F' });
  const maleA = addAdult(world, { x: 4, y: 4, sex: 'M', hunger: 0.99, birthCooldownDays: 999 });
  const maleB = addAdult(world, { x: 5, y: 4, sex: 'M' });
  const tracker = createDyadicEncounterTracker();

  for (let day = 0; day < 10; day += 1) {
    world.day = day;
    if (day === 2) {
      maleB.x = 8;
      maleB.y = 8;
    }
    if (day === 5) ensureParentalUnion(world, female, maleA);
    tracker.observe(world);
  }

  const summary = tracker.summarize(world);
  assert.equal(summary.focalFemales.count, 1);
  assert.equal(summary.focalFemales.withEncounters, 1);
  assert.equal(summary.focalFemales.capTruncatedFemaleShare, 0);
  assert.equal(summary.focalFemales.pairDays.mean, 12);
  assert.equal(summary.focalFemales.distinctPartnersAmongUntruncated.mean, 2);
  assert.ok(Math.abs(summary.focalFemales.topPartnerPairDayShare.mean - (10 / 12)) < 1e-12);
  assert.equal(summary.focalFemales.top2PartnerPairDayShare.mean, 1);
  assert.ok(Math.abs(summary.focalFemales.encounterHhi.mean - (104 / 144)) < 1e-12);
  assert.equal(summary.focalFemales.partnersWithAtLeast2EncounterDays.mean, 2);
  assert.equal(summary.focalFemales.partnersWithAtLeast5EncounterDays.mean, 1);
  assert.equal(summary.repeatedPairs.count, 2);
  assert.equal(summary.coParentRepeatedPairs.count, 1);
  assert.equal(summary.nonParentRepeatedPairs.count, 1);
  assert.equal(summary.coParentRepeatedPairs.encounterDays.mean, 10);
  assert.equal(summary.nonParentRepeatedPairs.encounterDays.mean, 2);
  assert.equal(summary.topPartnerCoParentShare, 1);
  assert.equal(summary.coParentShareAmongRepeatedPairs, 0.5);
  assert.equal(summary.repeatedPairs.sameSettlementShare.mean, 1);
  assert.equal(summary.storage.partnerRecordEvictions, 0);
});

test('same pair recurrence records real reunion gaps and persistence span', () => {
  const world = makeWorld(7102);
  addAdult(world, { x: 4, y: 4, sex: 'F' });
  const male = addAdult(world, { x: 4, y: 4, sex: 'M' });
  const tracker = createDyadicEncounterTracker();

  world.day = 0;
  tracker.observe(world);
  male.x = 8;
  male.y = 8;
  world.day = 1;
  tracker.observe(world);
  world.day = 2;
  tracker.observe(world);
  male.x = 4;
  male.y = 4;
  world.day = 3;
  tracker.observe(world);
  world.day = 40;
  tracker.observe(world);

  const summary = tracker.summarize(world);
  assert.equal(summary.repeatedPairs.count, 1);
  assert.equal(summary.repeatedPairs.encounterDays.mean, 3);
  assert.equal(summary.repeatedPairs.spanDays.mean, 40);
  assert.equal(summary.repeatedPairs.recurrenceCount.mean, 2);
  assert.equal(summary.repeatedPairs.recurrenceGapMean.mean, 20);
  assert.equal(summary.repeatedPairs.recurrenceGapMax.mean, 37);
  assert.equal(summary.persistence[30].repeatedPairsSpanningAtLeast, 1);
  assert.equal(summary.persistence[30].shareOfRepeatedPairs, 1);
  assert.equal(summary.persistence[90].shareOfRepeatedPairs, 0);
});

test('partner cap evicts weak records deterministically and exposes truncation', () => {
  const world = makeWorld(7103);
  addAdult(world, { x: 4, y: 4, sex: 'F' });
  const male1 = addAdult(world, { x: 4, y: 4, sex: 'M' });
  const male2 = addAdult(world, { x: 5, y: 4, sex: 'M' });
  const male3 = addAdult(world, { x: 4, y: 5, sex: 'M' });
  const tracker = createDyadicEncounterTracker({ maxPartnersPerFemale: 2 });

  world.day = 0;
  tracker.observe(world);
  const summary = tracker.summarize(world);

  assert.equal(summary.storage.currentPartnerRecords, 2);
  assert.equal(summary.storage.maxPartnersForOneFemale, 2);
  assert.equal(summary.storage.partnerRecordsCreated, 3);
  assert.equal(summary.storage.partnerRecordEvictions, 1);
  assert.equal(summary.storage.pairRecordsExcludedByCap, 1);
  assert.equal(summary.focalFemales.femalesWithCapEvictions, 1);
  assert.equal(summary.focalFemales.capTruncatedFemaleShare, 1);
  assert.equal(summary.focalFemales.partnerRecordSegmentsObserved.mean, 3);
  assert.equal(summary.focalFemales.distinctPartnersAmongUntruncated.count, 0);
  assert.equal(summary.repeatedPairs.count, 0);

  // Equal-strength ties evict the highest stable ID, leaving the two lower IDs.
  const replay = createDyadicEncounterTracker({ maxPartnersPerFemale: 2 });
  const before = snapshotWorld(world);
  replay.observe(world);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(replay.summarize(world).storage, summary.storage);
  assert.ok(male1.id < male2.id && male2.id < male3.id);
});

test('dyadic observation is snapshot and RNG neutral', () => {
  const world = createWorld({ seed: 7104, width: 16, height: 16, population: 24 });
  const tracker = createDyadicEncounterTracker();
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  const summary = tracker.summarize(world);

  assert.ok(summary.focalFemales.count >= 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('invalid partner cap is rejected', () => {
  assert.throws(() => createDyadicEncounterTracker({ maxPartnersPerFemale: 0 }), /positive integer/);
});
