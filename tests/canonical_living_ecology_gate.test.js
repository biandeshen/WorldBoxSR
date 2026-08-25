import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { applyCommand } from '../engine/core/commands.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createShowcaseWorld } from '../client/presentation/world_adapter.js';
import { ecologyStoryForEvent } from '../client/presentation/ecology_story.js';
import { eventCardForEvent } from '../client/presentation/event_card.js';
import { projectHistoryPulse } from '../client/presentation/world_event_pulse.js';

const YEAR34 = Object.freeze({ year: 34, grazers: 136, vegetation: 0.3431, births: 150 });
const YEAR40 = Object.freeze({ year: 40, grazers: 116, vegetation: 0.1750, births: 156 });
const YEAR50 = Object.freeze({ year: 50, grazers: 68, vegetation: 0.3744, births: 160 });
const WOLF_HORIZON_DAYS = 140;

function createCanonicalWorld() {
  return createShowcaseWorld(45, 'living_ecology');
}

function sample(world, year) {
  const summary = summarizeWorld(world);
  return {
    year,
    grazers: summary.grazers,
    wolves: world.creatures.filter((creature) => creature.alive && creature.species === 'wolf').length,
    vegetation: Number(summary.vegetationUtilization.toFixed(4)),
    births: world.counters.creatureBirths,
    deaths: world.counters.creatureDeaths,
    godCreatureSpawns: world.history.filter((event) => event.type === 'god.spawn_creature').length
  };
}

function advanceToYear(world, targetYear) {
  const targetDay = targetYear * world.config.daysPerYear;
  assert.ok(world.day <= targetDay, `cannot rewind canonical world from day ${world.day} to Y${targetYear}`);
  tickWorld(world, targetDay - world.day);
  return sample(world, targetYear);
}

function assertFrozenCheckpoint(actual, expected) {
  assert.equal(actual.year, expected.year);
  assert.equal(actual.grazers, expected.grazers);
  assert.equal(actual.vegetation, expected.vegetation);
  assert.equal(actual.births, expected.births);
  assert.equal(actual.wolves, 0);
  assert.equal(actual.godCreatureSpawns, 0);
}

function deterministicWolfSetupTile(world) {
  const grazers = world.creatures.filter((creature) => creature.alive && creature.species === 'grazer');
  const occupied = new Set([
    ...world.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => `${entity.x},${entity.y}`),
    ...world.creatures.filter((creature) => creature.alive).map((creature) => `${creature.x},${creature.y}`),
    ...(world.warbands ?? []).filter((warband) => warband.active).map((warband) => `${warband.x},${warband.y}`)
  ]);

  return world.tiles
    .filter((tile) => tile.passable && !occupied.has(`${tile.x},${tile.y}`))
    .map((tile) => ({
      x: tile.x,
      y: tile.y,
      nearestGrazerDistance: grazers.reduce(
        (min, grazer) => Math.min(min, Math.max(Math.abs(tile.x - grazer.x), Math.abs(tile.y - grazer.y))),
        Infinity
      )
    }))
    .filter((tile) => tile.nearestGrazerDistance >= 2 && tile.nearestGrazerDistance <= world.config.wolfPreySearchRadius)
    .sort((a, b) => b.nearestGrazerDistance - a.nearestGrazerDistance || a.y - b.y || a.x - b.x)[0] ?? null;
}

function spawnCanonicalWolf(world) {
  const tile = deterministicWolfSetupTile(world);
  assert.ok(tile, 'Y50 canonical world must expose a clear deterministic Wolf setup tile inside prey-search radius');
  const spawnsBefore = world.history.filter((event) => event.type === 'god.spawn_creature').length;
  const [wolfId] = applyCommand(world, { type: 'spawn_creature', species: 'wolf', x: tile.x, y: tile.y, count: 1 });
  const wolf = world.creatures.find((creature) => creature.alive && creature.id === wolfId);
  assert.ok(wolf);
  assert.equal(world.history.filter((event) => event.type === 'god.spawn_creature').length, spawnsBefore + 1);
  return { wolfId, tile, spawnsBefore };
}

