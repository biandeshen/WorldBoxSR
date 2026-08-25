import { entityRef, pushEvent } from '../model/events.js';

export const RELATION_UPDATE_YEARS = 1;
export const WAR_THRESHOLD = -60;
export const PEACE_THRESHOLD = -12;
const SCORE_MIN = -100;
const SCORE_MAX = 100;

export function relationKey(polityAId, polityBId) {
  requirePolityId(polityAId);
  requirePolityId(polityBId);
  if (polityAId === polityBId) throw new RangeError('relation requires two different polities');
  return polityAId < polityBId ? `${polityAId}:${polityBId}` : `${polityBId}:${polityAId}`;
}

export function relationForPair(world, polityAId, polityBId) {
  const key = relationKey(polityAId, polityBId);
  return world.relations.find((relation) => relation.key === key) ?? null;
}

export function stanceForScore(score, atWar = false) {
  if (atWar) return 'war';
  if (score >= 35) return 'friendly';
  if (score <= -25) return 'hostile';
  return 'neutral';
}

export function updatePolityRelations(world) {
  if (!Array.isArray(world.relations)) world.relations = [];
  const activePolities = world.polities.filter((polity) => polity.active).sort((a, b) => a.id - b.id);
  const activeIds = new Set(activePolities.map((polity) => polity.id));
  const byKey = new Map(world.relations.map((relation) => [relation.key, relation]));

  archiveInactiveRelations(world, activeIds);

  const periodDays = Math.max(1, Math.round(world.config.daysPerYear * RELATION_UPDATE_YEARS));
  const period = Math.floor(world.day / periodDays);

  for (let left = 0; left < activePolities.length; left += 1) {
    for (let right = left + 1; right < activePolities.length; right += 1) {
      const polityA = activePolities[left];
      const polityB = activePolities[right];
      const key = relationKey(polityA.id, polityB.id);
      let relation = byKey.get(key);
      if (!relation) {
        relation = createRelation(polityA.id, polityB.id, world.day, period);
        world.relations.push(relation);
        byKey.set(key, relation);
        continue;
      }

      relation.active = true;
      relation.archivedDay = null;
      if (relation.lastUpdatedPeriod >= period) continue;

      const pressure = relationPressure(world, polityA, polityB, period, relation);
      relation.score = clamp(relation.score + pressure.delta, SCORE_MIN, SCORE_MAX);
      relation.lastUpdatedPeriod = period;
      relation.lastChangedDay = world.day;
      relation.cause = pressure.cause;

      if (!relation.atWar && relation.score <= WAR_THRESHOLD) {
        relation.atWar = true;
        relation.startedDay = world.day;
        relation.endedDay = null;
        relation.stance = 'war';
        pushEvent(world, {
          type: 'polity.war_started',
          subject: entityRef('polity', polityA.id),
          causes: [entityRef('polity', polityB.id)],
          relationKey: key,
          polityAId: polityA.id,
          polityBId: polityB.id,
          score: relation.score,
          reason: pressure.cause
        });
      } else if (relation.atWar && relation.score >= PEACE_THRESHOLD) {
        relation.atWar = false;
        relation.endedDay = world.day;
        relation.stance = stanceForScore(relation.score, false);
        pushEvent(world, {
          type: 'polity.peace_made',
          subject: entityRef('polity', polityA.id),
          causes: [entityRef('polity', polityB.id)],
          relationKey: key,
          polityAId: polityA.id,
          polityBId: polityB.id,
          score: relation.score,
          reason: 'war fatigue and reduced pressure'
        });
      } else {
        relation.stance = stanceForScore(relation.score, relation.atWar);
      }
    }
  }

  world.relations.sort((a, b) => a.polityAId - b.polityAId || a.polityBId - b.polityBId);
  return world.relations;
}

