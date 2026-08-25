import { createWorld, tickWorld } from '../../engine/core/world.js';
import { createHuman } from '../../engine/model/human.js';
import { createSettlement } from '../../engine/model/settlement.js';
import { updatePolities } from '../../engine/systems/polities.js';
import { updateRulers } from '../../engine/systems/rulers.js';
import { updatePolityRelations } from '../../engine/systems/polity_relations.js';
import { updateSettlementMembership, updateSettlementTerritory } from '../../engine/systems/settlements.js';

export const CANONICAL_COLLISION = Object.freeze({
  seed: 9301,
  width: 12,
  height: 8,
  settlementA: Object.freeze({ x: 2, y: 4, adults: 10 }),
  settlementB: Object.freeze({ x: 7, y: 4, adults: 4 }),
  maxYears: 8
});

export function createCanonicalCollisionWorld(seed = CANONICAL_COLLISION.seed) {
  const world = createWorld({
    seed,
    width: CANONICAL_COLLISION.width,
    height: CANONICAL_COLLISION.height,
    population: 0,
    config: {
      waterLevel: -1,
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementMinAdults: 999
    }
  });

  const left = createSettlement(world, CANONICAL_COLLISION.settlementA);
  const right = createSettlement(world, CANONICAL_COLLISION.settlementB);
  updatePolities(world);

  addAdults(world, left, CANONICAL_COLLISION.settlementA.adults, 0);
  addAdults(world, right, CANONICAL_COLLISION.settlementB.adults, 1);
  updateSettlementMembership(world);
  updateSettlementTerritory(world);
  updateRulers(world);
  updatePolityRelations(world);
  return world;
}

export function evolveCanonicalCollisionWorld(world, { maxYears = CANONICAL_COLLISION.maxYears } = {}) {
  if (!Number.isFinite(maxYears) || maxYears <= 0) throw new RangeError('maxYears must be positive');
  const maxDays = Math.round(maxYears * world.config.daysPerYear);
  const chunkDays = 30;
  while (world.day < maxDays) {
    tickWorld(world, Math.min(chunkDays, maxDays - world.day));
    if (evaluateCivilizationCollisionGate(world).pass) break;
  }
  return world;
}

export function evaluateCivilizationCollisionGate(world) {
  const history = world?.history ?? [];
  const foundingPolities = new Set(history.filter((event) => event.type === 'polity.founded').map((event) => event.polityId));
  const ruledPolities = new Set(history
    .filter((event) => event.type === 'polity.ruler_appointed' || event.type === 'polity.ruler_succeeded')
    .map((event) => event.polityId));
  const war = history.find((event) => event.type === 'polity.war_started');
  const engagement = history.find((event) => event.type === 'warband.engaged');
  const mapTransition = history.find((event) => event.type === 'settlement.conquered' || event.type === 'settlement.rebelled');

  const twoPowers = foundingPolities.size >= 2;
  const rulers = [...foundingPolities].filter((id) => ruledPolities.has(id)).length >= 2;
  const collision = Boolean(war && engagement);
  const politicalMapChanged = Boolean(mapTransition);
  return {
    pass: twoPowers && rulers && collision && politicalMapChanged,
    twoPowers,
    rulers,
    collision,
    politicalMapChanged,
    warEventId: war?.id ?? null,
    engagementEventId: engagement?.id ?? null,
    mapTransitionEventId: mapTransition?.id ?? null,
    foundingPolityIds: [...foundingPolities].sort((a, b) => a - b)
  };
}

function addAdults(world, settlement, count, sexOffset) {
  for (let index = 0; index < count; index += 1) {
    createHuman(world, {
      x: settlement.x,
      y: settlement.y,
      ageYears: 24 + index,
      settlementId: settlement.id,
      lineageId: null,
      sex: (index + sexOffset) % 2 === 0 ? 'F' : 'M'
    });
  }
}
