import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { summarizeSettlementFoodStorage } from '../engine/systems/settlement_food_storage.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 6-seed 100-year settlement storage off-vs-on probe', () => {
  const rows = [];

  for (const seed of seeds) {
    const offWorld = createWorld({ seed, width: 24, height: 24, population: 30 });
    const onWorld = createWorld({
      seed,
      width: 24,
      height: 24,
      population: 30,
      config: { settlementFoodStorageEnabled: true }
    });
    const days = 100 * offWorld.config.daysPerYear;
    tickWorld(offWorld, days);
    tickWorld(onWorld, days);

    const off = summarizeWorld(offWorld);
    const on = summarizeWorld(onWorld);
    const storage = summarizeSettlementFoodStorage(onWorld);

    rows.push({
      seed,
      off: pickWorld(off),
      on: pickWorld(on),
      delta: {
        population: on.population - off.population,
        births: on.births - off.births,
        deaths: on.deaths - off.deaths,
        meals: on.meals - off.meals,
        settlements: on.settlements - off.settlements,
        activeSettlements: on.activeSettlements - off.activeSettlements,
        abandonedSettlements: on.abandonedSettlements - off.abandonedSettlements,
        settledPopulation: on.settledPopulation - off.settledPopulation,
        food: round(on.food - off.food),
        averageHunger: round(on.averageHunger - off.averageHunger)
      },
      storage: {
        totalStored: round(storage.totalStored),
        totalCapacity: round(storage.totalCapacity),
        utilization: round(storage.capacityUtilization),
        totalDeposited: round(storage.totalDeposited),
        totalWithdrawn: round(storage.totalWithdrawn),
        storeMeals: storage.storeMeals,
        strandedFood: round(storage.strandedFood),
        settlementsWithStorage: storage.settlementsWithStorage
      }
    });
  }

  const seed45 = rows.find((row) => row.seed === 45);
  assert.deepEqual(
    { population: seed45.off.population, births: seed45.off.births, deaths: seed45.off.deaths },
    { population: 35, births: 44, deaths: 39 }
  );
  assert.equal(rows.length, seeds.length);
  console.log(`SETTLEMENT_STORAGE_AB_100Y ${JSON.stringify({ rows })}`);
});

function pickWorld(summary) {
  return {
    population: summary.population,
    births: summary.births,
    deaths: summary.deaths,
    meals: summary.meals,
    settlements: summary.settlements,
    activeSettlements: summary.activeSettlements,
    abandonedSettlements: summary.abandonedSettlements,
    settledPopulation: summary.settledPopulation,
    territoryCoverage: round(summary.territoryCoverage),
    food: round(summary.food),
    foodUtilization: round(summary.foodUtilization),
    averageHunger: round(summary.averageHunger)
  };
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