function advanceThroughFirstPredation(world, setup) {
  const wolf = () => world.creatures.find((creature) => creature.alive && creature.id === setup.wolfId) ?? null;
  const origin = { x: wolf().x, y: wolf().y };
  let firstMovement = null;
  let predation = null;
  let death = null;

  for (let day = 1; day <= WOLF_HORIZON_DAYS; day += 1) {
    const before = wolf();
    assert.ok(before, 'canonical Wolf must survive until its first hunt');
    const previous = { x: before.x, y: before.y };
    const firstNewEventId = world.nextEventId;
    tickWorld(world, 1);
    const after = wolf();
    assert.ok(after, 'canonical Wolf must survive through first hunt');
    if (!firstMovement && (after.x !== previous.x || after.y !== previous.y)) {
      firstMovement = { day, from: previous, to: { x: after.x, y: after.y } };
    }
    predation = world.history.find((event) => event.id >= firstNewEventId && event.type === 'creature.predated' && event.predatorCreatureId === setup.wolfId) ?? null;
    if (!predation) continue;
    death = world.history.find((event) => event.id > predation.id && event.type === 'creature.died' && event.creatureId === predation.preyCreatureId && event.cause === 'predation') ?? null;
    break;
  }

  assert.ok(firstMovement, `Wolf #${setup.wolfId} must visibly move from ${origin.x},${origin.y} before/while hunting`);
  assert.ok(predation, `Wolf #${setup.wolfId} must hunt within ${WOLF_HORIZON_DAYS} days`);
  assert.ok(death, 'canonical predation must have one matching shared creature death');
  assert.ok(predation.predatorHungerAfter < predation.predatorHungerBefore, 'successful canonical hunt must feed the Wolf');
  assert.equal(world.creatures.some((creature) => creature.alive && creature.id === predation.preyCreatureId), false);
  assert.equal(
    world.history.filter((event) => event.type === 'god.spawn_creature').length,
    setup.spawnsBefore + 1,
    'only the one explicit QA Wolf setup may be a god creature spawn'
  );

  return { firstMovement, predation, death };
}

function assertPredationPresentationIsReadOnly(world, predation) {
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const story = ecologyStoryForEvent(world, predation);
  const card = eventCardForEvent(world, predation);
  const pulse = projectHistoryPulse([predation], { daysPerYear: world.config.daysPerYear })[0];

  assert.equal(story.headline, `Wolf #${predation.predatorCreatureId} hunted Grazer #${predation.preyCreatureId}`);
  assert.equal(card.headline, story.headline);
  assert.equal(card.subject.status, 'unresolved');
  assert.match(card.subject.note, /not currently present/);
  assert.equal(card.causes.length, 1);
  assert.equal(card.causes[0].status, 'resolved');
  assert.equal(card.causes[0].label, `Wolf #${predation.predatorCreatureId}`);
  assert.equal(card.causes[0].navigation?.kind, 'map');
  assert.equal(pulse.title, story.headline);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);

  return { story, card, pulse };
}

