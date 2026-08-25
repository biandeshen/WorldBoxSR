import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createWolf } from '../engine/model/wolf.js';
import { resolveHistoryReference } from '../engine/analysis/history_query.js';
import { referenceRow } from '../client/presentation/event_card.js';
import { resolveSelection } from '../client/presentation/selection_highlight.js';
import { selectionAt, worldView } from '../client/presentation/world_adapter.js';

function emptyWorld(seed = 45) {
  return createWorld({ seed, width: 12, height: 12, population: 0 });
}

function distinctPassableTiles(world, count = 3) {
  const result = world.tiles.filter((tile) => tile.passable).slice(0, count);
  assert.equal(result.length, count, 'test world needs enough passable tiles');
  return result;
}

test('Wolf identity survives exact snapshot round-trip and creation is sequential-RNG neutral', () => {
  const world = emptyWorld();
  const control = emptyWorld();
  const [tile] = distinctPassableTiles(world, 1);
  const wolf = createWolf(world, { x: tile.x, y: tile.y, ageDays: 720, hunger: 0.35, health: 0.8 });
  const snapshot = snapshotWorld(world);

  assert.equal(wolf.species, 'wolf');
  assert.deepEqual(snapshotWorld(worldFromSnapshot(snapshot)), snapshot);
  assert.deepEqual(world.rng.snapshot(), control.rng.snapshot(), 'creating Wolf identity must not consume sequential RNG');
});

test('spawn_creature accepts exactly Grazer/Wolf and rejected species allocate no identity', () => {
  const world = emptyWorld();
  const [grazerTile, wolfTile] = distinctPassableTiles(world, 2);

  const grazerIds = applyCommand(world, { type: 'spawn_creature', species: 'grazer', x: grazerTile.x, y: grazerTile.y, count: 1 });
  const wolfIds = applyCommand(world, { type: 'spawn_creature', species: 'wolf', x: wolfTile.x, y: wolfTile.y, count: 1 });
  assert.equal(world.creatures.find((creature) => creature.id === grazerIds[0])?.species, 'grazer');
  assert.equal(world.creatures.find((creature) => creature.id === wolfIds[0])?.species, 'wolf');
  assert.equal(world.history.at(-1)?.species, 'wolf');

  const commandBefore = world.nextCommandId;
  const creatureBefore = world.nextCreatureId;
  const historyBefore = world.history.length;
  assert.throws(
    () => applyCommand(world, { type: 'spawn_creature', species: 'bear', x: wolfTile.x, y: wolfTile.y, count: 1 }),
    /species must be one of: grazer, wolf/
  );
  assert.equal(world.nextCommandId, commandBefore);
  assert.equal(world.nextCreatureId, creatureBefore);
  assert.equal(world.history.length, historyBefore);
});

test('world projection preserves stable mixed-species identity and is authority-neutral', () => {
  const world = emptyWorld();
  const [grazerTile, wolfTile] = distinctPassableTiles(world, 2);
  const grazer = createGrazer(world, { x: grazerTile.x, y: grazerTile.y, ageDays: 30, hunger: 0.2, health: 0.9 });
  const wolf = createWolf(world, { x: wolfTile.x, y: wolfTile.y, ageDays: 60, hunger: 0.4, health: 0.7 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const view = worldView(world);
  assert.deepEqual(view.creatures, [
    { id: grazer.id, species: 'grazer', x: grazer.x, y: grazer.y, ageDays: 30, hunger: 0.2, health: 0.9 },
    { id: wolf.id, species: 'wolf', x: wolf.x, y: wolf.y, ageDays: 60, hunger: 0.4, health: 0.7 }
  ]);
  assert.deepEqual(view.grazers, [view.creatures[0]], 'legacy compatibility surface must remain grazer-only');
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('mixed-species selection and highlight resolution use the shared creature surface', () => {
  const world = emptyWorld();
  const [grazerTile, wolfTile] = distinctPassableTiles(world, 2);
  const grazer = createGrazer(world, { x: grazerTile.x, y: grazerTile.y });
  const wolf = createWolf(world, { x: wolfTile.x, y: wolfTile.y });
  const view = worldView(world);

  const grazerSelection = selectionAt(world, grazer.x, grazer.y);
  const wolfSelection = selectionAt(world, wolf.x, wolf.y);
  assert.equal(grazerSelection.kind, 'creature');
  assert.equal(grazerSelection.value.species, 'grazer');
  assert.equal(wolfSelection.kind, 'creature');
  assert.equal(wolfSelection.value.species, 'wolf');
  assert.deepEqual(resolveSelection(view, { kind: 'creature', id: wolf.id }), {
    kind: 'creature', id: wolf.id, x: wolf.x, y: wolf.y
  });
});

test('current Wolf creature refs resolve truthfully and reuse creature map navigation', () => {
  const world = emptyWorld();
  const [tile] = distinctPassableTiles(world, 1);
  const wolf = createWolf(world, { x: tile.x, y: tile.y });
  const reference = { kind: 'entity', entityKind: 'creature', id: wolf.id };
  const resolution = resolveHistoryReference(world, reference);
  assert.equal(resolution.status, 'resolved');
  assert.equal(resolution.value.species, 'wolf');
  const row = referenceRow(world, resolution);
  assert.equal(row.label, `Wolf #${wolf.id}`);
  assert.deepEqual(row.navigation, {
    kind: 'map', entityKind: 'creature', entityId: wolf.id, x: wolf.x, y: wolf.y, label: 'Show on map'
  });
});