import test from 'node:test';
import assert from 'node:assert/strict';
import { historyForCreature } from '../engine/analysis/history_query.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, SNAPSHOT_VERSION, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { updateGrazerReproduction } from '../engine/systems/grazers.js';

function land(world) {
  return world.tiles.find((tile) => tile.passable);
}

function createEligiblePair(world, overridesA = {}, overridesB = {}) {
  const tile = land(world);
  const base = {
    x: tile.x,
    y: tile.y,
    ageDays: world.config.daysPerYear,
    hunger: 0.1,
    health: 1
  };
  return [
    createGrazer(world, { ...base, ...overridesA }),
    createGrazer(world, { ...base, ...overridesB })
  ];
}

function passablePairAtDistance(world, distance) {
  const passable = world.tiles.filter((tile) => tile.passable);
  for (const first of passable) {
    for (const second of passable) {
      if (first === second) continue;
      if (Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y)) === distance) {
        return [first, second];
      }
    }
  }
  throw new Error(`test world must contain passable cells at Chebyshev distance ${distance}`);
}

function reproductionWorld(seed = 9401, config = {}) {
  return createWorld({
    seed,
    width: 12,
    height: 12,
    population: 0,
    config: {
      grazerBirthChancePerEligiblePairPerDay: 1,
      grazerPassiveMoveChance: 0,
      ...config
    }
  });
}

