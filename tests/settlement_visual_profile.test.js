import test from 'node:test';
import assert from 'node:assert/strict';
import { populationTier, settlementVisualProfile } from '../client/presentation/settlement_visual_profile.js';

test('current-scale population bands map to four settlement visual tiers', () => {
  assert.equal(populationTier(0), 1);
  assert.equal(populationTier(4), 1);
  assert.equal(populationTier(5), 2);
  assert.equal(populationTier(9), 2);
  assert.equal(populationTier(10), 3);
  assert.equal(populationTier(19), 3);
  assert.equal(populationTier(20), 4);
  assert.equal(populationTier(120), 4);
});

test('settlement growth materially expands footprint and building density', () => {
  const hamlet = settlementVisualProfile(2);
  const village = settlementVisualProfile(6);
  const town = settlementVisualProfile(12);
  const city = settlementVisualProfile(24);

  assert.deepEqual([hamlet.label, village.label, town.label, city.label], ['hamlet', 'village', 'town', 'city']);
  assert.deepEqual(
    [hamlet.houseOffsets.length, village.houseOffsets.length, town.houseOffsets.length, city.houseOffsets.length],
    [2, 5, 8, 11]
  );
  assert.deepEqual(
    [hamlet.farmOffsets.length, village.farmOffsets.length, town.farmOffsets.length, city.farmOffsets.length],
    [0, 2, 4, 5]
  );
  assert.ok(village.groundWidth > hamlet.groundWidth);
  assert.ok(town.groundWidth > village.groundWidth);
  assert.ok(city.groundWidth > town.groundWidth);
  assert.ok(city.groundWidth >= hamlet.groundWidth * 2, `city width ${city.groundWidth} should be at least 2× hamlet ${hamlet.groundWidth}`);
  assert.ok(city.groundHeight >= hamlet.groundHeight * 2, `city height ${city.groundHeight} should be at least 2× hamlet ${hamlet.groundHeight}`);
  assert.equal(hamlet.hall, false);
  assert.equal(village.hall, false);
  assert.equal(town.hall, true);
  assert.equal(city.hall, true);
});

test('capital emphasis is presentation-only and does not change population tier', () => {
  const member = settlementVisualProfile(6);
  const capital = settlementVisualProfile(6, { isCapital: true });

  assert.equal(member.tier, capital.tier);
  assert.equal(member.groundWidth, capital.groundWidth);
  assert.equal(member.groundHeight, capital.groundHeight);
  assert.equal(member.capitalEmphasis, false);
  assert.equal(capital.capitalEmphasis, true);
  assert.equal(member.hall, false);
  assert.equal(capital.hall, true);
  assert.ok(capital.civicScale > member.civicScale);
  assert.ok(capital.bannerScale > member.bannerScale);
});

test('returned placement arrays are independent copies', () => {
  const first = settlementVisualProfile(24);
  first.houseOffsets[0][0] = 999;
  first.farmOffsets.push([999, 999]);

  const second = settlementVisualProfile(24);
  assert.notEqual(second.houseOffsets[0][0], 999);
  assert.equal(second.farmOffsets.some(([x, y]) => x === 999 && y === 999), false);
});
