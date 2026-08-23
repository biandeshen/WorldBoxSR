export const DEFAULT_CONFIG = Object.freeze({
  daysPerYear: 360,
  foodRegrowthPerDay: 0.045,
  hungerPerDay: 0.012,
  hungryThreshold: 0.35,
  starvationThreshold: 0.9,
  starvationDamagePerDay: 0.025,
  recoveryPerDay: 0.004,
  passiveMoveChance: 0.18,
  eatAmount: 0.58,
  foodPerMeal: 0.65,
  adultAgeYears: 18,
  femaleFertilityEndYears: 45,
  birthChancePerEligiblePairPerDay: 0.0012,
  birthCooldownDays: 300,
  oldAgeYears: 75,
  hardMaxAgeYears: 105,
  maxEventHistory: 2500
});

export function mergeConfig(overrides = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}
