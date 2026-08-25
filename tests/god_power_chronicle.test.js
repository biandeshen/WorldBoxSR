import test from 'node:test';
import assert from 'node:assert/strict';
import { civilizationChronicle } from '../client/presentation/civilization_story.js';

test('World Chronicle retains the two latest direct interventions even with all representative civilization groups present', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [{ id: 1, name: 'Amber Reach' }, { id: 2, name: 'Blue March' }],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 1, day: 10, type: 'polity.founded', polityId: 1, name: 'Amber Reach', capitalSettlementId: 7 },
      { id: 2, day: 20, type: 'polity.ruler_appointed', polityId: 1, name: 'Amber Reach', rulerId: 10 },
      { id: 3, day: 30, type: 'polity.war_started', relationKey: '1:2', polityAId: 1, polityBId: 2, score: -70 },
      { id: 4, day: 40, type: 'warband.mobilized', relationKey: '1:2', polityId: 1, opponentPolityId: 2, strength: 10, originSettlementId: 7, targetSettlementId: 8 },
      { id: 5, day: 50, type: 'warband.engaged', relationKey: '1:2', polityAId: 1, polityBId: 2, x: 4, y: 4, lossA: 1, lossB: 2, strengthA: 9, strengthB: 5 },
      { id: 6, day: 60, type: 'settlement.conquered', settlementId: 7, settlementName: 'Stoneford', previousPolityId: 2, newPolityId: 1, conquestCount: 1 },
      { id: 7, day: 100, type: 'god.meteor', x: 5, y: 5, radius: 2, impactedTileCount: 25, vegetationRemoved: 100, humanCount: 2, creatureCount: 3, noEffect: false },
      { id: 8, day: 100, type: 'god.rain', x: 5, y: 5, radius: 2, impactedTileCount: 25, passableTileCount: 24, vegetationAdded: 120, foodAdded: 15, noEffect: false }
    ]
  };

  const rows = civilizationChronicle(world, { limit: 7 });
  const ids = rows.map((entry) => entry.eventId);
  assert.equal(rows[0].eventType, 'god.rain');
  assert.equal(rows[1].eventType, 'god.meteor');
  assert.ok(ids.includes(8));
  assert.ok(ids.includes(7));
  assert.ok(rows.some((entry) => entry.eventType === 'settlement.conquered'));
  assert.ok(rows.some((entry) => entry.eventType === 'polity.war_started'));
  assert.ok(rows.some((entry) => entry.eventType === 'warband.engaged'));
});

test('a single intervention consumes only one Chronicle slot so other representative groups remain available', () => {
  const world = {
    config: { daysPerYear: 360 },
    polities: [{ id: 1, name: 'Amber Reach' }, { id: 2, name: 'Blue March' }],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 1, day: 10, type: 'polity.founded', polityId: 1, name: 'Amber Reach', capitalSettlementId: 7 },
      { id: 2, day: 20, type: 'polity.ruler_appointed', polityId: 1, name: 'Amber Reach', rulerId: 10 },
      { id: 3, day: 30, type: 'polity.war_started', relationKey: '1:2', polityAId: 1, polityBId: 2, score: -70 },
      { id: 4, day: 40, type: 'warband.mobilized', relationKey: '1:2', polityId: 1, opponentPolityId: 2, strength: 10, originSettlementId: 7, targetSettlementId: 8 },
      { id: 5, day: 50, type: 'warband.engaged', relationKey: '1:2', polityAId: 1, polityBId: 2, x: 4, y: 4, lossA: 1, lossB: 2, strengthA: 9, strengthB: 5 },
      { id: 6, day: 60, type: 'settlement.conquered', settlementId: 7, settlementName: 'Stoneford', previousPolityId: 2, newPolityId: 1, conquestCount: 1 },
      { id: 7, day: 100, type: 'god.meteor', x: 5, y: 5, radius: 2, impactedTileCount: 25, vegetationRemoved: 100, humanCount: 2, creatureCount: 3, noEffect: false }
    ]
  };

  const rows = civilizationChronicle(world, { limit: 7 });
  assert.equal(rows.length, 7);
  assert.equal(rows.filter((entry) => entry.eventType === 'god.meteor').length, 1);
  assert.ok(rows.some((entry) => entry.eventType === 'warband.mobilized'), 'unused second intervention slot must not suppress army representation');
});
