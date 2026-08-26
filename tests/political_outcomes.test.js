import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePoliticalOutcomes } from '../engine/systems/political_outcomes.js';
import { updatePolities } from '../engine/systems/polities.js';
import { relationForPair, updatePolityRelations } from '../engine/systems/polity_relations.js';
import { updateWarbands } from '../engine/systems/warbands.js';

const REBELLION_DELAY_YEARS = 6;

function landTiles(world) {
  return world.tiles.filter((tile) => tile.passable);
}

function addAdults(world, settlement, count) {
  for (let index = 0; index < count; index += 1) {
    createHuman(world, {
      x: settlement.x,
      y: settlement.y,
      ageYears: 25 + index,
      hunger: 0.1,
      settlementId: settlement.id,
      sex: index % 2 === 0 ? 'F' : 'M'
    });
  }
  settlement.memberIds = world.entities.filter((human) => human.settlementId === settlement.id).map((human) => human.id);
  settlement.population = settlement.memberIds.length;
}

function controlledOutcomeWorld(seed = 901) {
  const world = createWorld({ seed, width: 14, height: 14, population: 0 });
  const passable = landTiles(world);
  const aTile = passable.find((tile) => tile.x >= 2 && tile.x <= 4 && tile.y >= 2 && tile.y <= 4) ?? passable[0];
  const bTile = passable.find((tile) => Math.max(Math.abs(tile.x - aTile.x), Math.abs(tile.y - aTile.y)) >= 5) ?? passable.at(-1);
  const settlementA = createSettlement(world, aTile);
  const settlementB = createSettlement(world, bTile);
  addAdults(world, settlementA, 8);
  addAdults(world, settlementB, 4);
  updatePolities(world);
  updatePolityRelations(world);
  const [polityA, polityB] = world.polities;
  const relation = relationForPair(world, polityA.id, polityB.id);
  relation.atWar = true;
  relation.stance = 'war';
  relation.score = -100;
  relation.startedDay = world.day;
  return { world, settlementA, settlementB, polityA, polityB, relation };
}

function advanceUntilConquest(world, maxSteps = 80) {
  for (let step = 0; step < maxSteps; step += 1) {
    updateWarbands(world);
    updatePoliticalOutcomes(world);
    const conquest = world.history.findLast((event) => event.type === 'settlement.conquered');
    if (conquest) return conquest;
    world.day += 1;
  }
  return null;
}

test('an asymmetric war produces a surviving victor that keeps marching and conquers the enemy settlement', () => {
  const { world, settlementA, settlementB, polityA, polityB } = controlledOutcomeWorld();
  const rngBefore = world.rng.snapshot();
  const conquest = advanceUntilConquest(world);

  assert.ok(conquest, 'expected one deterministic conquest');
  assert.equal(conquest.settlementId, settlementB.id);
  assert.equal(conquest.previousPolityId, polityB.id);
  assert.equal(conquest.newPolityId, polityA.id);
  assert.equal(settlementB.polityId, polityA.id);
  assert.ok(polityA.settlementIds.includes(settlementB.id));
  assert.equal(polityB.active, false);
  assert.equal(polityB.dissolvedDay, world.day);
  assert.equal(settlementB.previousPolityId, polityB.id);
  assert.equal(settlementB.lastConqueredByPolityId, polityA.id);
  assert.equal(settlementB.conquestCount, 1);
  assert.ok(Number.isInteger(settlementB.lastConqueringWarbandId));
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  const remaining = world.warbands.find((warband) => warband.active && warband.polityId === polityA.id);
  assert.ok(remaining);
  assert.equal(remaining.targetSettlementId, settlementB.id);
  assert.equal(remaining.x, settlementB.x);
  assert.equal(remaining.y, settlementB.y);

  const dissolution = world.history.findLast((event) => event.type === 'polity.dissolved' && event.polityId === polityB.id);
  assert.ok(dissolution);
});

