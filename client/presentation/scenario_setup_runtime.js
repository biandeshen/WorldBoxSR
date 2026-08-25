import { applyScenarioSetup, materializeScenarioRecipe, serializeScenarioRecipe } from './scenario_recipe.js';
import {
  appendScenarioSetupAction,
  clearScenarioSetup,
  createScenarioSetupDraft,
  freezeScenarioSetup,
  renameScenarioSetup,
  scenarioSetupAction,
  scenarioSetupActionCountLabel,
  scenarioSetupRecentActions
} from './scenario_setup_state.js';
import { latestHistoryEventId } from './civilization_story.js';
import { selectedShowcasePreset } from './world_adapter.js';

if (document.documentElement.dataset.renderer === 'phaser') attachWhenReady();

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  if (!scene?.world || !scene?.useTool) {
    window.setTimeout(attachWhenReady, 30);
    return;
  }
  if (scene.scenarioSetup?.attached) return;

  const ui = setupUi();
  if (!ui) return;

  const originalUseTool = scene.useTool.bind(scene);
  const state = {
    attached: true,
    active: false,
    busy: false,
    selectedPlacement: 'human',
    draft: null,
    frozen: null,
    originalUseTool
  };
  scene.scenarioSetup = state;

  // Keep Phaser's existing pointer/tile/input loop authoritative for map clicks.
  // Setup owns only the useTool orchestration seam after pointerTile resolution.
  scene.useTool = (x, y, count) => {
    if (!state.active) return originalUseTool(x, y, count);
    useScenarioSetupTool(scene, state, ui, x, y, count);
  };

  ui.enter.addEventListener('click', () => { void enterScenarioSetup(scene, state, ui); });
  ui.clear.addEventListener('click', () => { void clearAndRebuild(scene, state, ui); });
  ui.run.addEventListener('click', () => runScenario(scene, state, ui));
  ui.name.addEventListener('change', () => renameDraft(scene, state, ui));
  for (const button of ui.placements) {
    button.addEventListener('click', () => {
      if (!state.active || state.busy) return;
      state.selectedPlacement = button.dataset.scenarioSetupTool;
      renderScenarioSetup(state, ui);
    });
  }

  // An ordinary world reset after Run leaves Scenario state behind deliberately.
  // It is a new normal world, so clear the frozen presentation identity.
  ui.reset.addEventListener('click', () => {
    if (state.active || state.busy) return;
    state.frozen = null;
    renderScenarioSetup(state, ui);
  });

  renderScenarioSetup(state, ui);
}

async function enterScenarioSetup(scene, state, ui) {
  if (state.busy) return;
  if (scene.booting) {
    scene.showToast?.('World is still evolving into the showcase…');
    return;
  }

  const draft = createScenarioSetupDraft({
    seed: ui.seed.value,
    preset: selectedShowcasePreset()
  });
  await rebuildScenarioWorld(scene, state, ui, draft, 'Preparing Scenario Setup');
}

async function clearAndRebuild(scene, state, ui) {
  if (!state.active || state.busy || !state.draft) return;
  await rebuildScenarioWorld(scene, state, ui, clearScenarioSetup(state.draft), 'Clearing Scenario Setup');
}

async function rebuildScenarioWorld(scene, state, ui, recipe, label) {
  const previousPaused = Boolean(scene.paused);
  const previousWorld = scene.world;
  const previousDraft = state.draft;
  const previousFrozen = state.frozen;
  const previousActive = state.active;

  state.busy = true;
  state.active = false;
  scene.booting = true;
  setPaused(scene, ui, true);
  setLocked(ui, true);
  ui.enter.dataset.active = 'true';
  if (ui.boot) ui.boot.textContent = `Phaser 4 · authoritative simulation · ${label.toLowerCase()}…`;

  try {
    const world = await materializeScenarioRecipe(recipe, {
      onProgress: ({ year, targetYear }) => {
        if (ui.boot) ui.boot.textContent = `Phaser 4 · authoritative simulation · scenario base ${year.toFixed(0)}/${targetYear}y`;
      }
    });

    scene.worldGeneration += 1;
    scene.world = world;
    scene.storyCursorId = latestHistoryEventId(world);
    scene.syncWorld(scene.time.now);
    scene.resetCamera();
    scene.nextStepAt = scene.time.now + 110;
    scene.booting = false;

    state.draft = recipe;
    state.frozen = null;
    state.active = true;
    state.selectedPlacement = 'human';
    state.busy = false;
    setPaused(scene, ui, true);
    setLocked(ui, true);
    if (ui.boot) ui.boot.textContent = 'Phaser 4 · authoritative simulation · Scenario Setup ready';
    scene.showToast?.(`Scenario Setup · ${scenarioSetupActionCountLabel(recipe)}`);
    renderScenarioSetup(state, ui);
  } catch (error) {
    scene.world = previousWorld;
    scene.booting = false;
    state.draft = previousDraft;
    state.frozen = previousFrozen;
    state.active = previousActive;
    state.busy = false;
    setPaused(scene, ui, previousPaused);
    setLocked(ui, previousActive);
    renderScenarioSetup(state, ui);
    console.error(error);
    scene.showToast?.(`Scenario Setup failed: ${error?.message || error}`);
  }
}

