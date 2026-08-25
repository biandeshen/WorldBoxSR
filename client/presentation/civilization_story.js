const STORY_TYPES = new Set([
  'polity.founded',
  'polity.dissolved',
  'polity.ruler_appointed',
  'polity.ruler_succeeded',
  'polity.ruler_vacant',
  'polity.war_started',
  'polity.peace_made',
  'warband.mobilized',
  'warband.engaged',
  'warband.destroyed',
  'warband.disbanded',
  'settlement.conquered',
  'settlement.rebelled'
]);

const PULSE_TYPES = new Set([
  'polity.founded',
  'polity.dissolved',
  'polity.ruler_succeeded',
  'polity.war_started',
  'polity.peace_made',
  'warband.engaged',
  'settlement.conquered',
  'settlement.rebelled'
]);

const PRIORITY = Object.freeze({
  'settlement.conquered': 100,
  'settlement.rebelled': 96,
  'polity.war_started': 92,
  'warband.engaged': 88,
  'polity.dissolved': 84,
  'polity.peace_made': 78,
  'polity.founded': 72,
  'polity.ruler_succeeded': 64,
  'polity.ruler_appointed': 58,
  'warband.destroyed': 54,
  'warband.mobilized': 48,
  'polity.ruler_vacant': 42,
  'warband.disbanded': 24
});

export function isCivilizationStoryEvent(event) {
  return Boolean(event && STORY_TYPES.has(event.type));
}

export function latestHistoryEventId(world) {
  let latest = 0;
  for (const event of world?.history ?? []) {
    if (Number.isInteger(event?.id)) latest = Math.max(latest, event.id);
  }
  return latest;
}

export function storyForEvent(world, event, daysPerYear = world?.config?.daysPerYear) {
  if (!isCivilizationStoryEvent(event)) return null;
  const year = eventYear(event, daysPerYear);
  const common = {
    eventId: event.id,
    eventType: event.type,
    year,
    priority: PRIORITY[event.type] ?? 0,
    pulse: PULSE_TYPES.has(event.type),
    story: true
  };
  const polity = (id) => polityName(world, id);
  const settlement = (id) => settlementName(world, id);

  switch (event.type) {
    case 'polity.founded': {
      const name = event.name ?? polity(event.polityId);
      return { ...common, icon: '♛', headline: `${name} rises`, detail: `Founded at ${settlement(event.capitalSettlementId)}.` };
    }
    case 'polity.dissolved': {
      const name = event.name ?? polity(event.polityId);
      return { ...common, icon: '◌', headline: `${name} falls`, detail: 'It no longer controls a viable settlement.' };
    }
    case 'polity.ruler_appointed': {
      const name = event.name ?? polity(event.polityId);
      return { ...common, icon: '♔', headline: `${name} crowns its first ruler`, detail: `${humanName(event.rulerId)} begins the founding reign.` };
    }
    case 'polity.ruler_succeeded': {
      const name = event.name ?? polity(event.polityId);
      return { ...common, icon: '♔', headline: `${name} has a new ruler`, detail: `${humanName(event.rulerId)} succeeds ${humanName(event.previousRulerId)} after ${event.reason ?? 'a succession'}.”`.replace('.”', '.') };
    }
    case 'polity.ruler_vacant': {
      const name = event.name ?? polity(event.polityId);
      return { ...common, icon: '♔', headline: `${name}'s throne is vacant`, detail: `${humanName(event.previousRulerId)} left the office (${event.reason ?? 'vacancy'}).` };
    }
    case 'polity.war_started': {
      const a = polity(event.polityAId);
      const b = polity(event.polityBId);
      return { ...common, icon: '⚔', headline: `${a} and ${b} go to war`, detail: `Relations fell to ${numberOrUnknown(event.score)} · ${event.reason ?? 'political pressure'}.` };
    }
    case 'polity.peace_made': {
      const a = polity(event.polityAId);
      const b = polity(event.polityBId);
      return { ...common, icon: '☮', headline: `${a} and ${b} make peace`, detail: `${event.reason ?? 'The conflict ended'} · relation ${numberOrUnknown(event.score)}.` };
    }
    case 'warband.mobilized': {
      const attacker = polity(event.polityId);
      const defender = polity(event.opponentPolityId);
      return { ...common, icon: '⚑', headline: `${attacker} mobilizes against ${defender}`, detail: `${numberOrUnknown(event.strength)} strength marches from ${settlement(event.originSettlementId)} toward ${settlement(event.targetSettlementId)}.` };
    }
    case 'warband.engaged': {
      const a = polity(event.polityAId);
      const b = polity(event.polityBId);
      return { ...common, icon: '⚔', headline: `${a} and ${b} collide`, detail: `Battle near ${event.x ?? '?'},${event.y ?? '?'} · losses ${numberOrUnknown(event.lossA)}–${numberOrUnknown(event.lossB)} · strength ${numberOrUnknown(event.strengthA)}–${numberOrUnknown(event.strengthB)}.` };
    }
    case 'warband.destroyed': {
      const loser = polity(event.polityId);
      const opponent = polity(event.opponentPolityId);
      return { ...common, icon: '✕', headline: `${loser}'s warband is destroyed`, detail: `${opponent} survives the engagement.` };
    }
    case 'warband.disbanded': {
      const owner = polity(event.polityId);
      return { ...common, icon: '⚑', headline: `${owner}'s warband stands down`, detail: `${numberOrUnknown(event.remainingStrength)} strength remains · ${event.reason ?? 'war ended'}.` };
    }
    case 'settlement.conquered': {
      const place = event.settlementName ?? settlement(event.settlementId);
      const winner = polity(event.newPolityId);
      const loser = polity(event.previousPolityId);
      return { ...common, icon: '⚑', headline: `${place} falls to ${winner}`, detail: `${winner} captures the settlement from ${loser}; conquest #${event.conquestCount ?? 1}.` };
    }
    case 'settlement.rebelled': {
      const place = event.settlementName ?? settlement(event.settlementId);
      const owner = polity(event.previousOwnerPolityId);
      return { ...common, icon: '✦', headline: `${place} rebels against ${owner}`, detail: `${numberOrUnknown(event.population)} residents break occupation and reopen the settlement's political future.` };
    }
    default:
      return null;
  }
}

