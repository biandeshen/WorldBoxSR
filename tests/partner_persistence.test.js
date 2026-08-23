import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerPersistenceTracker } from '../engine/core/partner_persistence.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeStaticPair() {
  const world = createWorld({
    seed: 4949,
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
  const female = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    birthCooldownDays: 0
  });
  const male = createHuman(world, {
    x: 3,
    y: 2,
    sex: 'M',
    ageYears: 25,
    hunger: 0.1,
    birthCooldownDays: 0
  });
  return { world, female, male };
}

test('remembered partner coverage distinguishes remembered, alive, and currently eligible', () => {
  const { world, male } = makeStaticPair();
  const tracker = createPartnerPersistenceTracker({ memoryWindows: [3, 10], retentionDays: 10 });

  tracker.observe(world); // day 0 encounter
  male.x = 6;

  tickWorld(world, 1);
  tracker.observe(world); // alive + eligible remembered partner

  male.birthCooldownDays = 5;
  tickWorld(world, 1);
  tracker.observe(world); // alive but ineligible remembered partner

  male.alive = false;
  tickWorld(world, 1);
  tracker.observe(world); // remembered identity exists but partner is dead

  const summary = tracker.summarize();
  assert.equal(summary.eligibleFemaleDays, 4);
  assert.equal(summary.eligibleDroughtFemaleDays, 3);
  assert.deepEqual(summary.memoryCoverageOfEligibleDroughtDays[3], {
    anyRemembered: 1,
    rememberedAlive: 2 / 3,
    rememberedEligible: 1 / 3
  });
  assert.deepEqual(summary.memoryCoverageOfEligibleDroughtDays[10], {
    anyRemembered: 1,
    rememberedAlive: 2 / 3,
    rememberedEligible: 1 / 3
  });
});

test('same-pair return interval records reunion after a real local separation', () => {
  const { world, male } = makeStaticPair();
  const tracker = createPartnerPersistenceTracker({ retentionDays: 20 });

  tracker.observe(world); // encounter on day 0
  male.x = 6;
  for (let day = 0; day < 3; day += 1) {
    tickWorld(world, 1);
    tracker.observe(world);
  }

  male.x = 3;
  tickWorld(world, 1);
  tracker.observe(world); // return on day 4

  assert.deepEqual(tracker.summarize().samePairReturnIntervals, {
    count: 1,
    mean: 4,
    median: 4,
    p90: 4,
    max: 4
  });
});

test('per-female partner memory is capped deterministically', () => {
  const { world } = makeStaticPair();
  createHuman(world, { x: 2, y: 3, sex: 'M', ageYears: 26, hunger: 0.1, birthCooldownDays: 0 });
  createHuman(world, { x: 1, y: 2, sex: 'M', ageYears: 27, hunger: 0.1, birthCooldownDays: 0 });
  const tracker = createPartnerPersistenceTracker({ maxPartnersPerFemale: 2 });

  tracker.observe(world);
  const storage = tracker.summarize().storage;
  assert.equal(storage.pairRecordsCreated, 3);
  assert.equal(storage.partnerRecordEvictions, 1);
  assert.equal(storage.currentTrackedPartnerRecords, 2);
  assert.equal(storage.maxPartnersForOneFemale, 2);
});

test('partner persistence observation is snapshot and RNG neutral', () => {
  const { world } = makeStaticPair();
  const tracker = createPartnerPersistenceTracker();
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);

  assert.deepEqual(snapshotWorld(world), snapshotBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
