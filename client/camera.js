export function createCamera() {
  return { offsetX: 0, offsetY: 0, zoom: 1 };
}

export function resetCamera(camera) {
  camera.offsetX = 0;
  camera.offsetY = 0;
  camera.zoom = 1;
  return camera;
}

export function panCamera(camera, dx, dy) {
  camera.offsetX += dx;
  camera.offsetY += dy;
  return camera;
}

export function zoomCameraAt(camera, factor, screenX, screenY, { minZoom = 0.5, maxZoom = 8 } = {}) {
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('zoom factor must be positive');
  const oldZoom = camera.zoom;
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * factor));
  const worldCanvasX = (screenX - camera.offsetX) / oldZoom;
  const worldCanvasY = (screenY - camera.offsetY) / oldZoom;
  camera.zoom = nextZoom;
  camera.offsetX = screenX - worldCanvasX * nextZoom;
  camera.offsetY = screenY - worldCanvasY * nextZoom;
  return camera;
}

export function screenToWorld(camera, screenX, screenY, viewport) {
  const baseCellW = viewport.canvasWidth / viewport.worldWidth;
  const baseCellH = viewport.canvasHeight / viewport.worldHeight;
  return {
    x: (screenX - camera.offsetX) / (baseCellW * camera.zoom),
    y: (screenY - camera.offsetY) / (baseCellH * camera.zoom)
  };
}

export function screenToTile(camera, screenX, screenY, viewport) {
  const point = screenToWorld(camera, screenX, screenY, viewport);
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (x < 0 || y < 0 || x >= viewport.worldWidth || y >= viewport.worldHeight) return null;
  return { x, y };
}

export function worldToScreen(camera, worldX, worldY, viewport) {
  const baseCellW = viewport.canvasWidth / viewport.worldWidth;
  const baseCellH = viewport.canvasHeight / viewport.worldHeight;
  return {
    x: camera.offsetX + worldX * baseCellW * camera.zoom,
    y: camera.offsetY + worldY * baseCellH * camera.zoom
  };
}
