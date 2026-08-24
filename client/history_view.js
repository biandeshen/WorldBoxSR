import {
  historyForCreature,
  historyForHuman,
  historyForSettlement,
  queryHistory,
  resolveEventReferences
} from '../engine/analysis/history_query.js';

export const DEFAULT_TIMELINE_LIMIT = 12;

export function timelineEvents(world, {
  scope = 'world',
  selection = null,
  order = 'newest',
  limit = DEFAULT_TIMELINE_LIMIT
} = {}) {
  if (scope === 'world') return queryHistory(world, { order, limit });
  if (scope !== 'selection') throw new RangeError('timeline scope must be world or selection');
  if (!selection || !Number.isInteger(selection.id)) return [];
  if (selection.kind === 'human') return historyForHuman(world, selection.id, { order, limit });
  if (selection.kind === 'creature') return historyForCreature(world, selection.id, { order, limit });
  if (selection.kind === 'settlement') return historyForSettlement(world, selection.id, { order, limit });
  return [];
}

export function timelineScopeLabel(scope, selection = null) {
  if (scope === 'world') return 'World history';
  if (!selection || !Number.isInteger(selection.id)) {
    return 'Selection history · select a human, creature, or settlement';
  }
  if (selection.kind === 'human') return `Human #${selection.id} history`;
  if (selection.kind === 'creature') return `Creature #${selection.id} history`;
  if (selection.kind === 'settlement') return `Settlement #${selection.id} history`;
  return 'Selection history · select a human, creature, or settlement';
}

export function formatHistoryEventLabel(event, daysPerYear) {
  requirePositiveFinite(daysPerYear, 'daysPerYear');
  return `#${event.id} · Y${(event.day / daysPerYear).toFixed(2)} · ${event.type}`;
}

export function formatHistoryEventDetail(world, event, daysPerYear) {
  requirePositiveFinite(daysPerYear, 'daysPerYear');
  if (!event || typeof event !== 'object') throw new TypeError('event must be an object');
  const references = resolveEventReferences(world, event);
  const lines = [
    `EVENT #${event.id}`,
    `type ${event.type}`,
    `day ${event.day} · year ${(event.day / daysPerYear).toFixed(2)}`,
    `subject ${references.subject ? formatReferenceResolution(references.subject, daysPerYear) : 'none'}`
  ];

  if (references.causes.length === 0) {
    lines.push('causes none');
  } else {
    lines.push('causes');
    for (const resolution of references.causes) {
      lines.push(`  - ${formatReferenceResolution(resolution, daysPerYear)}`);
    }
  }

  const payload = eventPayloadEntries(event);
  if (payload.length > 0) {
    lines.push('payload');
    for (const [key, value] of payload) lines.push(`  ${key}: ${formatValue(value)}`);
  }
  return lines.join('\n');
}

export function formatReferenceResolution(resolution, daysPerYear) {
  requirePositiveFinite(daysPerYear, 'daysPerYear');
  const reference = resolution.reference;
  const base = formatReference(reference);
  if (resolution.status !== 'resolved') return `${base} · ${resolution.reason}`;

  if (reference.kind === 'event') {
    return `${base} → ${resolution.value.type} @ Y${(resolution.value.day / daysPerYear).toFixed(2)}`;
  }
  if (reference.kind === 'entity') {
    const name = typeof resolution.value?.name === 'string' ? ` ${resolution.value.name}` : '';
    return `${base} → current${name}`;
  }
  return base;
}

export function formatReference(reference) {
  if (!reference) return 'none';
  switch (reference.kind) {
    case 'world':
      return 'world';
    case 'event':
      return `event #${reference.id}`;
    case 'entity':
      return `${reference.entityKind} #${reference.id}`;
    case 'command':
      return `command #${reference.id} ${reference.commandType}`;
    default:
      return `${reference.kind ?? 'unknown'} reference`;
  }
}

function eventPayloadEntries(event) {
  const excluded = new Set(['id', 'day', 'type', 'subject', 'causes']);
  return Object.entries(event).filter(([key]) => !excluded.has(key));
}

function formatValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function requirePositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be > 0`);
}
