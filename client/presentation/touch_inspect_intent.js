export const TOUCH_INSPECT_HOLD_MS = 460;
export const TOUCH_INSPECT_MOVE_THRESHOLD_PX = 5;

export function isTouchPointer(pointer) {
  const eventPointerType = pointer?.event?.pointerType;
  if (typeof eventPointerType === 'string' && eventPointerType.length > 0) return eventPointerType === 'touch';
  const directPointerType = pointer?.pointerType;
  if (typeof directPointerType === 'string' && directPointerType.length > 0) return directPointerType === 'touch';
  if (pointer?.wasTouch === true) return true;
  if (pointer?.event?.touches || pointer?.event?.changedTouches) return true;
  return false;
}

export function touchInspectIntent({
  touch = false,
  isDown = false,
  elapsedMs = 0,
  distancePx = 0,
  holdMs = TOUCH_INSPECT_HOLD_MS,
  moveThresholdPx = TOUCH_INSPECT_MOVE_THRESHOLD_PX
} = {}) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const distance = Number.isFinite(distancePx) ? Math.max(0, distancePx) : Number.POSITIVE_INFINITY;
  const hold = Number.isFinite(holdMs) ? Math.max(1, holdMs) : TOUCH_INSPECT_HOLD_MS;
  const threshold = Number.isFinite(moveThresholdPx) ? Math.max(0, moveThresholdPx) : TOUCH_INSPECT_MOVE_THRESHOLD_PX;
  if (!touch || !isDown) return 'ignore';
  if (distance > threshold) return 'drag';
  if (elapsed >= hold) return 'inspect';
  return 'pending';
}

export function pointerDistance(pointer, startX, startY) {
  if (!Number.isFinite(pointer?.x) || !Number.isFinite(pointer?.y) || !Number.isFinite(startX) || !Number.isFinite(startY)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.hypot(pointer.x - startX, pointer.y - startY);
}
