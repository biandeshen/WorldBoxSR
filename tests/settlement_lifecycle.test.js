import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updateSettlementMembership } from '../engine/systems/settlements.js';

function firstLand(world) {
  const tile = world.tiles.find((candidate) => candidate.passable);
  if (!tile) throw new Error('expected land');
  return tile;
}

function lifecycleWorld(overrides = {}) {
  return createWorld({
    seed: 9191,
    width: 16,
    height: 16,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      settlementCheckIntervalDays: 30,
      settlementAbandonmentDays: 60,
      settlementMinAdults: 999,
      ...overrides
    }
  });
}

test('empty settlements abandon exactly at the configured grace boundary', () => {
  const world = lifecycleWorld();
  const tile = firstLand(world);
  const settlement = createSettlement(world, tile);

  tickWorld(world, 30);
  assert.equal(settlement.active, true);
  assert.equal(settlement.emptyDays, 30);
  assert.equal(settlement.abandonedDay, null);

  tickWorld(world, 30);
  assert.equal(settlement.active, false);
  assert.equal(settlement.emptyDays, 60);
  assert.equal(settlement.abandonedDay, 60);
  assert.equal(world.history.at(-1).type, 'settlement.abandoned');
  assert.deepEqual(world.history.at(-1).subject, { kind: 'entity', entityKind: 'settlement', id: settlement.id });

  const summary = summarizeWorld(world);
  assert.equal(summary.settlements, 1);
  assert.equal(summary.activeSettlements, 0);
  assert.equal(summary.abandonedSettlements, 1);
});

test('repopulation before abandonment resets the empty-duration clock', () => {
  const world = lifecycleWorld();
  const tile = firstLand(world);
  const settlement = createSettlement(world, tile);

  tickWorld(world, 30);
  assert.equal(settlement.emptyDays, 30);

  createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 25, hunger: 0.1 });
  tickWorld(world, 30);

  assert.equal(settlement.active, true);
  assert.equal(settlement.emptyDays, 0);
  assert.equal(settlement.population, 1);
});

test('abandoned settlements cannot receive membership', () => {
  const world = lifecycleWorld();
  const tile = firstLand(world);
  const settlement = createSettlement(world, tile);
  tickWorld(world, 60);
  assert.equal(settlement.active, false);

  const human = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 25, hunger: 0.1 });
  updateSettlementMembership(world);

  assert.equal(human.settlementId, null);
  assert.equal(settlement.population, 0);
  assert.deepEqual(settlement.memberIds, []);
});

test('settlement lifecycle survives deterministic save/load continuation', () => {
  const world = lifecycleWorld();
  createSettlement(world, firstLand(world));
  tickWorld(world, 30);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 30);
  tickWorld(restored, 30);

  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
  assert.equal(world.settlements[0].active, false);
});

test('abandoned settlements stop blocking nearby replacement founding', () => {
  const world = lifecycleWorld({
    settlementAbandonmentDays: 30,
    settlementFormationDays: 30,
    settlementMinAdults: 1,
    settlementMinSpacing: 6
  });
  const tile = firstLand(world);
  const old = createSettlement(world, tile);

  tickWorld(world, 30);
  assert.equal(old.active, false);

  createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 25, hunger: 0.1 });
  tickWorld(world, 30);

  const replacement = world.settlements.find((settlement) => settlement.id !== old.id && settlement.active);
  assert.ok(replacement, 'expected a replacement settlement near the abandoned site');
  const distance = Math.max(Math.abs(replacement.x - old.x), Math.abs(replacement.y - old.y));
  assert.ok(distance < world.config.settlementMinSpacing);
});

test('natural seed 45 collapse records abandoned settlements without changing demographics when cohesion is disabled', () => {
  const world = createWorld({
    seed: 45,
    width: 24,
    height: 24,
    population: 30,
    config: { settlementHomeBiasChance: 0 }
  });
  tickWorld(world, 200 * world.config.daysPerYear);
  const summary = summarizeWorld(world);

  assert.equal(summary.population, 8);
  assert.equal(summary.births, 41);
  assert.equal(summary.deaths, 63);
  assert.equal(summary.settlements, 6);
  assert.equal(summary.activeSettlements, 1);
  assert.equal(summary.abandonedSettlements, 5);
  assert.ok(summary.foodUtilization > 0.99);
});
