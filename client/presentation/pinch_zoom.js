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

export function focusPreservingScroll({ scrollX, scrollY, worldBefore, worldAfter } = {}) {
  if (!Number.isFinite(scrollX) || !Number.isFinite(scrollY) || !finitePoint(worldBefore) || !finitePoint(worldAfter)) return null;
  return {
    x: scrollX + worldBefore.x - worldAfter.x,
    y: scrollY + worldBefore.y - worldAfter.y
  };
}

function finitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
