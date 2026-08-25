import { formatChronicleLabel } from './civilization_story.js';
import {
  CHRONICLE_LENSES,
  chronicleLensDefinition,
  chronicleRowsForLens
} from './chronicle_lenses.js';

const historyList = document.querySelector('#history-list');
const historyScopeLabel = document.querySelector('#history-scope-label');
const timeline = document.querySelector('#timeline');
const resetButton = document.querySelector('#reset');
const lensBar = ensureLensBar();
let activeLens = 'highlights';
let scheduled = false;

if (document.documentElement.dataset.renderer === 'phaser' && historyList && lensBar) {
  lensBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-chronicle-lens]');
    if (!button) return;
    const lensId = button.dataset.chronicleLens;
    chronicleLensDefinition(lensId);
    activeLens = lensId;
    renderLens();
  });

  const observer = new MutationObserver(() => scheduleRender());
  observer.observe(historyList, { childList: true });
  resetButton?.addEventListener('click', () => waitForReadyThenRender());
  waitForReadyThenRender();
} else if (lensBar) {
  lensBar.remove();
}

export function currentChronicleLens() {
  return activeLens;
}

export function setChronicleLens(lensId) {
  chronicleLensDefinition(lensId);
  activeLens = lensId;
  return renderLens();
}

function renderLens() {
  const scene = worldScene();
  if (!scene?.world || scene.booting !== false || !historyList) return false;
  const definition = chronicleLensDefinition(activeLens);
  const rows = chronicleRowsForLens(scene.world, activeLens);
  const desiredIds = rows.map((entry) => entry.eventId).join(',');
  const currentIds = [...historyList.querySelectorAll('button[data-event-id]')]
    .map((button) => Number(button.dataset.eventId))
    .join(',');
  const alreadyRendered = historyList.dataset.chronicleLens === activeLens && currentIds === desiredIds;

  updateLensButtons();
  if (historyScopeLabel) historyScopeLabel.textContent = `World chronicle · ${definition.label}`;
  if (alreadyRendered) return true;

  historyList.dataset.chronicleLens = activeLens;
  historyList.innerHTML = rows.length
    ? rows.map((entry) => `<button class="history-event" type="button" data-event-id="${entry.eventId}">${escapeHtml(formatChronicleLabel(entry))}</button>`).join('')
    : `<div id="history-empty">${escapeHtml(definition.empty)}</div>`;
  return true;
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    renderLens();
  });
}

function waitForReadyThenRender(attempt = 0) {
  const scene = worldScene();
  if (scene?.world && scene.booting === false) {
    renderLens();
    return;
  }
  if (attempt >= 300) return;
  globalThis.setTimeout?.(() => waitForReadyThenRender(attempt + 1), 100);
}

function updateLensButtons() {
  lensBar?.querySelectorAll('button[data-chronicle-lens]').forEach((button) => {
    const selected = button.dataset.chronicleLens === activeLens;
    button.dataset.active = selected ? 'true' : 'false';
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
  });
}

function ensureLensBar() {
  if (!timeline || !historyScopeLabel) return null;
  const existing = document.querySelector('#chronicle-lenses');
  if (existing) return existing;
  const bar = document.createElement('div');
  bar.id = 'chronicle-lenses';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Chronicle story lens');
  bar.innerHTML = CHRONICLE_LENSES.map((lens, index) => `<button type="button" role="tab" data-chronicle-lens="${lens.id}" data-active="${index === 0 ? 'true' : 'false'}" aria-selected="${index === 0 ? 'true' : 'false'}" tabindex="${index === 0 ? '0' : '-1'}">${escapeHtml(lens.label)}</button>`).join('');
  historyScopeLabel.insertAdjacentElement('afterend', bar);
  return bar;
}

function worldScene() {
  return globalThis.__PHASER_GAME__?.scene?.getScene?.('world') ?? null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
