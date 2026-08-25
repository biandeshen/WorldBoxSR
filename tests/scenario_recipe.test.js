import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import {
  applyScenarioSetup,
  materializeScenarioRecipe,
  normalizeScenarioRecipe,
  parseScenarioRecipe,
  SCENARIO_RECIPE_KIND,
  SCENARIO_RECIPE_MAX_ACTIONS,
  SCENARIO_RECIPE_MAX_COUNT,
  SCENARIO_RECIPE_MAX_NAME_LENGTH,
  SCENARIO_RECIPE_VERSION,
  serializeScenarioRecipe
} from '../client/presentation/scenario_recipe.js';
import {
  createShowcaseWorld,
  evolveShowcaseWorld
} from '../client/presentation/world_adapter.js';

const modulePath = fileURLToPath(new URL('../client/presentation/scenario_recipe.js', import.meta.url));

function recipe(overrides = {}) {
  return {
    kind: SCENARIO_RECIPE_KIND,
    version: SCENARIO_RECIPE_VERSION,
    name: 'My scenario',
    base: { seed: 45, preset: 'sandbox' },
    setup: [],
    ...overrides
  };
}

async function readyWorld(seed, preset) {
  const world = createShowcaseWorld(seed, preset);
  await evolveShowcaseWorld(world, { preset });
  return world;
}

test('Scenario Recipe normalization and canonical JSON are stable across input key order', () => {
  const first = {
    setup: [
      { count: 1, y: 8, type: 'spawn_human', x: 0 },
      { y: 8, species: 'grazer', count: 2, x: 0, type: 'spawn_creature' }
    ],
    name: '  Key Order  ',
    version: 1,
    base: { preset: 'sandbox', seed: '45' },
    kind: 'worldboxsr-scenario'
  };
  const second = {
    kind: 'worldboxsr-scenario',
    version: 1,
    name: 'Key Order',
    base: { seed: 45, preset: 'sandbox' },
    setup: [
      { type: 'spawn_human', x: 0, y: 8, count: 1 },
      { type: 'spawn_creature', species: 'grazer', x: 0, y: 8, count: 2 }
    ]
  };
  const expected = {
    kind: 'worldboxsr-scenario',
    version: 1,
    name: 'Key Order',
    base: { seed: 45, preset: 'sandbox' },
    setup: [
      { type: 'spawn_human', x: 0, y: 8, count: 1 },
      { type: 'spawn_creature', species: 'grazer', x: 0, y: 8, count: 2 }
    ]
  };

  assert.deepEqual(normalizeScenarioRecipe(first), expected);
  assert.deepEqual(normalizeScenarioRecipe(second), expected);
  assert.equal(serializeScenarioRecipe(first), serializeScenarioRecipe(second));
  assert.deepEqual(parseScenarioRecipe(serializeScenarioRecipe(first)), expected);

  const reversed = recipe({
    setup: [...expected.setup].reverse()
  });
  assert.notEqual(
    serializeScenarioRecipe(reversed),
    serializeScenarioRecipe(recipe({ setup: expected.setup })),
    'explicit setup order must remain part of recipe identity'
  );
});

test('Scenario Recipe v1 rejects malformed, widened, or unbounded input explicitly', () => {
  const validHuman = { type: 'spawn_human', x: 0, y: 8, count: 1 };
  const invalid = [
    [{ ...recipe(), extra: true }, /unsupported property: extra/],
    [Object.fromEntries(Object.entries(recipe()).filter(([key]) => key !== 'setup')), /Scenario Recipe\.setup is required/],
    [{ ...recipe(), kind: 'other' }, /scenario kind/],
    [{ ...recipe(), version: 2 }, /unsupported scenario recipe version/],
    [{ ...recipe(), name: '   ' }, /must not be empty/],
    [{ ...recipe(), name: 'x'.repeat(SCENARIO_RECIPE_MAX_NAME_LENGTH + 1) }, /at most 64/],
    [{ ...recipe(), base: { seed: 45, preset: 'sandbox', width: 24 } }, /unsupported property: width/],
    [{ ...recipe(), base: { seed: {}, preset: 'sandbox' } }, /seed must be a string or number/],
    [{ ...recipe(), base: { seed: Infinity, preset: 'sandbox' } }, /numeric seed must be finite/],
    [{ ...recipe(), base: { seed: 45, preset: 'unknown' } }, /unsupported showcase preset/],
    [{ ...recipe(), setup: Array.from({ length: SCENARIO_RECIPE_MAX_ACTIONS + 1 }, () => validHuman) }, /at most 32 actions/],
    [{ ...recipe(), setup: [{ ...validHuman, mystery: 1 }] }, /unsupported property: mystery/],
    [{ ...recipe(), setup: [{ ...validHuman, type: 'meteor' }] }, /unsupported scenario setup action type/],
    [{ ...recipe(), setup: [{ ...validHuman, x: -1 }] }, /x must be an integer from 0 to 23/],
    [{ ...recipe(), setup: [{ ...validHuman, y: 24 }] }, /y must be an integer from 0 to 23/],
    [{ ...recipe(), setup: [{ ...validHuman, count: 0 }] }, /count must be an integer from 1 to 10/],
    [{ ...recipe(), setup: [{ ...validHuman, count: SCENARIO_RECIPE_MAX_COUNT + 1 }] }, /count must be an integer from 1 to 10/],
    [{ ...recipe(), setup: [{ type: 'spawn_creature', species: 'bear', x: 0, y: 8, count: 1 }] }, /species must be one of: grazer, wolf/],
    [{ ...recipe(), setup: [{ type: 'spawn_creature', species: 'wolf', x: 0, y: 8, count: 1, extra: true }] }, /unsupported property: extra/]
  ];

  for (const [input, pattern] of invalid) assert.throws(() => normalizeScenarioRecipe(input), pattern);
  assert.throws(() => parseScenarioRecipe('{bad json'), /invalid scenario recipe JSON/);
  assert.throws(() => parseScenarioRecipe({}), /must be a string/);
});

