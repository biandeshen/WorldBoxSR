import test from 'node:test';
import assert from 'node:assert/strict';
import { historyForCreature } from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

function land(world) {
  return world.tiles.find((tile) => tile.passable);
}

function mortalityWorld(seed = 9501, config = {}) {
  return createWorld({
    seed,
    width: 12,
    height: 12,
    population: 0,
    config: {
      grazerOldAgeMortalityEnabled: true,
      grazerHungerPerDay: 0,
      grazerPassiveMoveChance: 0,
      grazerBirthChancePerEligiblePairPerDay: 0,
      ...config
    }
  });
}

test('grazer old-age mortality is default-off and behaviorally inert', () => {
  const common = {
    seed: 9500,
    width: 12,
    height: 12,
    population: 0,
    config: {
      grazerHungerPerDay: 0,
      grazerPassiveMoveChance: 0,
      grazerBirthChancePerEligiblePairPerDay: 0
    }
  };
  const implicit = createWorld(common);
  const explicit = createWorld({
    ...common,
    config: { ...common.config, grazerOldAgeMortalityEnabled: false }
  });
  const firstTile = land(implicit);
  const secondTile = explicit.tiles[firstTile.y * explicit.width + firstTile.x];
  const oldAge = 40 * implicit.config.daysPerYear;
  createGrazer(implicit, { x: firstTile.x, y: firstTile.y, ageDays: oldAge, hunger: 0.1 });
  createGrazer(explicit, { x: secondTile.x, y: secondTile.y, ageDays: oldAge, hunger: 0.1 });

  tickWorld(implicit, 2000);
  tickWorld(explicit, 2000);

  assert.equal(implicit.creatures.length, 1);
  assert.equal(explicit.creatures.length, 1);
  assert.deepEqual(snapshotWorld(explicit), snapshotWorld(implicit));
  assert.equal(implicit.history.some((event) => event.type === 'creature.died' && event.cause === 'old_age'), false);
});

test('enabled old-age hazard cannot kill a grazer before age 12', () => {
  const world = mortalityWorld(9501);
  const tile = land(world);
  const grazer = createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 11 * world.config.daysPerYear,
    hunger: 0.1
  });
  const rngBefore = world.rng.snapshot();

  tickWorld(world, world.config.daysPerYear - 1);

  assert.equal(world.creatures.length, 1);
  assert.equal(grazer.alive, true);
  assert.equal(grazer.ageDays, 12 * world.config.daysPerYear - 1);
  assert.equal(world.counters.creatureDeaths, 0);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('enabled old-age hazard is keyed-deterministic and emits typed causal death', () => {
  const world = mortalityWorld(9501);
  const tile = land(world);
  const grazer = createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 30 * world.config.daysPerYear,
    hunger: 0.1
  });
  const rngBefore = world.rng.snapshot();

  // With the validated hazard salt/curve, seed 9501 + creature 1 first
  // crosses the capped age-30 daily hazard on authoritative day 471.
  tickWorld(world, 470);
  assert.equal(grazer.alive, true);
  assert.equal(world.counters.creatureDeaths, 0);

  tickWorld(world, 1);

  assert.equal(world.day, 471);
  assert.equal(world.creatures.length, 0);
  assert.equal(grazer.alive, false);
  assert.equal(grazer.causeOfDeath, 'old_age');
  assert.equal(grazer.ageDays, 30 * world.config.daysPerYear + 471);
  assert.equal(world.counters.creatureDeaths, 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  const death = world.history.at(-1);
  assert.equal(death.type, 'creature.died');
  assert.deepEqual(death.subject, { kind: 'entity', entityKind: 'creature', id: grazer.id });
  assert.equal(death.creatureId, grazer.id);
  assert.equal(death.cause, 'old_age');
  assert.equal(death.ageDays, grazer.ageDays);
  assert.equal(historyForCreature(world, grazer.id).some((event) => event.id === death.id), true);
});