test('eligible pair creates one typed grazer birth without sequential RNG', () => {
  const world = reproductionWorld();
  const [parentA, parentB] = createEligiblePair(world);
  const rngBefore = world.rng.snapshot();

  assert.equal(updateGrazerReproduction(world), 1);

  assert.equal(world.creatures.length, 3);
  assert.equal(world.counters.creatureBirths, 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(parentA.lastBirthDay, world.day);
  assert.equal(parentB.lastBirthDay, world.day);

  const child = world.creatures.at(-1);
  assert.equal(child.ageDays, 0);
  assert.equal(child.lastBirthDay, null);
  assert.equal(child.bornDay, world.day);
  assert.equal(child.x, parentA.x);
  assert.equal(child.y, parentA.y);

  const birth = world.history.at(-1);
  assert.equal(birth.type, 'creature.born');
  assert.deepEqual(birth.subject, { kind: 'entity', entityKind: 'creature', id: child.id });
  assert.deepEqual(birth.parentCreatureIds, [parentA.id, parentB.id]);
  assert.deepEqual(birth.causes, [
    { kind: 'entity', entityKind: 'creature', id: parentA.id },
    { kind: 'entity', entityKind: 'creature', id: parentB.id }
  ]);
  assert.equal(historyForCreature(world, child.id).some((event) => event.id === birth.id), true);
  assert.equal(historyForCreature(world, parentA.id).some((event) => event.id === birth.id), true);
  assert.equal(historyForCreature(world, parentB.id).some((event) => event.id === birth.id), true);

  assert.equal(updateGrazerReproduction(world), 0, 'successful parents must immediately enter cooldown');
  assert.equal(world.creatures.length, 3);
});

test('eligible parents may reproduce at Chebyshev distance 3', () => {
  const world = reproductionWorld(9402);
  const [first, second] = passablePairAtDistance(world, 3);
  const parentA = createGrazer(world, {
    x: first.x,
    y: first.y,
    ageDays: world.config.daysPerYear,
    hunger: 0.1,
    health: 1
  });
  const parentB = createGrazer(world, {
    x: second.x,
    y: second.y,
    ageDays: world.config.daysPerYear,
    hunger: 0.1,
    health: 1
  });
  const rngBefore = world.rng.snapshot();

  assert.equal(updateGrazerReproduction(world), 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.creatures.length, 3);
  assert.equal(parentA.lastBirthDay, world.day);
  assert.equal(parentB.lastBirthDay, world.day);
  assert.deepEqual(world.history.at(-1).parentCreatureIds, [parentA.id, parentB.id]);
});

test('otherwise eligible parents beyond Chebyshev distance 3 do not reproduce', () => {
  const world = reproductionWorld(9403);
  const [first, second] = passablePairAtDistance(world, 4);
  createGrazer(world, {
    x: first.x,
    y: first.y,
    ageDays: world.config.daysPerYear,
    hunger: 0.1,
    health: 1
  });
  createGrazer(world, {
    x: second.x,
    y: second.y,
    ageDays: world.config.daysPerYear,
    hunger: 0.1,
    health: 1
  });

  assert.equal(updateGrazerReproduction(world), 0);
  assert.equal(world.creatures.length, 2);
  assert.equal(world.counters.creatureBirths, 0);
});

test('grazer reproduction rejects each pre-registered eligibility failure', () => {
  {
    const world = reproductionWorld(9410);
    createEligiblePair(world, { ageDays: world.config.daysPerYear - 1 });
    assert.equal(updateGrazerReproduction(world), 0, 'immature parent');
  }
  {
    const world = reproductionWorld(9411);
    createEligiblePair(world, { hunger: world.config.grazerHungryThreshold + 0.01 });
    assert.equal(updateGrazerReproduction(world), 0, 'hungry parent');
  }
  {
    const world = reproductionWorld(9412);
    createEligiblePair(world, { health: 0.94 });
    assert.equal(updateGrazerReproduction(world), 0, 'low-health parent');
  }
  {
    const world = reproductionWorld(9413);
    createEligiblePair(world);
    for (const tile of world.tiles) tile.vegetation = 0;
    assert.equal(updateGrazerReproduction(world), 0, 'low local vegetation');
  }
  {
    const world = reproductionWorld(9414);
    world.day = 100;
    createEligiblePair(world, { lastBirthDay: 100 });
    assert.equal(updateGrazerReproduction(world), 0, 'parent on cooldown');
  }
  {
    const world = reproductionWorld(9415);
    const [first, second] = passablePairAtDistance(world, 4);
    createGrazer(world, {
      x: first.x, y: first.y, ageDays: world.config.daysPerYear, hunger: 0.1, health: 1
    });
    createGrazer(world, {
      x: second.x, y: second.y, ageDays: world.config.daysPerYear, hunger: 0.1, health: 1
    });
    assert.equal(updateGrazerReproduction(world), 0, 'no eligible partner within radius 3');
  }
});

test('default-off reproduction leaves cooldown state behaviorally inert', () => {
  const options = {
    seed: 9420,
    width: 12,
    height: 12,
    population: 0,
    config: { grazerBirthChancePerEligiblePairPerDay: 0 }
  };
  const first = createWorld(options);
  const second = createWorld(options);
  const tile = land(first);
  const secondTile = second.tiles[tile.y * second.width + tile.x];
  const adultAge = first.config.daysPerYear * 2;
  createGrazer(first, { x: tile.x, y: tile.y, ageDays: adultAge, lastBirthDay: null });
  createGrazer(second, { x: secondTile.x, y: secondTile.y, ageDays: adultAge, lastBirthDay: 0 });
  const rngFirst = first.rng.snapshot();
  const rngSecond = second.rng.snapshot();

  tickWorld(first, 500);
  tickWorld(second, 500);

  assert.equal(first.counters.creatureBirths, 0);
  assert.equal(second.counters.creatureBirths, 0);
  assert.deepEqual(first.rng.snapshot(), rngFirst);
  assert.deepEqual(second.rng.snapshot(), rngSecond);
  assert.equal(first.creatures.length, second.creatures.length);
  const stripCooldown = (creature) => {
    const { lastBirthDay, ...rest } = creature;
    return rest;
  };
  assert.deepEqual(second.creatures.map(stripCooldown), first.creatures.map(stripCooldown));
  assert.deepEqual(second.tiles, first.tiles);
});

test('snapshot v10 migrates deterministically to inert reproduction state under current schema', () => {
  const world = createWorld({ seed: 9430, width: 12, height: 12, population: 2 });
  const tile = land(world);
  createGrazer(world, { x: tile.x, y: tile.y, ageDays: 50 });
  const legacy = JSON.parse(JSON.stringify(snapshotWorld(world)));
  legacy.snapshotVersion = 10;
  delete legacy.config.grazerBirthChancePerEligiblePairPerDay;
  delete legacy.counters.creatureBirths;
  for (const creature of legacy.creatures) delete creature.lastBirthDay;

  const restored = worldFromSnapshot(legacy);

  assert.equal(restored.snapshotVersion, SNAPSHOT_VERSION);
  assert.equal(restored.config.grazerBirthChancePerEligiblePairPerDay, 0);
  assert.equal(restored.counters.creatureBirths, 0);
  assert.equal(restored.creatures[0].lastBirthDay, null);
  const migrated = snapshotWorld(restored);
  assert.equal(migrated.snapshotVersion, SNAPSHOT_VERSION);
  assert.equal(migrated.creatures[0].lastBirthDay, null);
  assert.equal(migrated.counters.creatureBirths, 0);
});

test('enabled reproduction survives save-load continuation with cooldowns and birth history', () => {
  const world = reproductionWorld(9440, { grazerBirthChancePerEligiblePairPerDay: 1 });
  createEligiblePair(world);
  tickWorld(world, 1);
  assert.equal(world.counters.creatureBirths, 1);
  assert.equal(world.creatures.length, 3);
  assert.equal(world.creatures[0].lastBirthDay, 1);
  assert.equal(world.creatures[1].lastBirthDay, 1);

  const snapshot = snapshotWorld(world);
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  tickWorld(world, 400);
  tickWorld(restored, 400);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('multi-seed reproduction regression grows low density and stays bounded when overloaded', () => {
  for (const seed of [1, 4, 9]) {
    const low = seededAdultWorld(seed, 20);
    const high = seededAdultWorld(seed, 200);
    const lowRng = low.rng.snapshot();
    const highRng = high.rng.snapshot();

    tickWorld(low, low.config.daysPerYear * 10);
    tickWorld(high, high.config.daysPerYear * 10);

    const lowSummary = summarizeWorld(low);
    const highSummary = summarizeWorld(high);
    assert.ok(lowSummary.grazers > 20 && lowSummary.grazers < 100, `seed ${seed} low density ${lowSummary.grazers}`);
    assert.ok(lowSummary.creatureBirths > 0, `seed ${seed} low density must reproduce`);
    assert.ok(lowSummary.vegetationUtilization > 0.8, `seed ${seed} low vegetation ${lowSummary.vegetationUtilization}`);

    assert.ok(highSummary.creatureBirths > 0 && highSummary.creatureBirths < 50, `seed ${seed} high births ${highSummary.creatureBirths}`);
    assert.ok(highSummary.grazers < 200, `seed ${seed} overloaded population ${highSummary.grazers}`);
    assert.ok(highSummary.vegetationUtilization < 0.15, `seed ${seed} high vegetation ${highSummary.vegetationUtilization}`);
    assert.deepEqual(low.rng.snapshot(), lowRng, `seed ${seed} low density consumed sequential RNG`);
    assert.deepEqual(high.rng.snapshot(), highRng, `seed ${seed} high density consumed sequential RNG`);
  }
});

function seededAdultWorld(seed, count) {
  const world = createWorld({
    seed,
    width: 24,
    height: 24,
    population: 0,
    config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
  });
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  const adultAgeDays = 2 * world.config.daysPerYear;
  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays: adultAgeDays,
      bornDay: -adultAgeDays
    });
  }
  return world;
}