test('Scenario Recipe codec and name metadata are authority/RNG neutral', () => {
  const unrelated = createWorld({ seed: 17, width: 8, height: 8, population: 4 });
  const before = snapshotWorld(unrelated);
  const rngBefore = unrelated.rng.snapshot();
  const input = recipe({
    name: 'Codec only',
    setup: [{ type: 'spawn_creature', species: 'wolf', x: 0, y: 8, count: 1 }]
  });

  const normalized = normalizeScenarioRecipe(input);
  const serialized = serializeScenarioRecipe(normalized);
  assert.deepEqual(parseScenarioRecipe(serialized), normalized);
  assert.deepEqual(snapshotWorld(unrelated), before);
  assert.deepEqual(unrelated.rng.snapshot(), rngBefore);
});

test('empty Sandbox recipe materializes byte-identically to the existing ready Sandbox world', async () => {
  const direct = await readyWorld(45, 'sandbox');
  const materialized = await materializeScenarioRecipe(recipe({ base: { seed: 45, preset: 'sandbox' } }));
  assert.deepEqual(snapshotWorld(materialized), snapshotWorld(direct));
});

test('empty Living Ecology recipe materializes byte-identically to the existing ready Living Ecology world', async () => {
  const direct = await readyWorld(45, 'living_ecology');
  const materialized = await materializeScenarioRecipe(recipe({ base: { seed: 45, preset: 'living_ecology' } }));
  assert.deepEqual(snapshotWorld(materialized), snapshotWorld(direct));
});

test('valid Human/Grazer/Wolf setup is byte-repeatable, ordered, and independent of recipe name', async () => {
  const setup = [
    { type: 'spawn_human', x: 0, y: 8, count: 2 },
    { type: 'spawn_creature', species: 'grazer', x: 0, y: 8, count: 2 },
    { type: 'spawn_creature', species: 'wolf', x: 0, y: 8, count: 1 }
  ];
  const base = recipe({ name: 'Canonical Setup', base: { seed: 45, preset: 'living_ecology' }, setup });
  const duplicate = await materializeScenarioRecipe(base);
  const first = await materializeScenarioRecipe(base);
  const renamed = await materializeScenarioRecipe({ ...base, name: 'Same World, Different Label' });

  assert.deepEqual(snapshotWorld(first), snapshotWorld(duplicate));
  assert.deepEqual(snapshotWorld(first), snapshotWorld(renamed), 'recipe name must never enter world authority');

  const setupEvents = first.history.slice(-3);
  assert.deepEqual(setupEvents.map((event) => event.type), [
    'god.spawn_human',
    'god.spawn_creature',
    'god.spawn_creature'
  ]);
  assert.deepEqual(setupEvents.map((event) => event.species ?? 'human'), ['human', 'grazer', 'wolf']);
  assert.deepEqual(setupEvents.map((event) => event.causes?.[0]?.id), [1, 2, 3]);
  assert.equal(first.nextCommandId, 4);
});

test('whole-setup preflight rejects an impassable later action before any earlier setup command executes', () => {
  const world = createShowcaseWorld(45, 'sandbox');
  const passable = world.tiles.find((tile) => tile.passable);
  const impassable = world.tiles.find((tile) => !tile.passable);
  assert.ok(passable, 'seed45 must expose a passable setup tile');
  assert.ok(impassable, 'seed45 must expose an impassable preflight tile');

  const before = snapshotWorld(world);
  assert.throws(() => applyScenarioSetup(world, [
    { type: 'spawn_human', x: passable.x, y: passable.y, count: 1 },
    { type: 'spawn_creature', species: 'grazer', x: impassable.x, y: impassable.y, count: 1 }
  ]), /targets impassable tile/);

  assert.deepEqual(snapshotWorld(world), before, 'preflight failure must leave all setup command/entity/event identity untouched');
});

test('Scenario Recipe core stays DOM/storage/URL/renderer independent and does not bypass authority', () => {
  const source = readFileSync(modulePath, 'utf8');
  assert.doesNotMatch(source, /\bdocument\b|\bwindow\b|localStorage|sessionStorage|URLSearchParams|\bPhaser\b/);
  assert.doesNotMatch(source, /entities\.push|creatures\.push|pushEvent/);
  assert.match(source, /createShowcaseWorld/);
  assert.match(source, /evolveShowcaseWorld/);
  assert.match(source, /applyCommand/);
});
