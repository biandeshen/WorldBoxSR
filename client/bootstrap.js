const params = new URLSearchParams(window.location.search);
const renderer = params.get('renderer') === 'legacy' ? 'legacy' : 'phaser';

document.documentElement.dataset.renderer = renderer;

if (renderer === 'legacy') {
  const presetField = document.querySelector('#world-preset')?.closest('.compact-field');
  if (presetField) presetField.hidden = true;
}

const startup = renderer === 'legacy'
  ? import('./main.js')
  : import('./phaser_main.js');

startup.catch((error) => {
  console.error(`Failed to start ${renderer} renderer`, error);
  const status = document.querySelector('#boot-status');
  if (status) status.textContent = `Renderer failed: ${error?.message || error}`;
});
