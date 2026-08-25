import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chronicleRowsForLens, eventAllowedByChronicleLens } from '../client/presentation/chronicle_lenses.js';
import { civilizationChronicle } from '../client/presentation/civilization_story.js';
import { creatureBehaviorLabel, livingEcologyVegetationHud } from '../client/presentation/ecology_readability.js';
import { ecologyStoryForEvent } from '../client/presentation/ecology_story.js';
import { eventCardForEvent } from '../client/presentation/event_card.js';
import { projectHistoryPulse } from '../client/presentation/world_event_pulse.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { killCreature } from '../engine/model/creature_lifecycle.js';
import { entityRef, eventRef, pushEvent } from '../engine/model/events.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createWolf } from '../engine/model/wolf.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/ecology_readability_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

function readableWorld() {
  return {
    config: { daysPerYear: 360 },
    polities: [
      { id: 1, name: 'Amber Reach' },
      { id: 2, name: 'Blue March' }
    ],
    settlements: [{ id: 7, name: 'Stoneford' }],
    history: [
      { id: 1, day: 0, type: 'world.created' },
      { id: 2, day: 100, type: 'polity.founded', polityId: 1, name: 'Amber Reach', capitalSettlementId: 7 },
      { id: 3, day: 130, type: 'polity.war_started', polityAId: 1, polityBId: 2, score: -70, reason: 'shared border' },
      { id: 4, day: 180, type: 'polity.ruler_succeeded', polityId: 1, name: 'Amber Reach', rulerId: 11, previousRulerId: 10, reason: 'death' },
      { id: 5, day: 190, type: 'god.meteor', x: 3, y: 3, radius: 2, impactedTileCount: 25, vegetationRemoved: 12, humanCount: 1, creatureCount: 0, noEffect: false },
      { id: 6, day: 200, type: 'god.rain', x: 3, y: 3, radius: 2, passableTileCount: 25, vegetationAdded: 12, foodAdded: 3, noEffect: false }
    ]
  };
}

function addPredation(world, overrides = {}) {
  const event = {
    id: overrides.id ?? 7,
    day: overrides.day ?? 210,
    type: 'creature.predated',
    subject: entityRef('creature', overrides.preyCreatureId ?? 112),
    causes: [entityRef('creature', overrides.predatorCreatureId ?? 167)],
    predatorCreatureId: overrides.predatorCreatureId ?? 167,
    predatorSpecies: 'wolf',
    preyCreatureId: overrides.preyCreatureId ?? 112,
    preySpecies: 'grazer',
    predatorHungerBefore: overrides.predatorHungerBefore ?? 0.35,
    predatorHungerAfter: overrides.predatorHungerAfter ?? 0,
    x: overrides.x ?? 11,
    y: overrides.y ?? 2
  };
  world.history.push(event);
  return event;
}

test('authoritative predation projects one exact readable ecology story', () => {
  const world = readableWorld();
  const event = addPredation(world);
  const before = structuredClone(event);

  const story = ecologyStoryForEvent(world, event);

  assert.deepEqual(event, before);
  assert.equal(story.icon, '🐺');
  assert.equal(story.headline, 'Wolf #167 hunted Grazer #112');
  assert.equal(story.detail, 'Predation at 11,2 · hunger 35% → 0%');
  assert.equal(story.eventId, 7);
  assert.equal(story.eventType, 'creature.predated');
  assert.equal(story.year, 210 / 360);
  assert.equal(story.story, true);
  assert.equal(story.pulse, false, 'the separate World Event Pulse owns live notification');
});

test('predation joins Recent only while v0.5 Highlights/Conflict/Rule policy stays exact', () => {
  const world = readableWorld();
  const highlightsBefore = civilizationChronicle(world, { limit: 7 }).map((row) => row.eventId);
  const event = addPredation(world);

  assert.deepEqual(
    chronicleRowsForLens(world, 'highlights').map((row) => row.eventId),
    highlightsBefore,
    'ecology readability must not rewrite representative Highlights membership'
  );
  assert.deepEqual(chronicleRowsForLens(world, 'recent', { limit: 3 }).map((row) => row.eventId), [7, 6, 5]);
  assert.equal(chronicleRowsForLens(world, 'recent', { limit: 1 })[0].headline, 'Wolf #167 hunted Grazer #112');
  assert.equal(eventAllowedByChronicleLens(event, 'recent'), true);
  assert.equal(eventAllowedByChronicleLens(event, 'conflict'), false);
  assert.equal(eventAllowedByChronicleLens(event, 'rule'), false);
  assert.equal(chronicleRowsForLens(world, 'conflict').some((row) => row.eventId === event.id), false);
  assert.equal(chronicleRowsForLens(world, 'rule').some((row) => row.eventId === event.id), false);
});

