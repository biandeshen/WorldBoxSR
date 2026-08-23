export const DEFAULT_DAY90_RULES = Object.freeze([
  Object.freeze({
    id: 'mean-distance-5.0',
    description: 'first-90 mean former-home distance >= 5.0',
    select: (row) => row.first90.meanFormerHomeDistance >= 5.0
  }),
  Object.freeze({
    id: 'within6-at-most-0.8',
    description: 'first-90 former-home radius6 exposure <= 80%',
    select: (row) => row.first90.within6Share <= 0.8
  }),
  Object.freeze({
    id: 'drift-combined',
    description: 'mean distance >= 5.0 and radius6 exposure <= 80%',
    select: (row) =>
      row.first90.meanFormerHomeDistance >= 5.0 &&
      row.first90.within6Share <= 0.8
  }),
  Object.freeze({
    id: 'drift-no-other-closer',
    description: 'combined drift and zero first-90 other-settlement-closer exposure',
    select: (row) =>
      row.first90.meanFormerHomeDistance >= 5.0 &&
      row.first90.within6Share <= 0.8 &&
      row.first90.otherSettlementCloserShare === 0
  }),
  Object.freeze({
    id: 'drift-low-other-closer',
    description: 'combined drift and first-90 other-settlement-closer exposure <= 10%',
    select: (row) =>
      row.first90.meanFormerHomeDistance >= 5.0 &&
      row.first90.within6Share <= 0.8 &&
      row.first90.otherSettlementCloserShare <= 0.1
  })
]);

/**
 * Pure off-policy evaluation at the day-90 decision point.
 *
 * Only episodes still detached through day 90 enter the risk set. Fast
 * same-home recoveries (<=90d) therefore disappear naturally. Censored rows
 * remain visible but are excluded from resolved precision.
 */
export function evaluateDay90Rules(rows, rules = DEFAULT_DAY90_RULES) {
  const atRisk = rows.filter(observableAtDay90);
  const outcomeCounts = countOutcomes(atRisk);
  const totalTargets = outcomeCounts.long_same_rejoin ?? 0;
  const totalMediumRecovery = outcomeCounts.medium_same_rejoin ?? 0;
  const totalOtherJoins = outcomeCounts.other_join ?? 0;

  return {
    atRiskEpisodes: atRisk.length,
    outcomeCounts,
    targetLongEpisodes: totalTargets,
    rules: rules.map((rule) => {
      const selected = atRisk.filter((row) => rule.select(row));
      const selectedCounts = countOutcomes(selected);
      const truePositives = selectedCounts.long_same_rejoin ?? 0;
      const falseNegatives = totalTargets - truePositives;
      const mediumFalsePositives = selectedCounts.medium_same_rejoin ?? 0;
      const otherJoinFalsePositives = selectedCounts.other_join ?? 0;
      const otherResolvedFalsePositives =
        (selectedCounts.former_abandoned ?? 0) +
        (selectedCounts.human_lost ?? 0) +
        (selectedCounts.fast_same_rejoin ?? 0);
      const selectedCensored = selectedCounts.censored ?? 0;
      const resolvedSelected =
        truePositives +
        mediumFalsePositives +
        otherJoinFalsePositives +
        otherResolvedFalsePositives;

      return {
        id: rule.id,
        description: rule.description,
        selectedEpisodes: selected.length,
        selectionRate: ratio(selected.length, atRisk.length),
        selectedOutcomeCounts: selectedCounts,
        truePositives,
        falseNegatives,
        recall: ratio(truePositives, totalTargets),
        precisionResolved: ratio(truePositives, resolvedSelected),
        mediumRecoveryFalsePositives: mediumFalsePositives,
        otherJoinFalsePositives,
        otherResolvedFalsePositives,
        selectedCensored,
        mediumRecoveryInterferenceRate: ratio(mediumFalsePositives, totalMediumRecovery),
        migrationInterferenceRate: ratio(otherJoinFalsePositives, totalOtherJoins),
        otherJoinShareOfResolvedSelections: ratio(otherJoinFalsePositives, resolvedSelected)
      };
    })
  };
}

export function observableAtDay90(row) {
  return row.durationDays > 90 && row.first90?.days >= 91;
}

function countOutcomes(rows) {
  const counts = {};
  for (const row of rows) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
  return counts;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
