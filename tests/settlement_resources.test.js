import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSettlementResource, deriveSettlementResources, summarizeSettlementResourceDistribution } from '../engine/analysis/settlement_resources.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updateSettlementTerritory } from '../engine/systems/settlements.js';

test('resource accounting is derived-only and leaves snapshot and RNG byte-identical', () => {
  const world = createWorld({ seed: 42, width: 24, height: 24, population: 30 });
  tickWorld(world, 60 * world.config.daysPerYear);
  const before = JSON.stringify(snapshotWorld(world));
  const rngBefore = world.rng.snapshot();

  const accounts = deriveSettlementResources(world);
  const distribution = summarizeSettlementResourceDistribution(world);

  assert.ok(accounts.length > 0);
  assert.equal(distribution.activeSettlements, accounts.filter((account) => account.active).length);
  assert.equal(JSON.stringify(snapshotWorld(world)), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('active settlement resource totals equal the owned tile totals', () => {
  const world = createWorld({ seed: 12, width: 12, height: 10, population: 0, config: { waterLevel: -1, settlementTerritoryRadius: 2 } });
  const settlement = createSettlement(world, { x: 5, y: 5 });
  settlement.population = 4;
  updateSettlementTerritory(world);

  let expectedCells = 0;
  let expectedFood = 0;
  let expectedCapacity = 0;
  assert.ok(world.tiles.some((tile) => tile.ownerSettlementId === null), 'controlled world should retain unowned land');
  for (const tile of world.tiles) {
    if (tile.ownerSettlementId !== settlement.id) continue;
    expectedCells += 1;
    expectedFood += tile.food;
    expectedCapacity += tile.foodCapacity;
  }

  const account = deriveSettlementResource(world, settlement.id);
  assert.equal(account.ownedCells, expectedCells);
  assert.equal(account.food, expectedFood);
  assert.equal(account.foodCapacity, expectedCapacity);
  assert.equal(account.foodCapacityPerMember, expectedCapacity / 4);
  assert.equal(account.foodPerMember, expectedFood / 4);
});

test('zero-member active settlements report null per-member resources', () => {
  const world = createWorld({ seed: 13, width: 12, height: 10, population: 0, config: { waterLevel: -1, settlementTerritoryRadius: 1 } });
  const settlement = createSettlement(world, { x: 5, y: 5 });
  updateSettlementTerritory(world);
  const account = deriveSettlementResource(world, settlement.id);

  assert.equal(account.population, 0);
  assert.equal(account.foodCapacityPerMember, null);
  assert.equal(account.foodPerMember, null);
  assert.ok(account.ownedCells > 0);
});

test('abandoned settlements never receive current resource attribution', () => {
  const world = createWorld({ seed: 14, width: 12, height: 10, population: 0, config: { waterLevel: -1, settlementTerritoryRadius: 2 } });
  const settlement = createSettlement(world, { x: 5, y: 5 });
  updateSettlementTerritory(world);
  settlement.active = false;
  settlement.abandonedDay = world.day;

  const account = deriveSettlementResource(world, settlement.id);
  assert.equal(account.active, false);
  assert.equal(account.population, 0);
  assert.equal(account.ownedCells, 0);
  assert.equal(account.food, 0);
  assert.equal(account.foodCapacity, 0);
  assert.equal(account.foodRemainingFraction, 0);
});
