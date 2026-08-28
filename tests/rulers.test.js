import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, SNAPSHOT_VERSION, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { killHuman } from '../engine/model/human_lifecycle.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { eligibleRulerCandidates, updateRulers } from '../engine/systems/rulers.js';

function firstLand(world) { return world.tiles.find((tile) => tile.passable); }
function addAdult(world, settlement, { ageYears, sex = 'F', parentIds = [] }) {
  return createHuman(world, {
    x: settlement.x,
    y: settlement.y,
    ageYears,
    sex,
    hunger: 0.1,
    settlementId: settlement.id,
    parentIds
  });
}

test('first ruler remains the oldest eligible real human and starts ruling line 1 without RNG', () => {
  const world = createWorld({ seed: 301, width: 10, height: 10, population: 0 });
  const tile = firstLand(world); const settlement = createSettlement(world, tile); updatePolities(world); const polity = world.polities[0];
  const younger = addAdult(world, settlement, { ageYears: 25, sex: 'M' });
  const oldest = addAdult(world, settlement, { ageYears: 42, sex: 'F' });
  addAdult(world, settlement, { ageYears: 30, sex: 'M' });
  const rngBefore = world.rng.snapshot();

  assert.deepEqual(eligibleRulerCandidates(world, polity).map((human) => human.id), [oldest.id, 3, younger.id]);
  updateRulers(world);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(polity.rulerId, oldest.id);
  assert.equal(polity.rulerSequence, 1);
  assert.equal(polity.rulerSinceDay, 0);
  assert.equal(polity.rulingLineFounderId, oldest.id);
  assert.equal(polity.rulingLineSequence, 1);
  assert.equal(polity.rulingLineSinceDay, 0);
  assert.equal(polity.rulingLineReignCount, 1);
  const event = world.history.at(-1);
  assert.equal(event.type, 'polity.ruler_appointed');
  assert.equal(event.rulerId, oldest.id);
  assert.equal(event.reason, 'founding');
  assert.equal(event.successionPath, 'founding');
  assert.equal(event.rulingLineFounderId, oldest.id);
  assert.equal(event.previousRulingLineFounderId, null);
  assert.equal(event.rulingLineSequence, 1);
  assert.equal(event.rulingLineReignCount, 1);
  assert.equal(event.rulingLineChanged, true);
  assert.equal(event.descendantDistance, null);
});

