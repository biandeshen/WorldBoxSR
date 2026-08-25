import test from 'node:test';
import assert from 'node:assert/strict';

import { snapshotWorld } from '../engine/core/world.js';
import { materializeScenarioRecipe, serializeScenarioRecipe } from '../client/presentation/scenario_recipe.js';
import {
  decodeScenarioRecipeToken,
  encodeScenarioRecipe,
  MAX_SCENARIO_JSON_BYTES,
  MAX_SCENARIO_TOKEN_CHARS,
  parseScenarioRecipeText,
  scenarioRecipeFromSearch,
  scenarioSearchWithRecipe,
  scenarioShareUrl
} from '../client/presentation/scenario_transport.js';

const RECIPE = Object.freeze({
  kind: 'worldboxsr-scenario',
  version: 1,
  name: '狼与草原 · Scenario α',
  base: Object.freeze({ seed: 45, preset: 'sandbox' }),
  setup: Object.freeze([
    Object.freeze({ type: 'spawn_human', x: 12, y: 8, count: 1 }),
    Object.freeze({ type: 'spawn_creature', species: 'grazer', x: 16, y: 12, count: 1 }),
    Object.freeze({ type: 'spawn_creature', species: 'wolf', x: 14, y: 7, count: 1 })
  ])
});

test('Scenario Recipe token is canonical UTF-8 unpadded base64url', () => {
  const token = encodeScenarioRecipe(RECIPE);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.equal(token.includes('='), false);
  assert.deepEqual(decodeScenarioRecipeToken(token), JSON.parse(serializeScenarioRecipe(RECIPE)));
});

test('field-order-varied inputs encode to the same Scenario token', () => {
  const shuffled = {
    setup: RECIPE.setup.map((action) => Object.fromEntries(Object.entries(action).reverse())),
    base: { preset: 'sandbox', seed: 45 },
    name: RECIPE.name,
    version: 1,
    kind: 'worldboxsr-scenario'
  };
  assert.equal(encodeScenarioRecipe(shuffled), encodeScenarioRecipe(RECIPE));
  assert.equal(serializeScenarioRecipe(shuffled), serializeScenarioRecipe(RECIPE));
});

test('Scenario URL keeps unrelated params and renderer/scenario semantics distinct', () => {
  const preserved = scenarioSearchWithRecipe('?renderer=legacy&foo=bar', RECIPE);
  const preservedParams = new URLSearchParams(preserved.slice(1));
  assert.equal(preservedParams.get('renderer'), 'legacy');
  assert.equal(preservedParams.get('foo'), 'bar');
  assert.deepEqual(scenarioRecipeFromSearch(preserved), JSON.parse(serializeScenarioRecipe(RECIPE)));

  const phaser = scenarioSearchWithRecipe(preserved, RECIPE, { renderer: 'phaser' });
  const phaserParams = new URLSearchParams(phaser.slice(1));
  assert.equal(phaserParams.has('renderer'), false);
  assert.equal(phaserParams.get('foo'), 'bar');

  const legacy = scenarioSearchWithRecipe('?foo=bar', RECIPE, { renderer: 'legacy' });
  assert.equal(new URLSearchParams(legacy.slice(1)).get('renderer'), 'legacy');

  const url = scenarioShareUrl({
    origin: 'https://example.test',
    pathname: '/WorldBoxSR/play/',
    search: '?renderer=legacy&foo=bar',
    hash: '#chronicle'
  }, RECIPE, { renderer: 'phaser' });
  assert.match(url, /^https:\/\/example\.test\/WorldBoxSR\/play\/\?/);
  assert.equal(url.endsWith('#chronicle'), true);
  assert.equal(new URL(url).searchParams.has('renderer'), false);
  assert.equal(new URL(url).searchParams.get('foo'), 'bar');
});

test('Scenario transport rejects malformed, invalid UTF-8 and oversized payloads', () => {
  assert.throws(() => decodeScenarioRecipeToken('abc='), /unpadded base64url/);
  assert.throws(() => decodeScenarioRecipeToken('a'), /valid base64url/);
  assert.throws(() => decodeScenarioRecipeToken('_w'), /valid UTF-8/);
  assert.throws(() => decodeScenarioRecipeToken('A'.repeat(MAX_SCENARIO_TOKEN_CHARS + 1)), /too large/);
  assert.throws(() => parseScenarioRecipeText('x'.repeat(MAX_SCENARIO_JSON_BYTES + 1)), /exceeds 8192 bytes/);
  assert.throws(() => parseScenarioRecipeText(JSON.stringify({ ...RECIPE, version: 2 })), /unsupported scenario version/);
});

test('missing scenario query remains ordinary startup rather than a guessed recipe', () => {
  assert.equal(scenarioRecipeFromSearch('?renderer=legacy&foo=bar'), null);
});

test('original, token-decoded and JSON-imported recipes materialize byte-identical authority', async () => {
  const canonical = serializeScenarioRecipe(RECIPE);
  const fromToken = decodeScenarioRecipeToken(encodeScenarioRecipe(RECIPE));
  const fromText = parseScenarioRecipeText(canonical);

  const originalWorld = await materializeScenarioRecipe(RECIPE);
  const tokenWorld = await materializeScenarioRecipe(fromToken);
  const textWorld = await materializeScenarioRecipe(fromText);

  const originalSnapshot = snapshotWorld(originalWorld);
  assert.deepEqual(snapshotWorld(tokenWorld), originalSnapshot);
  assert.deepEqual(snapshotWorld(textWorld), originalSnapshot);
  assert.equal(serializeScenarioRecipe(fromToken), canonical);
  assert.equal(serializeScenarioRecipe(fromText), canonical);
});
