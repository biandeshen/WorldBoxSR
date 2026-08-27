const REBELLION_DISPLAY_YEARS = 3;

export function settlementPoliticalStatusProfile({
  active = true,
  polityId = null,
  previousPolityId = null,
  lastConqueredByPolityId = null,
  occupationStartedDay = null,
  lastRebelledDay = null,
  worldDay = 0,
  daysPerYear = 365
} = {}) {
  if (!active) return hiddenStatus();

  const now = Number.isFinite(worldDay) ? worldDay : 0;
  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const occupied = Number.isInteger(polityId)
    && Number.isInteger(previousPolityId)
    && previousPolityId !== polityId
    && Number.isInteger(lastConqueredByPolityId)
    && lastConqueredByPolityId === polityId
    && Number.isFinite(occupationStartedDay)
    && now >= occupationStartedDay;

  if (occupied) {
    const ageDays = now - occupationStartedDay;
    const ageYears = ageDays / yearDays;
    return {
      visible: true,
      kind: 'occupied',
      ageDays,
      ageYears,
      ageLabel: compactAge(ageYears),
      badgeText: `OCCUPIED · ${compactAge(ageYears)}`,
      ringAlpha: 0.54,
      badgeAlpha: 0.88
    };
  }

  const validRebellion = Number.isFinite(lastRebelledDay) && now >= lastRebelledDay;
  if (validRebellion) {
    const ageDays = now - lastRebelledDay;
    const ageYears = ageDays / yearDays;
    if (ageYears <= REBELLION_DISPLAY_YEARS) {
      const fade = clamp01(1 - ageYears / REBELLION_DISPLAY_YEARS);
      return {
        visible: true,
        kind: 'rebellion',
        ageDays,
        ageYears,
        ageLabel: compactAge(ageYears),
        badgeText: `REBELLION · ${compactAge(ageYears)}`,
        ringAlpha: 0.24 + fade * 0.28,
        badgeAlpha: 0.5 + fade * 0.36
      };
    }
  }

  return hiddenStatus();
}

export function compactAge(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) return 'age?';
  if (ageYears < 1) return '<1y';
  return `${Math.max(1, Math.floor(ageYears))}y`;
}

function hiddenStatus() {
  return {
    visible: false,
    kind: 'none',
    ageDays: null,
    ageYears: null,
    ageLabel: '',
    badgeText: '',
    ringAlpha: 0,
    badgeAlpha: 0
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
