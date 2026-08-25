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

export function creatureInspectorText(creature, config) {
  const behavior = creatureBehaviorLabel(creature, config);
  if (!behavior || !Number.isFinite(config?.daysPerYear) || config.daysPerYear <= 0) return null;
  if (!Number.isInteger(creature.id) || !Number.isInteger(creature.x) || !Number.isInteger(creature.y)) return null;
  if (!Number.isFinite(creature.ageDays) || !Number.isFinite(creature.health) || !Number.isFinite(creature.hunger)) return null;

  return [
    `${creatureSpeciesLabel(creature.species)} #${creature.id}`,
    `behavior ${behavior}`,
    `age ${(creature.ageDays / config.daysPerYear).toFixed(1)}y`,
    `health ${(creature.health * 100).toFixed(0)}% · hunger ${(creature.hunger * 100).toFixed(0)}%`,
    `tile ${creature.x},${creature.y}`
  ].join('\n');
}

export function livingEcologyVegetationHud(summary, preset) {
  if (preset !== 'living_ecology') return null;
  if (!Number.isFinite(summary?.vegetationUtilization)) return null;
  const percent = Math.round(clamp01(summary.vegetationUtilization) * 100);
  return `🌿 ${percent}%`;
}

function creatureSpeciesLabel(species) {
  if (species === 'wolf') return 'Wolf';
  if (species === 'grazer') return 'Grazer';
  return 'Creature';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
