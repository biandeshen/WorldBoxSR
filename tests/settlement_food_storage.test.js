import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updateHumans } from '../engine/systems/humans.js';
import {
  updateSettlementLifecycle,
  updateSettlementMembership,
  updateSettlementTerritory
} from '../engine/systems/settlements.js';
import {
  initializeSettlementFoodStorage,
  isSettlementFoodStorageEnabled,
  recordSettlementFoodStorageAbandonment,
  summarizeSettlementFoodStorage,
  tryEatFromSettlementFoodStorage,
  updateSettlementFoodStorage
} from '../engine/systems/settlement_food_storage.js';

function makeStorageWorld(seed = 7901, overrides = {}) {
  return createWorld({
    seed,
    width: 10,
    height: 10,
    population: 0,
    config: {
      waterLevel: 0,
      settlementFoodStorageEnabled: true,
      settlementFoodStorageCapacity: 2,
      settlementFoodStorageReserveFraction: 0.8,
      settlementFoodStorageDepositFraction: 0.5,
      settlementTerritoryRadius: 1,
      settlementMembershipRadius: 3,
      settlementCheckIntervalDays: 30,
      settlementAbandonmentDays: 60,
      passiveMoveChance: 0,
      birthChancePerEligiblePairPerDay: 0,
      hungerPerDay: 0,
      starvationDamagePerDay: 0,
      ...overrides
    }
  });
}

function totalTileFood(world) {
  return world.tiles.reduce((sum, tile) => sum + tile.food, 0);
}

function ownedTiles(world, settlementId) {
  return world.tiles.filter((tile) => tile.ownerSettlementId === settlementId);
}

