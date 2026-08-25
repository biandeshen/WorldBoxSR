import { entityRef, pushEvent } from '../model/events.js';

export const REBELLION_DELAY_YEARS = 2;
export const REBELLION_MIN_POPULATION = 4;

export function normalizeSettlementPoliticalFields(settlement) {
  return {
    ...settlement,
    conquestCount: settlement.conquestCount ?? 0,
    previousPolityId: settlement.previousPolityId ?? null,
    lastConqueredDay: settlement.lastConqueredDay ?? null,
    lastConqueredByPolityId: settlement.lastConqueredByPolityId ?? null,
    lastConqueringWarbandId: settlement.lastConqueringWarbandId ?? null,
    occupationStartedDay: settlement.occupationStartedDay ?? null,
    rebellionEligibleDay: settlement.rebellionEligibleDay ?? null,
    rebellionCount: settlement.rebellionCount ?? 0,
    lastRebelledDay: settlement.lastRebelledDay ?? null,
    lastRebelledFromPolityId: settlement.lastRebelledFromPolityId ?? null
  };
}

export function updatePoliticalOutcomes(world) {
  normalizeWorldSettlements(world);
  const conquests = resolveConquests(world);
  const rebellions = resolveRebellions(world);
  return { conquests, rebellions };
}

function normalizeWorldSettlements(world) {
  for (let index = 0; index < world.settlements.length; index += 1) {
    const settlement = world.settlements[index];
    if (settlement.conquestCount !== undefined && settlement.rebellionCount !== undefined) continue;
    world.settlements[index] = normalizeSettlementPoliticalFields(settlement);
  }
}

function resolveConquests(world) {
  let count = 0;
  const activeWarbands = (world.warbands ?? [])
    .filter((warband) => warband.active)
    .sort((a, b) => a.id - b.id);

  for (const warband of activeWarbands) {
    const relation = (world.relations ?? []).find((candidate) => candidate.active
      && candidate.atWar
      && candidate.key === warband.relationKey
      && candidate.startedDay === warband.warStartedDay);
    if (!relation) continue;

    const target = world.settlements.find((settlement) => settlement.id === warband.targetSettlementId && settlement.active);
    if (!target || target.polityId !== warband.opponentPolityId) continue;
    if (warband.x !== target.x || warband.y !== target.y) continue;
    if (opponentWarbandActive(world, warband)) continue;

    transferSettlement(world, warband, target);
    count += 1;
  }

  return count;
}

function opponentWarbandActive(world, warband) {
  return (world.warbands ?? []).some((candidate) => candidate.active
    && candidate.relationKey === warband.relationKey
    && candidate.warStartedDay === warband.warStartedDay
    && candidate.polityId === warband.opponentPolityId);
}

function transferSettlement(world, warband, settlement) {
  const previousPolityId = settlement.polityId;
  const newPolityId = warband.polityId;
  if (!Number.isInteger(previousPolityId) || previousPolityId === newPolityId) return;

  settlement.polityId = newPolityId;
  settlement.previousPolityId = previousPolityId;
  settlement.lastConqueredDay = world.day;
  settlement.lastConqueredByPolityId = newPolityId;
  settlement.lastConqueringWarbandId = warband.id;
  settlement.conquestCount = (settlement.conquestCount ?? 0) + 1;
  settlement.occupationStartedDay = world.day;
  settlement.rebellionEligibleDay = world.day + Math.max(1, Math.round(world.config.daysPerYear * REBELLION_DELAY_YEARS));

  warband.captures = (warband.captures ?? 0) + 1;
  warband.lastCapturedSettlementId = settlement.id;
  warband.lastCaptureDay = world.day;

  pushEvent(world, {
    type: 'settlement.conquered',
    subject: entityRef('settlement', settlement.id),
    causes: [entityRef('warband', warband.id), entityRef('polity', newPolityId), entityRef('polity', previousPolityId)],
    settlementId: settlement.id,
    settlementName: settlement.name,
    previousPolityId,
    newPolityId,
    warbandId: warband.id,
    relationKey: warband.relationKey,
    warStartedDay: warband.warStartedDay,
    conquestCount: settlement.conquestCount
  });
}

function resolveRebellions(world) {
  let count = 0;
  const settlements = [...world.settlements].sort((a, b) => a.id - b.id);

  for (const settlement of settlements) {
    if (!settlement.active || !Number.isInteger(settlement.polityId)) continue;
    if ((settlement.rebellionCount ?? 0) >= 1) continue;
    if (!Number.isInteger(settlement.occupationStartedDay) || !Number.isInteger(settlement.rebellionEligibleDay)) continue;
    if (world.day < settlement.rebellionEligibleDay) continue;
    if (settlement.lastConqueredByPolityId !== settlement.polityId) continue;
    if (settlement.population < REBELLION_MIN_POPULATION) continue;

    const owner = world.polities.find((polity) => polity.id === settlement.polityId && polity.active);
    if (!owner || owner.capitalSettlementId === settlement.id) continue;
    const ownerSettlements = world.settlements.filter((candidate) => candidate.active && candidate.polityId === owner.id);
    if (ownerSettlements.length < 2) continue;

    seedRebellion(world, settlement, owner.id);
    count += 1;
  }

  return count;
}

function seedRebellion(world, settlement, previousOwnerPolityId) {
  settlement.polityId = null;
  settlement.rebellionCount = (settlement.rebellionCount ?? 0) + 1;
  settlement.lastRebelledDay = world.day;
  settlement.lastRebelledFromPolityId = previousOwnerPolityId;
  settlement.occupationStartedDay = null;
  settlement.rebellionEligibleDay = null;

  pushEvent(world, {
    type: 'settlement.rebelled',
    subject: entityRef('settlement', settlement.id),
    causes: [entityRef('polity', previousOwnerPolityId)],
    settlementId: settlement.id,
    settlementName: settlement.name,
    previousOwnerPolityId,
    conquestDay: settlement.lastConqueredDay,
    rebellionCount: settlement.rebellionCount,
    population: settlement.population
  });
}
