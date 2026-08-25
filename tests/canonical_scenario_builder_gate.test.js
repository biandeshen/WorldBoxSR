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
import {
  decodeScenarioRecipeToken,
  encodeScenarioRecipe,
  scenarioRecipeFromSearch,
  scenarioSearchWithRecipe
} from '../client/presentation/scenario_transport.js';

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

test('canonical Scenario Builder path preserves source identity through share, Replay and Fork', async () => {
  const source = freezeScenarioSetup(SOURCE);
  const sourceCanonical = serializeScenarioRecipe(source);

  const sourceWorld = await materializeScenarioRecipe(source);
  const sourceSnapshot = snapshotWorld(sourceWorld);
  const sourceAgain = await materializeScenarioRecipe(source);
  assert.deepEqual(snapshotWorld(sourceAgain), sourceSnapshot);

  const token = encodeScenarioRecipe(source);
  assert.match(token, /^[A-Za-z0-9_-]+$/u);
  assert.equal(token.includes('='), false);
  const decoded = decodeScenarioRecipeToken(token);
  assert.equal(serializeScenarioRecipe(decoded), sourceCanonical);
  assert.deepEqual(snapshotWorld(await materializeScenarioRecipe(decoded)), sourceSnapshot);

  const search = scenarioSearchWithRecipe('?foo=canonical', source, { renderer: 'phaser' });
  const params = new URLSearchParams(search.slice(1));
  assert.equal(params.get('foo'), 'canonical');
  assert.equal(params.has('renderer'), false);
  const fromSearch = scenarioRecipeFromSearch(search);
  assert.equal(serializeScenarioRecipe(fromSearch), sourceCanonical);
  assert.deepEqual(snapshotWorld(await materializeScenarioRecipe(fromSearch)), sourceSnapshot);

  tickWorld(sourceWorld, 3);
  applyCommand(sourceWorld, { type: 'meteor', x: 12, y: 8 });
  assert.notDeepEqual(snapshotWorld(sourceWorld), sourceSnapshot);
  assert.equal(serializeScenarioRecipe(source), sourceCanonical);

  const replayedSource = await materializeScenarioRecipe(source);
  assert.deepEqual(snapshotWorld(replayedSource), sourceSnapshot);
  assert.equal(serializeScenarioRecipe(source), sourceCanonical);

  const fork = appendScenarioSetupAction(
    forkScenarioSetup(source),
    scenarioSetupAction('human', 12, 8, 1)
  );
  const forkCanonical = serializeScenarioRecipe(fork);
  assert.notEqual(forkCanonical, sourceCanonical);
  assert.equal(serializeScenarioRecipe(source), sourceCanonical);
  assert.equal(source.setup.length, 3);
  assert.equal(fork.setup.length, 4);

  const forkWorld = await materializeScenarioRecipe(fork);
  const forkSnapshot = snapshotWorld(forkWorld);
  assert.notDeepEqual(forkSnapshot, sourceSnapshot);
  assert.equal(forkSnapshot.day, sourceSnapshot.day);
  assert.equal(forkSnapshot.entities.length, sourceSnapshot.entities.length + 1);
  assert.equal(forkSnapshot.history.length, sourceSnapshot.history.length + 1);
  assert.deepEqual(snapshotWorld(await materializeScenarioRecipe(fork)), forkSnapshot);

  assert.deepEqual(snapshotWorld(await materializeScenarioRecipe(source)), sourceSnapshot);
  assert.equal(serializeScenarioRecipe(source), sourceCanonical);
});
