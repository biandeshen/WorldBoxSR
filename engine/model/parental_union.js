import { entityRef, pushEvent } from './events.js';

export function parentalUnionByPair(world, firstHumanId, secondHumanId) {
  const [a, b] = orderedPartnerIds(firstHumanId, secondHumanId);
  return world.unions.find((union) =>
    union.kind === 'parental_union' &&
    union.partnerIds[0] === a &&
    union.partnerIds[1] === b
  ) ?? null;
}

export function ensureParentalUnion(world, firstParent, secondParent) {
  const existing = parentalUnionByPair(world, firstParent.id, secondParent.id);
  if (existing) return { union: existing, founded: false };

  const partnerIds = orderedPartnerIds(firstParent.id, secondParent.id);
  const commonSettlementId = firstParent.settlementId !== null &&
    firstParent.settlementId === secondParent.settlementId
    ? firstParent.settlementId
    : null;

  const union = {
    id: world.nextUnionId++,
    kind: 'parental_union',
    partnerIds,
    childIds: [],
    foundedDay: world.day,
    lastChildDay: null,
    settlementIdAtFormation: commonSettlementId,
    active: true,
    endedDay: null,
    endReason: null,
    endedByHumanId: null
  };
  world.unions.push(union);
  addUnionReference(firstParent, union.id);
  addUnionReference(secondParent, union.id);

  pushEvent(world, {
    type: 'union.founded',
    subject: entityRef('parental_union', union.id),
    causes: [entityRef('human', partnerIds[0]), entityRef('human', partnerIds[1])],
    unionId: union.id,
    partnerIds: [...partnerIds],
    settlementId: commonSettlementId
  });

  return { union, founded: true };
}

export function addChildToParentalUnion(world, union, childId) {
  if (!union || union.kind !== 'parental_union') throw new TypeError('parental union is required');
  if (!Number.isInteger(childId) || childId < 1) throw new RangeError('childId must be a positive integer');
  if (!union.childIds.includes(childId)) union.childIds.push(childId);
  union.lastChildDay = world.day;
  return union;
}

export function endParentalUnionsForHuman(world, humanId, reason = 'partner_death') {
  const ended = [];
  for (const union of world.unions) {
    if (!union.active || !union.partnerIds.includes(humanId)) continue;
    union.active = false;
    union.endedDay = world.day;
    union.endReason = reason;
    union.endedByHumanId = humanId;
    pushEvent(world, {
      type: 'union.ended',
      subject: entityRef('parental_union', union.id),
      causes: [entityRef('human', humanId)],
      unionId: union.id,
      reason,
      endedByHumanId: humanId
    });
    ended.push(union);
  }
  return ended;
}

function addUnionReference(human, unionId) {
  if (!Array.isArray(human.unionIds)) human.unionIds = [];
  if (!human.unionIds.includes(unionId)) human.unionIds.push(unionId);
}

function orderedPartnerIds(firstHumanId, secondHumanId) {
  if (!Number.isInteger(firstHumanId) || firstHumanId < 1 ||
      !Number.isInteger(secondHumanId) || secondHumanId < 1) {
    throw new RangeError('partner IDs must be positive integers');
  }
  if (firstHumanId === secondHumanId) throw new RangeError('parental union requires two distinct humans');
  return firstHumanId < secondHumanId
    ? [firstHumanId, secondHumanId]
    : [secondHumanId, firstHumanId];
}
