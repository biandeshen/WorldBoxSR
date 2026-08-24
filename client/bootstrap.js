const params = new URLSearchParams(window.location.search);
const renderer = params.get('renderer') === 'legacy' ? 'legacy' : 'phaser';

document.documentElement.dataset.renderer = renderer;

const modulePath = renderer === 'legacy' ? './main.js' : './phaser_main.js';

import(modulePath).catch((error) => {
  console.error(`Failed to start ${renderer} renderer`, error);
  const status = document.querySelector('#boot-status');
  if (status) status.textContent = `Renderer failed: ${error?.message || error}`;
});
