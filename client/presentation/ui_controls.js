const toolSelect = document.querySelector('#tool');
const powerButtons = [...document.querySelectorAll('[data-tool-button]')];
const toolReadout = document.querySelector('#tool-readout');
const rendererLink = document.querySelector('#renderer-link');

const toolLabels = {
  spawn_human: 'Create humans',
  spawn_grazer: 'Create grazers',
  erase: 'Erase humans',
  lightning: 'Lightning'
};

for (const button of powerButtons) {
  button.addEventListener('click', () => selectTool(button.dataset.toolButton));
}

toolSelect?.addEventListener('change', syncPowerButtons);

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;

  const shortcuts = {
    '1': 'spawn_human',
    '2': 'spawn_grazer',
    '3': 'erase',
    '4': 'lightning'
  };

  const tool = shortcuts[event.key];
  if (!tool) return;
  event.preventDefault();
  selectTool(tool);
});

const params = new URLSearchParams(window.location.search);
const legacy = params.get('renderer') === 'legacy';
if (rendererLink) {
  rendererLink.href = legacy ? window.location.pathname : '?renderer=legacy';
  rendererLink.textContent = legacy ? 'v0.2 renderer ↗' : 'v0.1 renderer ↗';
  rendererLink.title = legacy
    ? 'Return to the Phaser v0.2 renderer'
    : 'Open the v0.1 Canvas renderer for comparison';
}

syncPowerButtons();

function selectTool(tool) {
  if (!toolSelect || !toolLabels[tool]) return;
  toolSelect.value = tool;
  toolSelect.dispatchEvent(new Event('change', { bubbles: true }));
  syncPowerButtons();
}

function syncPowerButtons() {
  const selected = toolSelect?.value || 'spawn_human';
  for (const button of powerButtons) {
    const active = button.dataset.toolButton === selected;
    button.dataset.active = active ? 'true' : 'false';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  if (toolReadout) toolReadout.textContent = toolLabels[selected] || selected;
}
