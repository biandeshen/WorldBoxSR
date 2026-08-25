import { serializeScenarioRecipe } from './scenario_recipe.js';
import { parseScenarioRecipeText, scenarioShareUrl } from './scenario_transport.js';

installStyleSheet();

const startupError = document.querySelector('#scenario-startup-error');
const toggle = document.querySelector('#scenario-portability-toggle');
const panel = document.querySelector('#scenario-portability-panel');
const closeButton = document.querySelector('#scenario-portability-close');
const summary = document.querySelector('#scenario-portability-summary');
const copyButton = document.querySelector('#scenario-copy-link');
const exportButton = document.querySelector('#scenario-export-json');
const importButton = document.querySelector('#scenario-import-json');
const text = document.querySelector('#scenario-recipe-text');
const status = document.querySelector('#scenario-portability-status');

showStartupError();

if (document.documentElement.dataset.renderer === 'legacy') {
  if (toggle) toggle.hidden = true;
  if (panel) panel.hidden = true;
} else {
  attachWhenReady();
}

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  if (!scene?.scenarioSetup?.attached || !toggle || !panel || !closeButton || !summary
      || !copyButton || !exportButton || !importButton || !text || !status) {
    window.setTimeout(attachWhenReady, 40);
    return;
  }
  if (scene.scenarioPortability?.attached) return;

  const state = {
    attached: true,
    busy: false,
    scene
  };
  scene.scenarioPortability = state;

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    refresh(state);
  });
  closeButton.addEventListener('click', () => { panel.hidden = true; });
  copyButton.addEventListener('click', () => { void copyScenarioLink(state); });
  exportButton.addEventListener('click', () => exportScenarioJson(state));
  importButton.addEventListener('click', () => { void importScenarioJson(state); });
  document.querySelector('#scenario-name')?.addEventListener('change', () => refresh(state));

  const observer = new MutationObserver(() => refresh(state));
  for (const target of [document.querySelector('#scenario-state-badge'), document.querySelector('#scenario-setup-count')]) {
    if (target) observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  refresh(state);
  showStartupError();
}

function currentRecipe(state) {
  return state.scene.scenarioSetup?.currentRecipe?.()
    ?? (state.scene.scenarioSetup?.active ? state.scene.scenarioSetup?.draft : state.scene.scenarioSetup?.frozen)
    ?? null;
}

function refresh(state) {
  if (!summary || !copyButton || !exportButton || !importButton || !status) return;
  const recipe = currentRecipe(state);
  summary.textContent = recipe ? `${recipe.name} · ${recipe.setup.length}/32 actions` : 'No Scenario selected';
  copyButton.disabled = state.busy || !recipe;
  exportButton.disabled = state.busy || !recipe;
  importButton.disabled = state.busy;
  toggle?.setAttribute('aria-pressed', panel?.hidden === false ? 'true' : 'false');
  if (!recipe && !state.busy && !status.dataset.message) {
    status.textContent = 'Create or import a Scenario to share it.';
  }
}

async function copyScenarioLink(state) {
  const recipe = currentRecipe(state);
  if (!recipe) return setStatus('No Scenario Recipe is available to copy.', 'error');
  const url = scenarioShareUrl(window.location, recipe, { renderer: 'phaser' });
  text.value = url;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(url);
    setStatus('Scenario link copied. The same link is shown below.', 'ok');
  } catch {
    text.focus();
    text.select();
    setStatus('Clipboard unavailable — the Scenario link is shown below for manual copy.', 'warn');
  }
}

function exportScenarioJson(state) {
  const recipe = currentRecipe(state);
  if (!recipe) return setStatus('No Scenario Recipe is available to export.', 'error');
  const canonical = serializeScenarioRecipe(recipe);
  text.value = canonical;

  try {
    const blob = new Blob([canonical], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeFileName(recipe.name)}.worldboxsr-scenario.json`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus('Canonical Scenario JSON exported and shown below.', 'ok');
  } catch (error) {
    setStatus(`Download unavailable — canonical JSON is shown below. ${error?.message || error}`, 'warn');
  }
}

async function importScenarioJson(state) {
  if (state.busy) return;
  const beforeText = text.value;
  state.busy = true;
  setStatus('Validating and materializing Scenario…', 'busy');
  refresh(state);

  try {
    const recipe = parseScenarioRecipeText(beforeText);
    const installed = await state.scene.scenarioSetup.installPortableRecipe(recipe);
    text.value = serializeScenarioRecipe(installed);
    setStatus(`Imported ${installed.name} · ${installed.setup.length}/32 actions · paused start.`, 'ok');
  } catch (error) {
    text.value = beforeText;
    setStatus(`Import rejected: ${error?.message || error}`, 'error');
  } finally {
    state.busy = false;
    refresh(state);
  }
}

function showStartupError() {
  if (!startupError) return;
  const message = globalThis.__WORLDBOXSR_STARTUP_SCENARIO_ERROR__;
  if (!message) return;
  startupError.hidden = false;
  startupError.textContent = message;
}

function setStatus(message, kind) {
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
  status.dataset.message = 'true';
}

function safeFileName(name) {
  const value = String(name ?? 'scenario').trim().replace(/[^A-Za-z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '');
  return value || 'scenario';
}

function installStyleSheet() {
  if (document.querySelector('link[data-scenario-portability-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../scenario_portability.css', import.meta.url).href;
  link.dataset.scenarioPortabilityStyle = 'true';
  document.head.append(link);
}
