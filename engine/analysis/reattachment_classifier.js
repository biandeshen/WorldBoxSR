export const DEFAULT_DAY30_RULES = Object.freeze([
  Object.freeze({
    id: 'mean-distance-4.5',
    description: 'first-30 mean former-home distance >= 4.5',
    select: (row) => row.first30.meanFormerHomeDistance >= 4.5
  }),
  Object.freeze({
    id: 'within4-at-most-0.5',
    description: 'first-30 former-home radius4 exposure <= 50%',
    select: (row) => row.first30.within4Share <= 0.5
  }),
  Object.freeze({
    id: 'drift-combined',
    description: 'mean distance >= 4.5 and radius4 exposure <= 50%',
    select: (row) =>
      row.first30.meanFormerHomeDistance >= 4.5 &&
      row.first30.within4Share <= 0.5
  }),
  Object.freeze({
    id: 'drift-no-other-closer',
    description: 'combined drift rule and no first-30 day with another settlement closer',
    select: (row) =>
      row.first30.meanFormerHomeDistance >= 4.5 &&
      row.first30.within4Share <= 0.5 &&
      row.first30.otherSettlementCloserShare === 0
  }),
  Object.freeze({
    id: 'drift-low-other-closer',
    description: 'combined drift rule and other-settlement-closer exposure <= 10%',
    select: (row) =>
      row.first30.meanFormerHomeDistance >= 4.5 &&
      row.first30.within4Share <= 0.5 &&
      row.first30.otherSettlementCloserShare <= 0.1
  })
]);

/**
 * Evaluate transparent day-30 rules against already-recorded episode rows.
 *
 * Only episodes still detached through day 30 are eligible for a day-30
 * decision. Censored episodes remain visible but are excluded from resolved
 * precision. No fitted model or mutable world state is involved.
 */
export function evaluateDay30Rules(rows, rules = DEFAULT_DAY30_RULES) {
  const atRisk = rows.filter(observableAtDay30);
  const outcomeCounts = countOutcomes(atRisk);
  const totalTargets = outcomeCounts.long_same_rejoin ?? 0;
  const totalNaturalRecovery =
    (outcomeCounts.fast_same_rejoin ?? 0) +
    (outcomeCounts.medium_same_rejoin ?? 0);
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
      const fastFalsePositives = selectedCounts.fast_same_rejoin ?? 0;
      const mediumFalsePositives = selectedCounts.medium_same_rejoin ?? 0;
      const otherJoinFalsePositives = selectedCounts.other_join ?? 0;
      const otherResolvedFalsePositives =
        (selectedCounts.former_abandoned ?? 0) +
        (selectedCounts.human_lost ?? 0);
      const selectedCensored = selectedCounts.censored ?? 0;
      const resolvedSelected =
        truePositives +
        fastFalsePositives +
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
        fastRecoveryFalsePositives: fastFalsePositives,
        mediumRecoveryFalsePositives: mediumFalsePositives,
        otherJoinFalsePositives,
        otherResolvedFalsePositives,
        selectedCensored,
        naturalRecoveryInterferenceRate: ratio(
          fastFalsePositives + mediumFalsePositives,
          totalNaturalRecovery
        ),
        migrationInterferenceRate: ratio(otherJoinFalsePositives, totalOtherJoins),
        otherJoinShareOfResolvedSelections: ratio(otherJoinFalsePositives, resolvedSelected)
      };
    })
  };
}

export function observableAtDay30(row) {
  return row.durationDays > 30 && row.first30?.days >= 31;
}

function countOutcomes(rows) {
  const counts = {};
  for (const row of rows) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
  return counts;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
