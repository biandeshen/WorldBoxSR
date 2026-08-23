import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

test('bulk founder creation preserves the pre-optimization seeded world snapshot exactly', () => {
  const world = createWorld({ seed: 314159, width: 16, height: 12, population: 64 });
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify(snapshotWorld(world)))
    .digest('hex');

  assert.equal(digest, '4b70996f6c189d98bcf6890abb213c70e342363a9b16bf39b816d196e7a57af8');
});

test('explicit-position human creation remains independent of bulk spawn candidates', () => {
  const world = createWorld({ seed: 77, width: 12, height: 12, population: 0 });
  const tile = world.tiles.find((candidate) => candidate.passable);
  assert.ok(tile);
  const before = world.rng.snapshot();
  const human = createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 20, hunger: 0.1 });

  assert.deepEqual([human.x, human.y], [tile.x, tile.y]);
  assert.equal(human.sex, 'F');
  // Age, sex, hunger and position are explicit; no random values are needed.
  assert.deepEqual(world.rng.snapshot(), before);
});
