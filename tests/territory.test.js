import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updateSettlementTerritory } from '../engine/systems/settlements.js';

function allLandWorld(overrides = {}) {
  return createWorld({
    seed: 6161,
    width: 12,
    height: 10,
    population: 0,
    config: { waterLevel: -1, settlementTerritoryRadius: 5, settlementMinAdults: 999, ...overrides }
  });
}

test('territory ownership is deterministic, local, and tie-broken by stable settlement id', () => {
  const world = allLandWorld();
  const a = createSettlement(world, { x: 2, y: 4 });
  const b = createSettlement(world, { x: 6, y: 4 });
  updateSettlementTerritory(world);

  const tile = world.tiles[4 * world.width + 4];
  assert.equal(tile.ownerSettlementId, a.id, 'equal-distance tie should prefer lower stable id');
  assert.equal(world.tiles[4 * world.width + 2].ownerSettlementId, a.id);
  assert.equal(world.tiles[4 * world.width + 6].ownerSettlementId, b.id);

  const again = allLandWorld();
  createSettlement(again, { x: 2, y: 4 });
  createSettlement(again, { x: 6, y: 4 });
  updateSettlementTerritory(again);
  assert.deepEqual(
    again.tiles.map((candidate) => candidate.ownerSettlementId),
    world.tiles.map((candidate) => candidate.ownerSettlementId)
  );
});

test('ocean tiles remain unowned', () => {
  const world = createWorld({ seed: 11, width: 20, height: 16, population: 0, config: { settlementTerritoryRadius: 20 } });
  const land = world.tiles.find((tile) => tile.passable);
  const ocean = world.tiles.find((tile) => !tile.passable);
  assert.ok(land && ocean);
  createSettlement(world, land);
  updateSettlementTerritory(world);
  assert.equal(ocean.ownerSettlementId, null);
});

test('abandoned settlements release territory immediately on authoritative settlement update', () => {
  const world = allLandWorld({
    settlementCheckIntervalDays: 30,
    settlementAbandonmentDays: 30,
    settlementTerritoryRadius: 3
  });
  const settlement = createSettlement(world, { x: 5, y: 5 });
  updateSettlementTerritory(world);
  assert.ok(world.tiles.some((tile) => tile.ownerSettlementId === settlement.id));

  tickWorld(world, 30);
  assert.equal(settlement.active, false);
  assert.equal(world.tiles.some((tile) => tile.ownerSettlementId === settlement.id), false);
});

test('territory survives deterministic save/load continuation exactly', () => {
  const world = allLandWorld({ settlementCheckIntervalDays: 10 });
  createSettlement(world, { x: 3, y: 3 });
  createSettlement(world, { x: 8, y: 6 });
  updateSettlementTerritory(world);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 20);
  tickWorld(restored, 20);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('territory remains neutral to human and RNG behavior while political relation history may respond to borders', () => {
  const make = (radius) => createWorld({
    seed: 42,
    width: 24,
    height: 24,
    population: 30,
    config: { settlementTerritoryRadius: radius }
  });
  const a = make(0);
  const b = make(5);
  tickWorld(a, 60 * a.config.daysPerYear);
  tickWorld(b, 60 * b.config.daysPerYear);

  assert.deepEqual(a.rng.snapshot(), b.rng.snapshot());
  assert.deepEqual(a.counters, b.counters);
  assert.deepEqual(a.entities, b.entities);
  assert.deepEqual(nonRelationHistory(a), nonRelationHistory(b));
  assert.notDeepEqual(
    relationHistory(a),
    relationHistory(b),
    'territory borders are now an intentional input to authoritative polity relations'
  );
});

function relationHistory(world) {
  return world.history.filter((event) => event.type === 'polity.war_started' || event.type === 'polity.peace_made');
}

function nonRelationHistory(world) {
  return world.history
    .filter((event) => event.type !== 'polity.war_started' && event.type !== 'polity.peace_made')
    .map(({ id, ...event }) => event);
}