function runCanonicalPath({ restoreAtYear40 = false } = {}) {
  const startedAt = performance.now();
  let world = createCanonicalWorld();

  assert.equal(world.width, 24);
  assert.equal(world.height, 24);
  assert.equal(world.creatures.length, 10, 'canonical Living Ecology must start with exactly 10 natural founders');
  assert.equal(world.history.some((event) => event.type === 'god.spawn_creature'), false, 'natural founders must not be fake god spawns');

  const y34 = advanceToYear(world, 34);
  assertFrozenCheckpoint(y34, YEAR34);
  const y40 = advanceToYear(world, 40);
  assertFrozenCheckpoint(y40, YEAR40);
  assert.ok(y34.vegetation - y40.vegetation >= 0.16, 'Y34→Y40 must retain the measured material vegetation pressure');

  const checkpoint = snapshotWorld(world);
  if (restoreAtYear40) world = worldFromSnapshot(checkpoint);

  const y50 = advanceToYear(world, 50);
  assertFrozenCheckpoint(y50, YEAR50);
  assert.ok(y50.vegetation - y40.vegetation >= 0.19, 'Y40→Y50 must retain the measured material vegetation recovery');
  assert.ok(y50.grazers < y40.grazers, 'recovery must occur with lower living Grazer pressure');
  assert.ok(y50.births > 0, 'the canonical world must contain ordinary natural Grazer births');

  const preWolfDeaths = world.history.filter((event) => event.type === 'creature.died');
  assert.ok(preWolfDeaths.length > 0);
  assert.ok(preWolfDeaths.every((event) => event.cause === 'old_age'), 'pre-Wolf canonical creature decline must remain ordinary recorded old-age lifecycle');

  const setup = spawnCanonicalWolf(world);
  const hunt = advanceThroughFirstPredation(world, setup);
  const presentation = assertPredationPresentationIsReadOnly(world, hunt.predation);
  const summary = summarizeWorld(world);

  return {
    snapshot: snapshotWorld(world),
    evidence: {
      trajectory: { y34, y40, y50 },
      wolfSetup: { id: setup.wolfId, x: setup.tile.x, y: setup.tile.y, nearestGrazerDistance: setup.tile.nearestGrazerDistance },
      firstMovement: hunt.firstMovement,
      predation: {
        eventId: hunt.predation.id,
        deathEventId: hunt.death.id,
        predatorCreatureId: hunt.predation.predatorCreatureId,
        preyCreatureId: hunt.predation.preyCreatureId,
        x: hunt.predation.x,
        y: hunt.predation.y,
        hungerBefore: hunt.predation.predatorHungerBefore,
        hungerAfter: hunt.predation.predatorHungerAfter
      },
      readableHeadline: presentation.story.headline,
      final: { day: world.day, grazers: summary.grazers, creatures: summary.creatures, vegetation: Number(summary.vegetationUtilization.toFixed(4)) }
    },
    runtimeMs: performance.now() - startedAt
  };
}

test('canonical Living Ecology release path is fixed, byte-repeatable and save/load continuous', () => {
  const uninterrupted = runCanonicalPath();
  const duplicate = runCanonicalPath();
  const restored = runCanonicalPath({ restoreAtYear40: true });

  assert.deepEqual(duplicate.evidence, uninterrupted.evidence, 'duplicate canonical runs must report identical facts');
  assert.deepEqual(duplicate.snapshot, uninterrupted.snapshot, 'duplicate canonical runs must be byte-identical');
  assert.deepEqual(restored.evidence, uninterrupted.evidence, 'Y40 save/load continuation must report the same recovery + hunt facts');
  assert.deepEqual(restored.snapshot, uninterrupted.snapshot, 'Y40 restored continuation must reach the exact same authoritative world');

  console.log(`Canonical Living Ecology gate: Y34 ${YEAR34.grazers} grazers/${(YEAR34.vegetation * 100).toFixed(2)}% vegetation → Y40 ${YEAR40.grazers}/${(YEAR40.vegetation * 100).toFixed(2)}% → Y50 ${YEAR50.grazers}/${(YEAR50.vegetation * 100).toFixed(2)}%; Wolf #${uninterrupted.evidence.wolfSetup.id} at ${uninterrupted.evidence.wolfSetup.x},${uninterrupted.evidence.wolfSetup.y} moved ${JSON.stringify(uninterrupted.evidence.firstMovement.from)}→${JSON.stringify(uninterrupted.evidence.firstMovement.to)} and predated Grazer #${uninterrupted.evidence.predation.preyCreatureId}; duplicate ${(duplicate.runtimeMs / 1000).toFixed(2)}s, restored ${(restored.runtimeMs / 1000).toFixed(2)}s`);
});