test('predation Event Card keeps readable facts, unavailable prey Subject and resolved Wolf Cause', () => {
  const world = createWorld({ seed: 2310, width: 8, height: 8, population: 0, config: { waterLevel: -1 } });
  const wolf = createWolf(world, { x: 2, y: 2, hunger: 0.35 });
  const grazer = createGrazer(world, { x: 3, y: 2 });
  const predation = pushEvent(world, {
    type: 'creature.predated',
    subject: entityRef('creature', grazer.id),
    causes: [entityRef('creature', wolf.id)],
    predatorCreatureId: wolf.id,
    predatorSpecies: 'wolf',
    preyCreatureId: grazer.id,
    preySpecies: 'grazer',
    predatorHungerBefore: 0.35,
    predatorHungerAfter: 0,
    x: 3,
    y: 2
  });
  killCreature(world, grazer, { cause: 'predation', causes: [eventRef(predation.id)] });
  world.creatures = world.creatures.filter((creature) => creature.alive);
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const card = eventCardForEvent(world, predation);

  assert.equal(card.headline, `Wolf #${wolf.id} hunted Grazer #${grazer.id}`);
  assert.equal(card.detail, 'Predation at 3,2 · hunger 35% → 0%');
  assert.equal(card.provenance, `event #${predation.id} · creature.predated`);
  assert.equal(card.subject.status, 'unresolved');
  assert.equal(card.subject.label, `Creature #${grazer.id}`);
  assert.match(card.subject.note, /not currently present/);
  assert.equal(card.causes.length, 1);
  assert.equal(card.causes[0].status, 'resolved');
  assert.equal(card.causes[0].label, `Wolf #${wolf.id}`);
  assert.deepEqual(card.causes[0].navigation, {
    kind: 'map', entityKind: 'creature', entityId: wolf.id, x: 2, y: 2, label: 'Show on map'
  });
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('World Event Pulse emits one high-priority predation card without mutating recorded facts', () => {
  const event = {
    id: 375, day: 14460, type: 'creature.predated',
    predatorCreatureId: 167, preyCreatureId: 112, x: 11, y: 2
  };
  const events = [
    { id: 374, day: 14459, type: 'human.born', entityId: 90 },
    event
  ];
  const before = structuredClone(events);

  const cards = projectHistoryPulse(events, { daysPerYear: 360 });

  assert.deepEqual(events, before);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].kind, 'creature.predated');
  assert.equal(cards[0].icon, '🐺');
  assert.equal(cards[0].title, 'Wolf #167 hunted Grazer #112');
  assert.equal(cards[0].detail, 'tile 11,2 · Year 40.2');
  assert.equal(cards.filter((card) => card.kind === 'creature.predated').length, 1);
});

test('creature behavior and Living Ecology vegetation HUD are pure compact projections', () => {
  const world = createWorld({ seed: 2311, width: 8, height: 8, population: 0, config: { waterLevel: -1 } });
  const wolf = createWolf(world, { x: 2, y: 2, hunger: 0.10 });
  const grazer = createGrazer(world, { x: 3, y: 2, hunger: 0.10 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const summary = summarizeWorld(world);

  assert.equal(creatureBehaviorLabel(wolf, world.config), 'resting');
  wolf.hunger = world.config.wolfHungryThreshold;
  assert.equal(creatureBehaviorLabel(wolf, world.config), 'seeking grazers');
  wolf.hunger = world.config.wolfStarvationThreshold;
  assert.equal(creatureBehaviorLabel(wolf, world.config), 'starving · seeking grazers');

  assert.equal(creatureBehaviorLabel(grazer, world.config), 'fed');
  grazer.hunger = world.config.grazerHungryThreshold;
  assert.equal(creatureBehaviorLabel(grazer, world.config), 'foraging');
  grazer.hunger = world.config.grazerStarvationThreshold;
  assert.equal(creatureBehaviorLabel(grazer, world.config), 'starving · foraging');

  const expected = `🌿 ${Math.round(summary.vegetationUtilization * 100)}%`;
  assert.equal(livingEcologyVegetationHud(summary, 'living_ecology'), expected);
  assert.equal(livingEcologyVegetationHud(summary, 'sandbox'), null);
  assert.equal(livingEcologyVegetationHud({ vegetationUtilization: 1.5 }, 'living_ecology'), '🌿 100%');

  // Restore local test mutations before checking that projection calls themselves were neutral.
  wolf.hunger = 0.10;
  grazer.hunger = 0.10;
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('ecology readability runtime is presentation-only and loaded by the playable shell', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent|killCreature/);
  assert.doesNotMatch(runtime, /engine\//);
  assert.match(runtime, /creatureBehaviorLabel/);
  assert.match(runtime, /livingEcologyVegetationHud/);
  assert.match(runtime, /MutationObserver/);
  assert.match(html, /ecology_readability_runtime\.js/);
});
