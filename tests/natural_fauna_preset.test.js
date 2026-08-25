import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import {
  initializeValidatedNaturalGrazers,
  NATURAL_GRAZER_CONFIG,
  NATURAL_GRAZER_FOUNDER_COUNT,
  NATURAL_GRAZER_MAX_FOUNDER_AGE_YEARS,
  naturalGrazerSpawnPool
} from '../engine/world/natural_fauna.js';

function ecologyWorld(seed = 45, population = 30) {
  return createWorld({
    seed,
    width: 24,
    height: 24,
    population,
    config: NATURAL_GRAZER_CONFIG
  });
}

test('validated natural-fauna initializer is exact, keyed and sequential-RNG neutral', () => {
  const control = ecologyWorld(45);
  const world = ecologyWorld(45);
  const rngBefore = world.rng.snapshot();
  const pool = naturalGrazerSpawnPool(world).map((tile) => `${tile.x},${tile.y}`);

  const founders = initializeValidatedNaturalGrazers(world);

  assert.equal(founders.length, NATURAL_GRAZER_FOUNDER_COUNT);
  assert.equal(world.creatures.length, NATURAL_GRAZER_FOUNDER_COUNT);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.deepEqual(world.rng.snapshot(), control.rng.snapshot());
  assert.deepEqual(founders.map((creature) => creature.id), [1,2,3,4,5,6,7,8,9,10]);
  assert.ok(founders.every((creature) => pool.includes(`${creature.x},${creature.y}`)));
  assert.deepEqual(founders.map((creature) => `${creature.x},${creature.y}`), pool.slice(0, NATURAL_GRAZER_FOUNDER_COUNT));

  const maxAgeDays = NATURAL_GRAZER_MAX_FOUNDER_AGE_YEARS * world.config.daysPerYear;
  assert.ok(founders.every((creature) => creature.ageDays >= 0 && creature.ageDays <= maxAgeDays));
  assert.ok(new Set(founders.map((creature) => creature.ageDays)).size > 1);
  assert.ok(founders.every((creature) => creature.bornDay === -creature.ageDays));

  const duplicate = ecologyWorld(45);
  initializeValidatedNaturalGrazers(duplicate);
  assert.deepEqual(snapshotWorld(duplicate), snapshotWorld(world));
});

test('natural-fauna founders survive snapshot round-trip exactly', () => {
  const world = ecologyWorld(45);
  initializeValidatedNaturalGrazers(world);
  const snapshot = snapshotWorld(world);
  assert.deepEqual(snapshotWorld(worldFromSnapshot(snapshot)), snapshot);
});

test('initializer rejects unsupported scope and accidental double seeding', () => {
  const compact = createWorld({ seed: 1, width: 16, height: 16, population: 0, config: NATURAL_GRAZER_CONFIG });
  assert.throws(() => initializeValidatedNaturalGrazers(compact), /exactly 24x24/);

  const wrongConfig = createWorld({ seed: 1, width: 24, height: 24, population: 0 });
  assert.throws(() => initializeValidatedNaturalGrazers(wrongConfig), /validated natural grazer ecology settings/);

  const world = ecologyWorld(1, 0);
  initializeValidatedNaturalGrazers(world);
  assert.throws(() => initializeValidatedNaturalGrazers(world), /empty creature domain/);
});

test('supported seed45 ecology produces natural birth and vegetation pressure without reseeding', () => {
  const first = ecologyWorld(45);
  initializeValidatedNaturalGrazers(first);
  const second = ecologyWorld(45);
  initializeValidatedNaturalGrazers(second);

  const initialVegetation = first.tiles.reduce((sum, tile) => sum + tile.vegetation, 0);
  const initialNextCreatureId = first.nextCreatureId;
  const horizon = 40 * first.config.daysPerYear;
  let firstBirthDay = null;
  let minVegetation = initialVegetation;

  for (let day = 0; day < horizon; day += 1) {
    tickWorld(first, 1);
    tickWorld(second, 1);
    const vegetation = first.tiles.reduce((sum, tile) => sum + tile.vegetation, 0);
    minVegetation = Math.min(minVegetation, vegetation);
    if (firstBirthDay === null && first.history.some((event) => event.type === 'creature.born')) firstBirthDay = first.day;
    if (firstBirthDay !== null && minVegetation < initialVegetation - 1) break;
  }

  assert.notEqual(firstBirthDay, null, 'seed45 should naturally reproduce within the bounded ecology horizon');
  assert.ok(first.nextCreatureId > initialNextCreatureId, 'new creature IDs must come only from normal reproduction after founders');
  assert.ok(minVegetation < initialVegetation - 1, 'grazing should materially draw vegetation below its initial total');
  assert.equal(first.history.some((event) => event.type === 'god.spawn_creature'), false);
  assert.deepEqual(snapshotWorld(first), snapshotWorld(second));
});
