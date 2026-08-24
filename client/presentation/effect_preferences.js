export function effectProfile(reducedMotion = false) {
  return reducedMotion
    ? {
        reducedMotion: true,
        cameraShake: false,
        flashAlpha: 0.28,
        flashScale: 1.3,
        ringScale: 1.65,
        sparkRatio: 0.35
      }
    : {
        reducedMotion: false,
        cameraShake: true,
        flashAlpha: 0.88,
        flashScale: 2.1,
        ringScale: 3.5,
        sparkRatio: 1
      };
}

export function currentEffectProfile() {
  const reduced = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  return effectProfile(reduced);
}