function useScenarioSetupTool(scene, state, ui, x, y, count) {
  if (state.busy || !state.draft) return;
  try {
    const action = scenarioSetupAction(state.selectedPlacement, x, y, count);
    // Build/validate the next immutable draft before authority. Assignment still
    // happens only after the command succeeds.
    const nextDraft = appendScenarioSetupAction(state.draft, action);
    applyScenarioSetup(scene.world, [action]);
    state.draft = nextDraft;
    scene.syncWorld(scene.time.now);
    scene.inspectTile(x, y);
    scene.showToast?.(`Scenario + ${setupToast(action)}`);
    renderScenarioSetup(state, ui);
  } catch (error) {
    if (/impassable/i.test(String(error?.message))) {
      scene.showToast?.('Scenario placement needs passable land');
      return;
    }
    if (/32 actions/i.test(String(error?.message))) {
      scene.showToast?.('Scenario Setup is full · 32/32 actions');
      return;
    }
    console.error(error);
    scene.showToast?.(`Scenario placement failed: ${error?.message || error}`);
  }
}

function renameDraft(scene, state, ui) {
  if (!state.active || state.busy || !state.draft) return;
  try {
    state.draft = renameScenarioSetup(state.draft, ui.name.value);
    ui.name.value = state.draft.name;
    renderScenarioSetup(state, ui);
  } catch (error) {
    ui.name.value = state.draft.name;
    scene.showToast?.(`Scenario name unchanged: ${error?.message || error}`);
  }
}

function runScenario(scene, state, ui) {
  if (!state.active || state.busy || !state.draft) return;
  state.frozen = freezeScenarioSetup(state.draft);
  state.active = false;
  state.busy = false;
  setPaused(scene, ui, true);
  setLocked(ui, false);
  scene.showToast?.(`Scenario ready · ${scenarioSetupActionCountLabel(state.frozen)}`);
  renderScenarioSetup(state, ui);
}

function renderScenarioSetup(state, ui) {
  const active = state.active;
  document.documentElement.dataset.scenarioSetup = active ? 'true' : 'false';
  ui.enter.dataset.active = active ? 'true' : 'false';
  ui.enter.setAttribute('aria-pressed', active ? 'true' : 'false');
  ui.enter.disabled = active || state.busy;

  for (const button of ui.placements) {
    const selected = active && button.dataset.scenarioSetupTool === state.selectedPlacement;
    button.dataset.active = selected ? 'true' : 'false';
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }

  if (active && state.draft) {
    ui.panel.hidden = false;
    ui.editor.hidden = false;
    ui.running.hidden = true;
    ui.state.textContent = 'SETUP · PAUSED';
    ui.heading.textContent = 'Scenario Setup';
    ui.name.value = state.draft.name;
    ui.count.textContent = scenarioSetupActionCountLabel(state.draft);
    ui.recent.innerHTML = recentActionMarkup(state.draft);
    ui.badge.hidden = false;
    ui.badge.textContent = `SETUP · ${state.draft.setup.length}`;
    return;
  }

  ui.panel.hidden = true;
  ui.editor.hidden = false;
  ui.running.hidden = true;
  if (state.frozen) {
    ui.badge.hidden = false;
    ui.badge.textContent = `SCENARIO · ${state.frozen.setup.length}`;
    ui.count.textContent = scenarioSetupActionCountLabel(state.frozen);
    ui.running.textContent = `${state.frozen.name} · ${scenarioSetupActionCountLabel(state.frozen)} · ordinary gameplay`;
  } else {
    ui.badge.hidden = true;
    ui.badge.textContent = '';
  }
}

function recentActionMarkup(recipe) {
  const rows = scenarioSetupRecentActions(recipe, 6);
  if (!rows.length) return 'Base world only · click passable land to place setup actors.';
  return rows.map((row) => `<span>${row.index}. ${escapeHtml(row.label)}</span>`).join('');
}

function setPaused(scene, ui, paused) {
  scene.paused = Boolean(paused);
  ui.pause.textContent = scene.paused ? '▶ Play' : 'Ⅱ Pause';
  ui.pause.dataset.active = scene.paused ? 'true' : 'false';
}

function setLocked(ui, locked) {
  ui.seed.disabled = locked;
  ui.preset.disabled = locked;
  ui.reset.disabled = locked;
  ui.pause.disabled = locked;
  ui.speed.disabled = locked;
}

function setupUi() {
  const ui = {
    enter: document.querySelector('#scenario-setup-enter'),
    badge: document.querySelector('#scenario-state-badge'),
    panel: document.querySelector('#scenario-setup-panel'),
    state: document.querySelector('#scenario-setup-state'),
    heading: document.querySelector('#scenario-setup-heading'),
    editor: document.querySelector('#scenario-setup-editor'),
    running: document.querySelector('#scenario-running-summary'),
    name: document.querySelector('#scenario-name'),
    count: document.querySelector('#scenario-setup-count'),
    recent: document.querySelector('#scenario-setup-recent'),
    clear: document.querySelector('#scenario-setup-clear'),
    run: document.querySelector('#scenario-setup-run'),
    placements: [...document.querySelectorAll('[data-scenario-setup-tool]')],
    seed: document.querySelector('#seed'),
    preset: document.querySelector('#world-preset'),
    reset: document.querySelector('#reset'),
    pause: document.querySelector('#pause'),
    speed: document.querySelector('#speed'),
    boot: document.querySelector('#boot-status')
  };
  if (!ui.enter || !ui.badge || !ui.panel || !ui.state || !ui.heading || !ui.editor || !ui.running
      || !ui.name || !ui.count || !ui.recent || !ui.clear || !ui.run || ui.placements.length !== 3
      || !ui.seed || !ui.preset || !ui.reset || !ui.pause || !ui.speed) return null;
  return ui;
}

function setupToast(action) {
  if (action.type === 'spawn_human') return `Human ×${action.count}`;
  if (action.species === 'grazer') return `Grazer ×${action.count}`;
  return `Wolf ×${action.count}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Retained for deterministic browser evidence without exposing raw JSON in UI.
export function frozenScenarioRecipeString(scene) {
  return scene?.scenarioSetup?.frozen ? serializeScenarioRecipe(scene.scenarioSetup.frozen) : null;
}
