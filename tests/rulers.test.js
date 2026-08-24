import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { killHuman } from '../engine/model/human_lifecycle.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { eligibleRulerCandidates, updateRulers } from '../engine/systems/rulers.js';

function firstLand(world) { return world.tiles.find((tile) => tile.passable); }
function addAdult(world, settlement, { ageYears, sex = 'F' }) { return createHuman(world, { x: settlement.x, y: settlement.y, ageYears, sex, hunger: 0.1, settlementId: settlement.id }); }

test('first ruler is the oldest eligible real human and selection consumes no RNG', () => {
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
  const event = world.history.at(-1);
  assert.equal(event.type, 'polity.ruler_appointed');
  assert.equal(event.rulerId, oldest.id);
  assert.equal(event.reason, 'founding');
});

test('ruler death produces deterministic succession caused by the recorded death event', () => {
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
  const succession = world.history.at(-1);
  assert.equal(succession.type, 'polity.ruler_succeeded');
  assert.equal(succession.previousRulerId, first.id);
  assert.equal(succession.rulerId, successor.id);
  assert.equal(succession.reason, 'death');
  assert.deepEqual(succession.causes[0], { kind: 'event', id: death.id });
});

test('polity becomes honestly vacant when no eligible successor exists and can fill later', () => {
  const world = createWorld({ seed: 303, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); const polity = world.polities[0];
  const ruler = addAdult(world, settlement, { ageYears: 45 }); updateRulers(world);
  killHuman(world, ruler, { cause: 'old_age' }); updateRulers(world);
  assert.equal(polity.rulerId, null);
  assert.equal(world.history.at(-1).type, 'polity.ruler_vacant');

  const successor = addAdult(world, settlement, { ageYears: 26, sex: 'M' });
  world.day += 1; updateRulers(world);
  assert.equal(polity.rulerId, successor.id);
  assert.equal(world.history.at(-1).type, 'polity.ruler_succeeded');
});

test('v12 snapshots without ruler fields restore compatible defaults and ruler state then persists exactly', () => {
  const world = createWorld({ seed: 304, width: 10, height: 10, population: 0 });
  const settlement = createSettlement(world, firstLand(world)); updatePolities(world); addAdult(world, settlement, { ageYears: 35 }); updateRulers(world);
  const current = snapshotWorld(world);
  const restored = worldFromSnapshot(structuredClone(current));
  assert.deepEqual(snapshotWorld(restored), current);

  const earlyV12 = structuredClone(current);
  for (const polity of earlyV12.polities) { delete polity.rulerId; delete polity.rulerSinceDay; delete polity.rulerSequence; delete polity.lastRulerId; }
  const migrated = worldFromSnapshot(earlyV12);
  assert.equal(migrated.polities[0].rulerId, null);
  assert.equal(migrated.polities[0].rulerSequence, 0);
  updateRulers(migrated);
  assert.ok(Number.isInteger(migrated.polities[0].rulerId));
});

test('canonical seed45 has multiple active powers with real human rulers by year 40', () => {
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
  }
});
