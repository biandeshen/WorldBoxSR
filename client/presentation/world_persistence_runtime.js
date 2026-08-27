import {
  clearLocalWorldSave,
  readLocalWorldSave,
  writeLocalWorldSave
} from './world_save.js';

const WORLD_REPLACED_EVENT = 'worldboxsr:world-replaced';
const AUTOSAVE_INTERVAL_MS = 30_000;
const seedInput = document.querySelector('#seed');
const presetSelect = document.querySelector('#world-preset');
const bootStatus = document.querySelector('#boot-status');
const panel = document.querySelector('#session-persistence');
const saveButton = document.querySelector('#session-save-now');
const restoreButton = document.querySelector('#session-restore');
const clearButton = document.querySelector('#session-clear');
const status = document.querySelector('#session-persistence-status');

if (document.documentElement.dataset.renderer === 'phaser') attachWhenReady();
else if (panel) panel.hidden = true;

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  if (!scene?.world || !scene?.installReadyWorld) {
    window.setTimeout(attachWhenReady, 20);
    return;
  }
  if (scene.localWorldPersistence?.attached) return;

  guardStaleShowcaseWarmup(scene);
  const state = {
    attached: true,
    armed: false,
    lastSavedAt: null,
    lastSavedBytes: null,
    startupRestoreAttempted: false,
    timer: null
  };
  scene.localWorldPersistence = state;

  saveButton?.addEventListener('click', () => saveCurrentWorld(scene, state, { announce: true }));
  restoreButton?.addEventListener('click', () => restoreSavedWorld(scene, state, { announce: true }));
  clearButton?.addEventListener('click', () => clearSavedWorld(scene, state));
  globalThis.addEventListener?.('pagehide', () => flushArmedWorld(scene, state));
  document.addEventListener?.('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushArmedWorld(scene, state);
  });
  globalThis.addEventListener?.(WORLD_REPLACED_EVENT, () => renderPersistenceState(scene, state));

  attemptStartupRestore(scene, state);
  renderPersistenceState(scene, state);
  renderWhenWorldReady(scene, state);
  state.timer = window.setInterval(() => saveCurrentWorld(scene, state, { announce: false }), AUTOSAVE_INTERVAL_MS);
}

function renderWhenWorldReady(scene, state) {
  if (!scene.booting) {
    renderPersistenceState(scene, state);
    return;
  }
  window.setTimeout(() => renderWhenWorldReady(scene, state), 120);
}

function guardStaleShowcaseWarmup(scene) {
  if (scene.__localWorldPersistenceWarmupGuard) return;
  const originalFinishShowcaseWarmup = scene.finishShowcaseWarmup?.bind(scene);
  if (!originalFinishShowcaseWarmup) return;
  scene.__localWorldPersistenceWarmupGuard = true;
  scene.finishShowcaseWarmup = (token, seed) => {
    if (token !== scene.worldGeneration) return Promise.resolve();
    return originalFinishShowcaseWarmup(token, seed);
  };
}

function attemptStartupRestore(scene, state) {
  if (state.startupRestoreAttempted) return;
  state.startupRestoreAttempted = true;
  if (globalThis.__WORLDBOXSR_STARTUP_SCENARIO__) return;

  let saved;
  try {
    saved = readLocalWorldSave(globalThis.localStorage);
  } catch (error) {
    globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__ = `Saved world rejected: ${error?.message || error}`;
    setStatus(`Saved world rejected · ${error?.message || error}`, 'error');
    return;
  }
  if (!saved) return;

  state.armed = true;
  installSavedWorld(scene, state, saved, { announce: true, startup: true });
}

function installSavedWorld(scene, state, saved, { announce = false, startup = false } = {}) {
  if (!saved?.world) return false;
  if (startup && globalThis.__WORLDBOXSR_STARTUP_SCENARIO__) return false;
  if (!startup && !ordinaryWorldAvailable(scene)) {
    if (announce) scene.showToast?.('Scenario worlds use Recipe / Replay instead of local world saves');
    renderPersistenceState(scene, state);
    return false;
  }

  scene.worldGeneration += 1;
  if (seedInput) seedInput.value = String(saved.world.seed);
  if (presetSelect) presetSelect.value = saved.preset;
  scene.installReadyWorld(saved.world, { paused: true });
  if (bootStatus) bootStatus.textContent = 'Phaser 4 · authoritative simulation · local world restored · paused';
  state.armed = true;
  state.lastSavedAt = saved.savedAt;
  globalThis.__WORLDBOXSR_LOCAL_SAVE_RESTORED__ = {
    savedAt: saved.savedAt,
    preset: saved.preset,
    day: saved.world.day
  };
  globalThis.dispatchEvent?.(new CustomEvent(WORLD_REPLACED_EVENT, { detail: { reason: 'local-save-restored' } }));
  if (announce) scene.showToast?.(`Restored local world · year ${worldYear(saved.world).toFixed(1)} · paused`);
  renderPersistenceState(scene, state);
  return true;
}

