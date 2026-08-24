import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventExplicitlyReferencesHuman,
  eventExplicitlyReferencesSettlement,
  findHistoryEvent,
  historyForHuman,
  historyForSettlement,
  queryHistory,
  resolveEventReferences,
  resolveHistoryReference
} from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { commandRef, entityRef, eventRef, pushEvent, worldSubject } from '../engine/model/events.js';

test('history query orders and slices retained events deterministically', () => {
  const world = createWorld({ seed: 85, width: 8, height: 8, population: 0 });
  pushEvent(world, { type: 'test.a' });
  pushEvent(world, { type: 'test.b' });
  pushEvent(world, { type: 'test.c' });

  assert.deepEqual(
    queryHistory(world, { order: 'oldest', offset: 1, limit: 2 }).map((event) => event.type),
    ['test.a', 'test.b']
  );
  assert.deepEqual(
    queryHistory(world, { order: 'newest', offset: 0, limit: 3 }).map((event) => event.type),
    ['test.c', 'test.b', 'test.a']
  );
  assert.deepEqual(
    queryHistory(world, { predicate: (event) => event.type.startsWith('test.'), limit: 10 })
      .map((event) => event.id),
    [4, 3, 2]
  );
});

test('settlement history uses only explicit recorded settlement references', () => {
  const world = createWorld({ seed: 86, width: 8, height: 8, population: 0 });
  pushEvent(world, {
    type: 'settlement.founded',
    subject: entityRef('settlement', 3),
    settlementId: 3
  });
  pushEvent(world, {
    type: 'test.settlement.payload',
    subject: worldSubject(),
    settlementId: 3
  });
  pushEvent(world, {
    type: 'human.born',
    subject: entityRef('human', 7),
    entityId: 7,
    motherId: 8,
    fatherId: 9
  });

  assert.equal(eventExplicitlyReferencesSettlement(world.history[1], 3), true);
  assert.equal(eventExplicitlyReferencesSettlement(world.history[2], 3), true);
  assert.equal(eventExplicitlyReferencesSettlement(world.history[3], 3), false);
  assert.deepEqual(
    historyForSettlement(world, 3, { order: 'oldest', limit: 10 }).map((event) => event.type),
    ['settlement.founded', 'test.settlement.payload']
  );

  // Current-state association is intentionally not consulted. The birth event
  // carries no settlement reference, so timeline queries must not invent one.
  world.entities.push({ id: 7, kind: 'human', alive: true, settlementId: 3 });
  assert.deepEqual(
    historyForSettlement(world, 3, { order: 'oldest', limit: 10 }).map((event) => event.type),
    ['settlement.founded', 'test.settlement.payload']
  );
});

test('human history matches explicit subject, causes, entity fields, and spawn entity IDs', () => {
  const world = createWorld({ seed: 87, width: 8, height: 8, population: 0 });
  pushEvent(world, {
    type: 'human.born',
    subject: entityRef('human', 10),
    causes: [entityRef('human', 1), entityRef('human', 2)],
    entityId: 10,
    motherId: 1,
    fatherId: 2
  });
  pushEvent(world, {
    type: 'god.spawn_human',
    subject: worldSubject(),
    entityIds: [20, 21]
  });
  pushEvent(world, {
    type: 'human.died',
    subject: entityRef('human', 20),
    entityId: 20
  });

  assert.equal(eventExplicitlyReferencesHuman(world.history[1], 1), true);
  assert.equal(eventExplicitlyReferencesHuman(world.history[1], 10), true);
  assert.equal(eventExplicitlyReferencesHuman(world.history[2], 20), true);
  assert.equal(eventExplicitlyReferencesHuman(world.history[3], 20), true);
  assert.deepEqual(
    historyForHuman(world, 20, { order: 'oldest', limit: 10 }).map((event) => event.type),
    ['god.spawn_human', 'human.died']
  );
});

test('event lookup and reference resolution keep evicted parent IDs explicit', () => {
  const world = createWorld({
    seed: 88,
    width: 8,
    height: 8,
    population: 0,
    config: { maxEventHistory: 3 }
  });
  const parent = pushEvent(world, { type: 'test.parent' });
  const child = pushEvent(world, {
    type: 'test.child',
    subject: worldSubject(),
    causes: [eventRef(parent.id), commandRef(4, 'test.command')]
  });

  assert.equal(findHistoryEvent(world, parent.id)?.type, 'test.parent');
  assert.equal(resolveHistoryReference(world, eventRef(parent.id)).status, 'resolved');
  pushEvent(world, { type: 'test.tail.1' });
  pushEvent(world, { type: 'test.tail.2' });

  assert.equal(findHistoryEvent(world, parent.id), null);
  const parentResolution = resolveHistoryReference(world, eventRef(parent.id));
  assert.deepEqual(parentResolution, {
    status: 'unresolved',
    reference: { kind: 'event', id: parent.id },
    reason: 'event_not_retained'
  });

  const childResolution = resolveEventReferences(world, child);
  assert.equal(childResolution.subject.status, 'resolved');
  assert.equal(childResolution.causes[0].status, 'unresolved');
  assert.equal(childResolution.causes[0].reason, 'event_not_retained');
  assert.equal(childResolution.causes[1].status, 'unresolved');
  assert.equal(childResolution.causes[1].reason, 'command_log_not_retained');
});

test('entity reference resolution distinguishes current entities from stable historical IDs', () => {
  const world = createWorld({ seed: 89, width: 8, height: 8, population: 0 });
  world.settlements.push({ id: 2, kind: 'settlement', name: 'Teststead', active: false });
  world.entities.push({ id: 5, kind: 'human', alive: true });

  assert.equal(resolveHistoryReference(world, entityRef('settlement', 2)).status, 'resolved');
  assert.equal(resolveHistoryReference(world, entityRef('human', 5)).status, 'resolved');
  world.entities = [];
  const dead = resolveHistoryReference(world, entityRef('human', 5));
  assert.equal(dead.status, 'unresolved');
  assert.equal(dead.reason, 'entity_not_currently_present');
});

test('history queries and reference resolution are exact snapshot and RNG neutral', () => {
  const world = createWorld({ seed: 90, width: 8, height: 8, population: 2 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  queryHistory(world, { order: 'newest', limit: 5 });
  historyForHuman(world, 1, { limit: 5 });
  historyForSettlement(world, 1, { limit: 5 });
  findHistoryEvent(world, 1);
  resolveHistoryReference(world, worldSubject());
  resolveEventReferences(world, world.history[0]);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('history query validates pagination, order, IDs, and reference kinds', () => {
  const world = createWorld({ seed: 91, width: 8, height: 8, population: 0 });
  assert.throws(() => queryHistory(world, { order: 'sideways' }), /order/);
  assert.throws(() => queryHistory(world, { offset: -1 }), /offset/);
  assert.throws(() => queryHistory(world, { limit: 0 }), /limit/);
  assert.throws(() => historyForHuman(world, 0), /humanId/);
  assert.throws(() => historyForSettlement(world, 0), /settlementId/);
  assert.throws(() => resolveHistoryReference(world, { kind: 'mystery' }), /unsupported/);
});
