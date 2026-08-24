import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';

function firstPassable(world) {
  return world.tiles.find((tile) => tile.passable);
}

test('active settlements form deterministic polities without consuming simulation RNG', () => {
  const world = createWorld({ seed: 73, width: 8, height: 8, population: 0 });
  const tile = firstPassable(world);
  const settlement = createSettlement(world, { x: tile.x, y: tile.y });
  const rngBefore = world.rng.snapshot();

  updatePolities(world);

  assert.deepEqual(world.rng.snapshot(), rngBefore, 'polity identity must not perturb simulation RNG');
  assert.equal(world.polities.length, 1);
  const polity = world.polities[0];
  assert.equal(settlement.polityId, polity.id);
  assert.equal(polity.capitalSettlementId, settlement.id);
  assert.deepEqual(polity.settlementIds, [settlement.id]);
  assert.ok(polity.name.startsWith(settlement.name));
  assert.ok(Number.isInteger(polity.colorIndex));
  assert.ok(typeof polity.bannerStyle === 'string' && polity.bannerStyle.length > 0);
  const event = world.history.find((candidate) => candidate.type === 'polity.founded');
  assert.equal(event?.polityId, polity.id);
  assert.equal(event?.capitalSettlementId, settlement.id);

  updatePolities(world);
  assert.equal(world.polities.length, 1, 'repeated updates must not duplicate polity identity');
});

test('a polity dissolves when it has no active member settlement', () => {
  const world = createWorld({ seed: 8, width: 8, height: 8, population: 0 });
  const tile = firstPassable(world);
  const settlement = createSettlement(world, { x: tile.x, y: tile.y });
  updatePolities(world);
  settlement.active = false;
  world.day = 720;

  updatePolities(world);

  assert.equal(world.polities[0].active, false);
  assert.equal(world.polities[0].dissolvedDay, 720);
  assert.ok(world.history.some((event) => event.type === 'polity.dissolved' && event.polityId === world.polities[0].id));
});

test('snapshot v12 preserves polity identity and v11 snapshots migrate safely', () => {
  const world = createWorld({ seed: 91, width: 8, height: 8, population: 0 });
  const tile = firstPassable(world);
  createSettlement(world, { x: tile.x, y: tile.y });
  updatePolities(world);

  const currentSnapshot = snapshotWorld(world);
  const restored = worldFromSnapshot(structuredClone(currentSnapshot));
  assert.deepEqual(restored.polities, world.polities);
  assert.equal(restored.nextPolityId, world.nextPolityId);
  assert.equal(restored.settlements[0].polityId, world.settlements[0].polityId);

  const legacy = structuredClone(currentSnapshot);
  legacy.snapshotVersion = 11;
  delete legacy.nextPolityId;
  delete legacy.polities;
  for (const settlement of legacy.settlements) delete settlement.polityId;
  const migrated = worldFromSnapshot(legacy);
  assert.equal(migrated.snapshotVersion, 12);
  assert.equal(migrated.nextPolityId, 1);
  assert.deepEqual(migrated.polities, []);
  assert.equal(migrated.settlements[0].polityId, null);

  tickWorld(migrated, 1);
  assert.equal(migrated.polities.length, 1, 'legacy active settlements should acquire polity identity on continuation');
});

test('canonical seed45 showcase contains multiple authoritative political actors by year 40', () => {
  const world = createWorld({ seed: 45, width: 24, height: 24, population: 30 });
  tickWorld(world, world.config.daysPerYear * 40);
  const activePolities = world.polities.filter((polity) => polity.active);
  assert.ok(activePolities.length >= 2, `expected multiple powers, got ${activePolities.length}`);
  for (const polity of activePolities) {
    const capital = world.settlements.find((settlement) => settlement.id === polity.capitalSettlementId);
    assert.ok(capital?.active);
    assert.equal(capital.polityId, polity.id);
  }
});
