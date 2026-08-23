/**
 * Derived-only parental-union metrics.
 *
 * Parental unions are descriptive social history. This accounting must not
 * mutate authoritative state or consume RNG.
 */
export function summarizeParentalUnions(world) {
  const unions = world.unions.filter((union) => union.kind === 'parental_union');
  const activeUnions = unions.filter((union) => union.active).length;
  const childCounts = unions.map((union) => union.childIds.length);
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingUnionParticipants = livingHumans.filter((human) => human.unionIds.length > 0).length;
  const multiUnionLivingHumans = livingHumans.filter((human) => human.unionIds.length > 1).length;

  return {
    unionCount: unions.length,
    activeUnions,
    endedUnions: unions.length - activeUnions,
    singleChildUnions: childCounts.filter((count) => count === 1).length,
    multiChildUnions: childCounts.filter((count) => count >= 2).length,
    averageChildrenPerUnion: childCounts.length
      ? childCounts.reduce((sum, count) => sum + count, 0) / childCounts.length
      : 0,
    maxChildrenPerUnion: childCounts.reduce((max, count) => Math.max(max, count), 0),
    livingUnionParticipants,
    multiUnionLivingHumans
  };
}
