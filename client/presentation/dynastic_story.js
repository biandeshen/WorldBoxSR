export function dynasticRulerStoryForEvent(world, event) {
  if (!event || (event.type !== 'polity.ruler_appointed' && event.type !== 'polity.ruler_succeeded')) return null;
  const name = event.name ?? polityName(world, event.polityId);
  const ruler = humanName(event.rulerId);

  if (event.type === 'polity.ruler_appointed') {
    if (event.successionPath !== 'founding') return null;
    const lineSequence = positiveIntegerOrNull(event.rulingLineSequence);
    const founderId = positiveIntegerOrNull(event.rulingLineFounderId) ?? positiveIntegerOrNull(event.rulerId);
    const detail = lineSequence && founderId
      ? `${ruler} begins ruling line ${lineSequence} as founder Human #${founderId}.`
      : `${ruler} begins the founding reign.`;
    return {
      icon: '♔',
      headline: `${name} crowns its first ruler`,
      detail,
      transitionKind: 'founding',
      lineSequence,
      founderId,
      descendantDistance: null
    };
  }

  if (event.successionPath === 'descendant') {
    const lineSequence = positiveIntegerOrNull(event.rulingLineSequence);
    const founderId = positiveIntegerOrNull(event.rulingLineFounderId);
    const distance = positiveIntegerOrNull(event.descendantDistance);
    if (!lineSequence || !founderId || !distance) return null;
    const relation = descendantLabel(distance);
    const reason = reasonPhrase(event.reason);
    return {
      icon: '♔',
      headline: `${name}'s ruling bloodline continues`,
      detail: `${ruler} continues ruling line ${lineSequence} as ${relation} of founder Human #${founderId}${reason}.`,
      transitionKind: 'descendant',
      lineSequence,
      founderId,
      descendantDistance: distance
    };
  }

  if (event.successionPath === 'open_selection') {
    const lineSequence = positiveIntegerOrNull(event.rulingLineSequence);
    const founderId = positiveIntegerOrNull(event.rulingLineFounderId) ?? positiveIntegerOrNull(event.rulerId);
    if (!lineSequence || !founderId) return null;
    const reason = reasonPhrase(event.reason);
    return {
      icon: '♔',
      headline: `${name} begins a new ruling line`,
      detail: `${ruler} begins ruling line ${lineSequence} as founder Human #${founderId}${reason}.`,
      transitionKind: 'open_selection',
      lineSequence,
      founderId,
      descendantDistance: null
    };
  }

  // Legacy/pre-v0.8 ruler events deliberately fall back to the existing story
  // projection instead of inventing ruling-line facts that were never recorded.
  return null;
}

export function descendantLabel(distance) {
  if (distance === 1) return 'a child';
  if (distance === 2) return 'a grandchild';
  return `${distance} generations from the founder`;
}

function reasonPhrase(reason) {
  if (!reason) return '';
  return ` after ${String(reason).replaceAll('_', ' ')}`;
}

function positiveIntegerOrNull(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function humanName(id) {
  return Number.isInteger(id) ? `Human #${id}` : 'An unknown ruler';
}

function polityName(world, id) {
  if (!Number.isInteger(id)) return 'An unknown power';
  return world?.polities?.find((candidate) => candidate.id === id)?.name ?? `Polity #${id}`;
}