export function chronicleEntryForEvent(world, event, daysPerYear = world?.config?.daysPerYear) {
  const story = storyForEvent(world, event, daysPerYear);
  if (story) return story;
  const year = eventYear(event, daysPerYear);
  return {
    eventId: event?.id ?? null,
    eventType: event?.type ?? 'unknown',
    year,
    priority: 0,
    pulse: false,
    story: false,
    icon: '•',
    headline: humanizeType(event?.type ?? 'unknown event'),
    detail: `Recorded in authoritative history${Number.isFinite(year) ? ` at year ${year.toFixed(2)}` : ''}.`
  };
}

export function civilizationChronicle(world, { limit = 7 } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('chronicle limit must be a positive integer');
  const history = [...(world?.history ?? [])];
  const selected = [];
  const selectedIds = new Set();

  for (let index = history.length - 1; index >= 0 && selected.length < limit; index -= 1) {
    const event = history[index];
    if (!isCivilizationStoryEvent(event)) continue;
    selected.push(event);
    if (Number.isInteger(event.id)) selectedIds.add(event.id);
  }
  for (let index = history.length - 1; index >= 0 && selected.length < limit; index -= 1) {
    const event = history[index];
    if (Number.isInteger(event?.id) && selectedIds.has(event.id)) continue;
    selected.push(event);
  }

  return selected
    .sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0))
    .map((event) => chronicleEntryForEvent(world, event));
}

export function latestCivilizationPulse(world, { afterEventId = 0 } = {}) {
  const candidates = (world?.history ?? [])
    .filter((event) => Number.isInteger(event?.id) && event.id > afterEventId)
    .map((event) => storyForEvent(world, event))
    .filter((story) => story?.pulse)
    .sort((a, b) => b.priority - a.priority || b.eventId - a.eventId);
  return candidates[0] ?? null;
}

export function formatChronicleLabel(entry) {
  const year = Number.isFinite(entry?.year) ? entry.year.toFixed(1) : '?';
  return `Y${year} · ${entry?.icon ?? '•'} ${entry?.headline ?? 'Recorded event'}`;
}

export function formatChronicleDetail(entry) {
  if (!entry) return 'Event unavailable';
  const year = Number.isFinite(entry.year) ? entry.year.toFixed(2) : '?';
  return [`${entry.icon ?? '•'} ${entry.headline}`, entry.detail, `year ${year} · event #${entry.eventId ?? '?'}`].filter(Boolean).join('\n');
}

function eventYear(event, daysPerYear) {
  if (!Number.isFinite(event?.day) || !Number.isFinite(daysPerYear) || daysPerYear <= 0) return NaN;
  return event.day / daysPerYear;
}

function polityName(world, id) {
  if (!Number.isInteger(id)) return 'an unknown power';
  return world?.polities?.find((candidate) => candidate.id === id)?.name ?? `Polity #${id}`;
}

function settlementName(world, id) {
  if (!Number.isInteger(id)) return 'an unknown settlement';
  return world?.settlements?.find((candidate) => candidate.id === id)?.name ?? `Settlement #${id}`;
}

function humanName(id) {
  return Number.isInteger(id) ? `Human #${id}` : 'an unknown ruler';
}

function humanizeType(type) {
  return String(type)
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function numberOrUnknown(value) {
  return Number.isFinite(value) ? value : '?';
}
