import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,80,98];

test('temporary 200-year lineage baseline probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, 200 * world.config.daysPerYear);
    const s = summarizeWorld(world);
    console.log(`LINEAGE_BASELINE ${JSON.stringify({
      seed,
      population: s.population,
      lineages: s.lineages,
      extinctLineages: s.extinctLineages,
      extinctLineageShare: s.lineages ? s.extinctLineages / s.lineages : 0,
      orphanedHumans: s.orphanedHumans,
      orphanShare: s.population ? s.orphanedHumans / s.population : 0,
      maxGeneration: s.maxGeneration,
      averageLivingLineageSize: s.averageLivingLineageSize,
      averageHistoricalLineageSize: s.averageHistoricalLineageSize,
      maxLivingLineageSize: s.maxLivingLineageSize,
      settlements: s.settlements,
      abandonedSettlements: s.abandonedSettlements,
      foodUtilization: s.foodUtilization
    })}`);
    assert.equal(s.lineages, 30);
  }
});
