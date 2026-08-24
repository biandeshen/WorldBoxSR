import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { deriveSettlementResources } from '../engine/analysis/settlement_resources.js';
import { summarizeSettlementFoodStorage } from '../engine/systems/settlement_food_storage.js';

const checkpoints = [100, 120, 140, 160, 180, 200];

test('temporary seed98 settlement-level storage survival audit', () => {
  const offWorld = createWorld({ seed: 98, width: 24, height: 24, population: 30 });
  const onWorld = createWorld({
    seed: 98,
    width: 24,
    height: 24,
    population: 30,
    config: { settlementFoodStorageEnabled: true }
  });

  const rows = [];
  let previousYear = 0;
  for (const year of checkpoints) {
    const days = (year - previousYear) * offWorld.config.daysPerYear;
    tickWorld(offWorld, days);
    tickWorld(onWorld, days);
    previousYear = year;

    rows.push({
      year,
      off: snapshotSettlements(offWorld),
      on: snapshotSettlements(onWorld)
    });
  }

  const off200 = rows.at(-1).off;
  const on200 = rows.at(-1).on;
  const offAbandoned = off200.filter((settlement) => !settlement.active);
  const rescuedIds = offAbandoned
    .filter((settlement) => on200.find((other) => other.id === settlement.id)?.active)
    .map((settlement) => settlement.id);

  assert.equal(offAbandoned.length, 1);
  assert.deepEqual(rescuedIds, [5]);
  console.log(`SEED98_STORAGE_SURVIVAL_AUDIT ${JSON.stringify({ rescuedIds, rows })}`);
});

function snapshotSettlements(world) {
  const resources = new Map(deriveSettlementResources(world).map((entry) => [entry.settlementId, entry]));
  const storage = new Map(
    summarizeSettlementFoodStorage(world).settlements.map((entry) => [entry.settlementId, entry])
  );

  return world.settlements.map((settlement) => {
    const resource = resources.get(settlement.id);
    const store = storage.get(settlement.id);
    return {
      id: settlement.id,
      name: settlement.name,
      active: settlement.active,
      foundedDay: settlement.foundedDay,
      abandonedDay: settlement.abandonedDay,
      population: settlement.population,
      foodRemainingFraction: round(resource?.foodRemainingFraction ?? 0),
      foodPerMember: nullableRound(resource?.foodPerMember),
      foodCapacityPerMember: nullableRound(resource?.foodCapacityPerMember),
      storedFood: round(store?.storedFood ?? 0),
      deposited: round(store?.deposited ?? 0),
      withdrawn: round(store?.withdrawn ?? 0),
      storeMeals: store?.storeMeals ?? 0,
      strandedAtAbandonment: nullableRound(store?.strandedAtAbandonment)
    };
  });
}

function nullableRound(value) {
  return value === null || value === undefined ? null : round(value);
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
