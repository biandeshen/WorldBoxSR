const MAX_METEOR_SITES = 4;
const MAX_AGE_YEARS = 5;
const RECOVERED_THRESHOLD = 0.98;

export function projectRecentMeteorImpactSites({
  history = [],
  tiles = [],
  worldDay = 0,
  daysPerYear = 365,
  width = 0,
  height = 0,
  limit = MAX_METEOR_SITES
} = {}) {
  if (!Array.isArray(history) || !Array.isArray(tiles)) return [];
  const now = Number.isFinite(worldDay) ? worldDay : 0;
  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const maxAgeDays = yearDays * MAX_AGE_YEARS;
  const worldWidth = Math.max(0, Math.trunc(Number.isFinite(width) ? width : 0));
  const worldHeight = Math.max(0, Math.trunc(Number.isFinite(height) ? height : 0));
  const maxSites = Math.max(0, Math.min(MAX_METEOR_SITES, Math.trunc(Number.isFinite(limit) ? limit : MAX_METEOR_SITES)));
  if (worldWidth <= 0 || worldHeight <= 0 || maxSites === 0) return [];

  const tileByKey = new Map(tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
  const seenFootprints = new Set();
  const sites = [];

  for (let index = history.length - 1; index >= 0 && sites.length < maxSites; index -= 1) {
    const event = history[index];
    if (event?.type !== 'god.meteor') continue;
    if (!Number.isInteger(event.id) || event.id < 1) continue;
    if (!Number.isFinite(event.day) || event.day > now) continue;
    if (!Number.isInteger(event.x) || !Number.isInteger(event.y) || !Number.isInteger(event.radius) || event.radius < 0) continue;
    if (!(Number(event.vegetationRemoved) > 1e-12) || event.noEffect === true) continue;

    const ageDays = now - event.day;
    if (ageDays > maxAgeDays) continue;
    const minX = Math.max(0, event.x - event.radius);
    const maxX = Math.min(worldWidth - 1, event.x + event.radius);
    const minY = Math.max(0, event.y - event.radius);
    const maxY = Math.min(worldHeight - 1, event.y + event.radius);
    const footprintKey = `${minX},${minY},${maxX},${maxY}`;
    if (seenFootprints.has(footprintKey)) continue;
    seenFootprints.add(footprintKey);

    let vegetation = 0;
    let capacity = 0;
    let passableTileCount = 0;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tile = tileByKey.get(`${x},${y}`);
        if (!tile?.passable) continue;
        const tileCapacity = Math.max(0, Number.isFinite(tile.vegetationCapacity) ? tile.vegetationCapacity : 0);
        const tileVegetation = Math.max(0, Number.isFinite(tile.vegetation) ? tile.vegetation : 0);
        passableTileCount += 1;
        capacity += tileCapacity;
        vegetation += Math.min(tileCapacity, tileVegetation);
      }
    }
    if (passableTileCount === 0 || capacity <= 1e-12) continue;

    const recoveryRatio = clamp01(vegetation / capacity);
    if (recoveryRatio >= RECOVERED_THRESHOLD) continue;
    const profile = meteorImpactMemoryProfile({ recoveryRatio, ageDays, daysPerYear: yearDays });
    if (!profile.visible) continue;

    sites.push({
      id: event.id,
      day: event.day,
      x: event.x,
      y: event.y,
      radius: event.radius,
      minX,
      minY,
      maxX,
      maxY,
      ageDays,
      recoveryRatio,
      vegetationRemoved: Number(event.vegetationRemoved),
      passableTileCount
    });
  }

  return sites;
}

export function meteorImpactMemoryProfile({ recoveryRatio = 1, ageDays = 0, daysPerYear = 365 } = {}) {
  const recovery = clamp01(Number.isFinite(recoveryRatio) ? recoveryRatio : 1);
  const age = Number.isFinite(ageDays) ? Math.max(0, ageDays) : Number.POSITIVE_INFINITY;
  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const maxAgeDays = yearDays * MAX_AGE_YEARS;
  if (recovery >= RECOVERED_THRESHOLD || age > maxAgeDays) {
    return { visible: false, alpha: 0, lineWidth: 0, centerAlpha: 0, cornerRatio: 0 };
  }

  const deficit = 1 - recovery;
  const ageFade = clamp01(1 - age / maxAgeDays);
  const alpha = Math.min(0.3, (0.07 + deficit * 0.23) * (0.38 + ageFade * 0.62));
  return {
    visible: alpha >= 0.04,
    alpha,
    lineWidth: Math.min(1.8, 1 + deficit * 0.8),
    centerAlpha: Math.min(0.32, alpha + 0.055),
    cornerRatio: Math.min(0.18, 0.1 + deficit * 0.08)
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
