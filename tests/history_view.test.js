import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHistoryEventDetail,
  formatHistoryEventLabel,
  timelineEvents,
  timelineScopeLabel
} from '../client/history_view.js';
import { createWorld } from '../engine/core/world.js';
import { entityRef, eventRef, pushEvent, worldSubject } from '../engine/model/events.js';

test('timeline helper switches between world and explicit selection history', () => {
  const world = createWorld({ seed: 92, width: 8, height: 8, population: 0 });
  pushEvent(world, {
    type: 'settlement.founded',
    subject: entityRef('settlement', 4),
    settlementId: 4,
    name: 'Oakrest'
  });
  pushEvent(world, {
    type: 'human.born',
    subject: entityRef('human', 8),
    entityId: 8
  });

  assert.deepEqual(
    timelineEvents(world, { scope: 'world', order: 'newest', limit: 2 }).map((event) => event.type),
    ['human.born', 'settlement.founded']
  );
  assert.deepEqual(
    timelineEvents(world, {
      scope: 'selection',
      selection: { kind: 'settlement', id: 4 },
      order: 'oldest'
    }).map((event) => event.type),
    ['settlement.founded']
  );
  assert.deepEqual(
    timelineEvents(world, {
      scope: 'selection',
      selection: { kind: 'human', id: 8 },
      order: 'oldest'
    }).map((event) => event.type),
    ['human.born']
  );
  assert.deepEqual(
    timelineEvents(world, {
      scope: 'selection',
      selection: { kind: 'tile', x: 1, y: 1 }
    }),
    []
  );
});

test('timeline scope labels remain explicit about unavailable selection history', () => {
  assert.equal(timelineScopeLabel('world'), 'World history');
  assert.equal(
    timelineScopeLabel('selection', { kind: 'human', id: 7 }),
    'Human #7 history'
  );
  assert.equal(
    timelineScopeLabel('selection', { kind: 'settlement', id: 3 }),
    'Settlement #3 history'
  );
  assert.match(timelineScopeLabel('selection', { kind: 'tile', x: 1, y: 1 }), /select a human or settlement/);
});

test('event labels and details show stable IDs, payload, and resolved causal events', () => {
  const world = createWorld({ seed: 93, width: 8, height: 8, population: 0 });
  world.day = 360;
  const parent = pushEvent(world, { type: 'test.parent', subject: worldSubject() });
  world.day = 720;
  const child = pushEvent(world, {
    type: 'test.child',
    subject: entityRef('settlement', 2),
    causes: [eventRef(parent.id)],
    settlementId: 2,
    note: 'kept'
  });

  assert.equal(formatHistoryEventLabel(child, 360), `#${child.id} · Y2.00 · test.child`);
  const detail = formatHistoryEventDetail(world, child, 360);
  assert.match(detail, new RegExp(`EVENT #${child.id}`));
  assert.match(detail, /subject settlement #2 · entity_not_currently_present/);
  assert.match(detail, new RegExp(`event #${parent.id} → test.parent @ Y1.00`));
  assert.match(detail, /settlementId: 2/);
  assert.match(detail, /note: kept/);
});

test('event detail keeps evicted parent references visible instead of dropping them', () => {
  const world = createWorld({
    seed: 94,
    width: 8,
    height: 8,
    population: 0,
    config: { maxEventHistory: 2 }
  });
  const parent = pushEvent(world, { type: 'test.parent' });
  const child = pushEvent(world, { type: 'test.child', causes: [eventRef(parent.id)] });
  pushEvent(world, { type: 'test.tail' });

  const detail = formatHistoryEventDetail(world, child, 360);
  assert.match(detail, new RegExp(`event #${parent.id} · event_not_retained`));
});
