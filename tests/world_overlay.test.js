import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../engine/core/world.js';
import { worldView } from '../client/presentation/world_adapter.js';
import { settlementColor, targetStyle, territoryCells, territorySignature } from '../client/presentation/world_overlay.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/world_overlay_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('presentation adapter exposes authoritative settlement ownership read-only', () => {
  const world = createWorld({ seed: 9, width: 4, height: 4, population: 0 });
  world.tiles[5].ownerSettlementId = 3;
  const view = worldView(world);
  assert.equal(view.tiles[5].ownerSettlementId, 3);
  assert.equal(world.tiles[5].ownerSettlementId, 3);
});

test('territory cells expose only ownership-change boundaries', () => {
  const view = {
    width: 3,
    height: 2,
    tiles: [
      { x: 0, y: 0, ownerSettlementId: 1 },
      { x: 1, y: 0, ownerSettlementId: 1 },
      { x: 2, y: 0, ownerSettlementId: 2 },
      { x: 0, y: 1, ownerSettlementId: null },
      { x: 1, y: 1, ownerSettlementId: 1 },
      { x: 2, y: 1, ownerSettlementId: 2 }
    ]
  };
  const cells = territoryCells(view);
  assert.equal(cells.length, 5);
  const center = cells.find((cell) => cell.x === 1 && cell.y === 0);
  assert.deepEqual(center.edges, { left: false, right: true, top: true, bottom: false });
  assert.notEqual(settlementColor(1), settlementColor(2));
  assert.notEqual(territorySignature(view), territorySignature({ ...view, tiles: view.tiles.map((tile, index) => index === 0 ? { ...tile, ownerSettlementId: 2 } : tile) }));
});

test('spawn targeting reports ocean as invalid while destructive powers remain valid', () => {
  const ocean = { passable: false };
  assert.equal(targetStyle('spawn_human', ocean).invalid, true);
  assert.equal(targetStyle('spawn_grazer', ocean).invalid, true);
  assert.equal(targetStyle('lightning', ocean).invalid, false);
  assert.equal(targetStyle('erase', ocean).invalid, false);
  assert.equal(targetStyle('spawn_human', { passable: true }).invalid, false);
});

test('overlay runtime remains presentation-only and loads after renderer bootstrap', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');
  assert.doesNotMatch(runtime, /engine\//);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|createWorld/);
  const bootstrapIndex = html.indexOf('./bootstrap.js');
  const overlayIndex = html.indexOf('./presentation/world_overlay_runtime.js');
  assert.ok(bootstrapIndex >= 0);
  assert.ok(overlayIndex > bootstrapIndex);
});
