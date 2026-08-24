import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSettlementScarcity, MIN_EDIBLE_TILE_FOOD } from '../engine/analysis/settlement_scarcity.js';
import { createSettlementScarcityEpisodeTracker } from '../engine/core/settlement_scarcity_episodes.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createSettlement } from '../engine/model/settlement.js';
import { createHuman } from '../engine/model/human.js';

function makeWorld({ population = 2, territorialFood = 10 } = {}) {
  const width = 5;
  const height = 5;
  const tiles = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({
        x,
        y,
        passable: true,
        food: 0,
        foodCapacity: 10,
        ownerSettlementId: null
      });
    }
  }

  // Keep territorial food far from the members so aggregate abundance can be
  // distinguished from the existing one-step meal path.
  const distant = tiles[0];
  distant.food = territorialFood;
  distant.ownerSettlementId = 1;

  const entities = [];
  const memberIds = [];
  for (let index = 0; index < population; index += 1) {
    const human = {
      id: index + 1,
      kind: 'human',
      alive: true,
      x: 2,
      y: 2 + index,
      hunger: 0.5,
      settlementId: 1
    };
    entities.push(human);
    memberIds.push(human.id);
  }

  return {
    day: 30,
    width,
    height,
    config: {
      foodPerMeal: 0.65,
      hungryThreshold: 0.35
    },
    tiles,
    entities,
    settlements: [{
      id: 1,
      kind: 'settlement',
      active: true,
      population,
      memberIds,
      abandonedDay: null
    }]
  };
}

function setLocalFood(world, x, y, food) {
  world.tiles[y * world.width + x].food = food;
}

test('derived scarcity separates true territorial shortage from local blockage', () => {
  const world = makeWorld({ population: 2, territorialFood: 0.5 });
  const [row] = deriveSettlementScarcity(world);

  assert.equal(row.population, 2);
  assert.equal(row.hungryMembers, 2);
  assert.equal(row.blockedHungryMembers, 2);
  assert.equal(row.localMealPathBlocked, true);
  assert.equal(row.oneMealTerritorialShortage, true);
  assert.equal(row.accessMismatch, false);
  assert.ok(row.territorialMealCoveragePerMember < 1);
  assert.equal(row.blockedHungryShare, 1);
});

test('access mismatch reports blocked hungry members while settlement territory remains meal-rich', () => {
  const world = makeWorld({ population: 2, territorialFood: 10 });
  const [row] = deriveSettlementScarcity(world);

  assert.equal(row.oneMealTerritorialShortage, false);
  assert.equal(row.localMealPathBlocked, true);
  assert.equal(row.accessMismatch, true);
  assert.ok(row.territorialMealCoveragePerMember > 1);
  assert.equal(row.blockedHungryMembers, 2);
});

test('the existing 0.2 edible threshold and one-step neighbor path prevent false blockage', () => {
  const world = makeWorld({ population: 1, territorialFood: 10 });
  setLocalFood(world, 3, 2, MIN_EDIBLE_TILE_FOOD);
  const [row] = deriveSettlementScarcity(world);

  assert.equal(row.hungryMembers, 1);
  assert.equal(row.blockedHungryMembers, 0);
  assert.equal(row.localMealPathBlocked, false);
  assert.equal(row.accessMismatch, false);
});

test('non-hungry members do not create local blockage episodes', () => {
  const world = makeWorld({ population: 1, territorialFood: 0 });
  world.entities[0].hunger = 0.2;
  const [row] = deriveSettlementScarcity(world);

  assert.equal(row.oneMealTerritorialShortage, true);
  assert.equal(row.hungryMembers, 0);
  assert.equal(row.blockedHungryMembers, 0);
  assert.equal(row.blockedHungryShare, null);
  assert.equal(row.localMealPathBlocked, false);
});

