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
