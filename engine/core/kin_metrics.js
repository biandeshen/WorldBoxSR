export function summarizeSpatialKin(world) {
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive);
  const livingById = new Map(livingHumans.map((human) => [human.id, human]));

  const pairDistances = [];
  for (const child of livingHumans) {
    for (const parentId of child.parentIds) {
      const parent = livingById.get(parentId);
      if (parent) pairDistances.push(chebyshevDistance(child, parent));
    }
  }

  const nearestDirectKinDistances = [];
  for (const human of livingHumans) {
    const directKinIds = new Set([...human.parentIds, ...human.childIds]);
    let nearest = Infinity;
    for (const kinId of directKinIds) {
      const kin = livingById.get(kinId);
      if (!kin) continue;
      nearest = Math.min(nearest, chebyshevDistance(human, kin));
    }
    if (Number.isFinite(nearest)) nearestDirectKinDistances.push(nearest);
  }

  let dependentMinors = 0;
  let minorsWithLivingParent = 0;
  let orphanedMinors = 0;
  let minorsParentCoLocated = 0;
  let minorsParentWithin1 = 0;
  let minorsParentWithin3 = 0;

  for (const human of livingHumans) {
    const ageYears = human.ageDays / world.config.daysPerYear;
    if (ageYears >= world.config.adultAgeYears || human.parentIds.length === 0) continue;
    dependentMinors += 1;

    const livingParents = human.parentIds
      .map((parentId) => livingById.get(parentId))
      .filter(Boolean);
    if (livingParents.length === 0) {
      orphanedMinors += 1;
      continue;
    }

    minorsWithLivingParent += 1;
    const nearestParent = Math.min(...livingParents.map((parent) => chebyshevDistance(human, parent)));
    if (nearestParent === 0) minorsParentCoLocated += 1;
    if (nearestParent <= 1) minorsParentWithin1 += 1;
    if (nearestParent <= 3) minorsParentWithin3 += 1;
  }

  return {
    livingParentChildPairs: pairDistances.length,
    parentChildCoLocatedShare: shareAtMost(pairDistances, 0),
    parentChildWithin1Share: shareAtMost(pairDistances, 1),
    parentChildWithin3Share: shareAtMost(pairDistances, 3),
    meanParentChildDistance: mean(pairDistances),
    medianParentChildDistance: median(pairDistances),
    humansWithLivingDirectKin: nearestDirectKinDistances.length,
    directKinWithin1Share: shareAtMost(nearestDirectKinDistances, 1),
    directKinWithin3Share: shareAtMost(nearestDirectKinDistances, 3),
    meanNearestDirectKinDistance: mean(nearestDirectKinDistances),
    medianNearestDirectKinDistance: median(nearestDirectKinDistances),
    dependentMinors,
    minorsWithLivingParent,
    orphanedMinors,
    minorsParentCoLocatedShare: ratio(minorsParentCoLocated, minorsWithLivingParent),
    minorsParentWithin1Share: ratio(minorsParentWithin1, minorsWithLivingParent),
    minorsParentWithin3Share: ratio(minorsParentWithin3, minorsWithLivingParent)
  };
}

function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function shareAtMost(values, threshold) {
  if (values.length === 0) return 0;
  return values.filter((value) => value <= threshold).length / values.length;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
