const DESKTOP_INSPECTOR_RESERVE = 300;
const TOPBAR_RESERVE = 58;
const POWER_DOCK_RESERVE = 86;
const WORLD_MARGIN = 14;

let attachedScene = null;
let tileSize = null;
let attachTimer = null;

attachWhenReady();
window.addEventListener('resize', () => scheduleApply());
for (const id of ['reset-camera', 'reset']) {
  document.querySelector(`#${id}`)?.addEventListener('click', () => scheduleApply());
}

function attachWhenReady() {
  const game = globalThis.__PHASER_GAME__;
  const scene = game?.scene?.getScene?.('world');
  const camera = scene?.cameras?.main;
  const view = scene?.view;

  if (!scene || !camera || !view?.width || !view?.height || camera.bounds.width <= 0) {
    attachTimer = window.setTimeout(attachWhenReady, 40);
    return;
  }

  attachedScene = scene;
  tileSize = camera.bounds.width / view.width;
  applyComposition();

  scene.scale?.on?.('resize', () => scheduleApply());
}

function scheduleApply() {
  window.clearTimeout(attachTimer);
  attachTimer = window.setTimeout(() => {
    if (!attachedScene?.view) {
      attachWhenReady();
      return;
    }
    applyComposition();
  }, 0);
}

function applyComposition() {
  const scene = attachedScene;
  if (!scene?.view || !Number.isFinite(tileSize) || tileSize <= 0) return;

  const camera = scene.cameras.main;
  const screenWidth = scene.scale.width;
  const screenHeight = scene.scale.height;
  const desktop = screenWidth >= 900;
  const compact = screenWidth < 650;

  const viewportX = 0;
  const viewportY = compact ? 46 : TOPBAR_RESERVE;
  const rightReserve = desktop ? DESKTOP_INSPECTOR_RESERVE : 0;
  const bottomReserve = compact ? 70 : POWER_DOCK_RESERVE;
  const viewportWidth = Math.max(280, screenWidth - rightReserve);
  const viewportHeight = Math.max(220, screenHeight - viewportY - bottomReserve);

  const worldWidth = scene.view.width * tileSize;
  const worldHeight = scene.view.height * tileSize;
  const fitX = Math.max(0.1, (viewportWidth - WORLD_MARGIN * 2) / worldWidth);
  const fitY = Math.max(0.1, (viewportHeight - WORLD_MARGIN * 2) / worldHeight);
  const zoom = clamp(Math.min(fitX, fitY), 0.55, 2.35);

  camera.setViewport(viewportX, viewportY, viewportWidth, viewportHeight);
  camera.setZoom(zoom);

  const visibleWorldWidth = viewportWidth / zoom;
  const visibleWorldHeight = viewportHeight / zoom;
  const padX = Math.max(0, (visibleWorldWidth - worldWidth) / 2);
  const padY = Math.max(0, (visibleWorldHeight - worldHeight) / 2);

  camera.setBounds(
    -padX,
    -padY,
    worldWidth + padX * 2,
    worldHeight + padY * 2
  );
  camera.centerOn(worldWidth / 2, worldHeight / 2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
