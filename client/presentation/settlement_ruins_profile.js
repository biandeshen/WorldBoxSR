export function settlementRuinsProfile({ active = true, abandonedDay = null, worldDay = 0, daysPerYear = 365 } = {}) {
  if (active) {
    return {
      visible: false,
      ageDays: null,
      ageYears: null,
      ageBand: 'active',
      ageLabel: '',
      foundationAlpha: 0,
      stoneAlpha: 0,
      beamAlpha: 0,
      labelAlpha: 0
    };
  }

  const yearDays = Number.isFinite(daysPerYear) && daysPerYear > 0 ? daysPerYear : 365;
  const knownAge = Number.isFinite(abandonedDay)
    && Number.isFinite(worldDay)
    && worldDay >= abandonedDay;
  const ageDays = knownAge ? worldDay - abandonedDay : null;
  const ageYears = ageDays === null ? null : ageDays / yearDays;
  const ageBand = ageYears === null
    ? 'unknown'
    : ageYears < 1
      ? 'recent'
      : ageYears < 5
        ? 'settled'
        : 'old';

  const style = ageBand === 'recent'
    ? { foundationAlpha: 0.34, stoneAlpha: 0.72, beamAlpha: 0.62, labelAlpha: 0.88 }
    : ageBand === 'settled'
      ? { foundationAlpha: 0.27, stoneAlpha: 0.58, beamAlpha: 0.46, labelAlpha: 0.78 }
      : ageBand === 'old'
        ? { foundationAlpha: 0.2, stoneAlpha: 0.44, beamAlpha: 0.3, labelAlpha: 0.68 }
        : { foundationAlpha: 0.25, stoneAlpha: 0.52, beamAlpha: 0.38, labelAlpha: 0.74 };

  return {
    visible: true,
    ageDays,
    ageYears,
    ageBand,
    ageLabel: formatAbandonmentAge(ageYears),
    ...style
  };
}

export function formatAbandonmentAge(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) return 'age unknown';
  if (ageYears < 1) return '<1y abandoned';
  const years = Math.max(1, Math.floor(ageYears));
  return `${years}y abandoned`;
}
