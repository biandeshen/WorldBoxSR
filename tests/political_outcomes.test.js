import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePoliticalOutcomes, REBELLION_DELAY_YEARS } from '../engine/systems/political_outcomes.js';
import { updatePolities } from '../engine/systems/polities.js';
import { updatePolityRelations } from '../engine/systems/polity_relations.js';
import { updateSettlementMembership, updateSettlementTerritory } from '../engine/systems/settlements.js';
import { updateWarbands, WARBAND_MOVE_INTERVAL_DAYS } from '../engine/systems/warbands.js';

function controlledOutcomeWorld(seed = 901, { adultsA = 10, adultsB = 4 } = {}) {
  const world = createWorld({
    seed,
    width: 14,
    height: 9,
    population: 0,
    config: { waterLevel: -1, settlementMinAdults: 999 }
  });
  const settlementA = createSettlement(world, { x: 2, y: 4 });
  const settlementB = createSettlement(world, { x: 11, y: 4 });
  updatePolities(world);
  const [polityA, polityB] = world.polities;

  for (let index = 0; index < adultsA; index += 1) {
    createHuman(world, {
      x: settlementA.x,
      y: settlementA.y,
      ageYears: 24 + index,
      settlementId: settlementA.id,
      lineageId: null,
      sex: index % 2 === 0 ? 'F' : 'M'
    });
  }
  for (let index = 0; index < adultsB; index += 1) {
    createHuman(world, {
      x: settlementB.x,
      y: settlementB.y,
      ageYears: 24 + index,
      settlementId: settlementB.id,
      lineageId: null,
      sex: index % 2 === 0 ? 'M' : 'F'
    });
  }
  updateSettlementMembership(world);
  updateSettlementTerritory(world);

  updatePolityRelations(world);
  const relation = world.relations[0];
  relation.atWar = true;
  relation.stance = 'war';
  relation.score = -80;
  relation.startedDay = world.day;
  relation.endedDay = null;
  updateWarbands(world);

  return { world, relation, polityA, polityB, settlementA, settlementB };
}

function stepPoliticalWar(world, days = WARBAND_MOVE_INTERVAL_DAYS) {
  world.day += days;
  updatePoliticalOutcomes(world);
  updatePolities(world);
  updateWarbands(world);
}

function advanceUntilConquest(world, maxSteps = 30) {
  for (let step = 0; step < maxSteps; step += 1) {
    stepPoliticalWar(world);
    const conquest = world.history.find((event) => event.type === 'settlement.conquered');
    if (conquest) return conquest;
  }
  return null;
}

test('an asymmetric war produces a surviving victor that keeps marching and conquers the enemy settlement', () => {
  const { world, relation, polityA, polityB, settlementA, settlementB } = controlledOutcomeWorld();
  const rngBefore = world.rng.snapshot();

  const conquest = advanceUntilConquest(world);
  assert.ok(conquest, 'a surviving warband should reach and capture the enemy settlement');
  assert.equal(conquest.previousPolityId, polityB.id);
  assert.equal(conquest.newPolityId, polityA.id);
  assert.equal(settlementB.polityId, polityA.id);
  assert.equal(settlementB.previousPolityId, polityB.id);
  assert.equal(settlementB.conquestCount, 1);
  assert.equal(settlementB.lastConqueringWarbandId, conquest.warbandId);
  assert.equal(polityB.active, false, 'losing the only viable settlement dissolves the polity through existing polity authority');
  assert.deepEqual(world.rng.snapshot(), rngBefore, 'political outcomes do not consume sequential world RNG');

  const surviving = world.warbands.find((warband) => warband.id === conquest.warbandId);
  assert.ok(surviving);
  assert.equal(surviving.active, true);
  assert.equal(surviving.captures, 1);
  assert.equal(surviving.x, settlementB.x);
  assert.equal(surviving.y, settlementB.y);

  const capturedTile = world.tiles[settlementB.y * world.width + settlementB.x];
  assert.equal(capturedTile.ownerSettlementId, settlementB.id);
  assert.equal(world.settlements.find((settlement) => settlement.id === capturedTile.ownerSettlementId)?.polityId, polityA.id,
    'territory remains settlement-authoritative and therefore follows the new political owner');

  updatePolityRelations(world);
  updateWarbands(world);
  assert.equal(relation.atWar, false);
  assert.equal(relation.active, false);
  assert.equal(surviving.active, false, 'dissolution archives the war and disbands the surviving occupation force');
});

test('equal final combat cannot double-destroy both sides and deterministically leaves one active victor', () => {
  const { world } = controlledOutcomeWorld(902, { adultsA: 8, adultsB: 8 });
  const rngBefore = world.rng.snapshot();

  for (let step = 0; step < 16; step += 1) {
    world.day += WARBAND_MOVE_INTERVAL_DAYS;
    updateWarbands(world);
  }

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

test('snapshot v15 preserves political outcomes exactly and v14 snapshots migrate with neutral settlement political fields', () => {
  const { world, settlementB } = controlledOutcomeWorld(904);
  assert.ok(advanceUntilConquest(world));

  const snapshot = snapshotWorld(world);
  assert.equal(snapshot.snapshotVersion, 15);
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
  assert.equal(migrated.snapshotVersion, 15);
  assert.equal(migratedSettlement.conquestCount, 0);
  assert.equal(migratedSettlement.rebellionCount, 0);
  assert.equal(migratedSettlement.lastConqueredDay, null);
  assert.equal(migratedSettlement.lastRebelledDay, null);
});
