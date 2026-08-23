export function createHousehold(world, { settlementId = null } = {}) {
  const household = {
    id: world.nextHouseholdId++,
    kind: 'household',
    settlementId,
    memberIds: [],
    founderIds: [],
    foundedDay: world.day,
    emptyDay: null
  };

  world.households.push(household);
  return household;
}

export function addHouseholdMember(household, humanId) {
  if (!household.memberIds.includes(humanId)) household.memberIds.push(humanId);
}

export function removeHouseholdMember(household, humanId) {
  household.memberIds = household.memberIds.filter((id) => id !== humanId);
  if (household.memberIds.length === 0 && household.emptyDay === null) {
    household.emptyDay = true;
  }
}
