/**
 * Derived-only parental-union metrics.
 *
 * Parental unions are descriptive social history. This accounting must not
 * mutate authoritative state or consume RNG.
 */
export function summarizeParentalUnions(world) {
  const unions = world.unions.filter((union) => union.kind === 'parental_union');
  const bothPartnersLivingUnions = unions.filter((union) => union.firstPartnerDeathDay === null).length;
  const partnerDeathRecordedUnions = unions.length - bothPartnersLivingUnions;
  const childCounts = unions.map((union) => union.childIds.length);
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingUnionParticipants = livingHumans.filter((human) => human.unionIds.length > 0).length;
  const multiUnionLivingHumans = livingHumans.filter((human) => human.unionIds.length > 1).length;
  const partnerUnionCounts = new Map();

  for (const union of unions) {
    for (const humanId of union.partnerIds) {
      partnerUnionCounts.set(humanId, (partnerUnionCounts.get(humanId) ?? 0) + 1);
    }
  }

  const historicalUnionCounts = [...partnerUnionCounts.values()];
  const firstPartnerDeathDurations = unions
    .filter((union) => Number.isFinite(union.firstPartnerDeathDay))
    .map((union) => Math.max(0, union.firstPartnerDeathDay - union.foundedDay));
  const formedInSettlement = unions.filter((union) => union.settlementIdAtFormation !== null).length;
  const multiChildUnions = childCounts.filter((count) => count >= 2).length;

  return {
    unionCount: unions.length,
    bothPartnersLivingUnions,
    partnerDeathRecordedUnions,
    bothPartnersLivingShare: ratio(bothPartnersLivingUnions, unions.length),
    singleChildUnions: childCounts.filter((count) => count === 1).length,
    multiChildUnions,
    multiChildUnionShare: ratio(multiChildUnions, unions.length),
    childrenPerUnion: stats(childCounts),
    averageChildrenPerUnion: childCounts.length
      ? childCounts.reduce((sum, count) => sum + count, 0) / childCounts.length
      : 0,
    maxChildrenPerUnion: childCounts.reduce((max, count) => Math.max(max, count), 0),
    formedInSettlement,
    formedInSettlementShare: ratio(formedInSettlement, unions.length),
    historicalUnionParticipants: partnerUnionCounts.size,
    multiUnionHistoricalParticipants: historicalUnionCounts.filter((count) => count >= 2).length,
    multiUnionHistoricalParticipantShare: ratio(
      historicalUnionCounts.filter((count) => count >= 2).length,
      historicalUnionCounts.length
    ),
    unionsPerHistoricalParticipant: stats(historicalUnionCounts),
    maxUnionsPerHistoricalParticipant: historicalUnionCounts.reduce((max, count) => Math.max(max, count), 0),
    livingUnionParticipants,
    multiUnionLivingHumans,
    livingUnionParticipantShare: ratio(livingUnionParticipants, livingHumans.length),
    multiUnionLivingHumanShare: ratio(multiUnionLivingHumans, livingHumans.length),
    firstPartnerDeathDurationDays: stats(firstPartnerDeathDurations),
    unionPerBirthRatio: ratio(unions.length, world.counters.births),
    unionsPerLivingHuman: ratio(unions.length, livingHumans.length)
  };
}

function stats(values) {
  if (values.length === 0) {
    return { count: 0, min: 0, median: 0, mean: 0, p90: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 0.5),
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p90: percentile(sorted, 0.9),
    max: sorted.at(-1)
  };
}

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
