import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { historyForHuman, resolveEventReferences } from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { ensureParentalUnion } from '../engine/model/parental_union.js';
import { createSettlement } from '../engine/model/settlement.js';

function makeWorld(seed = 8701, config = {}) {
  return createWorld({
    seed,
    width: 12,
    height: 12,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      ...config
    }
  });
}

function land(world) {
  return world.tiles.find((tile) => tile.passable);
}

function addHuman(world, tile, overrides = {}) {
  return createHuman(world, {
    x: tile.x,
    y: tile.y,
    ageYears: 25,
    sex: 'F',
    hunger: 0.1,
    ...overrides
  });
}

test('erase removes exactly the living humans on one tile in stable ID order without RNG', () => {
  const world = makeWorld();
  const tile = land(world);
  const neighbor = world.tiles.find((candidate) => candidate.passable && (candidate.x !== tile.x || candidate.y !== tile.y));
  const first = addHuman(world, tile, { sex: 'M' });
  const second = addHuman(world, tile, { sex: 'F' });
  const survivor = addHuman(world, neighbor, { sex: 'M' });
  const rngBefore = world.rng.snapshot();

  const erased = applyCommand(world, { type: 'erase', x: tile.x, y: tile.y });

  assert.deepEqual(erased, [first.id, second.id]);
  assert.deepEqual(world.entities.map((human) => human.id), [survivor.id]);
  assert.equal(world.counters.deaths, 2);
  assert.equal(first.alive, false);
  assert.equal(second.alive, false);
  assert.equal(first.causeOfDeath, 'erased');
  assert.equal(second.causeOfDeath, 'erased');
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  const eraseEvent = world.history.find((event) => event.type === 'god.erase');
  assert.deepEqual(eraseEvent.entityIds, [first.id, second.id]);
  assert.equal(eraseEvent.count, 2);
  assert.deepEqual(eraseEvent.causes, [{ kind: 'command', id: 1, commandType: 'erase' }]);

  const deaths = world.history.filter((event) => event.type === 'human.died');
  assert.deepEqual(deaths.map((event) => event.entityId), [first.id, second.id]);
  assert.ok(deaths.every((event) => event.cause === 'erased'));
  assert.ok(deaths.every((event) => event.causes?.[0]?.kind === 'event' && event.causes[0].id === eraseEvent.id));
});

test('human history resolves erase death back to the prior god action', () => {
  const world = makeWorld(8702);
  const tile = land(world);
  const human = addHuman(world, tile);

  applyCommand(world, { type: 'erase', x: tile.x, y: tile.y });

  const history = historyForHuman(world, human.id, { order: 'oldest' });
  const death = history.find((event) => event.type === 'human.died');
  assert.ok(death);
  const refs = resolveEventReferences(world, death);
  assert.equal(refs.causes.length, 1);
  assert.equal(refs.causes[0].status, 'resolved');
  assert.equal(refs.causes[0].value.type, 'god.erase');
  assert.equal(refs.causes[0].value.entityIds[0], human.id);
});

test('erase uses normal parental-union death bookkeeping and does not directly mutate settlement lifecycle', () => {
  const world = makeWorld(8703, { settlementCheckIntervalDays: 30 });
  const tile = land(world);
  const other = world.tiles.find((candidate) => candidate.passable && Math.max(Math.abs(candidate.x - tile.x), Math.abs(candidate.y - tile.y)) === 1);
  const settlement = createSettlement(world, { x: tile.x, y: tile.y });
  const first = addHuman(world, tile, { sex: 'F', settlementId: settlement.id });
  const second = addHuman(world, other, { sex: 'M', settlementId: settlement.id });
  settlement.memberIds = [first.id, second.id];
  settlement.population = 2;
  const { union } = ensureParentalUnion(world, first, second);

  applyCommand(world, { type: 'erase', x: tile.x, y: tile.y });

  assert.equal(union.firstDeceasedPartnerId, first.id);
  assert.equal(union.firstPartnerDeathDay, world.day);
  assert.ok(world.history.some((event) => event.type === 'union.partner_died' && event.deceasedPartnerId === first.id));

  // Erase does not force the settlement system to run off-cadence.
  assert.equal(settlement.active, true);
  assert.equal(settlement.population, 2);
  assert.deepEqual(settlement.memberIds, [first.id, second.id]);

  tickWorld(world, 30);
  assert.equal(settlement.active, true);
  assert.equal(settlement.population, 1);
  assert.deepEqual(settlement.memberIds, [second.id]);
});

test('empty-tile erase is a valid deterministic no-op action and invalid coordinates consume no command ID', () => {
  const world = makeWorld(8704);
  const tile = land(world);
  const rngBefore = world.rng.snapshot();
  const historyBefore = world.history.length;

  assert.throws(() => applyCommand(world, { type: 'erase', x: -1, y: tile.y }), /x must be an integer/);
  assert.equal(world.nextCommandId, 1);

  const erased = applyCommand(world, { type: 'erase', x: tile.x, y: tile.y });
  assert.deepEqual(erased, []);
  assert.equal(world.nextCommandId, 2);
  assert.equal(world.counters.deaths, 0);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.history.length, historyBefore + 1);
  assert.deepEqual(world.history.at(-1).entityIds, []);
  assert.equal(world.history.at(-1).type, 'god.erase');
});

test('rejected impassable spawn no longer consumes a command ID', () => {
  const world = makeWorld(8705, { waterLevel: 0.9 });
  const water = world.tiles.find((tile) => !tile.passable);
  assert.ok(water, 'test world must contain an impassable tile');

  assert.throws(
    () => applyCommand(world, { type: 'spawn_human', x: water.x, y: water.y, count: 1 }),
    /impassable/
  );
  assert.equal(world.nextCommandId, 1);
  assert.equal(world.history.length, 1);
});

test('save-load continuation after erase stays deterministic', () => {
  const world = makeWorld(8706);
  const tile = land(world);
  addHuman(world, tile, { sex: 'F' });
  addHuman(world, tile, { sex: 'M' });
  applyCommand(world, { type: 'erase', x: tile.x, y: tile.y });

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 180);
  tickWorld(restored, 180);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('natural old-age death keeps the legacy death event shape after lifecycle extraction', () => {
  const world = makeWorld(8707);
  const tile = land(world);
  const human = addHuman(world, tile, {
    sex: 'M',
    ageYears: world.config.hardMaxAgeYears
  });

  tickWorld(world, 1);

  assert.equal(world.entities.some((entity) => entity.id === human.id), false);
  const death = world.history.find((event) => event.type === 'human.died' && event.entityId === human.id);
  assert.ok(death);
  assert.equal(death.cause, 'old_age');
  assert.deepEqual(death.subject, { kind: 'entity', entityKind: 'human', id: human.id });
  assert.equal(Object.hasOwn(death, 'causes'), false);
});
