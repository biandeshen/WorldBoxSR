export function rulingLinePresentation(world, polity) {
  if (!world || !polity) return null;

  const founderId = positiveIdOrNull(polity.rulingLineFounderId);
  const lineSequence = nonNegativeInteger(polity.rulingLineSequence);
  const reignCount = nonNegativeInteger(polity.rulingLineReignCount);
  const currentRulerId = positiveIdOrNull(polity.rulerId);
  const founder = founderId === null ? null : currentLivingHuman(world, founderId);
  const currentRuler = currentRulerId === null ? null : currentLivingHuman(world, currentRulerId);
  const transition = currentRulerId === null ? null : latestCurrentRulerTransition(world, polity.id, currentRulerId);

  return {
    polityId: polity.id,
    currentRulerId,
    currentRulerAvailable: Boolean(currentRuler),
    founderId,
    founderAvailable: Boolean(founder),
    lineSequence,
    reignCount,
    lineText: formatRulingLineText({ founderId, founderAvailable: Boolean(founder), lineSequence, reignCount }),
    transitionText: formatRulingLineTransition(transition),
    successionPath: transition?.successionPath ?? null,
    descendantDistance: positiveIntegerOrNull(transition?.descendantDistance)
  };
}

export function formatRulingLineText({ founderId, founderAvailable, lineSequence, reignCount }) {
  const normalizedFounderId = positiveIdOrNull(founderId);
  const normalizedSequence = nonNegativeInteger(lineSequence);
  const normalizedReignCount = nonNegativeInteger(reignCount);
  if (normalizedFounderId === null || normalizedSequence < 1) return 'ruling line unavailable';
  const availability = founderAvailable ? '' : ' · unavailable';
  return `ruling line ${normalizedSequence} · reign ${normalizedReignCount} · founder Human #${normalizedFounderId}${availability}`;
}

export function formatRulingLineTransition(event) {
  if (!event || (event.type !== 'polity.ruler_appointed' && event.type !== 'polity.ruler_succeeded')) return null;
  if (event.successionPath === 'founding') return 'founding line';
  if (event.successionPath === 'open_selection') return 'new ruling line · open selection';
  if (event.successionPath !== 'descendant') return null;

  const distance = positiveIntegerOrNull(event.descendantDistance);
  if (distance === 1) return 'bloodline continued · child';
  if (distance === 2) return 'bloodline continued · grandchild';
  return distance === null
    ? 'bloodline continued'
    : `bloodline continued · ${distance} generations`;
}

function latestCurrentRulerTransition(world, polityId, rulerId) {
  if (!Array.isArray(world.history)) return null;
  return world.history.findLast((event) =>
    (event.type === 'polity.ruler_appointed' || event.type === 'polity.ruler_succeeded') &&
    event.polityId === polityId &&
    event.rulerId === rulerId
  ) ?? null;
}

function currentLivingHuman(world, id) {
  if (!Array.isArray(world.entities)) return null;
  return world.entities.find((human) => human?.kind === 'human' && human.id === id && human.alive) ?? null;
}

function positiveIdOrNull(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function positiveIntegerOrNull(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
