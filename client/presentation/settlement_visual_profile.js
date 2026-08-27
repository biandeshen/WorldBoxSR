const PROFILES = Object.freeze([
  Object.freeze({
    tier: 1,
    label: 'hamlet',
    groundWidth: 38,
    groundHeight: 25,
    roadWidth: 28,
    roadHeight: 18,
    houseOffsets: Object.freeze([[-7, 4], [7, 3]]),
    farmOffsets: Object.freeze([]),
    hall: false,
    labelOffset: 29
  }),
  Object.freeze({
    tier: 2,
    label: 'village',
    groundWidth: 50,
    groundHeight: 34,
    roadWidth: 40,
    roadHeight: 27,
    houseOffsets: Object.freeze([[-12, 6], [0, 7], [12, 5], [-8, -6], [9, -6]]),
    farmOffsets: Object.freeze([[-19, 12], [19, 12]]),
    hall: false,
    labelOffset: 34
  }),
  Object.freeze({
    tier: 3,
    label: 'town',
    groundWidth: 64,
    groundHeight: 45,
    roadWidth: 53,
    roadHeight: 36,
    houseOffsets: Object.freeze([[-19, 9], [-7, 10], [8, 10], [19, 7], [-17, -4], [17, -5], [-10, -14], [10, -14]]),
    farmOffsets: Object.freeze([[-27, 15], [27, 15], [-25, -13], [25, -13]]),
    hall: true,
    labelOffset: 41
  }),
  Object.freeze({
    tier: 4,
    label: 'city',
    groundWidth: 80,
    groundHeight: 58,
    roadWidth: 68,
    roadHeight: 48,
    houseOffsets: Object.freeze([[-27, 12], [-14, 14], [0, 15], [14, 14], [27, 10], [-25, -2], [25, -3], [-19, -15], [-7, -17], [7, -17], [19, -14]]),
    farmOffsets: Object.freeze([[-34, 18], [34, 18], [-32, -15], [32, -15], [0, 25]]),
    hall: true,
    labelOffset: 49
  })
]);

export function populationTier(population) {
  if (population >= 45) return 4;
  if (population >= 25) return 3;
  if (population >= 10) return 2;
  return 1;
}

export function settlementVisualProfile(population, { isCapital = false } = {}) {
  const base = PROFILES[populationTier(population) - 1];
  return {
    ...base,
    houseOffsets: base.houseOffsets.map(([x, y]) => [x, y]),
    farmOffsets: base.farmOffsets.map(([x, y]) => [x, y]),
    hall: base.hall || isCapital,
    civicScale: isCapital ? 1.18 : 1,
    bannerScale: isCapital ? 1.18 : 1,
    capitalEmphasis: Boolean(isCapital)
  };
}
