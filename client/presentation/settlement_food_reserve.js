import {
  normalizedSettlementFoodStored,
  settlementFoodReserveCapacity
} from '../../engine/model/settlement_food_reserve.js';

const EPSILON = 1e-9;
const SEGMENT_COUNT = 5;

export function settlementFoodReserveProfile(settlement) {
  const visible = Boolean(settlement?.active);
  const capacity = settlementFoodReserveCapacity(settlement);
  const stored = visible
    ? Math.min(capacity, normalizedSettlementFoodStored(settlement?.foodStored))
    : 0;
  const ratio = capacity > 0 ? stored / capacity : 0;
  const state = !visible
    ? 'inactive'
    : stored <= EPSILON
      ? 'depleted'
      : ratio < 0.4
        ? 'low'
        : ratio < 0.8
          ? 'stable'
          : 'full';
  const fillSegments = !visible || stored <= EPSILON
    ? 0
    : Math.max(1, Math.min(SEGMENT_COUNT, Math.round(ratio * SEGMENT_COUNT)));

  return Object.freeze({
    visible,
    stored,
    capacity,
    ratio,
    state,
    fillSegments,
    segmentCount: SEGMENT_COUNT
  });
}

export function formatSettlementFoodReserveAmount(value) {
  const number = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (Math.abs(number - Math.round(number)) <= EPSILON) return String(Math.round(number));
  return number.toFixed(1).replace(/\.0$/, '');
}

export function formatSettlementFoodReserveLine(settlement) {
  const profile = settlementFoodReserveProfile(settlement);
  if (!profile.visible) return null;
  return `Food reserve ${formatSettlementFoodReserveAmount(profile.stored)} / ${formatSettlementFoodReserveAmount(profile.capacity)} · ${profile.state}`;
}
