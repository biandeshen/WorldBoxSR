const FORMATIONS = Object.freeze({
  mobilized: Object.freeze([
    Object.freeze({ x: 0, y: 4 }),
    Object.freeze({ x: -5, y: 4 }),
    Object.freeze({ x: 5, y: 4 }),
    Object.freeze({ x: -3, y: -1 }),
    Object.freeze({ x: 3, y: -1 })
  ]),
  marching: Object.freeze([
    Object.freeze({ x: 1, y: 5 }),
    Object.freeze({ x: -3, y: 2 }),
    Object.freeze({ x: 3, y: 0 }),
    Object.freeze({ x: -1, y: -3 }),
    Object.freeze({ x: 4, y: -5 })
  ]),
  engaged: Object.freeze([
    Object.freeze({ x: 0, y: 4 }),
    Object.freeze({ x: -5, y: 3 }),
    Object.freeze({ x: 5, y: 3 }),
    Object.freeze({ x: -8, y: 0 }),
    Object.freeze({ x: 8, y: 0 })
  ])
});

export function visibleWarbandSoldiers(strength) {
  const value = Math.max(0, Math.trunc(Number.isFinite(strength) ? strength : 0));
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value <= 3) return 2;
  if (value <= 5) return 3;
  if (value <= 8) return 4;
  return 5;
}

export function warbandVisualProfile({ strength = 0, initialStrength = strength, movementState = 'mobilized', engaged = false } = {}) {
  const currentStrength = Math.max(0, Math.trunc(Number.isFinite(strength) ? strength : 0));
  const startingStrength = Math.max(currentStrength, Math.trunc(Number.isFinite(initialStrength) ? initialStrength : currentStrength));
  const soldierCount = visibleWarbandSoldiers(currentStrength);
  const formation = engaged ? 'engaged' : movementState === 'marching' ? 'marching' : 'mobilized';
  const casualtyRatio = startingStrength > 0 ? 1 - currentStrength / startingStrength : 0;

  return {
    formation,
    soldierCount,
    offsets: FORMATIONS[formation].slice(0, soldierCount).map(({ x, y }) => ({ x, y })),
    currentStrength,
    startingStrength,
    casualtyRatio: Math.max(0, Math.min(1, casualtyRatio)),
    engaged: Boolean(engaged)
  };
}

export function warbandObjectiveCue({
  x,
  y,
  targetX,
  targetY,
  movementState = 'mobilized',
  engaged = false,
  tileSize = 28
} = {}) {
  const validCoordinates = [x, y, targetX, targetY].every(Number.isFinite);
  const activeObjectiveState = movementState === 'mobilized' || movementState === 'marching';
  if (!validCoordinates || !activeObjectiveState || engaged) return hiddenObjectiveCue();

  const dx = targetX - x;
  const dy = targetY - y;
  const distance = Math.hypot(dx, dy);
  if (!(distance > 0)) return hiddenObjectiveCue();

  const size = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 28;
  return {
    visible: true,
    directionX: dx / distance,
    directionY: dy / distance,
    angleRadians: Math.atan2(dy, dx),
    targetTileDistance: distance,
    arrowStart: size * 0.48,
    arrowEnd: size * 0.98,
    arrowHead: size * 0.19,
    targetRadius: size * 0.42,
    arrowAlpha: movementState === 'marching' ? 0.72 : 0.52,
    targetAlpha: movementState === 'marching' ? 0.34 : 0.25
  };
}

function hiddenObjectiveCue() {
  return {
    visible: false,
    directionX: 0,
    directionY: 0,
    angleRadians: 0,
    targetTileDistance: 0,
    arrowStart: 0,
    arrowEnd: 0,
    arrowHead: 0,
    targetRadius: 0,
    arrowAlpha: 0,
    targetAlpha: 0
  };
}
