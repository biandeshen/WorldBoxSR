import { resolveEventReferences } from '../../engine/analysis/history_query.js';
import { chronicleEntryForEvent } from './civilization_story.js';

export function eventCardForEvent(world, event) {
  if (!world || !Array.isArray(world.history)) throw new TypeError('world.history is required');
  if (!event || !Number.isInteger(event.id)) throw new TypeError('retained event is required');

  const entry = chronicleEntryForEvent(world, event);
  const resolved = resolveEventReferences(world, event);
  return {
    eventId: event.id,
    eventType: event.type,
    year: entry.year,
    icon: entry.icon,
    headline: entry.headline,
    detail: entry.detail,
    provenance: `event #${event.id} · ${event.type}`,
    subject: resolved.subject ? referenceRow(world, resolved.subject) : null,
    causes: resolved.causes.map((resolution) => referenceRow(world, resolution))
  };
}

export function referenceRow(world, resolution) {
  if (!resolution || typeof resolution !== 'object' || !resolution.reference) {
    throw new TypeError('reference resolution is required');
  }

  const reference = resolution.reference;
  if (resolution.status === 'unresolved') {
    return {
      status: 'unresolved',
      reference,
      label: unresolvedReferenceLabel(reference),
      note: unresolvedReasonLabel(resolution.reason),
      navigation: null
    };
  }

  return {
    status: 'resolved',
    reference,
    label: resolvedReferenceLabel(world, reference, resolution.value),
    note: resolvedReferenceNote(world, reference, resolution.value),
    navigation: navigationForResolvedReference(world, reference, resolution.value)
  };
}

export function navigationForResolvedReference(world, reference, value) {
  if (reference.kind === 'event') {
    return { kind: 'event', eventId: reference.id };
  }
  if (reference.kind !== 'entity') return null;

  if (reference.entityKind === 'polity') {
    const capital = world.settlements?.find((settlement) => settlement.id === value.capitalSettlementId) ?? null;
    if (!capital || !Number.isInteger(capital.x) || !Number.isInteger(capital.y)) return null;
    return {
      kind: 'map',
      entityKind: 'polity',
      entityId: reference.id,
      x: capital.x,
      y: capital.y,
      label: `Capital · ${capital.name ?? `Settlement #${capital.id}`}`
    };
  }

  if (['human', 'creature', 'settlement', 'warband'].includes(reference.entityKind)
    && Number.isInteger(value?.x) && Number.isInteger(value?.y)) {
    return {
      kind: 'map',
      entityKind: reference.entityKind,
      entityId: reference.id,
      x: value.x,
      y: value.y,
      label: 'Show on map'
    };
  }
  return null;
}

function resolvedReferenceLabel(world, reference, value) {
  if (reference.kind === 'world') return 'World';
  if (reference.kind === 'event') {
    const entry = chronicleEntryForEvent(world, value);
    return `Event #${reference.id} · ${entry.headline}`;
  }
  if (reference.kind !== 'entity') return 'Recorded reference';

  switch (reference.entityKind) {
    case 'human':
      return `Human #${reference.id}`;
    case 'creature':
      return `${capitalize(value?.species ?? 'Creature')} #${reference.id}`;
    case 'settlement':
      return value?.name ?? `Settlement #${reference.id}`;
    case 'polity':
      return value?.name ?? `Polity #${reference.id}`;
    case 'warband': {
      const polity = world.polities?.find((candidate) => candidate.id === value?.polityId);
      return `Warband #${reference.id}${polity?.name ? ` · ${polity.name}` : ''}`;
    }
    case 'lineage':
      return `Lineage #${reference.id}`;
    case 'parental_union':
      return `Parental union #${reference.id}`;
    default:
      return `${capitalize(reference.entityKind)} #${reference.id}`;
  }
}

function resolvedReferenceNote(world, reference, value) {
  if (reference.kind === 'event') {
    const entry = chronicleEntryForEvent(world, value);
    return Number.isFinite(entry.year) ? `Recorded year ${entry.year.toFixed(2)}` : 'Retained event';
  }
  if (reference.kind !== 'entity') return null;
  if (reference.entityKind === 'polity') {
    const capital = world.settlements?.find((settlement) => settlement.id === value?.capitalSettlementId) ?? null;
    return capital ? `Current capital: ${capital.name ?? `Settlement #${capital.id}`}` : 'No current map destination';
  }
  if (reference.entityKind === 'warband') {
    return `${value?.active ? 'active' : 'ended'} · strength ${value?.strength ?? '?'}`;
  }
  if (reference.entityKind === 'settlement') {
    return `${value?.active ? 'active' : 'inactive'} settlement`;
  }
  return null;
}

function unresolvedReferenceLabel(reference) {
  switch (reference.kind) {
    case 'command':
      return `Command #${reference.id} · ${reference.commandType}`;
    case 'event':
      return `Event #${reference.id}`;
    case 'entity':
      return `${capitalize(reference.entityKind)} #${reference.id}`;
    default:
      return 'Unavailable reference';
  }
}

function unresolvedReasonLabel(reason) {
  switch (reason) {
    case 'command_log_not_retained':
      return 'Command identity recorded; command log not retained';
    case 'event_not_retained':
      return 'Referenced event is no longer retained';
    case 'entity_not_currently_present':
      return 'Referenced entity is not currently present';
    default:
      return 'Reference unavailable';
  }
}

function capitalize(value) {
  const text = String(value).replaceAll('_', ' ');
  return text.length ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}
