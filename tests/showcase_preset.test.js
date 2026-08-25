import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShowcaseWorld,
  evolveShowcaseWorld,
  DEFAULT_SHOWCASE_PRESET,
  normalizeShowcasePreset,
  SHOWCASE,
  showcasePresetForWorld
} from '../client/presentation/world_adapter.js';
import { snapshotWorld } from '../engine/core/world.js';

test('Sandbox remains the default showcase contract', async () => {
  assert.equal(DEFAULT_SHOWCASE_PRESET, 'sandbox');
  assert.equal(normalizeShowcasePreset(), 'sandbox');
  const world = createShowcaseWorld(45, 'sandbox');
  assert.equal(showcasePresetForWorld(world), 'sandbox');
  assert.equal(world.width, SHOWCASE.width);
  assert.equal(world.height, SHOWCASE.height);
  assert.equal(world.creatures.length, 0);
  assert.equal(world.config.grazerBirthChancePerEligiblePairPerDay, 0);
  assert.equal(world.config.grazerOldAgeMortalityEnabled, false);

  await evolveShowcaseWorld(world, { years: 0 });
  assert.equal(world.creatures.length, SHOWCASE.grazerCount);
  assert.equal(world.history.filter((event) => event.type === 'god.spawn_creature').length, SHOWCASE.grazerCount);
});

test('Living Ecology starts with validated natural founders and never showcase-reseeds', async () => {
  const world = createShowcaseWorld(45, 'living_ecology');
  assert.equal(showcasePresetForWorld(world), 'living_ecology');
  assert.equal(world.creatures.length, 10);
  assert.equal(world.nextCreatureId, 11);
  assert.equal(world.config.grazerBirthChancePerEligiblePairPerDay, 0.001);
  assert.equal(world.config.grazerOldAgeMortalityEnabled, true);
  assert.equal(world.history.some((event) => event.type === 'god.spawn_creature'), false);

  const before = snapshotWorld(world);
  await evolveShowcaseWorld(world, { years: 0 });
  assert.deepEqual(snapshotWorld(world), before);
});

test('explicit Living Ecology showcase creation is byte-identical and rejects unknown modes', () => {
  const first = createShowcaseWorld('45', 'living_ecology');
  const second = createShowcaseWorld(45, 'living_ecology');
  assert.deepEqual(snapshotWorld(first), snapshotWorld(second));
  assert.throws(() => normalizeShowcasePreset('universal_ecology'), /unsupported showcase preset/);
});
