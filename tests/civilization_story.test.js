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
