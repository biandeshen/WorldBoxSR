import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { snapshotWorld } from '../engine/core/world.js';
import { materializeScenarioRecipe, serializeScenarioRecipe } from '../client/presentation/scenario_recipe.js';
import {
  appendScenarioSetupAction,
  clearScenarioSetup,
  createScenarioSetupDraft,
  freezeScenarioSetup,
  scenarioSetupAction
} from '../client/presentation/scenario_setup_state.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/ui.css', import.meta.url));
const runtimePath = fileURLToPath(new URL('../client/presentation/scenario_setup_runtime.js', import.meta.url));
const phaserPath = fileURLToPath(new URL('../client/phaser_main.js', import.meta.url));
const controlsPath = fileURLToPath(new URL('../client/presentation/ui_controls.js', import.meta.url));

function draft() {
  return createScenarioSetupDraft({ seed: 45, preset: 'sandbox' });
}

test('Scenario Setup shell exposes exactly three placement identities and compact run/clear/name controls', () => {
  const html = readFileSync(indexPath, 'utf8');
  assert.match(html, /id="scenario-setup-enter"/);
  assert.match(html, /id="scenario-setup-panel"/);
  assert.match(html, /id="scenario-name"[^>]*maxlength="64"/);
  assert.match(html, /id="scenario-setup-count">0\/32 actions/);
  assert.match(html, /id="scenario-setup-clear"/);
  assert.match(html, /id="scenario-setup-run"/);
  assert.equal((html.match(/data-scenario-setup-tool=/g) ?? []).length, 3);
  assert.match(html, /data-scenario-setup-tool="human"/);
  assert.match(html, /data-scenario-setup-tool="grazer"/);
  assert.match(html, /data-scenario-setup-tool="wolf"/);
  assert.doesNotMatch(html, /data-scenario-setup-tool="(?:meteor|rain|lightning|erase)"/);
});

test('Scenario Setup runtime loads after Phaser bootstrap and reuses the existing scene useTool seam', () => {
  const html = readFileSync(indexPath, 'utf8');
  const runtime = readFileSync(runtimePath, 'utf8');
  const phaser = readFileSync(phaserPath, 'utf8');

  assert.ok(html.indexOf('./bootstrap.js') < html.indexOf('./presentation/scenario_setup_runtime.js'));
  assert.match(runtime, /scene\.useTool\s*=\s*\(x, y, count\)/);
  assert.match(runtime, /originalUseTool/);
  assert.match(runtime, /applyScenarioSetup/);
  assert.match(runtime, /materializeScenarioRecipe/);
  assert.match(phaser, /this\.input\.on\('pointerup'/);
  assert.match(phaser, /this\.useTool\(tile\.x, tile\.y, count\)/);

  assert.doesNotMatch(runtime, /\.input\.on\(|pointerup|pointerdown|Input\.dispatch|addEventListener\(['"]pointer/);
  assert.doesNotMatch(runtime, /entities\.push|creatures\.push|history\.push|pushEvent|snapshotWorld/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage|URLSearchParams|history\.replaceState|location\.search/);
});

test('Scenario Setup styling hides ordinary power/pulse surfaces only during active Setup and stays Phaser-only', () => {
  const css = readFileSync(cssPath, 'utf8');
  assert.match(css, /html\[data-scenario-setup="true"\][\s\S]*#world-event-pulse[\s\S]*#power-dock\s*\{\s*display:\s*none/);
  assert.match(css, /html\[data-renderer="legacy"\][\s\S]*#scenario-setup-enter/);
  assert.match(css, /#scenario-setup-panel/);
  assert.match(css, /width:\s*min\(255px/);
});

test('ordinary God Power keyboard/tool selection is guarded while Scenario Setup owns map input', () => {
  const controls = readFileSync(controlsPath, 'utf8');
  assert.match(controls, /scenarioSetupActive\(\)/);
  assert.match(controls, /dataset\.scenarioSetup\s*===\s*['"]true['"]/);
  assert.match(controls, /if \(scenarioSetupActive\(\)\) return;/);
});

test('Clear Setup rematerializes the exact same empty ready base instead of reversing placed entities', async () => {
  const originalDraft = draft();
  const placed = appendScenarioSetupAction(originalDraft, scenarioSetupAction('human', 0, 8, 1));
  const cleared = clearScenarioSetup(placed);
  const direct = await materializeScenarioRecipe(originalDraft);
  const rebuilt = await materializeScenarioRecipe(cleared);

  assert.deepEqual(snapshotWorld(rebuilt), snapshotWorld(direct));
  assert.equal(cleared.setup.length, 0);
  assert.equal(placed.setup.length, 1);
});

test('failed setup authority leaves the accepted recipe draft and world identity unchanged', async () => {
  const acceptedDraft = draft();
  const world = await materializeScenarioRecipe(acceptedDraft);
  const impassable = world.tiles.find((tile) => !tile.passable);
  assert.ok(impassable);

  const before = snapshotWorld(world);
  const beforeRecipe = serializeScenarioRecipe(acceptedDraft);
  const action = scenarioSetupAction('wolf', impassable.x, impassable.y, 1);
  const proposed = appendScenarioSetupAction(acceptedDraft, action);
  assert.notEqual(serializeScenarioRecipe(proposed), beforeRecipe, 'a proposed next draft may be validated before authority');

  await assert.rejects(
    async () => {
      const { applyScenarioSetup } = await import('../client/presentation/scenario_recipe.js');
      applyScenarioSetup(world, [action]);
    },
    /impassable/
  );
  assert.equal(serializeScenarioRecipe(acceptedDraft), beforeRecipe);
  assert.deepEqual(snapshotWorld(world), before);
});

test('Run freeze is an independent immutable recipe identity that ordinary later world changes cannot rewrite', async () => {
  let activeDraft = draft();
  activeDraft = appendScenarioSetupAction(activeDraft, scenarioSetupAction('human', 0, 8, 1));
  activeDraft = appendScenarioSetupAction(activeDraft, scenarioSetupAction('wolf', 1, 8, 1));
  const frozen = freezeScenarioSetup(activeDraft);
  const frozenString = serializeScenarioRecipe(frozen);
  const world = await materializeScenarioRecipe(activeDraft);

  // Mutating the authoritative world after Run is ordinary gameplay and cannot
  // rewrite the frozen presentation recipe identity.
  world.day += 1;
  world.tiles[0].vegetation = Math.max(0, world.tiles[0].vegetation - 0.01);
  assert.equal(serializeScenarioRecipe(frozen), frozenString);
  assert.equal(frozen.setup.length, 2);
});
