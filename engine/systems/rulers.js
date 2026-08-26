import { rankDescendantCandidates } from '../core/succession_genealogy.js';
import { entityRef, eventRef, pushEvent } from '../model/events.js';

export function updateRulers(world) {
  for (const polity of [...world.polities].sort((a, b) => a.id - b.id)) {
    if (!polity.active) continue;

    const currentRuler = livingHumanById(world, polity.rulerId);
    if (currentRuler && humanBelongsToPolity(world, polity, currentRuler)) continue;

    const previousRulerId = Number.isInteger(polity.rulerId)
      ? polity.rulerId
      : (Number.isInteger(polity.lastRulerId) ? polity.lastRulerId : null);
    const previousTermExisted = Number(polity.rulerSequence || 0) > 0;
    const previousRulingLineFounderId = positiveHumanIdOrNull(polity.rulingLineFounderId);
    if (Number.isInteger(polity.rulerId)) polity.lastRulerId = polity.rulerId;

    const selection = selectRulerCandidateDetails(world, polity);
    const successor = selection.human;
    const reason = successionReason(world, previousRulerId);

    if (!successor) {
      if (Number.isInteger(polity.rulerId)) {
        polity.rulerId = null;
        polity.rulerSinceDay = null;
        pushEvent(world, {
          type: 'polity.ruler_vacant',
          subject: entityRef('polity', polity.id),
          causes: causesForPreviousRuler(world, previousRulerId),
          polityId: polity.id,
          name: polity.name,
          previousRulerId,
          reason,
          rulingLineFounderId: positiveHumanIdOrNull(polity.rulingLineFounderId),
          rulingLineSequence: normalizedNonNegativeInteger(polity.rulingLineSequence),
          rulingLineReignCount: normalizedNonNegativeInteger(polity.rulingLineReignCount)
        });
      }
      continue;
    }

    const firstAppointment = !previousTermExisted;
    const lineFacts = applyRulingLineTransition(world, polity, successor, selection, { firstAppointment });

    polity.rulerId = successor.id;
    polity.rulerSinceDay = world.day;
    polity.rulerSequence = Number(polity.rulerSequence || 0) + 1;
    polity.lastRulerId = previousRulerId;

    pushEvent(world, {
      type: firstAppointment ? 'polity.ruler_appointed' : 'polity.ruler_succeeded',
      subject: entityRef('polity', polity.id),
      causes: [
        ...causesForPreviousRuler(world, previousRulerId),
        entityRef('human', successor.id)
      ],
      polityId: polity.id,
      name: polity.name,
      rulerId: successor.id,
      previousRulerId,
      reason: firstAppointment ? 'founding' : reason,
      rulerSequence: polity.rulerSequence,
      successionPath: lineFacts.successionPath,
      rulingLineFounderId: polity.rulingLineFounderId,
      previousRulingLineFounderId,
      rulingLineSequence: polity.rulingLineSequence,
      rulingLineReignCount: polity.rulingLineReignCount,
      rulingLineChanged: lineFacts.rulingLineChanged,
      descendantDistance: lineFacts.descendantDistance
    });
  }
  return world;
}

export function selectRulerCandidate(world, polity) {
  return selectRulerCandidateDetails(world, polity).human;
}

export function selectRulerCandidateDetails(world, polity) {
  const eligible = eligibleRulerCandidates(world, polity);
  if (eligible.length === 0) {
    return { human: null, successionPath: null, descendantDistance: null };
  }

  const firstAppointment = Number(polity?.rulerSequence || 0) === 0;
  const founderId = positiveHumanIdOrNull(polity?.rulingLineFounderId);
  if (!firstAppointment && founderId !== null) {
    const ranked = rankDescendantCandidates(world, founderId, eligible);
    if (ranked.length > 0) {
      return {
        human: ranked[0].human,
        successionPath: 'descendant',
        descendantDistance: ranked[0].distance
      };
    }
  }

  return {
    human: eligible[0],
    successionPath: firstAppointment ? 'founding' : 'open_selection',
    descendantDistance: null
  };
}

export function eligibleRulerCandidates(world, polity) {
  if (!polity?.active) return [];
  const activeMemberSettlements = new Set(
    world.settlements
      .filter((settlement) => settlement.active && settlement.polityId === polity.id)
      .map((settlement) => settlement.id)
  );
  const adultAgeDays = world.config.adultAgeYears * world.config.daysPerYear;
  return world.entities
    .filter((human) =>
      human.kind === 'human' &&
      human.alive &&
      human.ageDays >= adultAgeDays &&
      activeMemberSettlements.has(human.settlementId)
    )
    .sort((a, b) => b.ageDays - a.ageDays || a.id - b.id);
}

function applyRulingLineTransition(world, polity, successor, selection, { firstAppointment }) {
  if (firstAppointment) {
    polity.rulingLineFounderId = successor.id;
    polity.rulingLineSequence = 1;
    polity.rulingLineSinceDay = world.day;
    polity.rulingLineReignCount = 1;
    return {
      successionPath: 'founding',
      rulingLineChanged: true,
      descendantDistance: null
    };
  }

  if (selection.successionPath === 'descendant') {
    polity.rulingLineSequence = Math.max(1, normalizedNonNegativeInteger(polity.rulingLineSequence));
    polity.rulingLineReignCount = Math.max(1, normalizedNonNegativeInteger(polity.rulingLineReignCount)) + 1;
    return {
      successionPath: 'descendant',
      rulingLineChanged: false,
      descendantDistance: selection.descendantDistance
    };
  }

  polity.rulingLineFounderId = successor.id;
  polity.rulingLineSequence = normalizedNonNegativeInteger(polity.rulingLineSequence) + 1;
  polity.rulingLineSinceDay = world.day;
  polity.rulingLineReignCount = 1;
  return {
    successionPath: 'open_selection',
    rulingLineChanged: true,
    descendantDistance: null
  };
}

function humanBelongsToPolity(world, polity, human) {
  if (!human?.alive || human.kind !== 'human') return false;
  return world.settlements.some((settlement) =>
    settlement.active &&
    settlement.polityId === polity.id &&
    settlement.id === human.settlementId
  );
}

function livingHumanById(world, id) {
  if (!Number.isInteger(id)) return null;
  return world.entities.find((human) => human.kind === 'human' && human.id === id && human.alive) ?? null;
}

function successionReason(world, previousRulerId) {
  if (!Number.isInteger(previousRulerId)) return 'vacancy_filled';
  const death = latestDeathEvent(world, previousRulerId);
  if (death) return 'death';
  const living = livingHumanById(world, previousRulerId);
  return living ? 'no_longer_member' : 'unavailable';
}

function causesForPreviousRuler(world, previousRulerId) {
  if (!Number.isInteger(previousRulerId)) return [];
  const death = latestDeathEvent(world, previousRulerId);
  return death ? [eventRef(death.id)] : [entityRef('human', previousRulerId)];
}

function latestDeathEvent(world, humanId) {
  return world.history.findLast((event) => event.type === 'human.died' && event.entityId === humanId) ?? null;
}

function positiveHumanIdOrNull(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizedNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