test('starvation remains earlier and cannot double-kill as old age', () => {
  const world = mortalityWorld(9502, {
    vegetationRegrowthPerDay: 0,
    grazerStarvationDamagePerDay: 0.03
  });
  for (const tile of world.tiles) tile.vegetation = 0;
  const tile = land(world);
  const grazer = createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 30 * world.config.daysPerYear,
    hunger: 1,
    health: 0.02
  });
  const rngBefore = world.rng.snapshot();

  tickWorld(world, 1);

  assert.equal(world.creatures.length, 0);
  assert.equal(grazer.causeOfDeath, 'starvation');
  assert.equal(world.counters.creatureDeaths, 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  const deaths = world.history.filter((event) => event.type === 'creature.died' && event.creatureId === grazer.id);
  assert.equal(deaths.length, 1);
  assert.equal(deaths[0].cause, 'starvation');
});

test('enabled old-age mortality survives save-load continuation exactly', () => {
  const world = mortalityWorld(9501);
  const tile = land(world);
  createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 30 * world.config.daysPerYear,
    hunger: 0.1
  });
  const snapshot = snapshotWorld(world);
  assert.equal(snapshot.snapshotVersion, 11);
  assert.equal(snapshot.config.grazerOldAgeMortalityEnabled, true);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotWorld(restored), snapshot);

  tickWorld(world, 1000);
  tickWorld(restored, 1000);

  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
  assert.equal(world.creatures.length, 0);
  assert.equal(world.history.some((event) => event.type === 'creature.died' && event.cause === 'old_age'), true);
});

test('existing v11 snapshots without mortality config restore default-off without a schema bump', () => {
  const world = createWorld({
    seed: 9503,
    width: 12,
    height: 12,
    population: 0,
    config: { grazerHungerPerDay: 0, grazerPassiveMoveChance: 0 }
  });
  const tile = land(world);
  createGrazer(world, {
    x: tile.x,
    y: tile.y,
    ageDays: 40 * world.config.daysPerYear,
    hunger: 0.1
  });
  const legacyV11 = JSON.parse(JSON.stringify(snapshotWorld(world)));
  delete legacyV11.config.grazerOldAgeMortalityEnabled;

  const restored = worldFromSnapshot(legacyV11);

  assert.equal(restored.snapshotVersion, 11);
  assert.equal(restored.config.grazerOldAgeMortalityEnabled, false);
  tickWorld(restored, 1000);
  assert.equal(restored.creatures.length, 1);
  assert.equal(restored.history.some((event) => event.type === 'creature.died' && event.cause === 'old_age'), false);
});

test('enabled 60-year ecology reproduces the validated Sprint 019 population and birth fingerprint', () => {
  const expected = new Map([
    ['20:1', { living: 93, births: 199 }],
    ['20:4', { living: 109, births: 260 }],
    ['20:9', { living: 128, births: 249 }],
    ['100:1', { living: 11, births: 48 }],
    ['100:4', { living: 69, births: 148 }],
    ['100:9', { living: 130, births: 185 }],
    ['200:1', { living: 26, births: 55 }],
    ['200:4', { living: 62, births: 111 }],
    ['200:9', { living: 124, births: 170 }]
  ]);

  for (const density of [20, 100, 200]) {
    for (const seed of [1, 4, 9]) {
      const world = seededAdultWorld(seed, density);
      const rngBefore = world.rng.snapshot();

      tickWorld(world, world.config.daysPerYear * 60);

      const target = expected.get(`${density}:${seed}`);
      assert.equal(world.creatures.length, target.living, `density ${density} seed ${seed} living`);
      assert.equal(world.counters.creatureBirths, target.births, `density ${density} seed ${seed} births`);
      assert.ok(world.creatures.length > 0, `density ${density} seed ${seed} must survive`);
      assert.ok(target.births > 0, `density ${density} seed ${seed} must reproduce`);
      assert.equal(
        world.history.some((event) => event.type === 'creature.died' && event.cause === 'old_age'),
        true,
        `density ${density} seed ${seed} must have old-age turnover`
      );
      assert.deepEqual(world.rng.snapshot(), rngBefore, `density ${density} seed ${seed} consumed sequential RNG`);
    }
  }
});

function seededAdultWorld(seed, count) {
  const world = createWorld({
    seed,
    width: 24,
    height: 24,
    population: 0,
    config: {
      grazerBirthChancePerEligiblePairPerDay: 0.001,
      grazerOldAgeMortalityEnabled: true
    }
  });
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  const ageDays = 2 * world.config.daysPerYear;
  for (let index = 0; index < count; index += 1) {
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays,
      bornDay: -ageDays
    });
  }
  return world;
}
