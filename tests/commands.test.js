import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';

test('spawn_human command changes authoritative simulation state deterministically', () => {
  const a = createWorld({ seed: 9, width: 8, height: 8, population: 0 });
  const b = createWorld({ seed: 9, width: 8, height: 8, population: 0 });
  applyCommand(a, { type: 'spawn_human', x: 3, y: 4, count: 5 });
  applyCommand(b, { type: 'spawn_human', x: 3, y: 4, count: 5 });
  assert.equal(a.entities.length, 5);
  assert.ok(a.entities.every((human) => human.x === 3 && human.y === 4));
  assert.deepEqual(snapshotWorld(a), snapshotWorld(b));
});
