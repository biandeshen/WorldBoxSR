const TOPBAR_RESERVE = 58;
const COMPACT_TOPBAR_RESERVE = 96;
const POWER_DOCK_RESERVE = 88;
const COMPACT_POWER_DOCK_RESERVE = 82;
const WORLD_MARGIN = 18;

export function computeCameraComposition({ screenWidth, screenHeight, worldWidth, worldHeight }) {
  assertPositive(screenWidth, 'screenWidth');
  assertPositive(screenHeight, 'screenHeight');
  assertPositive(worldWidth, 'worldWidth');
  assertPositive(worldHeight, 'worldHeight');

  const desktop = screenWidth >= 900;
  const compact = screenWidth < 650;
  const viewport = desktop
    ? {
        x: 0,
        y: 0,
        width: screenWidth,
        height: screenHeight
      }
    : {
        x: 0,
        y: compact ? COMPACT_TOPBAR_RESERVE : TOPBAR_RESERVE,
        width: Math.max(280, screenWidth),
        height: Math.max(
          220,
          screenHeight
            - (compact ? COMPACT_TOPBAR_RESERVE : TOPBAR_RESERVE)
            - (compact ? COMPACT_POWER_DOCK_RESERVE : POWER_DOCK_RESERVE)
        )
      };

  const fitX = Math.max(0.1, (viewport.width - WORLD_MARGIN * 2) / worldWidth);
  const fitY = Math.max(0.1, (viewport.height - WORLD_MARGIN * 2) / worldHeight);
  const zoom = clamp(Math.min(fitX, fitY), 0.35, 2.35);
  const bounds = boundsForZoom({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    zoom,
    worldWidth,
    worldHeight
  });

  return {
    viewport,
    zoom,
    bounds,
    center: { x: worldWidth / 2, y: worldHeight / 2 },
    mode: desktop ? 'desktop' : compact ? 'compact' : 'tablet'
  };
}

export function applyCameraComposition(scene, tileSize) {
  if (!scene?.view || !Number.isFinite(tileSize) || tileSize <= 0) return null;

  const worldWidth = scene.view.width * tileSize;
  const worldHeight = scene.view.height * tileSize;
  const layout = computeCameraComposition({
    screenWidth: scene.scale.width,
    screenHeight: scene.scale.height,
    worldWidth,
    worldHeight
  });
  const camera = scene.cameras.main;

  camera.setViewport(layout.viewport.x, layout.viewport.y, layout.viewport.width, layout.viewport.height);
  camera.setZoom(layout.zoom);
  camera.setBounds(
    layout.bounds.x,
    layout.bounds.y,
    layout.bounds.width,
    layout.bounds.height
  );
  camera.centerOn(layout.center.x, layout.center.y);
  return layout;
}

export function refreshCameraBoundsForZoom(scene, tileSize) {
  if (!scene?.view || !Number.isFinite(tileSize) || tileSize <= 0) return null;

  const camera = scene.cameras.main;
  const worldWidth = scene.view.width * tileSize;
  const worldHeight = scene.view.height * tileSize;
  const bounds = boundsForZoom({
    viewportWidth: camera.width,
    viewportHeight: camera.height,
    zoom: camera.zoom,
    worldWidth,
    worldHeight
  });

  camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  return bounds;
}

function boundsForZoom({ viewportWidth, viewportHeight, zoom, worldWidth, worldHeight }) {
  const visibleWorldWidth = viewportWidth / zoom;
  const visibleWorldHeight = viewportHeight / zoom;
  const padX = Math.max(0, (visibleWorldWidth - worldWidth) / 2);
  const padY = Math.max(0, (visibleWorldHeight - worldHeight) / 2);
  return {
    x: -padX,
    y: -padY,
    width: worldWidth + padX * 2,
    height: worldHeight + padY * 2,
    padX,
    padY
  };
}

function assertPositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
