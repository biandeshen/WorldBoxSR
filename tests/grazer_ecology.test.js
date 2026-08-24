import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { historyForCreature, historyForHuman, resolveHistoryReference } from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { updateGrazers } from '../engine/systems/grazers.js';

function land(world) {
  return world.tiles.find((tile) => tile.passable);
}

function behaviorFingerprint(world) {
  return {
    rng: world.rng.snapshot(),
    day: world.day,
    nextEntityId: world.nextEntityId,
    nextSettlementId: world.nextSettlementId,
    nextLineageId: world.nextLineageId,
    nextUnionId: world.nextUnionId,
    nextEventId: world.nextEventId,
    entities: world.entities.map((entity) => ({ ...entity })),
    settlements: world.settlements.map((settlement) => ({ ...settlement, memberIds: [...settlement.memberIds] })),
    lineages: world.lineages.map((lineage) => ({ ...lineage, memberIds: [...lineage.memberIds], founderIds: [...lineage.founderIds] })),
    unions: world.unions.map((union) => ({ ...union, partnerIds: [...union.partnerIds], childIds: [...union.childIds] })),
    history: world.history.map((event) => ({ ...event })),
    humanCounters: {
      births: world.counters.births,
      deaths: world.counters.deaths,
      meals: world.counters.meals
    },
    tileHumanState: world.tiles.map((tile) => ({
      food: tile.food,
      foodCapacity: tile.foodCapacity,
      ownerSettlementId: tile.ownerSettlementId,
      settlementCandidateDays: tile.settlementCandidateDays
    }))
  };
}

test('spawn_creature uses an independent typed ID domain and cannot leak into human history', () => {
  const world = createWorld({ seed: 9301, width: 12, height: 12, population: 2 });
  const tile = land(world);
  const nextHumanIdBefore = world.nextEntityId;
  const rngBefore = world.rng.snapshot();

  const creatureIds = applyCommand(world, {
    type: 'spawn_creature', species: 'grazer', x: tile.x, y: tile.y, count: 2
  });

  assert.deepEqual(creatureIds, [1, 2]);
  assert.equal(world.nextCreatureId, 3);
  assert.equal(world.nextEntityId, nextHumanIdBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.deepEqual(world.creatures.map((creature) => creature.id), [1, 2]);

  const event = world.history.at(-1);
  assert.equal(event.type, 'god.spawn_creature');
  assert.equal(event.species, 'grazer');
  assert.deepEqual(event.creatureIds, [1, 2]);
  assert.equal(Object.hasOwn(event, 'entityIds'), false);

  assert.equal(historyForHuman(world, 1).some((candidate) => candidate.type === 'god.spawn_creature'), false);
  assert.equal(historyForCreature(world, 1).some((candidate) => candidate.type === 'god.spawn_creature'), true);
  const resolved = resolveHistoryReference(world, { kind: 'entity', entityKind: 'creature', id: 1 });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.value.species, 'grazer');
});

