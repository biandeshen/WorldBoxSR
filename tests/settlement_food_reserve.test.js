import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import {
  SETTLEMENT_FOOD_RESERVE_HARVEST_FLOOR_RATIO,
  settlementFoodReserveCapacity
} from '../engine/model/settlement_food_reserve.js';
import { eatFromSettlementReserve, updateHumans } from '../engine/systems/humans.js';
import {
  updateSettlementFoodReserves,
  updateSettlementLifecycle,
  updateSettlementMembership,
  updateSettlementTerritory
} from '../engine/systems/settlements.js';

function makeSettlementWorld({ residents = 4 } = {}) {
  const world = createWorld({
    seed: 328,
    width: 12,
    height: 12,
    population: 0,
    config: {
      passiveMoveChance: 0,
      settlementTerritoryRadius: 2,
      settlementMembershipRadius: 2,
      birthChancePerEligiblePairPerDay: 0
    }
  });
  const center = world.tiles.find((tile) => tile.passable && tile.x >= 2 && tile.x <= 9 && tile.y >= 2 && tile.y <= 9)
    ?? world.tiles.find((tile) => tile.passable);
  assert.ok(center, 'reserve fixture requires passable land');
  const settlement = createSettlement(world, { x: center.x, y: center.y });
  const humans = [];
  for (let index = 0; index < residents; index += 1) {
    humans.push(createHuman(world, {
      x: center.x,
      y: center.y,
      ageYears: 30,
      sex: index % 2 === 0 ? 'F' : 'M',
      hunger: 0.1,
      health: 1,
      settlementId: settlement.id
    }));
  }
  updateSettlementMembership(world);
  updateSettlementTerritory(world);
  assert.equal(settlement.population, residents);
  assert.ok(humans.every((human) => human.settlementId === settlement.id));
  return { world, settlement, humans, center };
}

function ownedTiles(world, settlementId) {
  return world.tiles.filter((tile) => tile.passable && tile.ownerSettlementId === settlementId);
}

function sumFood(tiles) {
  return tiles.reduce((sum, tile) => sum + tile.food, 0);
}

test('settlement reserve harvest conserves food, respects the ecological floor, budget and capacity', () => {
  const { world, settlement } = makeSettlementWorld({ residents: 4 });
  const sources = ownedTiles(world, settlement.id);
  assert.ok(sources.length > 1, 'reserve fixture requires multiple owned tiles');
  for (const tile of sources) tile.food = tile.foodCapacity;

  const beforeTileFood = sumFood(sources);
  const beforeStored = settlement.foodStored;
  updateSettlementFoodReserves(world);
  const afterTileFood = sumFood(sources);
  const harvested = settlement.foodStored - beforeStored;

  assert.ok(Math.abs(harvested - 2) <= 1e-9, `expected 0.5 × population budget = 2, got ${harvested}`);
  assert.ok(Math.abs((beforeTileFood - afterTileFood) - harvested) <= 1e-9, 'tile food decrease must equal reserve increase');
  assert.ok(sources.every((tile) => tile.food + 1e-9 >= tile.foodCapacity * SETTLEMENT_FOOD_RESERVE_HARVEST_FLOOR_RATIO));
  assert.ok(settlement.foodStored <= settlementFoodReserveCapacity(settlement) + 1e-9);
});

test('settlement reserve never exceeds capacity when population-derived capacity shrinks', () => {
  const { world, settlement } = makeSettlementWorld({ residents: 4 });
  settlement.foodStored = 100;
  updateSettlementFoodReserves(world);
  assert.equal(settlement.foodStored, settlementFoodReserveCapacity(settlement));

  settlement.population = 1;
  settlement.memberIds = settlement.memberIds.slice(0, 1);
  updateSettlementFoodReserves(world);
  assert.equal(settlement.foodStored, settlementFoodReserveCapacity(settlement));
  assert.equal(settlement.foodStored, 4);
});

test('hungry local resident eats current-tile food first, then the same settlement reserve before moving', () => {
  const { world, settlement, humans, center } = makeSettlementWorld({ residents: 1 });
  Object.assign(world.config, {
    hungerPerDay: 0,
    hungryThreshold: 0.5,
    foodPerMeal: 1,
    eatAmount: 0.4,
    passiveMoveChance: 0,
    birthChancePerEligiblePairPerDay: 0
  });
  const human = humans[0];
  human.hunger = 0.9;
  center.food = 0.5;
  settlement.foodStored = 1;
  const mealsBefore = world.counters.meals;

  updateHumans(world);

  assert.equal(center.food, 0);
  assert.equal(settlement.foodStored, 0);
  assert.ok(Math.abs(human.hunger - 0.3) <= 1e-9);
  assert.equal(human.x, center.x);
  assert.equal(human.y, center.y);
  assert.equal(world.counters.meals, mealsBefore + 2);
});

test('reserve draw is local: nonmember, other-settlement, outside-territory and inactive cases cannot consume it', () => {
  const { world, settlement, humans, center } = makeSettlementWorld({ residents: 1 });
  Object.assign(world.config, { foodPerMeal: 1, eatAmount: 0.4 });
  const human = humans[0];
  human.hunger = 0.9;
  settlement.foodStored = 2;

  human.settlementId = null;
  assert.equal(eatFromSettlementReserve(world, human, center), 0);
  assert.equal(settlement.foodStored, 2);

  human.settlementId = settlement.id + 100;
  assert.equal(eatFromSettlementReserve(world, human, center), 0);
  assert.equal(settlement.foodStored, 2);

  human.settlementId = settlement.id;
  const outside = { ...center, ownerSettlementId: null };
  assert.equal(eatFromSettlementReserve(world, human, outside), 0);
  assert.equal(settlement.foodStored, 2);

  settlement.active = false;
  assert.equal(eatFromSettlementReserve(world, human, center), 0);
  assert.equal(settlement.foodStored, 2);
});

test('abandonment clears stored food and inactive settlements cannot harvest', () => {
  const { world, settlement } = makeSettlementWorld({ residents: 0 });
  const interval = world.config.settlementCheckIntervalDays;
  settlement.foodStored = 5;
  settlement.emptyDays = world.config.settlementAbandonmentDays - interval;
  updateSettlementLifecycle(world, interval);

  assert.equal(settlement.active, false);
  assert.equal(settlement.foodStored, 0);

  const sources = world.tiles.filter((tile) => tile.passable);
  for (const tile of sources) tile.food = tile.foodCapacity;
  updateSettlementTerritory(world);
  updateSettlementFoodReserves(world);
  assert.equal(settlement.foodStored, 0);
  assert.ok(world.tiles.every((tile) => tile.ownerSettlementId !== settlement.id));
});

test('nonzero v17 settlement reserve survives save/load and continuation normalization exactly', () => {
  const { world, settlement } = makeSettlementWorld({ residents: 3 });
  settlement.foodStored = 4.25;
  const snapshot = snapshotWorld(world);
  const restored = worldFromSnapshot(structuredClone(snapshot));

  assert.deepEqual(snapshotWorld(restored), snapshot);
  assert.equal(restored.settlements[0].foodStored, 4.25);
});
