import test from 'node:test';
import assert from 'node:assert/strict';
import { historyForCreature, resolveEventReferences } from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createWolf } from '../engine/model/wolf.js';
import { updateWolves } from '../engine/systems/wolves.js';

function flatWorld(seed = 45) {
  const world = createWorld({ seed, width: 8, height: 8, population: 0 });
  for (const tile of world.tiles) {
    tile.passable = true;
    tile.biome = 'land';
    tile.foodCapacity = Math.max(1, tile.foodCapacity);
    tile.food = tile.foodCapacity;
    tile.vegetationCapacity = Math.max(1, tile.vegetationCapacity);
    tile.vegetation = tile.vegetationCapacity;
  }
  return world;
}

function creature(world, id) {
  return world.creatures.find((candidate) => candidate.id === id) ?? null;
}

test('hungry Wolf deterministically kills one adjacent lowest-id Grazer and records causal predation', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 2, y: 2, hunger: 0.35, health: 0.8 });
  const prey = createGrazer(world, { x: 3, y: 2 });
  const other = createGrazer(world, { x: 2, y: 3 });
  const rngBefore = world.rng.snapshot();

  updateWolves(world);

  assert.equal(creature(world, prey.id), null, 'selected prey must be removed after shared death bookkeeping');
  assert.equal(creature(world, other.id)?.alive, true, 'one Wolf may kill at most one prey per day');
  assert.equal(creature(world, wolf.id)?.alive, true);
  assert.equal(wolf.ageDays, 1);
  assert.equal(wolf.hunger, 0);
  assert.equal(world.counters.creatureDeaths, 1);
  assert.equal(world.counters.creatureMeals, 1);
  assert.deepEqual(world.rng.snapshot(), rngBefore, 'Wolf predation must not consume sequential RNG');

  const predation = world.history.find((event) => event.type === 'creature.predated');
  const death = world.history.find((event) => event.type === 'creature.died' && event.creatureId === prey.id);
  assert.ok(predation);
  assert.ok(death);
  assert.deepEqual(predation.subject, { kind: 'entity', entityKind: 'creature', id: prey.id });
  assert.deepEqual(predation.causes, [{ kind: 'entity', entityKind: 'creature', id: wolf.id }]);
  assert.equal(predation.predatorCreatureId, wolf.id);
  assert.equal(predation.predatorSpecies, 'wolf');
  assert.equal(predation.preyCreatureId, prey.id);
  assert.equal(predation.preySpecies, 'grazer');
  assert.equal(predation.predatorHungerBefore, 0.36);
  assert.equal(predation.predatorHungerAfter, 0);
  assert.equal(death.cause, 'predation');
  assert.deepEqual(death.causes, [{ kind: 'event', id: predation.id }]);

  const predationRefs = resolveEventReferences(world, predation);
  assert.equal(predationRefs.subject.status, 'unresolved', 'dead prey is truthfully no longer current');
  assert.equal(predationRefs.subject.reason, 'entity_not_currently_present');
  assert.equal(predationRefs.causes[0].status, 'resolved');
  assert.equal(predationRefs.causes[0].value.id, wolf.id);
  const deathRefs = resolveEventReferences(world, death);
  assert.equal(deathRefs.causes[0].status, 'resolved');
  assert.equal(deathRefs.causes[0].value.id, predation.id);

  assert.ok(historyForCreature(world, wolf.id, { order: 'oldest' }).some((event) => event.id === predation.id));
  assert.deepEqual(
    historyForCreature(world, prey.id, { order: 'oldest' }).filter((event) => event.type === 'creature.predated' || event.type === 'creature.died').map((event) => event.id),
    [predation.id, death.id]
  );
});

test('hungry Wolf moves at most one passable step toward nearest prey before hunting range', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 1, y: 1, hunger: 0.35 });
  const prey = createGrazer(world, { x: 4, y: 1 });

  updateWolves(world);

  assert.deepEqual({ x: wolf.x, y: wolf.y }, { x: 2, y: 1 });
  assert.equal(creature(world, prey.id)?.alive, true);
  assert.equal(world.history.some((event) => event.type === 'creature.predated'), false);
});

test('non-hungry Wolf does not move or kill even with adjacent prey', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 2, y: 2, hunger: 0.10 });
  const prey = createGrazer(world, { x: 3, y: 2 });

  updateWolves(world);

  assert.deepEqual({ x: wolf.x, y: wolf.y }, { x: 2, y: 2 });
  assert.equal(wolf.hunger, 0.11);
  assert.equal(creature(world, prey.id)?.alive, true);
  assert.equal(world.history.some((event) => event.type === 'creature.predated'), false);
});

test('Wolf cannot cross impassable geometry merely because prey is nearby', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 1, y: 1, hunger: 0.35 });
  const prey = createGrazer(world, { x: 3, y: 1 });
  for (const y of [0, 1, 2]) world.tiles[y * world.width + 2].passable = false;

  updateWolves(world);

  assert.deepEqual({ x: wolf.x, y: wolf.y }, { x: 1, y: 1 });
  assert.equal(creature(world, prey.id)?.alive, true);
});

test('prey outside bounded search radius is ignored', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 0, y: 0, hunger: 0.35 });
  const prey = createGrazer(world, { x: 7, y: 7 });

  updateWolves(world);

  assert.deepEqual({ x: wolf.x, y: wolf.y }, { x: 0, y: 0 });
  assert.equal(creature(world, prey.id)?.alive, true);
});

test('Wolf without prey can starve through the shared creature lifecycle', () => {
  const world = flatWorld();
  const wolf = createWolf(world, { x: 2, y: 2, hunger: 0.90, health: 0.02 });

  updateWolves(world);

  assert.equal(creature(world, wolf.id), null);
  const death = world.history.find((event) => event.type === 'creature.died' && event.creatureId === wolf.id);
  assert.ok(death);
  assert.equal(death.species, 'wolf');
  assert.equal(death.cause, 'starvation');
  assert.equal(world.counters.creatureDeaths, 1);
});

test('Wolf predation is byte-deterministic and sequential-RNG neutral', () => {
  const first = flatWorld(17);
  const second = flatWorld(17);
  for (const world of [first, second]) {
    createWolf(world, { x: 1, y: 1, hunger: 0.34 });
    createGrazer(world, { x: 5, y: 1 });
    createGrazer(world, { x: 5, y: 2 });
  }
  const rngBefore = first.rng.snapshot();

  tickWorld(first, 30);
  tickWorld(second, 30);

  assert.deepEqual(snapshotWorld(first), snapshotWorld(second));
  assert.deepEqual(first.rng.snapshot(), rngBefore);
  assert.deepEqual(second.rng.snapshot(), rngBefore);
  assert.ok(first.history.some((event) => event.type === 'creature.predated'));
});

test('save-load continuation with an active hungry Wolf matches uninterrupted simulation', () => {
  const uninterrupted = flatWorld(29);
  createWolf(uninterrupted, { x: 1, y: 1, hunger: 0.34, health: 0.9 });
  createGrazer(uninterrupted, { x: 6, y: 1 });
  createGrazer(uninterrupted, { x: 6, y: 2 });

  tickWorld(uninterrupted, 1);
  const checkpoint = snapshotWorld(uninterrupted);
  const restored = worldFromSnapshot(checkpoint);

  tickWorld(uninterrupted, 40);
  tickWorld(restored, 40);

  assert.deepEqual(snapshotWorld(restored), snapshotWorld(uninterrupted));
  assert.ok(uninterrupted.history.some((event) => event.type === 'creature.predated'));
});