function saveCurrentWorld(scene, state, { announce = false } = {}) {
  if (!ordinaryWorldAvailable(scene) || scene.booting || !scene.world) {
    if (announce) scene.showToast?.(scene.booting ? 'World is still preparing…' : 'Scenario worlds use Recipe / Replay instead of local world saves');
    renderPersistenceState(scene, state);
    return false;
  }

  try {
    const savedAt = Date.now();
    const result = writeLocalWorldSave(globalThis.localStorage, scene.world, {
      preset: presetSelect?.value || 'sandbox',
      savedAt
    });
    state.armed = true;
    state.lastSavedAt = savedAt;
    state.lastSavedBytes = result.bytes;
    delete globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__;
    if (announce) scene.showToast?.(`World saved locally · year ${worldYear(scene.world).toFixed(1)}`);
    renderPersistenceState(scene, state);
    return true;
  } catch (error) {
    globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__ = `Autosave failed: ${error?.message || error}`;
    setStatus(`Autosave failed · ${error?.message || error}`, 'error');
    if (announce) scene.showToast?.(`Save failed: ${error?.message || error}`);
    return false;
  }
}

function flushArmedWorld(scene, state) {
  if (!state.armed) return false;
  return saveCurrentWorld(scene, state, { announce: false });
}

function restoreSavedWorld(scene, state, { announce = false } = {}) {
  if (!ordinaryWorldAvailable(scene)) {
    if (announce) scene.showToast?.('Scenario worlds use Recipe / Replay instead of local world saves');
    renderPersistenceState(scene, state);
    return false;
  }
  try {
    const saved = readLocalWorldSave(globalThis.localStorage);
    if (!saved) {
      if (announce) scene.showToast?.('No local world save yet');
      renderPersistenceState(scene, state);
      return false;
    }
    state.armed = true;
    return installSavedWorld(scene, state, saved, { announce, startup: false });
  } catch (error) {
    globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__ = `Saved world rejected: ${error?.message || error}`;
    setStatus(`Saved world rejected · ${error?.message || error}`, 'error');
    if (announce) scene.showToast?.(`Restore failed: ${error?.message || error}`);
    return false;
  }
}

function clearSavedWorld(scene, state) {
  try {
    clearLocalWorldSave(globalThis.localStorage);
    state.armed = false;
    state.lastSavedAt = null;
    state.lastSavedBytes = null;
    delete globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__;
    scene.showToast?.('Local world save cleared');
    renderPersistenceState(scene, state);
  } catch (error) {
    setStatus(`Could not clear local save · ${error?.message || error}`, 'error');
  }
}

function ordinaryWorldAvailable(scene) {
  if (!scene?.world) return false;
  const scenario = scene.scenarioSetup;
  if (!scenario?.attached) return false;
  if (scenario.active || scenario.busy) return false;
  return scenario.currentRecipe?.() == null;
}

function renderPersistenceState(scene, state) {
  if (!panel) return;
  const scenarioReady = Boolean(scene.scenarioSetup?.attached);
  if (!scenarioReady) {
    saveButton && (saveButton.disabled = true);
    restoreButton && (restoreButton.disabled = true);
    clearButton && (clearButton.disabled = true);
    setStatus('Autosave initializing…', 'idle');
    return;
  }

  const ordinary = ordinaryWorldAvailable(scene);
  saveButton && (saveButton.disabled = !ordinary || Boolean(scene.booting));
  const saved = safeReadSave();
  restoreButton && (restoreButton.disabled = !ordinary || !saved);
  clearButton && (clearButton.disabled = !saved);

  if (!ordinary) {
    setStatus('Scenario active · use Recipe / Replay / Fork', 'scenario');
    return;
  }
  if (globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__) {
    setStatus(globalThis.__WORLDBOXSR_LOCAL_SAVE_ERROR__, 'error');
    return;
  }
  if (saved) {
    const age = formatSavedAge(saved.savedAt);
    const size = state.lastSavedBytes ? ` · ${formatBytes(state.lastSavedBytes)}` : '';
    setStatus(`Autosave ready · year ${worldYear(saved.world).toFixed(1)} · ${age}${size}`, 'ready');
    return;
  }
  setStatus(scene.booting ? 'Autosave starts when this world is ready' : 'Autosave ready · first checkpoint in ≤30s', 'idle');
}

function safeReadSave() {
  try {
    return readLocalWorldSave(globalThis.localStorage);
  } catch {
    return null;
  }
}

function setStatus(message, stateName = 'idle') {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = stateName;
}

function worldYear(world) {
  return world.day / world.config.daysPerYear;
}

function formatSavedAge(savedAt) {
  const delta = Math.max(0, Date.now() - savedAt);
  if (delta < 60_000) return 'saved just now';
  if (delta < 3_600_000) return `saved ${Math.max(1, Math.floor(delta / 60_000))}m ago`;
  if (delta < 86_400_000) return `saved ${Math.max(1, Math.floor(delta / 3_600_000))}h ago`;
  return `saved ${Math.max(1, Math.floor(delta / 86_400_000))}d ago`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
