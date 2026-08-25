import { entityRef, pushEvent } from '../model/events.js';

export const WARBAND_MOVE_INTERVAL_DAYS = 30;
export const WARBAND_COMBAT_INTERVAL_DAYS = 30;
export const WARBAND_MAX_STRENGTH = 60;

export function updateWarbands(world) {
  if (!Array.isArray(world.warbands)) world.warbands = [];
  if (!Number.isInteger(world.nextWarbandId)) world.nextWarbandId = 1;

  const activeWars = world.relations
    .filter((relation) => relation.active && relation.atWar && Number.isInteger(relation.startedDay))
    .sort((a, b) => a.key.localeCompare(b.key));

  const activeWarKeys = new Set(activeWars.map((relation) => warLifecycleKey(relation)));
  retireEndedWarbands(world, activeWarKeys);

  for (const relation of activeWars) {
    ensureWarband(world, relation, relation.polityAId, relation.polityBId);
    ensureWarband(world, relation, relation.polityBId, relation.polityAId);
    refreshTargets(world, relation);
  }

  resolveAllEngagements(world, activeWars);

  for (const relation of activeWars) {
    const bands = activeBandsForRelation(world, relation);
    if (bands.length !== 2) continue;
    const [a, b] = bands;
    if (areSpatiallyEngaged(a, b)) continue;
    maybeMoveWarband(world, a);
    maybeMoveWarband(world, b);
  }

  resolveAllEngagements(world, activeWars);
  world.warbands.sort((a, b) => a.id - b.id);
  return world.warbands;
}

export function adultPopulationForPolity(world, polityId) {
  const settlementPolity = new Map(world.settlements.map((settlement) => [settlement.id, settlement.polityId]));
  const adultAgeDays = world.config.adultAgeYears * world.config.daysPerYear;
  return world.entities.filter((human) => human.kind === 'human'
    && human.alive
    && human.ageDays >= adultAgeDays
    && Number.isInteger(human.settlementId)
    && settlementPolity.get(human.settlementId) === polityId).length;
}

export function mobilizedStrengthForPolity(world, polityId) {
  return Math.min(WARBAND_MAX_STRENGTH, adultPopulationForPolity(world, polityId));
}

export function activeWarbandFor(world, relationKey, polityId, warStartedDay = null) {
  return world.warbands.find((warband) => warband.active
    && warband.relationKey === relationKey
    && warband.polityId === polityId
    && (warStartedDay === null || warband.warStartedDay === warStartedDay)) ?? null;
}

function ensureWarband(world, relation, polityId, opponentPolityId) {
  const existing = world.warbands.find((warband) => warband.relationKey === relation.key
    && warband.polityId === polityId
    && warband.warStartedDay === relation.startedDay);
  if (existing) return existing;

  const strength = mobilizedStrengthForPolity(world, polityId);
  if (strength <= 0) return null;

  const origin = objectiveSettlement(world, polityId);
  const target = objectiveSettlement(world, opponentPolityId);
  if (!origin || !target) return null;

  const warband = {
    id: world.nextWarbandId++,
    kind: 'warband',
    relationKey: relation.key,
    warStartedDay: relation.startedDay,
    polityId,
    opponentPolityId,
    originSettlementId: origin.id,
    targetSettlementId: target.id,
    x: origin.x,
    y: origin.y,
    strength,
    initialStrength: strength,
    sourceAdultPopulation: adultPopulationForPolity(world, polityId),
    formedDay: world.day,
    lastMovedDay: world.day,
    lastEngagedDay: null,
    engagements: 0,
    active: true,
    endedDay: null,
    endReason: null
  };
  world.warbands.push(warband);
  pushEvent(world, {
    type: 'warband.mobilized',
    subject: entityRef('warband', warband.id),
    causes: [entityRef('polity', polityId), entityRef('polity', opponentPolityId)],
    relationKey: relation.key,
    polityId,
    opponentPolityId,
    strength,
    sourceAdultPopulation: warband.sourceAdultPopulation,
    originSettlementId: origin.id,
    targetSettlementId: target.id
  });
  return warband;
}

function refreshTargets(world, relation) {
  for (const warband of activeBandsForRelation(world, relation)) {
    const target = objectiveSettlement(world, warband.opponentPolityId);
    if (target) warband.targetSettlementId = target.id;
  }
}

function objectiveSettlement(world, polityId) {
  const polity = world.polities.find((candidate) => candidate.id === polityId && candidate.active);
  if (!polity) return null;
  const activeMembers = world.settlements
    .filter((settlement) => settlement.active && settlement.polityId === polityId)
    .sort((a, b) => a.id - b.id);
  if (activeMembers.length === 0) return null;
  return activeMembers.find((settlement) => settlement.id === polity.capitalSettlementId) ?? activeMembers[0];
}

function retireEndedWarbands(world, activeWarKeys) {
  for (const warband of world.warbands) {
    if (!warband.active) continue;
    if (activeWarKeys.has(`${warband.relationKey}@${warband.warStartedDay}`)) continue;
    warband.active = false;
    warband.endedDay = world.day;
    warband.endReason = 'war ended';
    pushEvent(world, {
      type: 'warband.disbanded',
      subject: entityRef('warband', warband.id),
      causes: [entityRef('polity', warband.polityId)],
      relationKey: warband.relationKey,
      polityId: warband.polityId,
      opponentPolityId: warband.opponentPolityId,
      remainingStrength: warband.strength,
      reason: warband.endReason
    });
  }
}

