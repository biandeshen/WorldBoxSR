import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { PEACE_THRESHOLD, relationForPair, relationKey, updatePolityRelations, WAR_THRESHOLD } from '../engine/systems/polity_relations.js';

function twoPolityWorld(seed = 701) {
  const world = createWorld({ seed, width: 16, height: 16, population: 0 });
  createSettlement(world, { x: 2, y: 2 });
  createSettlement(world, { x: 4, y: 2 });
  updatePolities(world);
  updatePolityRelations(world);
  return world;
}

function advanceRelationYears(world, years = 1) {
  for (let index = 0; index < years; index += 1) {
    world.day += world.config.daysPerYear;
    updatePolityRelations(world);
  }
}

test('active polity pairs have one stable unordered authoritative relation without consuming world RNG', () => {
  const world = twoPolityWorld();
  const [a, b] = world.polities;
  const rngBefore = world.rng.snapshot();

  assert.equal(world.relations.length, 1);
  assert.equal(relationKey(a.id, b.id), relationKey(b.id, a.id));
  assert.equal(world.relations[0].key, `${a.id}:${b.id}`);
  assert.equal(world.relations[0].stance, 'neutral');

  advanceRelationYears(world, 3);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.relations.length, 1);
});

test('bounded proximity pressure produces explicit war, then reduced pressure plus war fatigue produces peace', () => {
  const world = twoPolityWorld(702);
  const [a, b] = world.polities;
  let relation = relationForPair(world, a.id, b.id);

  for (let year = 0; year < 10 && !relation.atWar; year += 1) {
    advanceRelationYears(world);
    relation = relationForPair(world, a.id, b.id);
  }

  assert.equal(relation.atWar, true);
  assert.equal(relation.stance, 'war');
  assert.ok(relation.score <= WAR_THRESHOLD);
  assert.ok(Number.isInteger(relation.startedDay));
  const warEvent = world.history.findLast((event) => event.type === 'polity.war_started');
  assert.ok(warEvent);
  assert.equal(warEvent.relationKey, relation.key);

  const secondCapital = world.settlements.find((settlement) => settlement.id === b.capitalSettlementId);
  secondCapital.x = 15;
  secondCapital.y = 15;

  for (let year = 0; year < 10 && relation.atWar; year += 1) {
    advanceRelationYears(world);
    relation = relationForPair(world, a.id, b.id);
  }

  assert.equal(relation.atWar, false);
  assert.ok(relation.score >= PEACE_THRESHOLD);
  assert.ok(Number.isInteger(relation.endedDay));
  assert.ok(relation.endedDay >= relation.startedDay);
  const peaceEvent = world.history.findLast((event) => event.type === 'polity.peace_made');
  assert.ok(peaceEvent);
  assert.equal(peaceEvent.relationKey, relation.key);
});

test('same seed and same political geometry produce identical relation history', () => {
  const left = twoPolityWorld(703);
  const right = twoPolityWorld(703);
  advanceRelationYears(left, 8);
  advanceRelationYears(right, 8);
  assert.deepEqual(left.relations, right.relations);
  assert.deepEqual(left.history, right.history);
});

test('v13 relation state round-trips exactly and v12 snapshots migrate with empty relation authority', () => {
  const world = twoPolityWorld(704);
  advanceRelationYears(world, 5);
  const snapshot = snapshotWorld(world);
  const restored = worldFromSnapshot(structuredClone(snapshot));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  const legacy = structuredClone(snapshot);
  legacy.snapshotVersion = 12;
  delete legacy.relations;
  const migrated = worldFromSnapshot(legacy);
  assert.deepEqual(migrated.relations, []);
  updatePolityRelations(migrated);
  assert.equal(migrated.relations.length, 1);
});

test('polity dissolution truthfully ends and archives an active war', () => {
  const world = twoPolityWorld(705);
  const [a, b] = world.polities;
  let relation = relationForPair(world, a.id, b.id);
  for (let year = 0; year < 10 && !relation.atWar; year += 1) {
    advanceRelationYears(world);
    relation = relationForPair(world, a.id, b.id);
  }
  assert.equal(relation.atWar, true);

  b.active = false;
  b.dissolvedDay = world.day;
  updatePolityRelations(world);

  assert.equal(relation.active, false);
  assert.equal(relation.atWar, false);
  assert.equal(relation.stance, 'archived');
  assert.equal(relation.archivedDay, world.day);
  assert.equal(world.history.at(-1).type, 'polity.peace_made');
  assert.equal(world.history.at(-1).reason, 'polity dissolved');
});
