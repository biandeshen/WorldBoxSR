export function isEcologyStoryEvent(event) {
  return event?.type === 'creature.predated';
}

export function ecologyStoryForEvent(world, event, daysPerYear = world?.config?.daysPerYear) {
  if (!isEcologyStoryEvent(event)) return null;
  const year = eventYear(event, daysPerYear);
  const predatorId = event.predatorCreatureId ?? '?';
  const preyId = event.preyCreatureId ?? '?';
  const hungerBefore = percentage(event.predatorHungerBefore);
  const hungerAfter = percentage(event.predatorHungerAfter);
  return {
    eventId: event.id ?? null,
    eventType: event.type,
    year,
    priority: 90,
    pulse: false,
    story: true,
    icon: '🐺',
    headline: `Wolf #${predatorId} hunted Grazer #${preyId}`,
    detail: `Predation at ${coordinate(event.x)},${coordinate(event.y)} · hunger ${hungerBefore} → ${hungerAfter}`
  };
}

function eventYear(event, daysPerYear) {
  if (!Number.isFinite(event?.day) || !Number.isFinite(daysPerYear) || daysPerYear <= 0) return NaN;
  return event.day / daysPerYear;
}

function percentage(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '?';
}

function coordinate(value) {
  return Number.isInteger(value) ? value : '?';
}
