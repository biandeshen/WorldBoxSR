import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { chronicleRowsForLens } from '../client/presentation/chronicle_lenses.js';
import { dynasticRulerStoryForEvent } from '../client/presentation/dynastic_story.js';
import { eventCardForEvent } from '../client/presentation/event_card.js';

function storyWorld() {
  const world = createWorld({ seed: 8801, width: 8, height: 8, population: 0 });
  world.settlements.push({
    id: 1,
    kind: 'settlement',
    name: 'Eldergate',
    x: 2,
    y: 3,
    active: true,
    polityId: 1,
    memberIds: [31]
  });
  world.polities.push({
    id: 1,
    kind: 'polity',
    name: 'Eldergate Realm',
    capitalSettlementId: 1,
    settlementIds: [1],
    active: true,
    rulerId: 31,
    rulingLineFounderId: 23,
    rulingLineSequence: 13,
    rulingLineReignCount: 2
  });
  world.entities.push({
    id: 31,
    kind: 'human',
    alive: true,
    x: 2,
    y: 3,
    ageDays: world.config.daysPerYear * 24,
    settlementId: 1,
    parentIds: [23],
    childIds: [],
    unionIds: []
  });
  return world;
}

function successionEvent(overrides = {}) {
  return {
    id: 11,
    day: 9150,
    type: 'polity.ruler_succeeded',
    subject: { kind: 'entity', entityKind: 'polity', id: 1 },
    causes: [
      { kind: 'event', id: 10 },
      { kind: 'entity', entityKind: 'human', id: 31 }
    ],
    polityId: 1,
    name: 'Eldergate Realm',
    rulerId: 31,
    previousRulerId: 23,
    reason: 'death',
    successionPath: 'descendant',
    rulingLineFounderId: 23,
    previousRulingLineFounderId: 23,
    rulingLineSequence: 13,
    rulingLineReignCount: 2,
    rulingLineChanged: false,
    descendantDistance: 1,
    ...overrides
  };
}

test('descendant succession tells recorded bloodline continuation without inference', () => {
  const world = storyWorld();
  const event = successionEvent();
  const before = JSON.stringify(world);
  const story = dynasticRulerStoryForEvent(world, event);

  assert.equal(story.headline, "Eldergate Realm's ruling bloodline continues");
  assert.equal(story.detail, 'Human #31 continues ruling line 13 as a child of founder Human #23 after death.');
  assert.equal(story.transitionKind, 'descendant');
  assert.equal(story.descendantDistance, 1);
  assert.equal(JSON.stringify(world), before);
});

test('recorded distant descendant uses bounded generation wording only', () => {
  const story = dynasticRulerStoryForEvent(storyWorld(), successionEvent({ descendantDistance: 3 }));
  assert.match(story.detail, /3 generations from the founder/);
  assert.doesNotMatch(story.detail, /heir|legitim|primogen|claim/i);
});

test('open selection explicitly begins a new recorded ruling line', () => {
  const event = successionEvent({
    rulerId: 12,
    previousRulerId: 9,
    successionPath: 'open_selection',
    rulingLineFounderId: 12,
    previousRulingLineFounderId: 9,
    rulingLineSequence: 56,
    rulingLineReignCount: 1,
    rulingLineChanged: true,
    descendantDistance: null,
    reason: 'vacancy_filled'
  });
  const story = dynasticRulerStoryForEvent(storyWorld(), event);
  assert.equal(story.headline, 'Eldergate Realm begins a new ruling line');
  assert.equal(story.detail, 'Human #12 begins ruling line 56 as founder Human #12 after vacancy filled.');
  assert.equal(story.transitionKind, 'open_selection');
});

test('founding appointment uses recorded line facts while legacy ruler events fall back', () => {
  const founding = {
    id: 2,
    day: 100,
    type: 'polity.ruler_appointed',
    polityId: 1,
    name: 'Eldergate Realm',
    rulerId: 23,
    successionPath: 'founding',
    rulingLineFounderId: 23,
    rulingLineSequence: 1,
    rulingLineReignCount: 1
  };
  const story = dynasticRulerStoryForEvent(storyWorld(), founding);
  assert.equal(story.detail, 'Human #23 begins ruling line 1 as founder Human #23.');

  const legacy = successionEvent({ successionPath: undefined, rulingLineFounderId: undefined, rulingLineSequence: undefined });
  assert.equal(dynasticRulerStoryForEvent(storyWorld(), legacy), null);
});

test('Event Card keeps authoritative subject/death/successor references while using dynastic copy', () => {
  const world = storyWorld();
  const death = {
    id: 10,
    day: 9150,
    type: 'human.died',
    entityId: 23,
    cause: 'old_age'
  };
  const succession = successionEvent();
  world.history.push(death, succession);
  const before = snapshotWorld(world);

  const card = eventCardForEvent(world, succession);
  assert.equal(card.headline, "Eldergate Realm's ruling bloodline continues");
  assert.match(card.detail, /continues ruling line 13/);
  assert.equal(card.subject.reference.entityKind, 'polity');
  assert.equal(card.subject.reference.id, 1);
  assert.equal(card.subject.status, 'resolved');
  assert.equal(card.subject.navigation.kind, 'map');
  assert.equal(card.causes.length, 2);
  assert.deepEqual(card.causes[0].reference, { kind: 'event', id: 10 });
  assert.deepEqual(card.causes[0].navigation, { kind: 'event', eventId: 10 });
  assert.deepEqual(card.causes[1].reference, { kind: 'entity', entityKind: 'human', id: 31 });
  assert.equal(card.causes[1].navigation.kind, 'map');
  assert.deepEqual(snapshotWorld(world), before);
});

test('Rule lens keeps exact membership/order/limit while projecting dynastic copy', () => {
  const world = storyWorld();
  world.history = [
    { id: 1, day: 1, type: 'polity.founded', polityId: 1, name: 'Eldergate Realm', capitalSettlementId: 1 },
    { id: 2, day: 2, type: 'polity.ruler_appointed', polityId: 1, name: 'Eldergate Realm', rulerId: 23 },
    { id: 3, day: 3, type: 'polity.war_started', polityAId: 1, polityBId: 2 },
    successionEvent({ id: 4, day: 4 }),
    { id: 5, day: 5, type: 'polity.ruler_vacant', polityId: 1, name: 'Eldergate Realm', previousRulerId: 31 },
    successionEvent({ id: 6, day: 6, rulerId: 12, successionPath: 'open_selection', rulingLineFounderId: 12, rulingLineSequence: 14, rulingLineReignCount: 1, descendantDistance: null }),
    { id: 7, day: 7, type: 'settlement.conquered', settlementId: 1, newPolityId: 1, previousPolityId: 2 },
    successionEvent({ id: 8, day: 8, descendantDistance: 2 })
  ];

  const rows = chronicleRowsForLens(world, 'rule', { limit: 4 });
  assert.deepEqual(rows.map((row) => row.eventId), [8, 6, 5, 4]);
  assert.match(rows[0].headline, /ruling bloodline continues/);
  assert.match(rows[1].headline, /new ruling line/);
  assert.equal(rows.length, 4);
});
