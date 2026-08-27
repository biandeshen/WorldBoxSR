const DEFAULT_MAX_TRACES = 6;
const MAX_AGE_YEARS = 3;

export function projectRecentBattleTraces(history, worldDay, daysPerYear, limit = DEFAULT_MAX_TRACES) {
  const now = Number.isFinite(worldDay) ? worldDay : 0;
  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const maxAgeDays = yearDays * MAX_AGE_YEARS;
  const maxTraces = Math.max(0, Math.min(DEFAULT_MAX_TRACES, Math.trunc(Number.isFinite(limit) ? limit : DEFAULT_MAX_TRACES)));
  if (!Array.isArray(history) || maxTraces === 0) return [];

  const projected = [];
  for (let index = history.length - 1; index >= 0 && projected.length < maxTraces; index -= 1) {
    const event = history[index];
    if (event?.type !== 'warband.engaged') continue;
    const lossA = finiteNonNegativeInteger(event.lossA);
    const lossB = finiteNonNegativeInteger(event.lossB);
    const totalLoss = lossA + lossB;
    const ageDays = now - Number(event.day);
    if (!Number.isInteger(event.id) || event.id < 1) continue;
    if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) continue;
    if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > maxAgeDays) continue;
    if (totalLoss <= 0) continue;

    projected.push({
      id: event.id,
      day: event.day,
      x: event.x,
      y: event.y,
      lossA,
      lossB,
      totalLoss,
      ageDays,
      polityAId: Number.isInteger(event.polityAId) ? event.polityAId : null,
      polityBId: Number.isInteger(event.polityBId) ? event.polityBId : null
    });
  }
  return projected;
}

export function battleTraceProfile({ totalLoss = 0, ageDays = 0, daysPerYear = 365 } = {}) {
  const losses = Math.max(0, Math.trunc(Number.isFinite(totalLoss) ? totalLoss : 0));
  const age = Number.isFinite(ageDays) ? Math.max(0, ageDays) : Number.POSITIVE_INFINITY;
  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const maxAgeDays = yearDays * MAX_AGE_YEARS;
  if (losses <= 0 || age > maxAgeDays) {
    return { visible: false, alpha: 0, radius: 0, stroke: 0, crossHalf: 0, dotRadius: 0 };
  }

  const severity = clamp01(losses / 18);
  const ageFade = clamp01(1 - age / maxAgeDays);
  const alpha = (0.12 + severity * 0.18) * (0.32 + ageFade * 0.68);
  return {
    visible: alpha >= 0.045,
    alpha,
    radius: 5.5 + severity * 4.5,
    stroke: 0.9 + severity * 0.7,
    crossHalf: 2.8 + severity * 2.2,
    dotRadius: Math.min(1.45, 0.9 + severity * 0.55)
  };
}

function finiteNonNegativeInteger(value) {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
