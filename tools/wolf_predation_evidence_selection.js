function chebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Deterministic, read-only selector for the incremental browser Wolf-predation
 * evidence path. This is deliberately not the v0.6 canonical release setup;
 * the canonical gate remains frozen at Y50 tile (0,8).
 *
 * Candidates must be passable, clear of current living/active authority,
 * inside the Wolf prey-search radius but far enough away to make movement
 * observable, and have at least one passable neighbor that strictly reduces
 * distance to the prey the real Wolf system would choose.
 */
export function wolfPredationEvidenceStartCandidates(world) {
  const radius = Number(world?.config?.wolfPreySearchRadius);
  if (!Number.isFinite(radius) || radius < 2 || !Array.isArray(world?.tiles)) return [];

  const grazers = (world.creatures ?? [])
    .filter((creature) => creature?.alive && creature.species === 'grazer' && Number.isInteger(creature.id))
    .map(({ id, x, y }) => ({ id, x, y }));
  if (grazers.length === 0) return [];

  const occupied = new Set();
  for (const entity of world.entities ?? []) {
    if (entity?.kind === 'human' && entity.alive) occupied.add(key(entity.x, entity.y));
  }
  for (const creature of world.creatures ?? []) {
    if (creature?.alive) occupied.add(key(creature.x, creature.y));
  }
  for (const warband of world.warbands ?? []) {
    if (warband?.active) occupied.add(key(warband.x, warband.y));
  }

  const passable = (world.tiles ?? [])
    .filter((tile) => tile?.passable && Number.isInteger(tile.x) && Number.isInteger(tile.y))
    .map(({ x, y }) => ({ x, y }));
  const passableKeys = new Set(passable.map((tile) => key(tile.x, tile.y)));

  const candidates = [];
  for (const tile of passable) {
    if (occupied.has(key(tile.x, tile.y))) continue;

    const prey = grazers
      .map((grazer) => ({ grazer, distance: chebyshevDistance(tile, grazer) }))
      .filter(({ distance }) => distance >= 2 && distance <= radius)
      .sort((a, b) => a.distance - b.distance || a.grazer.id - b.grazer.id)[0];
    if (!prey) continue;

    const closerStep = neighborCoordinates(tile)
      .filter((neighbor) => passableKeys.has(key(neighbor.x, neighbor.y)))
      .map((neighbor) => ({
        ...neighbor,
        distance: chebyshevDistance(neighbor, prey.grazer),
        manhattan: manhattanDistance(neighbor, prey.grazer)
      }))
      .filter((neighbor) => neighbor.distance < prey.distance)
      .sort((a, b) => a.distance - b.distance || a.manhattan - b.manhattan || a.y - b.y || a.x - b.x)[0];
    if (!closerStep) continue;

    candidates.push({
      x: tile.x,
      y: tile.y,
      nearestGrazerId: prey.grazer.id,
      nearestGrazerDistance: prey.distance,
      firstCloserStep: { x: closerStep.x, y: closerStep.y }
    });
  }

  return candidates.sort((a, b) =>
    a.nearestGrazerDistance - b.nearestGrazerDistance ||
    a.nearestGrazerId - b.nearestGrazerId ||
    a.y - b.y ||
    a.x - b.x
  );
}

function neighborCoordinates(tile) {
  const rows = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      rows.push({ x: tile.x + dx, y: tile.y + dy });
    }
  }
  return rows;
}

function key(x, y) {
  return `${x},${y}`;
}
