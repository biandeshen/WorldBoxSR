import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, passableNeighbors8, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createGrazer } from '../engine/model/grazer.js';

function makePairWorld(config = {}) {
  const world = createWorld({
    seed: 10001,
    width: 10,
    height: 10,
    population: 0,
    config: {
      grazerBirthChancePerEligiblePairPerDay: 1,
      grazerHungerPerDay: 0,
      grazerPassiveMoveChance: 0,
      grazerRecoveryPerDay: 0,
      grazerEatAmount: 0,
      vegetationRegrowthPerDay: 0,
      ...config
    }
  });
  fillVegetation(world, 1);
  return world;
}

function adjacentTiles(world) {
  for (const tile of world.tiles) {
    if (!tile.passable) continue;
    const neighbor = passableNeighbors8(world, tile.x, tile.y)[0];
    if (neighbor) return [tile, neighbor];
  }
  throw new Error('test world needs adjacent passable tiles');
}

function farTiles(world) {
  const passable = world.tiles.filter((tile) => tile.passable);
  for (const a of passable) {
    const b = passable.find((candidate) => Math.max(Math.abs(a.x - candidate.x), Math.abs(a.y - candidate.y)) > 1);
    if (b) return [a, b];
  }
  throw new Error('test world needs separated passable tiles');
}

function fillVegetation(world, ratio) {
  for (const tile of world.tiles) {
    if (tile.passable) tile.vegetation = tile.vegetationCapacity * ratio;
  }
}

function addAdult(world, tile, overrides = {}) {
  return createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 2 * world.config.daysPerYear,
    hunger: 0.1,
    health: 1,
    bornDay: -2 * world.config.daysPerYear,
    ...overrides
  });
}

test('eligible stable pair produces one typed birth, cools both parents, and consumes no sequential RNG', () => {
  const world = makePairWorld();
  const [tile] = adjacentTiles(world);
  const parentA = addAdult(world, tile);
  const parentB = addAdult(world, tile);
  const rngBefore = world.rng.snapshot();

  tickWorld(world, 1);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(world.creatures.length, 3);
  assert.equal(world.counters.creatureBirths, 1);
  assert.equal(parentA.lastBirthDay, 0);
  assert.equal(parentB.lastBirthDay, 0);
  const child = world.creatures.find((creature) => creature.id !== parentA.id && creature.id !== parentB.id);
  assert.ok(child);
  assert.equal(child.ageDays, 0);
  assert.equal(child.bornDay, 0);
  assert.equal(child.lastBirthDay, null);

  const event = world.history.find((candidate) => candidate.type === 'creature.born');
  assert.ok(event);
  assert.deepEqual(event.subject, { kind: 'entity', entityKind: 'creature', id: child.id });
  assert.deepEqual(event.causes, [
    { kind: 'entity', entityKind: 'creature', id: parentA.id },
    { kind: 'entity', entityKind: 'creature', id: parentB.id }
  ]);
  assert.deepEqual(event.parentIds, [parentA.id, parentB.id]);
  assert.equal(event.creatureId, child.id);
  assert.equal(event.species, 'grazer');
  assert.equal(summarizeWorld(world).creatureBirths, 1);

  tickWorld(world, 1);
  assert.equal(world.counters.creatureBirths, 1, 'one-year cooldown prevents immediate repeat birth');
});

test('stable pairing uses each grazer at most once per day', () => {
  const world = makePairWorld();
  const [tile] = adjacentTiles(world);
  const first = addAdult(world, tile);
  const second = addAdult(world, tile);
  const third = addAdult(world, tile);

  tickWorld(world, 1);

  assert.equal(world.counters.creatureBirths, 1);
  assert.equal(first.lastBirthDay, 0);
  assert.equal(second.lastBirthDay, 0);
  assert.equal(third.lastBirthDay, null);
});

test('reproduction gates reject immature, hungry, low-health, low-vegetation, cooldown, and separated pairs', () => {
  const cases = [
    {
      name: 'immature',
      prepare(world, a, b) {
        a.ageDays = 0;
        b.ageDays = 0;
      }
    },
    {
      name: 'hungry',
      prepare(world, a, b) {
        a.hunger = 0.6;
        b.hunger = 0.6;
      }
    },
    {
      name: 'low-health',
      prepare(world, a, b) {
        a.health = 0.9;
        b.health = 0.9;
      }
    },
    {
      name: 'low-vegetation',
      prepare(world) {
        fillVegetation(world, 0);
      }
    },
    {
      name: 'cooldown',
      prepare(world, a, b) {
        a.lastBirthDay = 0;
        b.lastBirthDay = 0;
      }
    }
  ];

  for (const entry of cases) {
    const world = makePairWorld();
    const [tile] = adjacentTiles(world);
    const a = addAdult(world, tile);
    const b = addAdult(world, tile);
    entry.prepare(world, a, b);
    tickWorld(world, 1);
    assert.equal(world.counters.creatureBirths, 0, `${entry.name} pair should not reproduce`);
  }

  const separated = makePairWorld();
  const [aTile, bTile] = farTiles(separated);
  addAdult(separated, aTile);
  addAdult(separated, bTile);
  tickWorld(separated, 1);
  assert.equal(separated.counters.creatureBirths, 0);
});

