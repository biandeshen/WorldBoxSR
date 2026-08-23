import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSpatialKin } from '../engine/core/kin_metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,80,98];

test('temporary 200-year spatial kin probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, 200 * world.config.daysPerYear);
    const k = summarizeSpatialKin(world);
    console.log(`KIN_SPATIAL ${JSON.stringify({ seed, ...k })}`);
    assert.ok(k.livingParentChildPairs >= 0);
  }
});
