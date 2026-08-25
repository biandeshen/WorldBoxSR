import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { updatePolityRelations } from '../engine/systems/polity_relations.js';
import {
  activeWarbandFor,
  adultPopulationForPolity,
  mobilizedStrengthForPolity,
  updateWarbands,
  WARBAND_MOVE_INTERVAL_DAYS
} from '../engine/systems/warbands.js';

function controlledWarWorld(seed = 801) {
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

  for (let index = 0; index < 8; index += 1) {
    createHuman(world, {
      x: settlementA.x,
      y: settlementA.y,
      ageYears: 24 + index,
      settlementId: settlementA.id,
      lineageId: null,
      sex: index % 2 === 0 ? 'F' : 'M'
    });
    createHuman(world, {
      x: settlementB.x,
      y: settlementB.y,
      ageYears: 24 + index,
      settlementId: settlementB.id,
      lineageId: null,
      sex: index % 2 === 0 ? 'M' : 'F'
    });
  }

  updatePolityRelations(world);
  const relation = world.relations[0];
  relation.atWar = true;
  relation.stance = 'war';
  relation.score = -80;
  relation.startedDay = world.day;
  relation.endedDay = null;
  return { world, relation, polityA, polityB, settlementA, settlementB };
}

function advanceWarbandClock(world, days = WARBAND_MOVE_INTERVAL_DAYS) {
  world.day += days;
  updateWarbands(world);
}

test('each side mobilizes at most one authoritative warband from living adult population without consuming world RNG', () => {
  const { world, relation, polityA, polityB, settlementA, settlementB } = controlledWarWorld();
  const rngBefore = world.rng.snapshot();

  assert.equal(adultPopulationForPolity(world, polityA.id), 8);
  assert.equal(adultPopulationForPolity(world, polityB.id), 8);
  assert.equal(mobilizedStrengthForPolity(world, polityA.id), 8);

  updateWarbands(world);
  updateWarbands(world);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.warbands.filter((warband) => warband.active).length, 2);
  const a = activeWarbandFor(world, relation.key, polityA.id, relation.startedDay);
  const b = activeWarbandFor(world, relation.key, polityB.id, relation.startedDay);
  assert.ok(a && b);
  assert.equal(a.x, settlementA.x);
  assert.equal(a.y, settlementA.y);
  assert.equal(a.targetSettlementId, settlementB.id);
  assert.equal(b.targetSettlementId, settlementA.id);
  assert.equal(a.strength, 8);
  assert.equal(b.strength, 8);
  assert.equal(world.history.filter((event) => event.type === 'warband.mobilized').length, 2);
});

test('opposing warbands move deterministically toward enemy capitals and only fight when spatially engaged', () => {
  const { world, relation, polityA, polityB } = controlledWarWorld(802);
  updateWarbands(world);
  const a = activeWarbandFor(world, relation.key, polityA.id, relation.startedDay);
  const b = activeWarbandFor(world, relation.key, polityB.id, relation.startedDay);
  const rngBefore = world.rng.snapshot();

  advanceWarbandClock(world);
  assert.deepEqual({ x: a.x, y: a.y }, { x: 3, y: 4 });
  assert.deepEqual({ x: b.x, y: b.y }, { x: 10, y: 4 });
  assert.equal(world.history.some((event) => event.type === 'warband.engaged'), false);

  for (let step = 0; step < 8 && !world.history.some((event) => event.type === 'warband.engaged'); step += 1) {
    advanceWarbandClock(world);
  }

  const engagement = world.history.find((event) => event.type === 'warband.engaged');
  assert.ok(engagement);
  assert.ok(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1);
  assert.ok(engagement.lossA > 0);
  assert.ok(engagement.lossB > 0);
  assert.ok(a.strength < a.initialStrength);
  assert.ok(b.strength < b.initialStrength);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('combat outcome is deterministic and warband strength loss does not silently kill humans', () => {
  const left = controlledWarWorld(803).world;
  const right = controlledWarWorld(803).world;
  updateWarbands(left);
  updateWarbands(right);
  const livingBefore = left.entities.filter((human) => human.alive).length;

  for (let step = 0; step < 16; step += 1) {
    advanceWarbandClock(left);
    advanceWarbandClock(right);
  }

  assert.deepEqual(left.warbands, right.warbands);
  assert.deepEqual(
    left.history.filter((event) => event.type.startsWith('warband.')),
    right.history.filter((event) => event.type.startsWith('warband.'))
  );
  assert.equal(left.entities.filter((human) => human.alive).length, livingBefore);
  assert.ok(left.warbands.some((warband) => !warband.active && warband.endReason === 'destroyed in engagement'));
});

test('active warbands survive exact save/load continuation and v13 snapshots migrate without invented armies', () => {
  const { world } = controlledWarWorld(804);
  updateWarbands(world);
  advanceWarbandClock(world, WARBAND_MOVE_INTERVAL_DAYS * 2);

  const snapshot = snapshotWorld(world);
  const restored = worldFromSnapshot(structuredClone(snapshot));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  for (let step = 0; step < 8; step += 1) {
    advanceWarbandClock(world);
    advanceWarbandClock(restored);
  }
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));

  const legacy = structuredClone(snapshot);
  legacy.snapshotVersion = 13;
  delete legacy.nextWarbandId;
  delete legacy.warbands;
  const migrated = worldFromSnapshot(legacy);
  assert.equal(migrated.nextWarbandId, 1);
  assert.deepEqual(migrated.warbands, []);
});

test('peace truthfully disbands surviving warbands and a later war can mobilize a fresh lifecycle', () => {
  const { world, relation } = controlledWarWorld(805);
  updateWarbands(world);
  assert.equal(world.warbands.filter((warband) => warband.active).length, 2);

  relation.atWar = false;
  relation.stance = 'neutral';
  relation.endedDay = world.day;
  updateWarbands(world);
  assert.equal(world.warbands.filter((warband) => warband.active).length, 0);
  assert.equal(world.history.filter((event) => event.type === 'warband.disbanded').length, 2);

  world.day += world.config.daysPerYear;
  relation.atWar = true;
  relation.stance = 'war';
  relation.startedDay = world.day;
  relation.endedDay = null;
  updateWarbands(world);
  assert.equal(world.warbands.filter((warband) => warband.active).length, 2);
  assert.equal(world.warbands.length, 4, 'a new war gets a new historical warband lifecycle instead of reusing destroyed/disbanded authority');
});
