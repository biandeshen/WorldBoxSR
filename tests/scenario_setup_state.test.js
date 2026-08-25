import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serializeScenarioRecipe } from '../client/presentation/scenario_recipe.js';
import {
  appendScenarioSetupAction,
  clearScenarioSetup,
  createScenarioSetupDraft,
  DEFAULT_SCENARIO_NAME,
  freezeScenarioSetup,
  renameScenarioSetup,
  scenarioSetupAction,
  scenarioSetupActionCountLabel,
  scenarioSetupRecentActions
} from '../client/presentation/scenario_setup_state.js';

const modulePath = fileURLToPath(new URL('../client/presentation/scenario_setup_state.js', import.meta.url));

function draft() {
  return createScenarioSetupDraft({ seed: '45', preset: 'sandbox' });
}

test('new Scenario Setup draft is normalized from current seed/preset and starts empty', () => {
  const value = draft();
  assert.deepEqual(value, {
    kind: 'worldboxsr-scenario',
    version: 1,
    name: DEFAULT_SCENARIO_NAME,
    base: { seed: 45, preset: 'sandbox' },
    setup: []
  });
  assert.equal(scenarioSetupActionCountLabel(value), '0/32 actions');
  assert.deepEqual(scenarioSetupRecentActions(value), []);
});

test('Scenario Setup placement identities map only to Recipe v1 Human/Grazer/Wolf actions', () => {
  assert.deepEqual(scenarioSetupAction('human', 1, 2, 1), { type: 'spawn_human', x: 1, y: 2, count: 1 });
  assert.deepEqual(scenarioSetupAction('grazer', 3, 4, 10), { type: 'spawn_creature', species: 'grazer', x: 3, y: 4, count: 10 });
  assert.deepEqual(scenarioSetupAction('wolf', 5, 6, 1), { type: 'spawn_creature', species: 'wolf', x: 5, y: 6, count: 1 });
  assert.throws(() => scenarioSetupAction('meteor', 1, 2, 1), /unsupported Scenario Setup placement/);
});

test('append preserves order, leaves prior draft immutable, and caps the recipe at 32 actions', () => {
  const original = draft();
  let current = original;
  for (let index = 0; index < 32; index += 1) {
    current = appendScenarioSetupAction(current, scenarioSetupAction('human', index % 24, 8, 1));
  }

  assert.equal(original.setup.length, 0);
  assert.equal(current.setup.length, 32);
  assert.equal(current.setup[0].x, 0);
  assert.equal(current.setup[31].x, 7);
  assert.equal(scenarioSetupActionCountLabel(current), '32/32 actions');
  assert.throws(
    () => appendScenarioSetupAction(current, scenarioSetupAction('wolf', 0, 8, 1)),
    /already contains 32 actions/
  );
});

test('rename changes recipe identity without mutating the prior draft', () => {
  const original = appendScenarioSetupAction(draft(), scenarioSetupAction('grazer', 0, 8, 1));
  const before = serializeScenarioRecipe(original);
  const renamed = renameScenarioSetup(original, '  Founders  ');

  assert.equal(original.name, DEFAULT_SCENARIO_NAME);
  assert.equal(renamed.name, 'Founders');
  assert.notEqual(serializeScenarioRecipe(renamed), before);
  assert.deepEqual(renamed.setup, original.setup);
});

test('clear keeps base/name, removes all setup actions, and leaves source draft untouched', () => {
  const original = renameScenarioSetup(
    appendScenarioSetupAction(
      appendScenarioSetupAction(draft(), scenarioSetupAction('human', 0, 8, 1)),
      scenarioSetupAction('wolf', 1, 8, 1)
    ),
    'Clear me'
  );
  const cleared = clearScenarioSetup(original);

  assert.equal(original.setup.length, 2);
  assert.deepEqual(cleared, {
    kind: 'worldboxsr-scenario',
    version: 1,
    name: 'Clear me',
    base: { seed: 45, preset: 'sandbox' },
    setup: []
  });
});

test('freeze creates an independent deeply frozen normalized recipe copy', () => {
  const mutable = appendScenarioSetupAction(draft(), scenarioSetupAction('wolf', 0, 8, 1));
  const frozen = freezeScenarioSetup(mutable);

  assert.notEqual(frozen, mutable);
  assert.notEqual(frozen.setup, mutable.setup);
  assert.equal(Object.isFrozen(frozen), true);
  assert.equal(Object.isFrozen(frozen.base), true);
  assert.equal(Object.isFrozen(frozen.setup), true);
  assert.equal(Object.isFrozen(frozen.setup[0]), true);
  assert.throws(() => { frozen.name = 'changed'; }, TypeError);
  mutable.name = 'mutable source changed';
  mutable.setup.push({ type: 'spawn_human', x: 1, y: 8, count: 1 });
  assert.equal(frozen.name, DEFAULT_SCENARIO_NAME);
  assert.equal(frozen.setup.length, 1);
});

test('recent-action summary is bounded and does not widen recipe semantics', () => {
  let value = draft();
  value = appendScenarioSetupAction(value, scenarioSetupAction('human', 0, 8, 1));
  value = appendScenarioSetupAction(value, scenarioSetupAction('grazer', 1, 8, 10));
  value = appendScenarioSetupAction(value, scenarioSetupAction('wolf', 2, 8, 1));

  assert.deepEqual(scenarioSetupRecentActions(value, 2), [
    { index: 2, label: 'Grazer ×10 @ 1,8' },
    { index: 3, label: 'Wolf ×1 @ 2,8' }
  ]);
  assert.deepEqual(scenarioSetupRecentActions(value, 0), []);
  assert.throws(() => scenarioSetupRecentActions(value, -1), /non-negative integer/);
});

test('Scenario Setup state stays pure and owns no DOM/storage/URL/world mutation', () => {
  const source = readFileSync(modulePath, 'utf8');
  assert.doesNotMatch(source, /\bdocument\b|\bwindow\b|localStorage|sessionStorage|URLSearchParams|snapshotWorld|applyCommand/);
  assert.doesNotMatch(source, /entities\.push|creatures\.push|history\.push|pushEvent/);
  assert.match(source, /normalizeScenarioRecipe/);
});
