export function createLineage(world, { settlementId = null, founderIds = [] } = {}) {
  const lineage = {
    id: world.nextLineageId++,
    kind: 'lineage',
    settlementId,
    memberIds: [],
    founderIds: [...founderIds],
    foundedDay: world.day,
    maxGeneration: 0
  };

  world.lineages.push(lineage);
  return lineage;
}

export function addLineageMember(lineage, humanId, generation = 0) {
  if (!lineage.memberIds.includes(humanId)) lineage.memberIds.push(humanId);
  lineage.maxGeneration = Math.max(lineage.maxGeneration, generation);
}

export function lineageById(world, lineageId) {
  return world.lineages.find((lineage) => lineage.id === lineageId) ?? null;
}
