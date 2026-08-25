const STORY_TYPES = new Set([
  'god.meteor',
  'god.rain',
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
  'polity.war_started',
  'polity.peace_made',
  'warband.engaged',
  'settlement.conquered',
  'settlement.rebelled'
]);

const PRIORITY = Object.freeze({
  'god.meteor': 110,
  'god.rain': 108,
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

// Two intervention slots are intentional. v0.4's core player story is often a
// short sequence such as Meteor → Rain. The second slot is consumed only when
// a second distinct intervention exists; otherwise the loop naturally falls
// through to the remaining representative world-story groups.
const REPRESENTATIVE_GROUPS = Object.freeze([
  'intervention',
  'intervention',
  'outcome',
  'diplomacy',
  'battle',
  'polity',
  'ruler',
  'army'
]);

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
    case 'god.meteor': {
      const humanCount = Number.isInteger(event.humanCount) ? event.humanCount : (event.entityIds?.length ?? 0);
      const creatureCount = Number.isInteger(event.creatureCount) ? event.creatureCount : (event.creatureIds?.length ?? 0);
      const lives = humanCount + creatureCount;
      const vegetation = Number.isFinite(event.vegetationRemoved) ? event.vegetationRemoved : 0;
      if (event.noEffect) {
        return { ...common, icon: '☄', headline: `Meteor strikes ${event.x},${event.y} — no effect`, detail: `The radius-${event.radius ?? 2} impact found no living targets or vegetation to remove.` };
      }
      return { ...common, icon: '☄', headline: `Meteor devastates ${event.x},${event.y}`, detail: `${lives} ${lives === 1 ? 'life' : 'lives'} lost · ${vegetation.toFixed(1)} vegetation removed across ${event.impactedTileCount ?? '?'} impacted tiles.` };
    }
    case 'god.rain': {
      const vegetation = Number.isFinite(event.vegetationAdded) ? event.vegetationAdded : 0;
      const food = Number.isFinite(event.foodAdded) ? event.foodAdded : 0;
      if (event.noEffect) {
        return { ...common, icon: '☂', headline: `Rain falls at ${event.x},${event.y} — no effect`, detail: `The radius-${event.radius ?? 2} area was already saturated or had no passable resource tiles to restore.` };
      }
      return { ...common, icon: '☂', headline: `Rain renews ${event.x},${event.y}`, detail: `+${vegetation.toFixed(1)} vegetation · +${food.toFixed(1)} food across ${event.passableTileCount ?? event.impactedTileCount ?? '?'} restored tiles.` };
    }
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
      return { ...common, icon: '♔', headline: `${name} has a new ruler`, detail: `${humanName(event.rulerId)} succeeds ${humanName(event.previousRulerId)} after ${event.reason ?? 'a succession'}.` };
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
  const uniqueStoryEvents = uniqueStoryCandidates(history);
  const selected = [];
  const selectedIds = new Set();

  for (const group of REPRESENTATIVE_GROUPS) {
    if (selected.length >= limit) break;
    const event = uniqueStoryEvents.find((candidate) => storyGroup(candidate.type) === group && !selectedIds.has(candidate.id));
    if (!event) continue;
    selected.push(event);
    if (Number.isInteger(event.id)) selectedIds.add(event.id);
  }

  const rankedRemainder = uniqueStoryEvents
    .filter((event) => !selectedIds.has(event.id))
    .sort((a, b) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0) || (b.id ?? 0) - (a.id ?? 0));
  for (const event of rankedRemainder) {
    if (selected.length >= limit) break;
    selected.push(event);
    if (Number.isInteger(event.id)) selectedIds.add(event.id);
  }

  for (let index = history.length - 1; index >= 0 && selected.length < limit; index -= 1) {
    const event = history[index];
    if (Number.isInteger(event?.id) && selectedIds.has(event.id)) continue;
    selected.push(event);
    if (Number.isInteger(event?.id)) selectedIds.add(event.id);
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

function uniqueStoryCandidates(history) {
  const result = [];
  const seen = new Set();
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index];
    if (!isCivilizationStoryEvent(event)) continue;
    const key = storyDedupeKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

function storyDedupeKey(event) {
  const type = event.type;
  if (type === 'god.meteor' || type === 'god.rain') return `intervention:${event.id ?? 'unknown'}`;
  if (type.startsWith('polity.ruler_')) return `ruler:${event.polityId ?? 'unknown'}`;
  if (type === 'warband.engaged') return `battle:${event.relationKey ?? `${event.polityAId}:${event.polityBId}`}`;
  if (type.startsWith('warband.')) return `${type}:${event.relationKey ?? 'unknown'}:${event.polityId ?? event.warbandAId ?? 'unknown'}`;
  if (type === 'polity.war_started' || type === 'polity.peace_made') return `${type}:${event.relationKey ?? `${event.polityAId}:${event.polityBId}`}`;
  if (type === 'settlement.conquered' || type === 'settlement.rebelled') return `${type}:${event.settlementId ?? 'unknown'}`;
  if (type.startsWith('polity.')) return `${type}:${event.polityId ?? 'unknown'}`;
  return `${type}:${event.id ?? 'unknown'}`;
}

function storyGroup(type) {
  if (type === 'god.meteor' || type === 'god.rain') return 'intervention';
  if (type === 'settlement.conquered' || type === 'settlement.rebelled') return 'outcome';
  if (type === 'polity.war_started' || type === 'polity.peace_made') return 'diplomacy';
  if (type === 'warband.engaged' || type === 'warband.destroyed') return 'battle';
  if (type === 'polity.founded' || type === 'polity.dissolved') return 'polity';
  if (type.startsWith('polity.ruler_')) return 'ruler';
  if (type.startsWith('warband.')) return 'army';
  return 'other';
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
