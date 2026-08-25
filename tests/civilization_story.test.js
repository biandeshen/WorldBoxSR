import test from 'node:test';
import assert from 'node:assert/strict';
import {
  civilizationChronicle,
  chronicleEntryForEvent,
  formatChronicleDetail,
  formatChronicleLabel,
  latestCivilizationPulse,
  latestHistoryEventId,
  storyForEvent
} from '../client/presentation/civilization_story.js';
import {
  createCanonicalCollisionWorld,
  evaluateCivilizationCollisionGate,
  evolveCanonicalCollisionWorld
} from '../client/presentation/civilization_gate.js';
import { snapshotWorld } from '../engine/core/world.js';

test('civilization story projection turns authoritative political events into readable copy', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [
      { id: 1, name: 'Amber Reach' },
      { id: 2, name: 'Blue March' }
    ],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: []
  };
  const conquest = {
    id: 12,
    day: 720,
    type: 'settlement.conquered',
    settlementId: 7,
    settlementName: 'Stoneford',
    previousPolityId: 2,
    newPolityId: 1,
    conquestCount: 1
  };

  const story = storyForEvent(world, conquest);
  assert.equal(story.headline, 'Stoneford falls to Amber Reach');
  assert.match(story.detail, /Blue March/);
  assert.equal(story.pulse, true);
  assert.equal(formatChronicleLabel(story), 'Y2.0 · ⚑ Stoneford falls to Amber Reach');
  assert.match(formatChronicleDetail(story), /event #12/);
});

test('Meteor and Rain interventions remain readable world history without pretending to be autonomous pulses', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [],
    settlements: [],
    history: [
      { id: 1, day: 0, type: 'world.created' },
      { id: 2, day: 360, type: 'god.meteor', x: 4, y: 5, radius: 2, impactedTileCount: 25, vegetationRemoved: 18.5, humanCount: 2, creatureCount: 1, noEffect: false },
      { id: 3, day: 360, type: 'god.rain', x: 4, y: 5, radius: 2, impactedTileCount: 25, passableTileCount: 23, vegetationAdded: 19.25, foodAdded: 8.75, noEffect: false }
    ]
  };

  const meteor = storyForEvent(world, world.history[1]);
  assert.equal(meteor.headline, 'Meteor devastates 4,5');
  assert.match(meteor.detail, /3 lives/);
  assert.match(meteor.detail, /18\.5 vegetation/);
  assert.equal(meteor.pulse, false);

  const rain = storyForEvent(world, world.history[2]);
  assert.equal(rain.headline, 'Rain renews 4,5');
  assert.match(rain.detail, /\+19\.3 vegetation/);
  assert.match(rain.detail, /\+8\.8 food/);
  assert.match(rain.detail, /23 restored tiles/);
  assert.equal(rain.pulse, false, 'direct player restoration uses direct power feedback rather than competing with autonomous event pulses');

  const rows = civilizationChronicle(world, { limit: 3 });
  assert.equal(rows[0].eventType, 'god.rain');
  assert.equal(rows[1].eventType, 'god.meteor');
  assert.match(formatChronicleLabel(rows[0]), /☂ Rain renews 4,5/);
  assert.match(formatChronicleLabel(rows[1]), /☄ Meteor devastates 4,5/);
  assert.equal(latestCivilizationPulse(world, { afterEventId: 1 }), null, 'direct interventions do not become autonomous pulse events');

  const meteorNoEffect = storyForEvent(world, { id: 4, day: 361, type: 'god.meteor', x: 0, y: 0, radius: 2, noEffect: true });
  assert.match(meteorNoEffect.headline, /no effect/);
  assert.match(meteorNoEffect.detail, /no living targets or vegetation/);
  const rainNoEffect = storyForEvent(world, { id: 5, day: 361, type: 'god.rain', x: 0, y: 0, radius: 2, noEffect: true });
  assert.match(rainNoEffect.headline, /no effect/);
  assert.match(rainNoEffect.detail, /already saturated/);
});

test('chronicle keeps civilization transitions visible and gracefully humanizes fallback events', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [{ id: 1, name: 'Amber Reach' }, { id: 2, name: 'Blue March' }],
    settlements: [],
    history: [
      { id: 1, day: 0, type: 'world.created' },
      { id: 2, day: 360, type: 'polity.war_started', polityAId: 1, polityBId: 2, score: -64, reason: 'shared border' },
      { id: 3, day: 361, type: 'human.born' },
      { id: 4, day: 362, type: 'human.ate' }
    ]
  };

  const rows = civilizationChronicle(world, { limit: 3 });
  assert.equal(rows.length, 3);
  assert.ok(rows.some((entry) => entry.eventId === 2 && /go to war/.test(entry.headline)));
  assert.ok(rows.some((entry) => entry.story === false));
  assert.equal(chronicleEntryForEvent(world, world.history[2]).headline, 'Human Born');
});

