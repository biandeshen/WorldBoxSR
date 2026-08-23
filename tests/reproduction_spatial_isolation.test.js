import test from 'node:test';
import assert from 'node:assert/strict';
import { createReproductionSpatialIsolationTracker } from '../engine/core/reproduction_spatial_isolation.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld() {
  return createWorld({
    seed: 5151,
    width: 10,
    height: 8,
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
}

test('settled drought distinguishes intra-settlement spatial dispersion from zero-male settlement', () => {
  const world = makeWorld();
  addSettlement(world, 1, 2, 2);
  const female = createHuman(world, {
    x: 1, y: 1, sex: 'F', ageYears: 24, hunger: 0.1, birthCooldownDays: 0, settlementId: 1
  });
  const male = createHuman(world, {
    x: 4, y: 1, sex: 'M', ageYears: 25, hunger: 0.1, birthCooldownDays: 0, settlementId: 1
  });
  world.settlements[0].memberIds = [female.id, male.id];
  world.settlements[0].population = 2;

  const tracker = createReproductionSpatialIsolationTracker();
  tracker.observe(world);
  const summary = tracker.summarize();

  assert.equal(summary.droughtFemaleDays, 1);
  assert.equal(summary.settledShareOfDroughtDays, 1);
  assert.equal(summary.sameSettlementMaleShareOfSettledDroughtDays, 1);
  assert.equal(summary.zeroMaleSettlementShareOfSettledDroughtDays, 0);
  assert.equal(summary.sameComponentMaleShare, 1);
  assert.deepEqual(summary.nearestEligibleMaleDistance, {
    count: 1,
    mean: 3,
    median: 3,
    p90: 3,
    max: 3
  });
  assert.equal(summary.nearestEligibleMaleRelation.sameSettlement.share, 1);
});

test('post-settlement participation rates exclude pre-settlement drought days', () => {
  const world = makeWorld();
  const female = createHuman(world, {
    x: 1, y: 1, sex: 'F', ageYears: 24, hunger: 0.1, birthCooldownDays: 0
  });
  const male = createHuman(world, {
    x: 5, y: 1, sex: 'M', ageYears: 25, hunger: 0.1, birthCooldownDays: 0
  });
  const tracker = createReproductionSpatialIsolationTracker();

  tracker.observe(world); // drought before any active settlement exists

  addSettlement(world, 1, 2, 2);
  female.settlementId = 1;
  male.settlementId = 1;
  tracker.observe(world); // drought after settlement exists, both are socially settled

  const summary = tracker.summarize();
  assert.equal(summary.droughtFemaleDays, 2);
  assert.equal(summary.preSettlementShareOfDroughtDays, 0.5);
  assert.equal(summary.settledEligibleFemaleShare, 0.5);
  assert.equal(summary.settledEligibleFemaleShareWhenSettlementsExist, 1);
  assert.equal(summary.unsettledEligibleFemaleShareWhenSettlementsExist, 0);
  assert.equal(summary.settledShareOfDroughtDaysWhenSettlementsExist, 1);
  assert.equal(summary.unsettledShareOfDroughtDaysWhenSettlementsExist, 0);
});

test('full impassable barrier identifies true cross-component-only drought', () => {
  const world = makeWorld();
  createHuman(world, { x: 1, y: 3, sex: 'F', ageYears: 24, hunger: 0.1, birthCooldownDays: 0 });
  createHuman(world, { x: 7, y: 3, sex: 'M', ageYears: 25, hunger: 0.1, birthCooldownDays: 0 });

  for (let y = 0; y < world.height; y += 1) {
    const tile = world.tiles[y * world.width + 4];
    tile.passable = false;
    tile.food = 0;
    tile.foodCapacity = 0;
  }

  const tracker = createReproductionSpatialIsolationTracker();
  tracker.observe(world);
  const summary = tracker.summarize();

  assert.equal(summary.droughtFemaleDays, 1);
  assert.equal(summary.crossComponentOnlyShare, 1);
  assert.equal(summary.sameComponentMaleShare, 0);
  assert.equal(summary.topology.componentCount, 2);
  assert.equal(summary.topology.largestComponentShare < 1, true);
});

test('remembered eligible partner location distinguishes same vs other settlement after separation', () => {
  const world = makeWorld();
  addSettlement(world, 1, 2, 2);
  addSettlement(world, 2, 7, 2);
  const female = createHuman(world, {
    x: 2, y: 2, sex: 'F', ageYears: 24, hunger: 0.1, birthCooldownDays: 0, settlementId: 1
  });
  const male = createHuman(world, {
    x: 3, y: 2, sex: 'M', ageYears: 25, hunger: 0.1, birthCooldownDays: 0, settlementId: 1
  });
  const tracker = createReproductionSpatialIsolationTracker();

  tracker.observe(world); // real local encounter, not a drought

  male.x = 6;
  tickWorld(world, 1);
  tracker.observe(world); // remembered eligible partner remains same settlement

  male.settlementId = 2;
  tickWorld(world, 1);
  tracker.observe(world); // same remembered partner is now in another settlement

  const summary = tracker.summarize();
  assert.equal(summary.droughtFemaleDays, 2);
  assert.equal(summary.rememberedEligiblePartnerShare, 1);
  assert.equal(summary.rememberedEligiblePartnerRelation.sameSettlement, 0.5);
  assert.equal(summary.rememberedEligiblePartnerRelation.otherSettlement, 0.5);
  assert.equal(summary.rememberedEligiblePartnerRelation.sameComponent, 1);
  assert.equal(summary.rememberedEligiblePartnerRelation.crossComponent, 0);
});

test('spatial isolation observation is snapshot and RNG neutral', () => {
  const world = makeWorld();
  createHuman(world, { x: 1, y: 1, sex: 'F', ageYears: 24, hunger: 0.1, birthCooldownDays: 0 });
  createHuman(world, { x: 5, y: 1, sex: 'M', ageYears: 25, hunger: 0.1, birthCooldownDays: 0 });
  const tracker = createReproductionSpatialIsolationTracker();
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