test('no eligible descendant preserves oldest-adult fallback, starts a new line, and keeps death causality', () => {
  const world = createWorld({ seed: 302, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const first = addAdult(world, settlement, { ageYears: 50, sex: 'M' });
  const successor = addAdult(world, settlement, { ageYears: 40, sex: 'F' });
  updateRulers(world);
  assert.equal(polity.rulerId, first.id);

  const death = killHuman(world, first, { cause: 'old_age' });
  const rngBefore = world.rng.snapshot();
  updateRulers(world);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(polity.rulerId, successor.id);
  assert.equal(polity.lastRulerId, first.id);
  assert.equal(polity.rulerSequence, 2);
  assert.equal(polity.rulingLineFounderId, successor.id);
  assert.equal(polity.rulingLineSequence, 2);
  assert.equal(polity.rulingLineSinceDay, world.day);
  assert.equal(polity.rulingLineReignCount, 1);
  const succession = world.history.at(-1);
  assert.equal(succession.type, 'polity.ruler_succeeded');
  assert.equal(succession.previousRulerId, first.id);
  assert.equal(succession.rulerId, successor.id);
  assert.equal(succession.reason, 'death');
  assert.deepEqual(succession.causes[0], { kind: 'event', id: death.id });
  assert.equal(succession.successionPath, 'open_selection');
  assert.equal(succession.previousRulingLineFounderId, first.id);
  assert.equal(succession.rulingLineFounderId, successor.id);
  assert.equal(succession.rulingLineSequence, 2);
  assert.equal(succession.rulingLineReignCount, 1);
  assert.equal(succession.rulingLineChanged, true);
  assert.equal(succession.descendantDistance, null);
});

test('a younger direct descendant beats an older unrelated eligible adult without succession RNG', () => {
  const world = createWorld({ seed: 305, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const founder = addAdult(world, settlement, { ageYears: 50, sex: 'M' });
  const outsider = addAdult(world, settlement, { ageYears: 44, sex: 'F' });
  updateRulers(world);
  const child = addAdult(world, settlement, { ageYears: 24, sex: 'M', parentIds: [founder.id] });
  const rngBefore = world.rng.snapshot();

  killHuman(world, founder, { cause: 'old_age' });
  updateRulers(world);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(polity.rulerId, child.id);
  assert.notEqual(polity.rulerId, outsider.id);
  assert.equal(polity.rulingLineFounderId, founder.id);
  assert.equal(polity.rulingLineSequence, 1);
  assert.equal(polity.rulingLineReignCount, 2);
  const succession = world.history.at(-1);
  assert.equal(succession.successionPath, 'descendant');
  assert.equal(succession.rulingLineChanged, false);
  assert.equal(succession.descendantDistance, 1);
  assert.equal(succession.previousRulingLineFounderId, founder.id);
  assert.equal(succession.rulingLineFounderId, founder.id);
});

test('nearest descendant generation outranks an older distant descendant', () => {
  const world = createWorld({ seed: 306, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const founder = addAdult(world, settlement, { ageYears: 55, sex: 'F' });
  updateRulers(world);
  const child = addAdult(world, settlement, { ageYears: 20, sex: 'M', parentIds: [founder.id] });
  const grandchild = addAdult(world, settlement, { ageYears: 60, sex: 'F', parentIds: [child.id] });

  killHuman(world, founder, { cause: 'old_age' });
  updateRulers(world);

  assert.equal(polity.rulerId, child.id);
  assert.notEqual(polity.rulerId, grandchild.id);
  assert.equal(world.history.at(-1).descendantDistance, 1);
});

test('vacancy preserves ruling-line identity and a later eligible descendant continues it', () => {
  const world = createWorld({ seed: 303, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const ruler = addAdult(world, settlement, { ageYears: 45, sex: 'F' });
  const child = createHuman(world, {
    x: settlement.x,
    y: settlement.y,
    ageYears: 10,
    sex: 'M',
    hunger: 0.1,
    settlementId: settlement.id,
    parentIds: [ruler.id]
  });
  updateRulers(world);
  killHuman(world, ruler, { cause: 'old_age' });
  updateRulers(world);

  assert.equal(polity.rulerId, null);
  assert.equal(polity.rulingLineFounderId, ruler.id);
  assert.equal(polity.rulingLineSequence, 1);
  assert.equal(polity.rulingLineReignCount, 1);
  const vacancy = world.history.at(-1);
  assert.equal(vacancy.type, 'polity.ruler_vacant');
  assert.equal(vacancy.rulingLineFounderId, ruler.id);
  assert.equal(vacancy.rulingLineSequence, 1);
  assert.equal(vacancy.rulingLineReignCount, 1);

  child.ageDays = world.config.adultAgeYears * world.config.daysPerYear;
  world.day += 1;
  updateRulers(world);
  assert.equal(polity.rulerId, child.id);
  assert.equal(polity.rulingLineFounderId, ruler.id);
  assert.equal(polity.rulingLineSequence, 1);
  assert.equal(polity.rulingLineReignCount, 2);
  assert.equal(world.history.at(-1).successionPath, 'descendant');
  assert.equal(world.history.at(-1).descendantDistance, 1);
});

test('current snapshot round-trips ruling-line state and v15 migration anchors current or last ruler without fabricated history date', () => {
  const world = createWorld({ seed: 304, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const ruler = addAdult(world, settlement, { ageYears: 35 }); updateRulers(world);
  const current = snapshotWorld(world);
  assert.equal(current.snapshotVersion, SNAPSHOT_VERSION);
  const restored = worldFromSnapshot(structuredClone(current));
  assert.deepEqual(snapshotWorld(restored), current);

  const legacyV15 = structuredClone(current);
  legacyV15.snapshotVersion = 15;
  const historyLength = legacyV15.history.length;
  for (const polity of legacyV15.polities) {
    delete polity.rulingLineFounderId;
    delete polity.rulingLineSequence;
    delete polity.rulingLineSinceDay;
    delete polity.rulingLineReignCount;
  }
  for (const settlement of legacyV15.settlements) delete settlement.foodStored;
  const migrated = worldFromSnapshot(legacyV15);
  assert.equal(migrated.snapshotVersion, SNAPSHOT_VERSION);
  assert.equal(migrated.settlements[0].foodStored, 0);
  assert.equal(migrated.polities[0].rulingLineFounderId, ruler.id);
  assert.equal(migrated.polities[0].rulingLineSequence, 1);
  assert.equal(migrated.polities[0].rulingLineSinceDay, null);
  assert.equal(migrated.polities[0].rulingLineReignCount, 1);
  assert.equal(migrated.history.length, historyLength, 'migration must not invent a ruling-line history event');

  const vacantWorld = createWorld({ seed: 307, width: 10, height: 10, population: 0 });
  const vacantSettlement = createSettlement(vacantWorld, firstLand(vacantWorld)); updatePolities(vacantWorld);
  const previous = addAdult(vacantWorld, vacantSettlement, { ageYears: 40 }); updateRulers(vacantWorld);
  killHuman(vacantWorld, previous, { cause: 'old_age' }); updateRulers(vacantWorld);
  const vacantLegacy = snapshotWorld(vacantWorld);
  vacantLegacy.snapshotVersion = 15;
  for (const polity of vacantLegacy.polities) {
    delete polity.rulingLineFounderId;
    delete polity.rulingLineSequence;
    delete polity.rulingLineSinceDay;
    delete polity.rulingLineReignCount;
  }
  for (const settlement of vacantLegacy.settlements) delete settlement.foodStored;
  const migratedVacancy = worldFromSnapshot(vacantLegacy);
  assert.equal(migratedVacancy.polities[0].rulerId, null);
  assert.equal(migratedVacancy.polities[0].lastRulerId, previous.id);
  assert.equal(migratedVacancy.polities[0].rulingLineFounderId, previous.id);
  assert.equal(migratedVacancy.polities[0].rulingLineSinceDay, null);
});

test('v12 snapshots without ruler fields restore compatible empty line defaults and can appoint a first line', () => {
  const world = createWorld({ seed: 308, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); addAdult(world, settlement, { ageYears: 35 }); updateRulers(world);
  const legacyV12 = structuredClone(snapshotWorld(world));
  legacyV12.snapshotVersion = 12;
  for (const polity of legacyV12.polities) {
    delete polity.rulerId;
    delete polity.rulerSinceDay;
    delete polity.rulerSequence;
    delete polity.lastRulerId;
    delete polity.rulingLineFounderId;
    delete polity.rulingLineSequence;
    delete polity.rulingLineSinceDay;
    delete polity.rulingLineReignCount;
  }
  for (const settlement of legacyV12.settlements) delete settlement.foodStored;
  const migrated = worldFromSnapshot(legacyV12);
  assert.equal(migrated.polities[0].rulerId, null);
  assert.equal(migrated.polities[0].rulerSequence, 0);
  assert.equal(migrated.polities[0].rulingLineFounderId, null);
  assert.equal(migrated.polities[0].rulingLineSequence, 0);
  updateRulers(migrated);
  assert.ok(Number.isInteger(migrated.polities[0].rulerId));
  assert.equal(migrated.polities[0].rulingLineFounderId, migrated.polities[0].rulerId);
  assert.equal(migrated.polities[0].rulingLineSequence, 1);
});

test('save-load immediately before descendant succession produces identical authoritative continuation', () => {
  const world = createWorld({ seed: 309, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const founder = addAdult(world, settlement, { ageYears: 50, sex: 'F' }); updateRulers(world);
  addAdult(world, settlement, { ageYears: 25, sex: 'M', parentIds: [founder.id] });
  addAdult(world, settlement, { ageYears: 45, sex: 'M' });

  const restored = worldFromSnapshot(structuredClone(snapshotWorld(world)));
  const restoredFounder = restored.entities.find((human) => human.id === founder.id);
  killHuman(world, founder, { cause: 'old_age' });
  killHuman(restored, restoredFounder, { cause: 'old_age' });
  updateRulers(world);
  updateRulers(restored);

  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
  assert.equal(polity.rulerId, 2);
  assert.equal(world.history.at(-1).successionPath, 'descendant');
});

test('canonical seed45 diverges from legacy open succession exactly at Y25.4167 by selecting direct child #31', () => {
  const world = createWorld({ seed: 45, width: 24, height: 24, population: 30 });
  tickWorld(world, 9149);
  const polity = world.polities.find((candidate) => candidate.id === 1);

  assert.equal(world.day, 9149);
  assert.equal(polity?.name, 'Eldergate Realm');
  assert.equal(polity?.rulerId, 23);
  assert.equal(polity?.rulingLineFounderId, 23);
  assert.equal(polity?.rulingLineSequence, 13);
  assert.equal(polity?.rulingLineReignCount, 1);

  const restored = worldFromSnapshot(structuredClone(snapshotWorld(world)));
  tickWorld(world, 1);
  tickWorld(restored, 1);

  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
  assert.equal(world.day, 9150);
  assert.equal(polity.rulerId, 31);
  assert.equal(polity.rulingLineFounderId, 23);
  assert.equal(polity.rulingLineSequence, 13);
  assert.equal(polity.rulingLineReignCount, 2);
  const succession = world.history.findLast((event) => event.type === 'polity.ruler_succeeded' && event.polityId === 1);
  assert.equal(succession.id, 41);
  assert.equal(succession.previousRulerId, 23);
  assert.equal(succession.rulerId, 31);
  assert.equal(succession.successionPath, 'descendant');
  assert.equal(succession.descendantDistance, 1);
  assert.equal(succession.previousRulingLineFounderId, 23);
  assert.equal(succession.rulingLineFounderId, 23);
  assert.equal(succession.rulingLineSequence, 13);
  assert.equal(succession.rulingLineReignCount, 2);
  assert.equal(succession.rulingLineChanged, false);
});

test('canonical seed45 still has multiple active powers with real human rulers by year 40', () => {
  const world = createWorld({ seed: 45, width: 24, height: 24, population: 30 });
  tickWorld(world, world.config.daysPerYear * 40);
  const active = world.polities.filter((polity) => polity.active);
  assert.ok(active.length >= 2);
  for (const polity of active) {
    assert.ok(Number.isInteger(polity.rulerId), `${polity.name} should have a ruler`);
    const ruler = world.entities.find((human) => human.id === polity.rulerId && human.alive);
    assert.ok(ruler, `${polity.name} ruler must be a living human`);
    const settlement = world.settlements.find((candidate) => candidate.id === ruler.settlementId);
    assert.equal(settlement?.polityId, polity.id);
    assert.ok(Number.isInteger(polity.rulingLineFounderId));
    assert.ok(polity.rulingLineSequence >= 1);
    assert.ok(polity.rulingLineReignCount >= 1);
  }
});
