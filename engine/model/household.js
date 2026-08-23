export function createHousehold(world, { settlementId = null, founderIds = [] } = {}) {
  const household = {
    id: world.nextHouseholdId++,
    kind: 'household',
    settlementId,
    memberIds: [],
    founderIds: [...founderIds],
    foundedDay: world.day,
    maxGeneration: 0
  };

  world.households.push(household);
  return household;
}

export function addHouseholdMember(household, humanId, generation = 0) {
  if (!household.memberIds.includes(humanId)) household.memberIds.push(humanId);
  household.maxGeneration = Math.max(household.maxGeneration, generation);
}

export function householdById(world, householdId) {
  return world.households.find((household) => household.id === householdId) ?? null;
}