test('storage-disabled worlds keep settlement shape, snapshot, and RNG untouched by storage helpers', () => {
  const world = createWorld({
    seed: 7900,
    width: 10,
    height: 10,
    population: 0,
    config: { waterLevel: 0 }
  });
  const settlement = createSettlement(world, { x: 4, y: 4 });
  updateSettlementTerritory(world);
  const human = createHuman(world, { x: 4, y: 4, ageYears: 25, hunger: 1, settlementId: settlement.id });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  assert.equal(isSettlementFoodStorageEnabled(world), false);
  initializeSettlementFoodStorage(world, settlement);
  updateSettlementFoodStorage(world);
  assert.equal(tryEatFromSettlementFoodStorage(world, human), false);
  recordSettlementFoodStorageAbandonment(world, settlement);
  const summary = summarizeSettlementFoodStorage(world);

  assert.equal('foodStorage' in settlement, false);
  assert.equal(summary.enabled, false);
  assert.equal(summary.totalStored, 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('deposit conserves food, preserves tile reserve, and obeys hard store capacity', () => {
  const world = makeStorageWorld();
  const settlement = createSettlement(world, { x: 4, y: 4 });
  updateSettlementTerritory(world);

  for (const tile of ownedTiles(world, settlement.id)) tile.food = tile.foodCapacity;
  const beforeTiles = totalTileFood(world);

  updateSettlementFoodStorage(world);
  const afterTiles = totalTileFood(world);
  const summary = summarizeSettlementFoodStorage(world);

  assert.equal(settlement.foodStorageCapacity, 2);
  assert.ok(settlement.foodStorage > 0);
  assert.ok(settlement.foodStorage <= settlement.foodStorageCapacity + 1e-12);
  assert.ok(Math.abs((beforeTiles - afterTiles) - settlement.foodStorage) < 1e-9);
  assert.ok(Math.abs(settlement.foodStorageDeposited - settlement.foodStorage) < 1e-9);
  assert.equal(settlement.foodStorageWithdrawn, 0);
  assert.equal(settlement.foodStorageMeals, 0);
  assert.equal(summary.totalDeposited, settlement.foodStorageDeposited);

  for (const tile of ownedTiles(world, settlement.id)) {
    assert.ok(tile.food + 1e-9 >= tile.foodCapacity * 0.8);
  }

  const totalAfterFirst = totalTileFood(world) + settlement.foodStorage;
  updateSettlementFoodStorage(world);
  assert.ok(Math.abs(totalTileFood(world) + settlement.foodStorage - totalAfterFirst) < 1e-9);
  assert.ok(settlement.foodStorage <= 2 + 1e-12);
});

test('store supplies a meal only after the normal local food path fails and only for an active member', () => {
  const world = makeStorageWorld(7902, { settlementFoodStorageCapacity: 4 });
  const settlement = createSettlement(world, { x: 4, y: 4 });
  initializeSettlementFoodStorage(world, settlement);
  settlement.foodStorage = 2;
  settlement.foodStorageDeposited = 2;

  const member = createHuman(world, {
    x: 4,
    y: 4,
    ageYears: 25,
    hunger: 0.9,
    settlementId: settlement.id
  });
  for (const tile of world.tiles) tile.food = 0;

  const beforeStored = settlement.foodStorage;
  const rngBefore = world.rng.snapshot();
  updateHumans(world);

  assert.equal(settlement.foodStorageMeals, 1);
  assert.equal(world.counters.meals, 1);
  assert.ok(settlement.foodStorage < beforeStored);
  assert.ok(member.hunger < 0.9);
  assert.notDeepEqual(world.rng.snapshot(), rngBefore, 'normal hungry movement still consumes its existing RNG draw');

  // Local food wins: storage is not a preferred meal source.
  const localWorld = makeStorageWorld(7903, { settlementFoodStorageCapacity: 4 });
  const localSettlement = createSettlement(localWorld, { x: 4, y: 4 });
  initializeSettlementFoodStorage(localWorld, localSettlement);
  localSettlement.foodStorage = 2;
  localSettlement.foodStorageDeposited = 2;
  createHuman(localWorld, { x: 4, y: 4, ageYears: 25, hunger: 0.9, settlementId: localSettlement.id });
  const localTile = localWorld.tiles[4 * localWorld.width + 4];
  localTile.food = 1;
  const storeBeforeLocalMeal = localSettlement.foodStorage;
  updateHumans(localWorld);
  assert.equal(localSettlement.foodStorage, storeBeforeLocalMeal);
  assert.equal(localSettlement.foodStorageMeals, 0);
  assert.equal(localWorld.counters.meals, 1);

  // A non-member cannot consume settlement storage.
  const outsider = createHuman(localWorld, { x: 0, y: 0, ageYears: 25, hunger: 1, settlementId: null });
  assert.equal(tryEatFromSettlementFoodStorage(localWorld, outsider), false);
});

test('abandonment strands storage in history and inactive settlements cannot deposit or serve meals', () => {
  const world = makeStorageWorld(7904);
  const settlement = createSettlement(world, { x: 4, y: 4 });
  initializeSettlementFoodStorage(world, settlement);
  settlement.foodStorage = 1.5;
  settlement.foodStorageDeposited = 1.5;
  settlement.population = 0;
  settlement.memberIds = [];

  world.day = 60;
  settlement.emptyDays = 30;
  updateSettlementLifecycle(world, 30);

  assert.equal(settlement.active, false);
  assert.equal(settlement.foodStorage, 1.5);
  assert.equal(settlement.foodStorageStrandedAtAbandonment, 1.5);
  assert.equal(settlement.foodStorageAbandonedDay, 60);

  const strandedBefore = settlement.foodStorage;
  updateSettlementTerritory(world);
  updateSettlementFoodStorage(world);
  assert.equal(settlement.foodStorage, strandedBefore);

  const formerMember = createHuman(world, { x: 4, y: 4, ageYears: 25, hunger: 1, settlementId: settlement.id });
  assert.equal(tryEatFromSettlementFoodStorage(world, formerMember), false);
  assert.equal(settlement.foodStorage, strandedBefore);
  assert.equal(summarizeSettlementFoodStorage(world).strandedFood, 1.5);
});

test('enabled storage state survives exact deterministic save/load continuation', () => {
  const world = makeStorageWorld(7905, {
    settlementCheckIntervalDays: 1,
    settlementAbandonmentDays: 999999,
    settlementFoodStorageCapacity: 4
  });
  const settlement = createSettlement(world, { x: 4, y: 4 });
  initializeSettlementFoodStorage(world, settlement);
  createHuman(world, { x: 4, y: 4, ageYears: 25, hunger: 0.2, settlementId: settlement.id });
  updateSettlementMembership(world);
  updateSettlementTerritory(world);
  for (const tile of ownedTiles(world, settlement.id)) tile.food = tile.foodCapacity;
  updateSettlementFoodStorage(world);

  const restored = worldFromSnapshot(snapshotWorld(world));
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));

  tickWorld(world, 30);
  tickWorld(restored, 30);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
  assert.deepEqual(summarizeSettlementFoodStorage(restored), summarizeSettlementFoodStorage(world));
});

test('storage config validation rejects invalid enabled experiment parameters', () => {
  const cases = [
    { settlementFoodStorageCapacity: 0, pattern: /Capacity must be a finite positive number/ },
    { settlementFoodStorageReserveFraction: -0.1, pattern: /ReserveFraction must be between 0 and 1/ },
    { settlementFoodStorageReserveFraction: 1.1, pattern: /ReserveFraction must be between 0 and 1/ },
    { settlementFoodStorageDepositFraction: -0.1, pattern: /DepositFraction must be between 0 and 1/ },
    { settlementFoodStorageDepositFraction: 1.1, pattern: /DepositFraction must be between 0 and 1/ }
  ];

  for (const { pattern, ...overrides } of cases) {
    const world = makeStorageWorld(7910, overrides);
    const settlement = createSettlement(world, { x: 4, y: 4 });
    updateSettlementTerritory(world);
    assert.throws(() => updateSettlementFoodStorage(world), pattern);
    assert.equal('foodStorage' in settlement, false);
  }
});