test('equal final combat cannot double-destroy both sides and deterministically leaves one active victor', () => {
  const { world, polityA, polityB } = controlledOutcomeWorld(902);
  const rngBefore = world.rng.snapshot();
  updateWarbands(world);
  const [aBand, bBand] = world.warbands.filter((warband) => warband.active);
  aBand.strength = 1;
  bBand.strength = 1;
  aBand.x = bBand.x;
  aBand.y = bBand.y;

  updateWarbands(world);

  const active = world.warbands.filter((warband) => warband.active);
  const destroyed = world.warbands.filter((warband) => !warband.active && warband.endReason === 'destroyed in engagement');
  assert.equal(active.length, 1);
  assert.equal(destroyed.length, 1);
  assert.equal(active[0].strength, 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('a captured viable non-capital settlement can seed exactly one deterministic rebellion and found a new polity', () => {
  const { world, polityA, settlementB } = controlledOutcomeWorld(903);
  const conquest = advanceUntilConquest(world);
  assert.ok(conquest);
  assert.equal(settlementB.polityId, polityA.id);
  assert.equal(polityA.capitalSettlementId === settlementB.id, false);
  assert.ok(settlementB.population >= 4);

  world.day = settlementB.lastConqueredDay + Math.round(world.config.daysPerYear * REBELLION_DELAY_YEARS);
  const result = updatePoliticalOutcomes(world);
  assert.equal(result.rebellions, 1);
  assert.equal(settlementB.polityId, null, 'rebellion first severs occupation authority');
  assert.equal(settlementB.rebellionCount, 1);
  assert.equal(settlementB.lastRebelledFromPolityId, polityA.id);
  assert.ok(world.history.some((event) => event.type === 'settlement.rebelled' && event.settlementId === settlementB.id));

  updatePolities(world);
  const rebelPolity = world.polities.find((polity) => polity.active && polity.id !== polityA.id && polity.settlementIds.includes(settlementB.id));
  assert.ok(rebelPolity, 'existing polity authority should found the rebel settlement as a new polity');
  assert.equal(settlementB.polityId, rebelPolity.id);

  world.day += Math.round(world.config.daysPerYear * REBELLION_DELAY_YEARS * 2);
  updatePoliticalOutcomes(world);
  updatePolities(world);
  assert.equal(settlementB.rebellionCount, 1);
  assert.equal(world.history.filter((event) => event.type === 'settlement.rebelled' && event.settlementId === settlementB.id).length, 1);
});

test('snapshot v16 preserves political outcomes exactly and v14 snapshots migrate with neutral settlement political fields', () => {
  const { world, settlementB } = controlledOutcomeWorld(904);
  assert.ok(advanceUntilConquest(world));

  const snapshot = snapshotWorld(world);
  assert.equal(snapshot.snapshotVersion, 16);
  const restored = worldFromSnapshot(structuredClone(snapshot));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  const legacy = structuredClone(snapshot);
  legacy.snapshotVersion = 14;
  for (const settlement of legacy.settlements) {
    delete settlement.conquestCount;
    delete settlement.previousPolityId;
    delete settlement.lastConqueredDay;
    delete settlement.lastConqueredByPolityId;
    delete settlement.lastConqueringWarbandId;
    delete settlement.occupationStartedDay;
    delete settlement.rebellionEligibleDay;
    delete settlement.rebellionCount;
    delete settlement.lastRebelledDay;
    delete settlement.lastRebelledFromPolityId;
  }
  const migrated = worldFromSnapshot(legacy);
  const migratedSettlement = migrated.settlements.find((settlement) => settlement.id === settlementB.id);
  assert.equal(migrated.snapshotVersion, 16);
  assert.equal(migratedSettlement.conquestCount, 0);
  assert.equal(migratedSettlement.rebellionCount, 0);
  assert.equal(migratedSettlement.lastConqueredDay, null);
  assert.equal(migratedSettlement.lastRebelledDay, null);
});
