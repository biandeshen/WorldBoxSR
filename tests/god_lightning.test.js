import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { historyForHuman, resolveEventReferences } from '../engine/analysis/history_query.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { ensureParentalUnion } from '../engine/model/parental_union.js';
import { vegetationRegrowthFactor } from '../engine/world/vegetation.js';

function makeWorld(seed = 9101, config = {}) {
  return createWorld({
    seed,
    width: 14,
    height: 14,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      ...config
    }
  });
}

function land(world) {
  return world.tiles.find((tile) => tile.passable);
}

function addHuman(world, tile, overrides = {}) {
  return createHuman(world, {
    x: tile.x,
    y: tile.y,
    ageYears: 25,
    sex: 'F',
    hunger: 0.1,
    ...overrides
  });
}

test('lightning resets exact-tile vegetation, kills exact-tile humans, and leaves food/terrain/RNG unchanged', () => {
  const world = makeWorld();
  const tile = land(world);
  const other = world.tiles.find((candidate) => candidate.passable && (candidate.x !== tile.x || candidate.y !== tile.y));
  const first = addHuman(world, tile, { sex: 'M' });
  const second = addHuman(world, tile, { sex: 'F' });
  const survivor = addHuman(world, other, { sex: 'M' });
  const foodBefore = world.tiles.map((cell) => cell.food);
  const terrainBefore = world.tiles.map(({ elevation, moisture, biome, passable, foodCapacity, vegetationCapacity, ownerSettlementId }) => ({
    elevation, moisture, biome, passable, foodCapacity, vegetationCapacity, ownerSettlementId
  }));
  const otherVegetation = other.vegetation;
  const vegetationBefore = tile.vegetation;
  const rngBefore = world.rng.snapshot();

  const struck = applyCommand(world, { type: 'lightning', x: tile.x, y: tile.y });

  assert.deepEqual(struck, [first.id, second.id]);
  assert.equal(tile.vegetation, 0);
  assert.equal(other.vegetation, otherVegetation);
  assert.deepEqual(world.tiles.map((cell) => cell.food), foodBefore);
  assert.deepEqual(
    world.tiles.map(({ elevation, moisture, biome, passable, foodCapacity, vegetationCapacity, ownerSettlementId }) => ({
      elevation, moisture, biome, passable, foodCapacity, vegetationCapacity, ownerSettlementId
    })),
    terrainBefore
  );
  assert.deepEqual(world.entities.map((human) => human.id), [survivor.id]);
  assert.equal(world.counters.deaths, 2);
  assert.equal(first.causeOfDeath, 'lightning');
  assert.equal(second.causeOfDeath, 'lightning');
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  const event = world.history.find((candidate) => candidate.type === 'god.lightning');
  assert.equal(event.vegetationBefore, vegetationBefore);
  assert.equal(event.vegetationAfter, 0);
  assert.deepEqual(event.entityIds, [first.id, second.id]);
  assert.deepEqual(event.causes, [{ kind: 'command', id: 1, commandType: 'lightning' }]);
  const deaths = world.history.filter((candidate) => candidate.type === 'human.died');
  assert.deepEqual(deaths.map((death) => death.entityId), [first.id, second.id]);
  assert.ok(deaths.every((death) => death.causes?.[0]?.kind === 'event' && death.causes[0].id === event.id));
});

test('human history resolves lightning death to the prior god lightning event', () => {
  const world = makeWorld(9102);
  const tile = land(world);
  const human = addHuman(world, tile);

  applyCommand(world, { type: 'lightning', x: tile.x, y: tile.y });

  const death = historyForHuman(world, human.id, { order: 'oldest' })
    .find((event) => event.type === 'human.died');
  assert.ok(death);
  assert.equal(death.cause, 'lightning');
  const refs = resolveEventReferences(world, death);
  assert.equal(refs.causes.length, 1);
  assert.equal(refs.causes[0].status, 'resolved');
  assert.equal(refs.causes[0].value.type, 'god.lightning');
});

test('lightning reuses union mortality and does not force settlement lifecycle off-cadence', () => {
  const world = makeWorld(9103, { settlementCheckIntervalDays: 30 });
  const tile = land(world);
  const adjacent = world.tiles.find((candidate) => candidate.passable && Math.max(Math.abs(candidate.x - tile.x), Math.abs(candidate.y - tile.y)) === 1);
  const settlement = createSettlement(world, { x: tile.x, y: tile.y });
  const first = addHuman(world, tile, { sex: 'F', settlementId: settlement.id });
  const second = addHuman(world, adjacent, { sex: 'M', settlementId: settlement.id });
  settlement.memberIds = [first.id, second.id];
  settlement.population = 2;
  const { union } = ensureParentalUnion(world, first, second);

  applyCommand(world, { type: 'lightning', x: tile.x, y: tile.y });

  assert.equal(union.firstDeceasedPartnerId, first.id);
  assert.equal(union.firstPartnerDeathDay, world.day);
  assert.equal(settlement.active, true);
  assert.equal(settlement.population, 2);
  assert.deepEqual(settlement.memberIds, [first.id, second.id]);

  tickWorld(world, 30);
  assert.equal(settlement.population, 1);
  assert.deepEqual(settlement.memberIds, [second.id]);
});

test('lightning-disturbed vegetation recovers through the existing deterministic regrowth loop', () => {
  const world = makeWorld(9104);
  const tile = land(world);
  applyCommand(world, { type: 'lightning', x: tile.x, y: tile.y });
  assert.equal(tile.vegetation, 0);

  const expectedDayOne = world.config.vegetationRegrowthPerDay * vegetationRegrowthFactor(tile);
  tickWorld(world, 1);
  assert.ok(Math.abs(tile.vegetation - expectedDayOne) < 1e-12);

  tickWorld(world, 20_000);
  assert.equal(tile.vegetation, tile.vegetationCapacity);
});

test('ocean lightning is an accepted zero-target no-op action and consumes no RNG', () => {
  const world = makeWorld(9105, { waterLevel: 0.55 });
  const ocean = world.tiles.find((tile) => !tile.passable);
  assert.ok(ocean, 'test world must include ocean');
  const rngBefore = world.rng.snapshot();
  const foodBefore = ocean.food;

  const struck = applyCommand(world, { type: 'lightning', x: ocean.x, y: ocean.y });

  assert.deepEqual(struck, []);
  assert.equal(ocean.vegetation, 0);
  assert.equal(ocean.food, foodBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  const event = world.history.at(-1);
  assert.equal(event.type, 'god.lightning');
  assert.equal(event.vegetationBefore, 0);
  assert.equal(event.vegetationAfter, 0);
  assert.deepEqual(event.entityIds, []);
});

test('invalid lightning coordinates consume no command ID and struck worlds save/load deterministically', () => {
  const world = makeWorld(9106);
  const tile = land(world);
  addHuman(world, tile, { sex: 'M' });

  assert.throws(() => applyCommand(world, { type: 'lightning', x: world.width, y: tile.y }), /x must be an integer/);
  assert.equal(world.nextCommandId, 1);

  applyCommand(world, { type: 'lightning', x: tile.x, y: tile.y });
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 300);
  tickWorld(restored, 300);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});
