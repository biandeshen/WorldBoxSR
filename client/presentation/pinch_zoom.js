export const CAMERA_MIN_ZOOM = 0.55;
export const CAMERA_MAX_ZOOM = 2.6;

export function pinchDistance(a, b) {
  if (!finitePoint(a) || !finitePoint(b)) return Number.NaN;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pinchMidpoint(a, b) {
  if (!finitePoint(a) || !finitePoint(b)) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pinchZoom({ startZoom, startDistance, currentDistance, minZoom = CAMERA_MIN_ZOOM, maxZoom = CAMERA_MAX_ZOOM } = {}) {
  if (!Number.isFinite(startZoom) || startZoom <= 0) return null;
  if (!Number.isFinite(startDistance) || startDistance <= 0) return null;
  if (!Number.isFinite(currentDistance) || currentDistance <= 0) return null;
  const min = Number.isFinite(minZoom) ? minZoom : CAMERA_MIN_ZOOM;
  const max = Number.isFinite(maxZoom) ? maxZoom : CAMERA_MAX_ZOOM;
  if (!(max > min && min > 0)) return null;
  return clamp(startZoom * (currentDistance / startDistance), min, max);
}

// Phaser 4 rebuilds Camera.matrixCombined during preRender, not synchronously
// inside setZoom(). Therefore pinch focus cannot safely call getWorldPoint()
// both before and immediately after setZoom(). Instead, solve the public camera
// transform directly: keep one known world point under one screen point at the
// new zoom, then let the existing camera bounds clamp that desired scroll.
export function focusPreservingScroll({
  worldPoint,
  screenPoint,
  viewportX = 0,
  viewportY = 0,
  viewportWidth,
  viewportHeight,
  originX = 0.5,
  originY = 0.5,
  zoom
} = {}) {
  if (!finitePoint(worldPoint) || !finitePoint(screenPoint)) return null;
  if (!Number.isFinite(viewportX) || !Number.isFinite(viewportY)) return null;
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return null;
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return null;
  if (!Number.isFinite(originX) || !Number.isFinite(originY)) return null;
  if (!Number.isFinite(zoom) || zoom <= 0) return null;

  const originPxX = viewportWidth * originX;
  const originPxY = viewportHeight * originY;
  const localX = screenPoint.x - viewportX;
  const localY = screenPoint.y - viewportY;

  return {
    x: worldPoint.x - originPxX - ((localX - originPxX) / zoom),
    y: worldPoint.y - originPxY - ((localY - originPxY) / zoom)
  };
}

function finitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
