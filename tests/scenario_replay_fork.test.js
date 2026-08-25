import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { snapshotWorld, tickWorld } from '../engine/core/world.js';
import {
  materializeScenarioRecipe,
  serializeScenarioRecipe
} from '../client/presentation/scenario_recipe.js';
import {
  appendScenarioSetupAction,
  forkScenarioSetup,
  freezeScenarioSetup,
  scenarioSetupAction
} from '../client/presentation/scenario_setup_state.js';

const SOURCE = Object.freeze({
  kind: 'worldboxsr-scenario',
  version: 1,
  name: 'Portable trio',
  base: Object.freeze({ seed: 45, preset: 'sandbox' }),
  setup: Object.freeze([
    Object.freeze({ type: 'spawn_human', x: 12, y: 8, count: 1 }),
    Object.freeze({ type: 'spawn_creature', species: 'grazer', x: 16, y: 12, count: 1 }),
    Object.freeze({ type: 'spawn_creature', species: 'wolf', x: 14, y: 7, count: 1 })
  ])
});

test('Replay rematerialization restores exact Recipe start after later simulation and destructive God Power', async () => {
  const frozenSource = freezeScenarioSetup(SOURCE);
  const sourceCanonical = serializeScenarioRecipe(frozenSource);
  const startWorld = await materializeScenarioRecipe(frozenSource);
  const startSnapshot = snapshotWorld(startWorld);

  tickWorld(startWorld, 3);
  applyCommand(startWorld, { type: 'meteor', x: 12, y: 8 });
  const dirtySnapshot = snapshotWorld(startWorld);
  assert.notDeepEqual(dirtySnapshot, startSnapshot);
  assert.equal(serializeScenarioRecipe(frozenSource), sourceCanonical);

  const replayed = await materializeScenarioRecipe(frozenSource);
  assert.deepEqual(snapshotWorld(replayed), startSnapshot);
  assert.equal(serializeScenarioRecipe(frozenSource), sourceCanonical);

  const replayedAgain = await materializeScenarioRecipe(frozenSource);
  assert.deepEqual(snapshotWorld(replayedAgain), startSnapshot);
});

test('Fork edits an independent Recipe copy and materializes one exact deterministic difference without mutating source', async () => {
  const frozenSource = freezeScenarioSetup(SOURCE);
  const sourceCanonical = serializeScenarioRecipe(frozenSource);
  const sourceWorld = await materializeScenarioRecipe(frozenSource);
  const sourceSnapshot = snapshotWorld(sourceWorld);

  const fork = appendScenarioSetupAction(
    forkScenarioSetup(frozenSource),
    scenarioSetupAction('human', 12, 8, 1)
  );
  const forkCanonical = serializeScenarioRecipe(fork);
  assert.notEqual(forkCanonical, sourceCanonical);
  assert.equal(serializeScenarioRecipe(frozenSource), sourceCanonical);
  assert.equal(frozenSource.setup.length, 3);
  assert.equal(fork.setup.length, 4);

  const forkWorld = await materializeScenarioRecipe(fork);
  const forkSnapshot = snapshotWorld(forkWorld);
  assert.notDeepEqual(forkSnapshot, sourceSnapshot);
  assert.equal(forkSnapshot.entities.length, sourceSnapshot.entities.length + 1);
  assert.equal(forkSnapshot.history.length, sourceSnapshot.history.length + 1);
  assert.equal(forkSnapshot.day, sourceSnapshot.day);

  const forkAgain = await materializeScenarioRecipe(fork);
  assert.deepEqual(snapshotWorld(forkAgain), forkSnapshot);

  const replayedSource = await materializeScenarioRecipe(frozenSource);
  assert.deepEqual(snapshotWorld(replayedSource), sourceSnapshot);
  assert.equal(serializeScenarioRecipe(frozenSource), sourceCanonical);
});
