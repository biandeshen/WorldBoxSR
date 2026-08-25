import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcaseWorld } from '../client/presentation/world_adapter.js';

test('probe fixed seed45 Sandbox tiles for Scenario Setup browser evidence', () => {
  const world = createShowcaseWorld(45, 'sandbox');
  const passable = world.tiles.filter((tile) => tile.passable);
  const impassable = world.tiles.filter((tile) => !tile.passable);
  assert.ok(passable.length >= 3);
  assert.ok(impassable.length >= 1);

  const targets = [
    { x: 4, y: 8 },
    { x: 9, y: 12 },
    { x: 14, y: 7 }
  ];
  const chosen = targets.map((target, index) => passable
    .filter((tile) => !targets.slice(0, index).some(() => false))
    .sort((a, b) => distance(a, target) - distance(b, target) || a.y - b.y || a.x - b.x)[0]);
  const blocked = [...impassable].sort((a, b) => distance(a, { x: 12, y: 12 }) - distance(b, { x: 12, y: 12 }) || a.y - b.y || a.x - b.x)[0];

  console.log(`SCENARIO_SETUP_TILES ${JSON.stringify({
    passable: chosen.map(({ x, y }) => ({ x, y })),
    impassable: { x: blocked.x, y: blocked.y }
  })}`);
});

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
