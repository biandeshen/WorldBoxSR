import { scenarioRecipeFromSearch } from './presentation/scenario_transport.js';

const params = new URLSearchParams(window.location.search);
const renderer = params.get('renderer') === 'legacy' ? 'legacy' : 'phaser';
const hasScenario = params.has('scenario');

document.documentElement.dataset.renderer = renderer;

let startupScenario = null;
let startupScenarioError = null;
if (hasScenario) {
  if (renderer === 'legacy') {
    startupScenarioError = 'Scenario links require the Phaser renderer.';
  } else {
    try {
      startupScenario = scenarioRecipeFromSearch(window.location.search);
    } catch (error) {
      startupScenarioError = `Scenario link rejected: ${error?.message || error}`;
    }
  }
}

globalThis.__WORLDBOXSR_STARTUP_SCENARIO__ = startupScenario;
globalThis.__WORLDBOXSR_STARTUP_SCENARIO_ERROR__ = startupScenarioError;

if (renderer === 'legacy') {
  const presetField = document.querySelector('#world-preset')?.closest('.compact-field');
  if (presetField) presetField.hidden = true;
}

const startup = (renderer === 'legacy'
  ? import('./main.js')
  : import('./phaser_main.js'))
  .then(async (module) => {
    if (renderer === 'phaser') {
      const { installRulingLineInspectorRuntime } = await import('./presentation/ruling_line_runtime.js');
      installRulingLineInspectorRuntime();
    }
    return module;
  });

startup.catch((error) => {
  console.error(`Failed to start ${renderer} renderer`, error);
  const status = document.querySelector('#boot-status');
  if (status) status.textContent = `Renderer failed: ${error?.message || error}`;
});
