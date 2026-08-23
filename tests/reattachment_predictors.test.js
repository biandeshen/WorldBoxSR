import test from 'node:test';
import assert from 'node:assert/strict';
import { createReattachmentPredictorTracker } from '../engine/core/reattachment_predictors.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld() {
  const world = createWorld({
    seed: 5959,
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
  addSettlement(world, 2, 11, 2);
  for (const tile of world.tiles) {
    if (Math.max(Math.abs(tile.x - 2), Math.abs(tile.y - 2)) <= 3) {
      tile.ownerSettlementId = 1;
    }
  }
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
}

function advance(world, tracker, human, changes = {}) {
  tickWorld(world, 1);
  Object.assign(human, changes);
  tracker.observe(world);
}

test('fast same-home rejoin emits compact leave and early-window features', () => {
  const world = makeWorld();
  const female = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const male = createHuman(world, {
    x: 6,
    y: 2,
    sex: 'M',
    ageYears: 26,
    hunger: 0.1,
    settlementId: null
  });
  world.settlements[0].population = 1;
  world.settlements[0].memberIds = [female.id];

  const tracker = createReattachmentPredictorTracker();
  tracker.observe(world);

  advance(world, tracker, female, { x: 6, y: 2, settlementId: null });
  for (let day = 0; day < 9; day += 1) {
    advance(world, tracker, female, { x: 6, y: 2 });
  }
  advance(world, tracker, female, { x: 5, y: 2, settlementId: 1 });

  const summary = tracker.summarize(world);
  const rows = summary.reproductiveFemales.fastVsLong.fastSameHome.episodes;
  assert.equal(rows, 1);
  const row = summary.rows.find((candidate) => candidate.humanId === female.id);
  assert.equal(row.outcome, 'fast_same_rejoin');
  assert.equal(row.durationDays, 10);
  assert.equal(row.leaveDistance, 4);
  assert.ok(row.formerSettlementOwnedCells > 0);
  assert.ok(row.formerSettlementFoodRemainingFraction >= 0);
  assert.ok(row.remainingFemaleReproductiveYears > 20);
  assert.equal(row.first30.days, 10);
  assert.equal(row.first30.within4Share, 1);
  assert.equal(row.first30.radius1MaleOpportunityShare, 1);
  assert.equal(row.first30.radius3MaleOpportunityShare, 1);
  assert.equal(row.first30.nonHungryShare, 1);
  assert.equal(row.first30.otherSettlementCloserShare, 0);
  assert.ok(row.first30.meanTileFoodFraction >= 0);
  assert.ok(male.alive);
});

test('same-home rejoin after 180 days is classified as long without storing daily trajectory rows', () => {
  const world = makeWorld();
  const female = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createReattachmentPredictorTracker();
  tracker.observe(world);

  advance(world, tracker, female, { x: 8, y: 2, settlementId: null });
  for (let day = 0; day < 199; day += 1) {
    advance(world, tracker, female, { x: 8, y: 2 });
  }
  advance(world, tracker, female, { x: 5, y: 2, settlementId: 1 });

  const summary = tracker.summarize(world);
  const row = summary.rows.find((candidate) => candidate.humanId === female.id);
  assert.equal(row.outcome, 'long_same_rejoin');
  assert.equal(row.durationDays, 200);
  assert.ok(row.first30.days <= 31);
  assert.ok(row.first90.days <= 91);
  assert.equal(summary.reproductiveFemales.fastVsLong.longSameHome.episodes, 1);
  assert.equal(summary.storage.activeEpisodes, 0);
});

test('other joins and active episodes remain distinct from resolved same-home outcomes', () => {
  const world = makeWorld();
  const otherJoiner = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 25,
    hunger: 0.1,
    settlementId: 1
  });
  const censored = createHuman(world, {
    x: 3,
    y: 2,
    sex: 'F',
    ageYears: 26,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createReattachmentPredictorTracker();
  tracker.observe(world);

  advance(world, tracker, otherJoiner, { x: 6, y: 2, settlementId: null });
  censored.x = 7;
  censored.y = 2;
  censored.settlementId = null;
  tracker.observe(world);

  advance(world, tracker, otherJoiner, { x: 10, y: 2, settlementId: 2 });
  censored.x = 8;
  censored.y = 2;
  tracker.observe(world);

  const rows = tracker.summarize(world).rows;
  assert.equal(rows.find((row) => row.humanId === otherJoiner.id).outcome, 'other_join');
  assert.equal(rows.find((row) => row.humanId === censored.id).outcome, 'censored');
});

test('predictor observation is snapshot and RNG neutral', () => {
  const world = makeWorld();
  createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    settlementId: 1
  });
  const tracker = createReattachmentPredictorTracker();
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);
  tracker.summarize(world);

  assert.deepEqual(snapshotWorld(world), snapshotBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
