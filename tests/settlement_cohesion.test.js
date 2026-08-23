import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRng } from '../engine/core/rng.js';
import { createWorld, passableNeighbors8, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';

function adjacentLandPair(world) {
  for (const tile of world.tiles) {
    if (!tile.passable) continue;
    const neighbor = passableNeighbors8(world, tile.x, tile.y)[0];
    if (neighbor) return { home: tile, position: neighbor };
  }
  throw new Error('expected adjacent passable tiles');
}

function landLineOfThree(world) {
  for (const tile of world.tiles) {
    if (!tile.passable) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const b = world.tiles[(tile.y + dy) * world.width + tile.x + dx];
      const c = world.tiles[(tile.y + dy * 2) * world.width + tile.x + dx * 2];
      if (b?.passable && c?.passable) return { home: tile, position: b, away: c };
    }
  }
  throw new Error('expected three passable tiles in a line');
}

test('settled non-hungry humans take homeward passive steps when home bias is certain', () => {
  const world = createWorld({
    seed: 333,
    width: 16,
    height: 16,
    population: 0,
    config: { passiveMoveChance: 1, settlementHomeBiasChance: 1, settlementCheckIntervalDays: 1000 }
  });
  const { home, position } = adjacentLandPair(world);
  const settlement = createSettlement(world, { x: home.x, y: home.y });
  const human = createHuman(world, { x: position.x, y: position.y, sex: 'M', hunger: 0.1, settlementId: settlement.id });

  tickWorld(world, 1);
  assert.deepEqual([human.x, human.y], [home.x, home.y]);
});

test('hunger-driven food movement overrides settlement home bias', () => {
  const world = createWorld({
    seed: 444,
    width: 18,
    height: 18,
    population: 0,
    config: { passiveMoveChance: 1, settlementHomeBiasChance: 1, settlementCheckIntervalDays: 1000 }
  });
  const { home, position, away } = landLineOfThree(world);
  const settlement = createSettlement(world, { x: home.x, y: home.y });
  const human = createHuman(world, { x: position.x, y: position.y, sex: 'M', hunger: 0.8, settlementId: settlement.id });

  for (const tile of passableNeighbors8(world, position.x, position.y)) tile.food = 0;
  away.food = away.foodCapacity;
  world.tiles[position.y * world.width + position.x].food = 0;

  tickWorld(world, 1);
  assert.deepEqual([human.x, human.y], [away.x, away.y]);
});

test('disabling home bias preserves the original passive-movement RNG path', () => {
  const world = createWorld({
    seed: 555,
    width: 16,
    height: 16,
    population: 0,
    config: { passiveMoveChance: 1, settlementHomeBiasChance: 0, settlementCheckIntervalDays: 1000 }
  });
  const { home, position } = adjacentLandPair(world);
  const settlement = createSettlement(world, { x: home.x, y: home.y });
  const human = createHuman(world, { x: position.x, y: position.y, sex: 'M', hunger: 0.1, settlementId: settlement.id });
  const candidates = passableNeighbors8(world, human.x, human.y);
  const expectedRng = SeededRng.fromSnapshot(world.rng.snapshot());
  const expected = candidates[expectedRng.int(candidates.length)];

  tickWorld(world, 1);

  assert.deepEqual([human.x, human.y], [expected.x, expected.y]);
  assert.deepEqual(world.rng.snapshot(), expectedRng.snapshot());
});

test('home-bias override does not perturb the sequential RNG stream on the same pre-state', () => {
  const make = (bias) => {
    const world = createWorld({
      seed: 777,
      width: 16,
      height: 16,
      population: 0,
      config: { passiveMoveChance: 1, settlementHomeBiasChance: bias, settlementCheckIntervalDays: 1000 }
    });
    const { home, position } = adjacentLandPair(world);
    const settlement = createSettlement(world, { x: home.x, y: home.y });
    createHuman(world, { x: position.x, y: position.y, sex: 'M', hunger: 0.1, settlementId: settlement.id });
    return world;
  };

  const unbiased = make(0);
  const biased = make(1);
  assert.deepEqual(unbiased.rng.snapshot(), biased.rng.snapshot());

  tickWorld(unbiased, 1);
  tickWorld(biased, 1);

  assert.deepEqual(unbiased.rng.snapshot(), biased.rng.snapshot());
});
