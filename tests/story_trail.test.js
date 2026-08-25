import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventExplicitlyCausedByEvent,
  eventExplicitlyReferencesPolity,
  eventExplicitlyReferencesWarband,
  historyForEventFocus,
  historyForPolity,
  historyForReference,
  historyForWarband
} from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { entityRef, eventRef, pushEvent, worldSubject } from '../engine/model/events.js';
import { isSupportedStoryFocus, storyTrailForFocus, STORY_TRAIL_LIMIT } from '../client/presentation/story_trail.js';

test('polity and warband focus match only explicit recorded references and payload IDs', () => {
  const world = createWorld({ seed: 1601, width: 8, height: 8, population: 0 });
  const polityEvent = pushEvent(world, {
    type: 'test.polity',
    subject: entityRef('polity', 4),
    polityId: 4
  });
  const relationEvent = pushEvent(world, {
    type: 'test.relation',
    subject: worldSubject(),
    polityAId: 4,
    polityBId: 9
  });
  const warbandEvent = pushEvent(world, {
    type: 'test.warband',
    subject: entityRef('warband', 7),
    causes: [entityRef('polity', 4)],
    warbandId: 7,
    opponentPolityId: 9
  });
  pushEvent(world, { type: 'test.unrelated', subject: worldSubject(), value: 4 });

  assert.equal(eventExplicitlyReferencesPolity(polityEvent, 4), true);
  assert.equal(eventExplicitlyReferencesPolity(relationEvent, 4), true);
  assert.equal(eventExplicitlyReferencesPolity(warbandEvent, 4), true);
  assert.equal(eventExplicitlyReferencesWarband(warbandEvent, 7), true);
  assert.deepEqual(historyForPolity(world, 4, { order: 'oldest', limit: 10 }).map((event) => event.type), [
    'test.polity', 'test.relation', 'test.warband'
  ]);
  assert.deepEqual(historyForWarband(world, 7, { order: 'oldest', limit: 10 }).map((event) => event.type), ['test.warband']);
});

test('event focus is exactly one causal hop: selected event plus direct children, not grandchildren', () => {
  const world = createWorld({ seed: 1602, width: 8, height: 8, population: 0 });
  const parent = pushEvent(world, { type: 'story.parent' });
  const child = pushEvent(world, { type: 'story.child', causes: [eventRef(parent.id)] });
  const sibling = pushEvent(world, { type: 'story.sibling', causes: [eventRef(parent.id)] });
  const grandchild = pushEvent(world, { type: 'story.grandchild', causes: [eventRef(child.id)] });

  assert.equal(eventExplicitlyCausedByEvent(child, parent.id), true);
  assert.equal(eventExplicitlyCausedByEvent(grandchild, parent.id), false);
  assert.deepEqual(historyForEventFocus(world, parent.id, { order: 'oldest', limit: 10 }).map((event) => event.id), [
    parent.id, child.id, sibling.id
  ]);
});

test('generic reference dispatch preserves chronological bounded trails', () => {
  const world = createWorld({ seed: 1603, width: 8, height: 8, population: 0 });
  for (let index = 0; index < 12; index += 1) {
    pushEvent(world, {
      type: `story.human.${index}`,
      subject: entityRef('human', 5),
      entityId: 5
    });
  }
  const rows = historyForReference(world, entityRef('human', 5), { order: 'oldest', limit: 3 });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((event) => event.type), ['story.human.0', 'story.human.1', 'story.human.2']);
});

test('story trail keeps unavailable stable focus and projects readable retained entries', () => {
  const world = createWorld({ seed: 1604, width: 8, height: 8, population: 0 });
  const birth = pushEvent(world, {
    type: 'human.born',
    subject: entityRef('human', 12),
    entityId: 12,
    motherId: 3,
    fatherId: 4
  });
  const death = pushEvent(world, {
    type: 'human.died',
    subject: entityRef('human', 12),
    entityId: 12,
    cause: 'old_age'
  });

  const trail = storyTrailForFocus(world, entityRef('human', 12));
  assert.equal(trail.focus.status, 'unresolved');
  assert.equal(trail.focus.label, 'Human #12');
  assert.match(trail.focus.note, /not currently present/);
  assert.deepEqual(trail.entries.map((entry) => entry.eventId), [birth.id, death.id]);
  assert.equal(trail.entries[0].headline, 'Human Born');
  assert.equal(trail.entries[1].headline, 'Human Died');
});

test('story trail supports retained event focus without recursive expansion', () => {
  const world = createWorld({ seed: 1605, width: 8, height: 8, population: 0 });
  const strike = pushEvent(world, { type: 'god.lightning', subject: worldSubject() });
  const death = pushEvent(world, { type: 'human.died', subject: entityRef('human', 2), causes: [eventRef(strike.id)], entityId: 2 });
  pushEvent(world, { type: 'polity.ruler_succeeded', subject: entityRef('polity', 1), causes: [eventRef(death.id)], polityId: 1, rulerId: 3 });

  const trail = storyTrailForFocus(world, eventRef(strike.id));
  assert.equal(trail.focus.status, 'resolved');
  assert.deepEqual(trail.entries.map((entry) => entry.eventType), ['god.lightning', 'human.died']);
});

test('story trail projection is exact snapshot and RNG neutral', () => {
  const world = createWorld({ seed: 1606, width: 8, height: 8, population: 2 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const eventId = world.history[0].id;

  storyTrailForFocus(world, eventRef(eventId));
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('focused story support is deliberately narrow', () => {
  assert.equal(STORY_TRAIL_LIMIT, 8);
  assert.equal(isSupportedStoryFocus({ kind: 'event', id: 1 }), true);
  assert.equal(isSupportedStoryFocus({ kind: 'entity', entityKind: 'polity', id: 1 }), true);
  assert.equal(isSupportedStoryFocus({ kind: 'entity', entityKind: 'lineage', id: 1 }), false);
  assert.throws(() => storyTrailForFocus(createWorld({ seed: 1607, width: 8, height: 8, population: 0 }), { kind: 'world' }), /unsupported/);
});
