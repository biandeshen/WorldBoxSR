const MOTION_PROFILES = Object.freeze({
  human: Object.freeze({ speed: 0.021, stride: 15, legRatio: 0.82, idleBreath: 0.012, moveBreath: 0.02, headBob: 0, idleTail: 0, moveTail: 0 }),
  grazer: Object.freeze({ speed: 0.018, stride: 12, legRatio: 1, idleBreath: 0.009, moveBreath: 0.015, headBob: 1.3, idleTail: 0, moveTail: 0 }),
  wolf: Object.freeze({ speed: 0.02, stride: 14, legRatio: 1, idleBreath: 0.008, moveBreath: 0.014, headBob: 0.9, idleTail: 3.5, moveTail: 10 })
});

export function entityMotionPose(kind, nowMs, phaseSeed = 0, moving = false) {
  const profile = MOTION_PROFILES[kind] ?? MOTION_PROFILES.human;
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const seed = Number.isFinite(phaseSeed) ? phaseSeed : 0;
  const phase = now * profile.speed + seed;
  const stride = moving ? Math.sin(phase) * profile.stride : 0;
  const breathAmplitude = moving ? profile.moveBreath : profile.idleBreath;
  const breathScaleY = 1 + Math.sin(now * 0.0042 + seed * 0.63) * breathAmplitude;
  const headOffsetY = profile.headBob === 0
    ? 0
    : Math.sin(now * (moving ? 0.016 : 0.0048) + seed * 0.71) * profile.headBob * (moving ? 1 : 0.55);
  const tailAmplitude = moving ? profile.moveTail : profile.idleTail;
  const tailAngle = Math.sin(now * (moving ? 0.017 : 0.006) + seed * 0.83) * tailAmplitude;

  return {
    backArmAngle: moving ? stride : 0,
    frontArmAngle: moving ? -stride : 0,
    rearLegAngle: moving ? -stride * profile.legRatio : 0,
    frontLegAngle: moving ? stride * profile.legRatio : 0,
    breathScaleY,
    headOffsetY,
    tailAngle
  };
}
