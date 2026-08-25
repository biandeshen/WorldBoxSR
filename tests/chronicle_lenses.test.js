import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHRONICLE_LENS_LIMIT,
  chronicleLensDefinition,
  chronicleRowsForLens,
  eventAllowedByChronicleLens
} from '../client/presentation/chronicle_lenses.js';
import { civilizationChronicle } from '../client/presentation/civilization_story.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';

function storyWorld() {
  return {
    config: { daysPerYear: 360 },
    polities: [
      { id: 1, name: 'Amber Reach' },
      { id: 2, name: 'Blue March' }
    ],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 1, day: 0, type: 'world.created' },
      { id: 2, day: 100, type: 'polity.founded', polityId: 1, name: 'Amber Reach', capitalSettlementId: 7 },
      { id: 3, day: 110, type: 'human.born', entityId: 40 },
      { id: 4, day: 120, type: 'polity.ruler_appointed', polityId: 1, name: 'Amber Reach', rulerId: 10 },
      { id: 5, day: 130, type: 'polity.war_started', polityAId: 1, polityBId: 2, score: -70, reason: 'shared border' },
      { id: 6, day: 140, type: 'warband.mobilized', polityId: 1, opponentPolityId: 2, strength: 8, originSettlementId: 7, targetSettlementId: 7 },
      { id: 7, day: 150, type: 'warband.engaged', polityAId: 1, polityBId: 2, x: 4, y: 4, lossA: 1, lossB: 2, strengthA: 7, strengthB: 5 },
      { id: 8, day: 160, type: 'settlement.conquered', settlementId: 7, settlementName: 'Stoneford', previousPolityId: 2, newPolityId: 1, conquestCount: 1 },
      { id: 9, day: 170, type: 'polity.peace_made', polityAId: 1, polityBId: 2, score: -10, reason: 'war ended' },
      { id: 10, day: 180, type: 'polity.ruler_succeeded', polityId: 1, name: 'Amber Reach', rulerId: 11, previousRulerId: 10, reason: 'death' },
      { id: 11, day: 190, type: 'god.meteor', x: 3, y: 3, radius: 2, impactedTileCount: 25, vegetationRemoved: 12, humanCount: 1, creatureCount: 0, noEffect: false },
      { id: 12, day: 200, type: 'god.rain', x: 3, y: 3, radius: 2, passableTileCount: 25, vegetationAdded: 12, foodAdded: 3, noEffect: false },
      { id: 13, day: 210, type: 'settlement.rebelled', settlementId: 7, settlementName: 'Stoneford', previousOwnerPolityId: 1, population: 14 }
    ]
  };
}

test('Highlights is exactly the existing representative Chronicle behavior', () => {
  const world = storyWorld();
  assert.deepEqual(
    chronicleRowsForLens(world, 'highlights'),
    civilizationChronicle(world, { limit: CHRONICLE_LENS_LIMIT })
  );
});

test('Recent shows newest retained readable World Story events only', () => {
  const world = storyWorld();
  const rows = chronicleRowsForLens(world, 'recent', { limit: 5 });
  assert.deepEqual(rows.map((row) => row.eventId), [13, 12, 11, 10, 9]);
  assert.equal(rows.some((row) => row.eventId === 3), false, 'ordinary human.born is not a World Story lens row');
  assert.ok(rows.every((row) => eventAllowedByChronicleLens(world.history.find((event) => event.id === row.eventId), 'recent')));
});

test('Conflict and Rule lenses use exact explicit story-type membership', () => {
  const world = storyWorld();
  const conflict = chronicleRowsForLens(world, 'conflict', { limit: 20 });
  assert.deepEqual(conflict.map((row) => row.eventId), [13, 9, 8, 7, 6, 5]);
  assert.ok(conflict.every((row) => eventAllowedByChronicleLens(world.history.find((event) => event.id === row.eventId), 'conflict')));
  assert.equal(conflict.some((row) => [2, 4, 10, 11, 12].includes(row.eventId)), false);

  const rule = chronicleRowsForLens(world, 'rule', { limit: 20 });
  assert.deepEqual(rule.map((row) => row.eventId), [10, 4, 2]);
  assert.ok(rule.every((row) => eventAllowedByChronicleLens(world.history.find((event) => event.id === row.eventId), 'rule')));
  assert.equal(rule.some((row) => [5, 7, 8, 9, 11, 12, 13].includes(row.eventId)), false);
});

test('a lens with no matching retained story stays truthfully empty', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [],
    settlements: [],
    history: [
      { id: 1, day: 0, type: 'world.created' },
      { id: 2, day: 1, type: 'human.born', entityId: 1 }
    ]
  };
  assert.deepEqual(chronicleRowsForLens(world, 'conflict'), []);
  assert.deepEqual(chronicleRowsForLens(world, 'rule'), []);
  assert.equal(chronicleLensDefinition('conflict').empty, 'No retained conflict stories.');
});

test('Chronicle lens projection is snapshot/RNG neutral', () => {
  const world = createWorld({ seed: 410, width: 8, height: 8, population: 2 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  for (const lens of ['highlights', 'recent', 'conflict', 'rule']) {
    chronicleRowsForLens(world, lens);
  }

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('Chronicle lens API rejects unsupported lenses and invalid limits', () => {
  const world = storyWorld();
  assert.throws(() => chronicleLensDefinition('analytics'), /unsupported Chronicle lens/);
  assert.throws(() => chronicleRowsForLens(world, 'recent', { limit: 0 }), /positive integer/);
  assert.throws(() => chronicleRowsForLens({}, 'recent'), /world\.history/);
});