test('repeated ruler churn cannot crowd war, battle, and conquest out of the civilization chronicle', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [{ id: 1, name: 'Amber Reach' }, { id: 2, name: 'Blue March' }],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 1, day: 100, type: 'polity.founded', polityId: 1, name: 'Amber Reach', capitalSettlementId: 7 },
      { id: 2, day: 200, type: 'polity.war_started', relationKey: '1:2', polityAId: 1, polityBId: 2, score: -70 },
      { id: 3, day: 230, type: 'warband.engaged', relationKey: '1:2', polityAId: 1, polityBId: 2, x: 4, y: 4, lossA: 2, lossB: 3, strengthA: 8, strengthB: 1 },
      { id: 4, day: 260, type: 'settlement.conquered', settlementId: 7, settlementName: 'Stoneford', previousPolityId: 2, newPolityId: 1, conquestCount: 1 },
      { id: 5, day: 300, type: 'polity.ruler_succeeded', polityId: 1, name: 'Amber Reach', rulerId: 11, previousRulerId: 10 },
      { id: 6, day: 320, type: 'polity.ruler_succeeded', polityId: 1, name: 'Amber Reach', rulerId: 12, previousRulerId: 11 },
      { id: 7, day: 340, type: 'polity.ruler_succeeded', polityId: 1, name: 'Amber Reach', rulerId: 13, previousRulerId: 12 },
      { id: 8, day: 350, type: 'polity.ruler_succeeded', polityId: 2, name: 'Blue March', rulerId: 21, previousRulerId: 20 }
    ]
  };

  const rows = civilizationChronicle(world, { limit: 6 });
  const types = rows.map((entry) => entry.eventType);
  assert.ok(types.includes('settlement.conquered'));
  assert.ok(types.includes('polity.war_started'));
  assert.ok(types.includes('warband.engaged'));
  assert.equal(types.filter((type) => type === 'polity.ruler_succeeded').length, 2, 'only the latest ruler change per polity should remain representative');
});

test('pulse cursor ignores old history and chooses the highest-value new political transition', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [{ id: 1, name: 'Amber Reach' }, { id: 2, name: 'Blue March' }],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 10, day: 100, type: 'polity.war_started', polityAId: 1, polityBId: 2, score: -70 },
      { id: 11, day: 130, type: 'warband.engaged', polityAId: 1, polityBId: 2, x: 4, y: 4, lossA: 2, lossB: 3, strengthA: 8, strengthB: 1 },
      { id: 12, day: 130, type: 'settlement.conquered', settlementId: 7, previousPolityId: 2, newPolityId: 1, conquestCount: 1 }
    ]
  };

  assert.equal(latestHistoryEventId(world), 12);
  assert.equal(latestCivilizationPulse(world, { afterEventId: 12 }), null, 'warmup cursor suppresses already-recorded history');
  const pulse = latestCivilizationPulse(world, { afterEventId: 10 });
  assert.equal(pulse.eventId, 12);
  assert.match(pulse.headline, /falls to/);
});

test('canonical collision gate uses real engine systems and deterministically proves the v0.3 civilization loop', () => {
  const left = createCanonicalCollisionWorld();
  const right = createCanonicalCollisionWorld();
  evolveCanonicalCollisionWorld(left);
  evolveCanonicalCollisionWorld(right);

  const gate = evaluateCivilizationCollisionGate(left);
  assert.equal(gate.pass, true, JSON.stringify(gate));
  assert.equal(gate.twoPowers, true);
  assert.equal(gate.rulers, true);
  assert.equal(gate.collision, true);
  assert.equal(gate.politicalMapChanged, true);
  assert.deepEqual(snapshotWorld(right), snapshotWorld(left));

  const storyTypes = left.history
    .filter((event) => ['polity.founded', 'polity.ruler_appointed', 'polity.war_started', 'warband.engaged', 'settlement.conquered'].includes(event.type))
    .map((event) => event.type);
  assert.ok(storyTypes.includes('polity.founded'));
  assert.ok(storyTypes.includes('polity.ruler_appointed'));
  assert.ok(storyTypes.includes('polity.war_started'));
  assert.ok(storyTypes.includes('warband.engaged'));
  assert.ok(storyTypes.includes('settlement.conquered'));
});
