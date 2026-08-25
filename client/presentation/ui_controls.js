import { godPowerForShortcut, godPowerMeta } from './god_power_catalog.js';

const toolSelect = document.querySelector('#tool');
const powerButtons = [...document.querySelectorAll('[data-tool-button]')];
const toolReadout = document.querySelector('#tool-readout');
const rendererLink = document.querySelector('#renderer-link');

for (const button of powerButtons) {
  button.addEventListener('click', () => selectTool(button.dataset.toolButton));
}

toolSelect?.addEventListener('change', syncPowerButtons);

window.addEventListener('keydown', (event) => {
  if (scenarioSetupActive()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;

  const tool = godPowerForShortcut(event.key);
  if (!tool) return;
  event.preventDefault();
  selectTool(tool);
});

const params = new URLSearchParams(window.location.search);
const legacy = params.get('renderer') === 'legacy';
if (rendererLink) {
  rendererLink.href = legacy ? window.location.pathname : '?renderer=legacy';
  rendererLink.textContent = legacy ? 'Phaser renderer ↗' : 'Legacy renderer ↗';
  rendererLink.title = legacy
    ? 'Return to the Phaser renderer'
    : 'Open the legacy Canvas renderer for comparison';
}

syncPowerButtons();

function selectTool(tool) {
  if (scenarioSetupActive() || !toolSelect) return;
  const meta = godPowerMeta(tool);
  if (meta.id !== tool) return;
  toolSelect.value = tool;
  toolSelect.dispatchEvent(new Event('change', { bubbles: true }));
  syncPowerButtons();
}

function syncPowerButtons() {
  const selected = toolSelect?.value || 'spawn_human';
  for (const button of powerButtons) {
    const active = toolSelect && !scenarioSetupActive() && button.dataset.toolButton === selected;
    button.dataset.active = active ? 'true' : 'false';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  if (toolReadout) toolReadout.textContent = scenarioSetupActive() ? 'Scenario Setup owns map input' : godPowerMeta(selected).label;
}

function scenarioSetupActive() {
  return document.documentElement.dataset.scenarioSetup === 'true';
}
