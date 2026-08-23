export function summarizeFamilies(world) {
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingById = new Map(livingHumans.map((human) => [human.id, human]));

  const households = world.households.map((household) => {
    const livingMembers = household.memberIds
      .map((id) => livingById.get(id))
      .filter(Boolean);
    return {
      householdId: household.id,
      settlementId: household.settlementId,
      historicalMembers: household.memberIds.length,
      livingMembers: livingMembers.length,
      historicalDescendants: Math.max(0, household.memberIds.length - household.founderIds.length),
      survivingDescendants: livingMembers.filter((human) => human.generation > 0).length,
      maxGeneration: household.maxGeneration
    };
  });

  const orphanedHumans = livingHumans.filter((human) =>
    human.parentIds.length > 0 && human.parentIds.every((parentId) => !livingById.has(parentId))
  ).length;

  return {
    householdCount: households.length,
    emptyHouseholds: households.filter((household) => household.livingMembers === 0).length,
    orphanedHumans,
    maxGeneration: households.reduce((max, household) => Math.max(max, household.maxGeneration), 0),
    households
  };
}