export function relationPressure(world, polityA, polityB, period, relation = null) {
  const distance = closestSettlementDistance(world, polityA, polityB);
  const sharedBorder = politiesShareBorder(world, polityA.id, polityB.id);
  const proximity = distance <= 5 ? -16 : distance <= 9 ? -8 : 3;
  const border = sharedBorder ? -18 : 2;
  const drift = keyedDrift(world.seed, polityA.id, polityB.id, period);
  const warFatigue = relation?.atWar && Number.isInteger(relation.startedDay)
    && world.day - relation.startedDay >= world.config.daysPerYear * 2 ? 28 : 0;
  const delta = clamp(proximity + border + drift + warFatigue, -36, 32);
  const cause = [
    sharedBorder ? 'shared border' : 'separate territory',
    Number.isFinite(distance) ? `distance ${distance}` : 'no settlement proximity',
    `political drift ${drift >= 0 ? '+' : ''}${drift}`,
    warFatigue ? 'war fatigue' : null
  ].filter(Boolean).join(' · ');
  return { delta, sharedBorder, distance, drift, warFatigue, cause };
}

function createRelation(polityAId, polityBId, day, period) {
  return {
    key: relationKey(polityAId, polityBId),
    polityAId: Math.min(polityAId, polityBId),
    polityBId: Math.max(polityAId, polityBId),
    score: 0,
    stance: 'neutral',
    atWar: false,
    startedDay: null,
    endedDay: null,
    foundedDay: day,
    lastChangedDay: day,
    lastUpdatedPeriod: period,
    cause: 'first contact',
    active: true,
    archivedDay: null
  };
}

function archiveInactiveRelations(world, activeIds) {
  for (const relation of world.relations) {
    if (activeIds.has(relation.polityAId) && activeIds.has(relation.polityBId)) continue;
    if (!relation.active && !relation.atWar) continue;
    if (relation.atWar) {
      relation.atWar = false;
      relation.endedDay = world.day;
      pushEvent(world, {
        type: 'polity.peace_made',
        subject: entityRef('polity', relation.polityAId),
        causes: [entityRef('polity', relation.polityBId)],
        relationKey: relation.key,
        polityAId: relation.polityAId,
        polityBId: relation.polityBId,
        score: relation.score,
        reason: 'polity dissolved'
      });
    }
    relation.active = false;
    relation.archivedDay = world.day;
    relation.stance = 'archived';
    relation.lastChangedDay = world.day;
    relation.cause = 'polity dissolved';
  }
}

function closestSettlementDistance(world, polityA, polityB) {
  const aSettlements = activeSettlementsFor(world, polityA);
  const bSettlements = activeSettlementsFor(world, polityB);
  let best = Infinity;
  for (const a of aSettlements) for (const b of bSettlements) best = Math.min(best, Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
  return best;
}

function activeSettlementsFor(world, polity) {
  const ids = new Set(polity.settlementIds);
  return world.settlements.filter((settlement) => settlement.active && ids.has(settlement.id));
}

function politiesShareBorder(world, polityAId, polityBId) {
  const settlementPolity = new Map(world.settlements.map((settlement) => [settlement.id, settlement.polityId]));
  const pair = relationKey(polityAId, polityBId);
  for (const tile of world.tiles) {
    if (!Number.isInteger(tile.ownerSettlementId)) continue;
    const ownerPolity = settlementPolity.get(tile.ownerSettlementId);
    if (!Number.isInteger(ownerPolity)) continue;
    const right = tile.x + 1 < world.width ? world.tiles[tile.y * world.width + tile.x + 1] : null;
    const down = tile.y + 1 < world.height ? world.tiles[(tile.y + 1) * world.width + tile.x] : null;
    for (const neighbor of [right, down]) {
      if (!Number.isInteger(neighbor?.ownerSettlementId)) continue;
      const neighborPolity = settlementPolity.get(neighbor.ownerSettlementId);
      if (!Number.isInteger(neighborPolity) || neighborPolity === ownerPolity) continue;
      if (relationKey(ownerPolity, neighborPolity) === pair) return true;
    }
  }
  return false;
}

function keyedDrift(seed, polityAId, polityBId, period) {
  let h = (Number(seed) >>> 0) ^ Math.imul(polityAId, 0x9e3779b1) ^ Math.imul(polityBId, 0x85ebca6b) ^ Math.imul(period + 1, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) % 9 - 4;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function requirePolityId(value) { if (!Number.isInteger(value) || value < 1) throw new RangeError('polity id must be a positive integer'); }
