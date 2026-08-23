export function summarizeLineages(world) {
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingById = new Map(livingHumans.map((human) => [human.id, human]));

  const lineages = world.lineages.map((lineage) => {
    const livingMembers = lineage.memberIds
      .map((id) => livingById.get(id))
      .filter(Boolean);
    return {
      lineageId: lineage.id,
      settlementId: lineage.settlementId,
      historicalMembers: lineage.memberIds.length,
      livingMembers: livingMembers.length,
      historicalDescendants: Math.max(0, lineage.memberIds.length - lineage.founderIds.length),
      survivingDescendants: livingMembers.filter((human) => human.generation > 0).length,
      maxGeneration: lineage.maxGeneration
    };
  });

  const orphanedHumans = livingHumans.filter((human) =>
    human.parentIds.length > 0 && human.parentIds.every((parentId) => !livingById.has(parentId))
  ).length;

  return {
    lineageCount: lineages.length,
    extinctLineages: lineages.filter((lineage) => lineage.livingMembers === 0).length,
    orphanedHumans,
    maxGeneration: lineages.reduce((max, lineage) => Math.max(max, lineage.maxGeneration), 0),
    lineages
  };
}