function warLifecycleKey(relation) {
  return `${relation.key}@${relation.startedDay}`;
}

function activeBandsForRelation(world, relation) {
  return world.warbands
    .filter((warband) => warband.active
      && warband.relationKey === relation.key
      && warband.warStartedDay === relation.startedDay)
    .sort((a, b) => a.id - b.id);
}

function resolveAllEngagements(world, activeWars) {
  for (const relation of activeWars) {
    const bands = activeBandsForRelation(world, relation);
    if (bands.length !== 2) continue;
    const [a, b] = bands;
    if (!areSpatiallyEngaged(a, b)) continue;
    if (Number.isInteger(a.lastEngagedDay) && world.day - a.lastEngagedDay < WARBAND_COMBAT_INTERVAL_DAYS) continue;
    resolveEngagement(world, relation, a, b);
  }
}

function maybeMoveWarband(world, warband) {
  if (!warband.active) return;
  if (world.day - warband.lastMovedDay < WARBAND_MOVE_INTERVAL_DAYS) return;
  const target = world.settlements.find((settlement) => settlement.id === warband.targetSettlementId && settlement.active);
  if (!target) return;
  const step = nextPassableStep(world, warband.x, warband.y, target.x, target.y);
  warband.lastMovedDay = world.day;
  if (!step) return;
  warband.x = step.x;
  warband.y = step.y;
}

function nextPassableStep(world, startX, startY, targetX, targetY) {
  if (startX === targetX && startY === targetY) return null;
  const startKey = tileKey(startX, startY);
  const targetKey = tileKey(targetX, targetY);
  const queue = [{ x: startX, y: startY }];
  const previous = new Map([[startKey, null]]);
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor++];
    const neighbors = cardinalNeighbors(world, current.x, current.y)
      .filter((tile) => tile.passable)
      .sort((a, b) => {
        const distanceA = manhattan(a.x, a.y, targetX, targetY);
        const distanceB = manhattan(b.x, b.y, targetX, targetY);
        return distanceA - distanceB || a.y - b.y || a.x - b.x;
      });
    for (const neighbor of neighbors) {
      const key = tileKey(neighbor.x, neighbor.y);
      if (previous.has(key)) continue;
      previous.set(key, tileKey(current.x, current.y));
      if (key === targetKey) return reconstructFirstStep(previous, startKey, targetKey);
      queue.push(neighbor);
    }
  }
  return null;
}

function reconstructFirstStep(previous, startKey, targetKey) {
  let key = targetKey;
  let parent = previous.get(key);
  while (parent && parent !== startKey) {
    key = parent;
    parent = previous.get(key);
  }
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function resolveEngagement(world, relation, a, b) {
  const strengthA = a.strength;
  const strengthB = b.strength;
  const lossA = boundedLoss(strengthA, strengthB);
  const lossB = boundedLoss(strengthB, strengthA);
  a.strength = Math.max(0, strengthA - lossA);
  b.strength = Math.max(0, strengthB - lossB);
  a.lastEngagedDay = world.day;
  b.lastEngagedDay = world.day;
  a.engagements += 1;
  b.engagements += 1;

  pushEvent(world, {
    type: 'warband.engaged',
    subject: entityRef('warband', a.id),
    causes: [entityRef('warband', b.id)],
    relationKey: relation.key,
    polityAId: a.polityId,
    polityBId: b.polityId,
    warbandAId: a.id,
    warbandBId: b.id,
    x: Math.round((a.x + b.x) / 2),
    y: Math.round((a.y + b.y) / 2),
    lossA,
    lossB,
    strengthA: a.strength,
    strengthB: b.strength
  });

  if (a.strength <= 0) destroyWarband(world, a, b.id);
  if (b.strength <= 0) destroyWarband(world, b, a.id);
}

function boundedLoss(ownStrength, enemyStrength) {
  if (ownStrength <= 0 || enemyStrength <= 0) return 0;
  const pressure = Math.max(1, Math.ceil(enemyStrength * 0.28));
  return Math.min(ownStrength, Math.min(12, pressure));
}

function destroyWarband(world, warband, opponentWarbandId) {
  if (!warband.active) return;
  warband.active = false;
  warband.endedDay = world.day;
  warband.endReason = 'destroyed in engagement';
  pushEvent(world, {
    type: 'warband.destroyed',
    subject: entityRef('warband', warband.id),
    causes: [entityRef('warband', opponentWarbandId)],
    relationKey: warband.relationKey,
    polityId: warband.polityId,
    opponentPolityId: warband.opponentPolityId,
    reason: warband.endReason
  });
}

function areSpatiallyEngaged(a, b) {
  return manhattan(a.x, a.y, b.x, b.y) <= 1;
}

function cardinalNeighbors(world, x, y) {
  const candidates = [[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]];
  const result = [];
  for (const [nx, ny] of candidates) {
    if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
    result.push(world.tiles[ny * world.width + nx]);
  }
  return result;
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function tileKey(x, y) {
  return `${x},${y}`;
}
