export function createHuman(world, overrides = {}) {
  const ageYears = overrides.ageYears ?? world.rng.range(18, 35);
  const human = {
    id: world.nextEntityId++,
    kind: 'human',
    x: overrides.x ?? world.rng.int(world.width),
    y: overrides.y ?? world.rng.int(world.height),
    sex: overrides.sex ?? (world.rng.chance(0.5) ? 'F' : 'M'),
    ageDays: Math.floor(ageYears * world.config.daysPerYear),
    hunger: overrides.hunger ?? world.rng.range(0.05, 0.3),
    health: overrides.health ?? 1,
    birthCooldownDays: overrides.birthCooldownDays ?? 0,
    alive: true,
    bornDay: overrides.bornDay ?? world.day,
    causeOfDeath: null
  };
  world.entities.push(human);
  return human;
}