test('hungry grazer moves toward the locally highest vegetation and eats without sequential RNG', () => {
  const world = createWorld({
    seed: 9302,
    width: 10,
    height: 10,
    population: 0,
    config: { vegetationRegrowthPerDay: 0, grazerPassiveMoveChance: 0 }
  });
  const origin = world.tiles.find((tile) => tile.passable && world.tiles.some((candidate) =>
    candidate.passable && Math.max(Math.abs(candidate.x - tile.x), Math.abs(candidate.y - tile.y)) === 1
  ));
  const neighbors = world.tiles.filter((tile) =>
    tile.passable && Math.max(Math.abs(tile.x - origin.x), Math.abs(tile.y - origin.y)) === 1
  );
  assert.ok(neighbors.length > 0);
  for (const tile of world.tiles) tile.vegetation = 0;
  const target = neighbors[0];
  target.vegetation = 3;
  const grazer = createGrazer(world, {
    x: origin.x,
    y: origin.y,
    hunger: world.config.grazerHungryThreshold
  });
  const rngBefore = world.rng.snapshot();

  updateGrazers(world);

  assert.equal(grazer.x, target.x);
  assert.equal(grazer.y, target.y);
  assert.equal(target.vegetation, 3 - world.config.grazerVegetationPerMeal);
  assert.equal(world.counters.creatureMeals, 1);
  assert.ok(grazer.hunger < world.config.grazerHungryThreshold);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('grazer starvation records typed creature death and removes only the creature', () => {
  const world = createWorld({
    seed: 9303,
    width: 10,
    height: 10,
    population: 1,
    config: {
      vegetationRegrowthPerDay: 0,
      grazerPassiveMoveChance: 0,
      grazerHungerPerDay: 0,
      grazerStarvationDamagePerDay: 0.03
    }
  });
  for (const tile of world.tiles) tile.vegetation = 0;
  const tile = land(world);
  const grazer = createGrazer(world, { x: tile.x, y: tile.y, hunger: 1, health: 0.04 });
  const humanIds = world.entities.map((human) => human.id);
  const rngBefore = world.rng.snapshot();

  updateGrazers(world);
  assert.equal(world.creatures.length, 1);
  updateGrazers(world);

  assert.equal(world.creatures.length, 0);
  assert.equal(grazer.alive, false);
  assert.equal(grazer.causeOfDeath, 'starvation');
  assert.equal(world.counters.creatureDeaths, 1);
  assert.equal(world.counters.deaths, 0);
  assert.deepEqual(world.entities.map((human) => human.id), humanIds);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  const death = world.history.at(-1);
  assert.equal(death.type, 'creature.died');
  assert.deepEqual(death.subject, { kind: 'entity', entityKind: 'creature', id: grazer.id });
  assert.equal(death.creatureId, grazer.id);
});

test('invalid creature spawns reject before command ID allocation', () => {
  const world = createWorld({ seed: 9304, width: 10, height: 10, population: 0, config: { waterLevel: 0.6 } });
  const water = world.tiles.find((candidate) => !candidate.passable);
  assert.ok(water);

  // Species validation precedes passability, so this case should not depend on
  // the high-water test world containing any land at all.
  assert.throws(
    () => applyCommand(world, { type: 'spawn_creature', species: 'wolf', x: 0, y: 0 }),
    /species must be grazer/
  );
  assert.equal(world.nextCommandId, 1);
  assert.throws(
    () => applyCommand(world, { type: 'spawn_creature', species: 'grazer', x: water.x, y: water.y }),
    /impassable/
  );
  assert.equal(world.nextCommandId, 1);
  assert.equal(world.nextCreatureId, 1);
});

test('creature state survives snapshot v10 save-load continuation exactly', () => {
  const world = createWorld({ seed: 9305, width: 12, height: 12, population: 4 });
  const tile = land(world);
  applyCommand(world, { type: 'spawn_creature', species: 'grazer', x: tile.x, y: tile.y, count: 3 });
  tickWorld(world, 400);
  const snapshot = snapshotWorld(world);
  assert.equal(snapshot.snapshotVersion, 10);
  assert.equal(snapshot.nextCreatureId, 4);
  assert.equal(snapshot.creatures.length, world.creatures.length);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotWorld(restored), snapshot);
  tickWorld(world, 300);
  tickWorld(restored, 300);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('grazer config is behavior-neutral to a creature-free human world', () => {
  const base = { seed: 9306, width: 20, height: 20, population: 30 };
  const first = createWorld({
    ...base,
    config: {
      grazerHungerPerDay: 0,
      grazerPassiveMoveChance: 0,
      grazerVegetationPerMeal: 0.2
    }
  });
  const second = createWorld({
    ...base,
    config: {
      grazerHungerPerDay: 1,
      grazerPassiveMoveChance: 1,
      grazerVegetationPerMeal: 10
    }
  });

  tickWorld(first, first.config.daysPerYear * 20);
  tickWorld(second, second.config.daysPerYear * 20);

  assert.equal(first.creatures.length, 0);
  assert.equal(second.creatures.length, 0);
  assert.deepEqual(behaviorFingerprint(second), behaviorFingerprint(first));
});

test('greater explicit grazer density produces stronger vegetation depletion in a controlled loop', () => {
  const counts = [0, 1, 5];
  const totals = [];

  for (const count of counts) {
    const world = createWorld({
      seed: 9307,
      width: 10,
      height: 10,
      population: 0,
      config: {
        vegetationRegrowthPerDay: 0.002,
        grazerHungerPerDay: 0,
        grazerHungryThreshold: 0,
        grazerEatAmount: 0,
        grazerPassiveMoveChance: 0
      }
    });
    const tile = land(world);
    if (count > 0) {
      applyCommand(world, { type: 'spawn_creature', species: 'grazer', x: tile.x, y: tile.y, count });
    }
    tickWorld(world, 180);
    totals.push(world.tiles.reduce((sum, candidate) => sum + candidate.vegetation, 0));
  }

  assert.ok(totals[0] > totals[1], `expected one grazer to reduce biomass: ${totals}`);
  assert.ok(totals[1] > totals[2], `expected five grazers to reduce biomass more: ${totals}`);
});
