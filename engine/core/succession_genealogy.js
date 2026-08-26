function positiveId(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}

function validateWorld(world) {
  if (!world || !Array.isArray(world.entities) || !Array.isArray(world.unions)) {
    throw new TypeError('world.entities and world.unions are required');
  }
}

function addEdge(adjacency, parentId, childId) {
  if (!Number.isInteger(parentId) || parentId < 1 || !Number.isInteger(childId) || childId < 1 || parentId === childId) return;
  let children = adjacency.get(parentId);
  if (!children) adjacency.set(parentId, children = new Set());
  children.add(childId);
}

/**
 * Rebuild a parent -> child graph from retained authoritative genealogy facts.
 *
 * Current humans carry parentIds, while persistent parental_union records keep
 * partnerIds + childIds after parents have died and left world.entities. Both
 * are explicit ancestry evidence. No spatial, lineage-equality, settlement or
 * union-lifecycle inference is allowed here.
 */
export function parentChildAdjacency(world) {
  validateWorld(world);
  const adjacency = new Map();

  for (const union of world.unions) {
    if (union?.kind !== 'parental_union' || !Array.isArray(union.partnerIds) || !Array.isArray(union.childIds)) continue;
    for (const parentId of union.partnerIds) {
      for (const childId of union.childIds) addEdge(adjacency, parentId, childId);
    }
  }

  for (const human of world.entities) {
    if (human?.kind !== 'human' || !Number.isInteger(human.id) || !Array.isArray(human.parentIds)) continue;
    for (const parentId of human.parentIds) addEdge(adjacency, parentId, human.id);
  }

  return adjacency;
}

/**
 * Return the shortest explicit descendant generation distance from ancestor to
 * candidate, or null when candidate is not a descendant. An ancestor is never
 * its own descendant. Traversal is cycle-safe even for malformed research data.
 */
export function descendantDistance(world, ancestorId, candidateId) {
  validateWorld(world);
  positiveId(ancestorId, 'ancestorId');
  positiveId(candidateId, 'candidateId');
  if (ancestorId === candidateId) return null;

  const adjacency = parentChildAdjacency(world);
  const visited = new Set([ancestorId]);
  let frontier = [ancestorId];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const next = [];
    for (const parentId of frontier) {
      const children = adjacency.get(parentId);
      if (!children) continue;
      for (const childId of children) {
        if (childId === candidateId) return distance;
        if (visited.has(childId)) continue;
        visited.add(childId);
        next.push(childId);
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Rank an already-eligible human candidate set by ruling-line descent only.
 * Eligibility (adult/current polity membership/etc.) stays owned by the ruler
 * system. This helper only filters descendants and applies the frozen ordering:
 * nearest generation -> older age -> lower stable human id.
 */
export function rankDescendantCandidates(world, founderId, candidates) {
  validateWorld(world);
  positiveId(founderId, 'founderId');
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');

  const adjacency = parentChildAdjacency(world);
  const distances = descendantDistancesFromAdjacency(adjacency, founderId);
  return candidates
    .filter((human) => human?.kind === 'human' && Number.isInteger(human.id) && distances.has(human.id))
    .map((human) => ({ human, distance: distances.get(human.id) }))
    .sort((a, b) =>
      a.distance - b.distance ||
      Number(b.human.ageDays ?? 0) - Number(a.human.ageDays ?? 0) ||
      a.human.id - b.human.id
    );
}

export function descendantDistances(world, founderId) {
  validateWorld(world);
  positiveId(founderId, 'founderId');
  return descendantDistancesFromAdjacency(parentChildAdjacency(world), founderId);
}

function descendantDistancesFromAdjacency(adjacency, founderId) {
  const distances = new Map();
  const visited = new Set([founderId]);
  let frontier = [founderId];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const next = [];
    for (const parentId of frontier) {
      const children = adjacency.get(parentId);
      if (!children) continue;
      for (const childId of children) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        distances.set(childId, distance);
        next.push(childId);
      }
    }
    frontier = next;
  }
  return distances;
}
