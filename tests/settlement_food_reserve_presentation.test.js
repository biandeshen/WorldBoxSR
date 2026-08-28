import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSettlementFoodReserveLine,
  settlementFoodReserveProfile
} from '../client/presentation/settlement_food_reserve.js';

test('settlement food reserve projection derives stable ratio states from authoritative facts only', () => {
  const base = { active: true, population: 4, foodStored: 0 };
  assert.deepEqual(
    settlementFoodReserveProfile(base),
    Object.freeze({ visible: true, stored: 0, capacity: 10, ratio: 0, state: 'depleted', fillSegments: 0, segmentCount: 5 })
  );

  const low = settlementFoodReserveProfile({ ...base, foodStored: 3 });
  assert.equal(low.state, 'low');
  assert.equal(low.ratio, 0.3);
  assert.equal(low.fillSegments, 2);

  const stable = settlementFoodReserveProfile({ ...base, foodStored: 6 });
  assert.equal(stable.state, 'stable');
  assert.equal(stable.ratio, 0.6);
  assert.equal(stable.fillSegments, 3);

  const full = settlementFoodReserveProfile({ ...base, foodStored: 8.5 });
  assert.equal(full.state, 'full');
  assert.equal(full.ratio, 0.85);
  assert.equal(full.fillSegments, 4);
});

test('map and Inspector can share the same reserve projection and inactive ruins expose no active reserve line', () => {
  const settlement = { active: true, population: 3, foodStored: 4.25 };
  const profile = settlementFoodReserveProfile(settlement);
  assert.equal(profile.capacity, 8);
  assert.equal(profile.state, 'stable');
  assert.equal(formatSettlementFoodReserveLine(settlement), 'Food reserve 4.3 / 8 · stable');

  const inactive = { ...settlement, active: false };
  assert.equal(settlementFoodReserveProfile(inactive).visible, false);
  assert.equal(formatSettlementFoodReserveLine(inactive), null);
});
