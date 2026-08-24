import { applyCameraComposition, refreshCameraBoundsForZoom } from './camera_composition.js';

const TILE_SIZE = 28;
let scene = null;
let attachTimer = null;
let scheduled = false;

attachWhenReady();
window.addEventListener('resize', scheduleComposition);
for (const id of ['reset-camera', 'reset']) {
  document.querySelector(`#${id}`)?.addEventListener('click', scheduleComposition);
}

function attachWhenReady() {
  const game = globalThis.__PHASER_GAME__;
  const candidate = game?.scene?.getScene?.('world');
  if (!candidate?.cameras?.main || !candidate?.view?.width || !candidate?.view?.height) {
    attachTimer = window.setTimeout(attachWhenReady, 30);
    return;
  }

  scene = candidate;
  applyCameraComposition(scene, TILE_SIZE);
  scene.scale?.on?.('resize', scheduleComposition);
  scene.input?.on?.('wheel', () => window.setTimeout(() => {
    if (scene?.view) refreshCameraBoundsForZoom(scene, TILE_SIZE);
  }, 0));
}

function scheduleComposition() {
  if (scheduled) return;
  scheduled = true;
  window.clearTimeout(attachTimer);
  window.setTimeout(() => {
    scheduled = false;
    if (!scene?.view) {
      attachWhenReady();
      return;
    }
    applyCameraComposition(scene, TILE_SIZE);
  }, 0);
}
