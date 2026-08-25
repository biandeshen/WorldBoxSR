import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { entityRef, pushEvent } from '../engine/model/events.js';
import { eventCardForEvent, navigationForResolvedReference } from '../client/presentation/event_card.js';

test('human death card follows retained Meteor cause while dead subject remains truthfully unresolved', () => {
  const world = createWorld({ seed: 1501, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  for (const tile of world.tiles) tile.vegetation = 0;
  const human = createHuman(world, { x: 3, y: 3, ageYears: 30, sex: 'F', lineageId: null, settlementId: null });

  applyCommand(world, { type: 'meteor', x: 3, y: 3 });
  const meteor = world.history.find((event) => event.type === 'god.meteor');
  const death = world.history.find((event) => event.type === 'human.died' && event.entityId === human.id);
  assert.ok(meteor && death);

  const card = eventCardForEvent(world, death);
  assert.equal(card.eventId, death.id);
  assert.equal(card.subject.status, 'unresolved');
  assert.equal(card.subject.label, `Human #${human.id}`);
  assert.match(card.subject.note, /not currently present/);
  assert.equal(card.causes.length, 1);
  assert.equal(card.causes[0].status, 'resolved');
  assert.equal(card.causes[0].navigation.kind, 'event');
  assert.equal(card.causes[0].navigation.eventId, meteor.id);
  assert.match(card.causes[0].label, /Meteor devastates/);
});

test('conquest card resolves settlement subject, warband and polity causes with map destinations', () => {
  const world = createWorld({ seed: 1502, width: 8, height: 8, population: 0, config: { waterLevel: -1 } });
  world.settlements.push({ id: 1, kind: 'settlement', name: 'Stoneford', x: 5, y: 4, active: true, population: 6, polityId: 2 });
  world.settlements.push({ id: 2, kind: 'settlement', name: 'Amber Keep', x: 2, y: 4, active: true, population: 8, polityId: 1 });
  world.polities.push({ id: 1, kind: 'polity', name: 'Amber Reach', active: true, capitalSettlementId: 2, settlementIds: [2] });
  world.polities.push({ id: 2, kind: 'polity', name: 'Blue March', active: true, capitalSettlementId: 1, settlementIds: [1] });
  world.warbands.push({ id: 7, kind: 'warband', active: true, x: 5, y: 4, strength: 4, polityId: 1 });

  const conquest = pushEvent(world, {
    type: 'settlement.conquered',
    subject: entityRef('settlement', 1),
    causes: [entityRef('warband', 7), entityRef('polity', 1), entityRef('polity', 2)],
    settlementId: 1,
    settlementName: 'Stoneford',
    previousPolityId: 2,
    newPolityId: 1,
    warbandId: 7,
    conquestCount: 1
  });

  const card = eventCardForEvent(world, conquest);
  assert.equal(card.headline, 'Stoneford falls to Amber Reach');
  assert.equal(card.subject.label, 'Stoneford');
  assert.deepEqual(card.subject.navigation, {
    kind: 'map', entityKind: 'settlement', entityId: 1, x: 5, y: 4, label: 'Show on map'
  });
  assert.equal(card.causes[0].label, 'Warband #7 · Amber Reach');
  assert.equal(card.causes[0].navigation.x, 5);
  assert.equal(card.causes[1].label, 'Amber Reach');
  assert.equal(card.causes[1].navigation.label, 'Capital · Amber Keep');
  assert.equal(card.causes[2].label, 'Blue March');
  assert.equal(card.causes[2].navigation.label, 'Capital · Stoneford');
});

test('command refs remain explicit unresolved identities and event-card projection is snapshot neutral', () => {
  const world = createWorld({ seed: 1503, width: 7, height: 7, population: 0, config: { waterLevel: -1 } });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  applyCommand(world, { type: 'meteor', x: 0, y: 0 });
  const event = world.history.find((candidate) => candidate.type === 'god.meteor');
  const postCommand = snapshotWorld(world);

  const card = eventCardForEvent(world, event);
  assert.equal(card.causes.length, 1);
  assert.equal(card.causes[0].status, 'unresolved');
  assert.match(card.causes[0].label, /Command #1 · meteor/);
  assert.match(card.causes[0].note, /command log not retained/i);
  assert.equal(card.causes[0].navigation, null);
  assert.deepEqual(snapshotWorld(world), postCommand);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.notDeepEqual(postCommand, before, 'the command changed history/command identity; the Event Card itself did not');
});

test('polity navigation is absent when no current capital can be resolved', () => {
  const world = createWorld({ seed: 1504, width: 7, height: 7, population: 0 });
  const polity = { id: 4, kind: 'polity', name: 'Lost Realm', active: false, capitalSettlementId: null };
  world.polities.push(polity);
  assert.equal(navigationForResolvedReference(world, entityRef('polity', 4), polity), null);
});