test('episode tracker closes consecutive observations and marks later abandonment', () => {
  const world = makeWorld({ population: 2, territorialFood: 10 });
  const tracker = createSettlementScarcityEpisodeTracker({ sampleIntervalDays: 30 });

  assert.equal(tracker.observe(world), true); // day 30: blockage + access mismatch
  world.day = 60;
  assert.equal(tracker.observe(world), true); // still blocked

  world.day = 90;
  setLocalFood(world, 2, 2, MIN_EDIBLE_TILE_FOOD);
  setLocalFood(world, 2, 3, MIN_EDIBLE_TILE_FOOD);
  assert.equal(tracker.observe(world), true); // closes local/access episodes

  let summary = tracker.summarize(world);
  assert.equal(summary.episodeTypes.localBlockage.completedEpisodes, 1);
  assert.equal(summary.episodeTypes.accessMismatch.completedEpisodes, 1);
  const mismatch = summary.retainedCompletedEpisodes.find((episode) => episode.type === 'accessMismatch');
  assert.equal(mismatch.startDay, 30);
  assert.equal(mismatch.endDay, 60);
  assert.equal(mismatch.samplesObserved, 2);
  assert.equal(mismatch.observedDurationDays, 30);
  assert.equal(mismatch.settlementAbandonedLater, false);

  world.day = 120;
  world.settlements[0].active = false;
  world.settlements[0].population = 0;
  world.settlements[0].memberIds = [];
  world.settlements[0].abandonedDay = 120;
  world.tiles[0].ownerSettlementId = null;
  assert.equal(tracker.observe(world), true);

  summary = tracker.summarize(world);
  const marked = summary.retainedCompletedEpisodes.find((episode) => episode.type === 'accessMismatch');
  assert.equal(marked.settlementAbandonedLater, true);
  assert.equal(summary.settlements[0].abandoned, true);
  assert.equal(summary.settlements[0].abandonedDay, 120);
});

test('tracker keeps completed episode rows bounded while preserving aggregate counts', () => {
  const world = makeWorld({ population: 1, territorialFood: 10 });
  const tracker = createSettlementScarcityEpisodeTracker({
    sampleIntervalDays: 30,
    maxCompletedEpisodes: 2
  });

  for (let cycle = 0; cycle < 4; cycle += 1) {
    world.day = 30 + cycle * 60;
    setLocalFood(world, 2, 2, 0);
    assert.equal(tracker.observe(world), true);
    world.day += 30;
    setLocalFood(world, 2, 2, MIN_EDIBLE_TILE_FOOD);
    assert.equal(tracker.observe(world), true);
  }

  const summary = tracker.summarize(world);
  assert.equal(summary.episodeTypes.localBlockage.completedEpisodes, 4);
  assert.equal(summary.episodeTypes.accessMismatch.completedEpisodes, 4);
  assert.equal(summary.storage.retainedCompletedEpisodes, 2);
  assert.equal(summary.storage.completedEpisodeEvictions, 6);
});

test('scarcity derivation and observation are exact snapshot and RNG neutral', () => {
  const world = createWorld({ seed: 81, width: 8, height: 8, population: 0 });
  const tile = world.tiles.find((candidate) => candidate.passable);
  assert.ok(tile);
  const settlement = createSettlement(world, { x: tile.x, y: tile.y });
  const human = createHuman(world, { x: tile.x, y: tile.y, hunger: 0.5 });
  human.settlementId = settlement.id;
  settlement.population = 1;
  settlement.memberIds = [human.id];
  tile.ownerSettlementId = settlement.id;
  world.day = 30;

  const beforeSnapshot = snapshotWorld(world);
  const beforeRng = world.rng.snapshot();
  const tracker = createSettlementScarcityEpisodeTracker();
  deriveSettlementScarcity(world);
  assert.equal(tracker.observe(world), true);
  tracker.summarize(world);

  assert.deepEqual(snapshotWorld(world), beforeSnapshot);
  assert.deepEqual(world.rng.snapshot(), beforeRng);
});

test('tracker validates cadence/cap and rejects time reversal without mutating the world', () => {
  assert.throws(() => createSettlementScarcityEpisodeTracker({ sampleIntervalDays: 0 }), /sampleIntervalDays/);
  assert.throws(() => createSettlementScarcityEpisodeTracker({ maxCompletedEpisodes: 0 }), /maxCompletedEpisodes/);

  const world = makeWorld({ population: 1, territorialFood: 10 });
  const tracker = createSettlementScarcityEpisodeTracker();
  assert.equal(tracker.observe(world), true);
  assert.equal(tracker.observe(world), false); // duplicate day is ignored
  world.day = 29;
  assert.throws(() => tracker.observe(world), /monotonic/);
});