test('default-off reproduction ignores cooldown state and preserves existing world behavior', () => {
  const a = createWorld({ seed: 10002, width: 16, height: 16, population: 24 });
  const b = createWorld({ seed: 10002, width: 16, height: 16, population: 24 });
  const landA = a.tiles.find((tile) => tile.passable);
  const landB = b.tiles.find((tile) => tile.x === landA.x && tile.y === landA.y);
  createGrazer(a, { x: landA.x, y: landA.y, ageDays: 720 });
  createGrazer(b, { x: landB.x, y: landB.y, ageDays: 720, lastBirthDay: 0 });

  tickWorld(a, 180);
  tickWorld(b, 180);

  assert.equal(a.config.grazerBirthChancePerEligiblePairPerDay, 0);
  assert.equal(b.config.grazerBirthChancePerEligiblePairPerDay, 0);
  assert.equal(a.counters.creatureBirths, 0);
  assert.equal(b.counters.creatureBirths, 0);
  assert.deepEqual(a.rng.snapshot(), b.rng.snapshot());
  assert.deepEqual(withoutReproductionState(snapshotWorld(a)), withoutReproductionState(snapshotWorld(b)));
});

test('snapshot v10 migrates deterministically to v11 reproduction defaults', () => {
  const world = createWorld({ seed: 10003, width: 10, height: 10, population: 0 });
  const land = world.tiles.find((tile) => tile.passable);
  createGrazer(world, { x: land.x, y: land.y, ageDays: 100 });
  const old = JSON.parse(JSON.stringify(snapshotWorld(world)));
  old.snapshotVersion = 10;
  delete old.config.grazerBirthChancePerEligiblePairPerDay;
  delete old.counters.creatureBirths;
  for (const creature of old.creatures) delete creature.lastBirthDay;

  const first = worldFromSnapshot(old);
  const second = worldFromSnapshot(JSON.parse(JSON.stringify(old)));
  assert.equal(first.snapshotVersion, 11);
  assert.equal(first.config.grazerBirthChancePerEligiblePairPerDay, 0);
  assert.equal(first.counters.creatureBirths, 0);
  assert.equal(first.creatures[0].lastBirthDay, null);
  assert.deepEqual(snapshotWorld(first), snapshotWorld(second));
});

test('enabled reproduction survives deterministic save-load continuation', () => {
  const world = makePairWorld({ grazerBirthChancePerEligiblePairPerDay: 1 });
  const [tile] = adjacentTiles(world);
  addAdult(world, tile);
  addAdult(world, tile);
  tickWorld(world, 400);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 400);
  tickWorld(restored, 400);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('enabled multi-seed regression grows low density and preserves resource-limited overloaded carrying pressure', () => {
  for (const seed of [1, 4, 9]) {
    const low = createWorld({
      seed,
      width: 24,
      height: 24,
      population: 0,
      config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
    });
    seedAdultGrazers(low, 20);
    const lowRngBefore = low.rng.snapshot();
    tickWorld(low, 10 * low.config.daysPerYear);
    const lowSummary = summarizeWorld(low);
    assert.ok(lowSummary.grazers > 20 && lowSummary.grazers < 100, `seed ${seed} low density should grow gradually`);
    assert.ok(lowSummary.creatureBirths > 0, `seed ${seed} low density should record births`);
    assert.ok(lowSummary.vegetationUtilization > 0.5, `seed ${seed} low density should retain abundant vegetation`);
    assert.deepEqual(low.rng.snapshot(), lowRngBefore);

    const high = createWorld({
      seed,
      width: 24,
      height: 24,
      population: 0,
      config: { grazerBirthChancePerEligiblePairPerDay: 0.001 }
    });
    seedAdultGrazers(high, 200);
    const highRngBefore = high.rng.snapshot();
    tickWorld(high, 10 * high.config.daysPerYear);
    const highSummary = summarizeWorld(high);
    assert.ok(highSummary.creatureBirths > 0, `seed ${seed} overloaded case should exercise reproduction`);
    assert.ok(highSummary.grazers < 190, `seed ${seed} overloaded population should self-thin rather than run away`);
    assert.ok(highSummary.vegetationUtilization > 0.01 && highSummary.vegetationUtilization < 0.12,
      `seed ${seed} overloaded vegetation should settle in the measured pressure regime`);
    const capacityPerGrazer = highSummary.vegetationCapacity / highSummary.grazers;
    assert.ok(capacityPerGrazer > 12 && capacityPerGrazer < 19,
      `seed ${seed} should remain near the external carrying envelope without reading a target`);
    assert.deepEqual(high.rng.snapshot(), highRngBefore);
  }
});

function seedAdultGrazers(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
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
}

function withoutReproductionState(snapshot) {
  const copy = JSON.parse(JSON.stringify(snapshot));
  delete copy.config.grazerBirthChancePerEligiblePairPerDay;
  delete copy.counters.creatureBirths;
  for (const creature of copy.creatures) delete creature.lastBirthDay;
  return copy;
}
