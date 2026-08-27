export function settlementAmbientPose({ nowMs = 0, settlementId = 0, tier = 1, active = true } = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const id = Number.isFinite(settlementId) ? settlementId : 0;
  const normalizedTier = Math.max(1, Math.min(4, Math.trunc(Number.isFinite(tier) ? tier : 1)));
  if (!active) {
    return {
      flagAngle: 0,
      flagScaleX: 1,
      flagLift: 0,
      smoke: []
    };
  }

  const phase = id * 1.917;
  const flagWave = Math.sin(now * 0.0032 + phase);
  const smokeCount = normalizedTier >= 3 ? 3 : normalizedTier >= 2 ? 2 : 0;
  const smoke = [];

  for (let index = 0; index < smokeCount; index += 1) {
    const cycle = positiveModulo(now * 0.00024 + id * 0.071 + index / smokeCount, 1);
    const driftPhase = cycle * Math.PI * 2 + phase * 0.41 + index * 0.8;
    smoke.push({
      x: Math.sin(driftPhase) * 1.45,
      y: -cycle * 14,
      alpha: Math.sin(Math.PI * cycle) * 0.17,
      scale: 0.72 + cycle * 0.58
    });
  }

  return {
    flagAngle: flagWave * 2.6,
    flagScaleX: 1 + Math.cos(now * 0.0041 + phase * 0.73) * 0.065,
    flagLift: Math.sin(now * 0.0027 + phase * 0.53) * 0.38,
    smoke
  };
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
