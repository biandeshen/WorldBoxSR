export function creatureBehaviorLabel(creature, config) {
  if (!creature || creature.kind !== 'creature' || !config) return null;
  if (creature.species === 'wolf') {
    if (creature.hunger >= config.wolfStarvationThreshold) return 'starving · seeking grazers';
    if (creature.hunger >= config.wolfHungryThreshold) return 'seeking grazers';
    return 'resting';
  }
  if (creature.species === 'grazer') {
    if (creature.hunger >= config.grazerStarvationThreshold) return 'starving · foraging';
    if (creature.hunger >= config.grazerHungryThreshold) return 'foraging';
    return 'fed';
  }
  return null;
}

export function livingEcologyVegetationHud(summary, preset) {
  if (preset !== 'living_ecology') return null;
  if (!Number.isFinite(summary?.vegetationUtilization)) return null;
  const percent = Math.round(clamp01(summary.vegetationUtilization) * 100);
  return `🌿 ${percent}%`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
