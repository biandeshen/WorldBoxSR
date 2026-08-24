import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../engine/core/world.js';
import { worldView } from '../client/presentation/world_adapter.js';
import { polityColor } from '../client/presentation/polity_style.js';
import { targetStyle, territoryCells, territorySignature } from '../client/presentation/world_overlay.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/world_overlay_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('presentation adapter exposes authoritative political ownership read-only', () => {
  const world = createWorld({ seed: 9, width: 4, height: 4, population: 0 });
  world.tiles[5].ownerSettlementId = 3;
  world.settlements.push({ id: 3, kind: 'settlement', name: 'Test', x: 1, y: 1, active: true, population: 0, memberIds: [], foundedDay: 0, polityId: 2 });
  world.polities.push({ id: 2, kind: 'polity', name: 'Test Realm', capitalSettlementId: 3, settlementIds: [3], foundedDay: 0, active: true, dissolvedDay: null, colorIndex: 4, bannerStyle: 'stripe' });
  const view = worldView(world);
  assert.equal(view.tiles[5].ownerSettlementId, 3);
  assert.equal(view.settlements[0].polityId, 2);
  assert.equal(view.polities[0].name, 'Test Realm');
  assert.equal(world.tiles[5].ownerSettlementId, 3);
});

test('territory boundaries compare polity ownership rather than settlement ids', () => {
  const view = {
    width: 3,
    height: 2,
    settlements: [
      { id: 1, polityId: 7 },
      { id: 2, polityId: 7 },
      { id: 3, polityId: 8 }
    ],
    polities: [
      { id: 7, colorIndex: 1 },
      { id: 8, colorIndex: 4 }
    ],
    tiles: [
      { x: 0, y: 0, ownerSettlementId: 1 },
      { x: 1, y: 0, ownerSettlementId: 2 },
      { x: 2, y: 0, ownerSettlementId: 3 },
      { x: 0, y: 1, ownerSettlementId: null },
      { x: 1, y: 1, ownerSettlementId: 2 },
      { x: 2, y: 1, ownerSettlementId: 3 }
    ]
  };
  const cells = territoryCells(view);
  assert.equal(cells.length, 5);
  const center = cells.find((cell) => cell.x === 1 && cell.y === 0);
  assert.equal(center.ownerPolityId, 7);
  assert.deepEqual(center.edges, { left: false, right: true, top: true, bottom: false });
  assert.notEqual(polityColor(1), polityColor(4));
  const changed = structuredClone(view);
  changed.settlements[1].polityId = 8;
  assert.notEqual(territorySignature(view), territorySignature(changed));
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
