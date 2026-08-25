import { historyForReference, resolveHistoryReference } from '../../engine/analysis/history_query.js';
import { chronicleEntryForEvent } from './civilization_story.js';
import { referenceRow } from './event_card.js';

export const STORY_TRAIL_LIMIT = 8;
const SUPPORTED_ENTITY_KINDS = new Set(['human', 'creature', 'settlement', 'polity', 'warband']);

export function isSupportedStoryFocus(reference) {
  if (!reference || typeof reference !== 'object') return false;
  if (reference.kind === 'event') return Number.isInteger(reference.id) && reference.id > 0;
  return reference.kind === 'entity'
    && SUPPORTED_ENTITY_KINDS.has(reference.entityKind)
    && Number.isInteger(reference.id)
    && reference.id > 0;
}

export function storyTrailForFocus(world, reference, { limit = STORY_TRAIL_LIMIT } = {}) {
  if (!world || !Array.isArray(world.history)) throw new TypeError('world.history is required');
  if (!isSupportedStoryFocus(reference)) throw new RangeError('unsupported story focus reference');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError('story trail limit must be an integer from 1 to 50');

  const canonicalReference = canonicalFocusReference(reference);
  const resolution = resolveHistoryReference(world, canonicalReference);
  const focus = referenceRow(world, resolution);
  const events = historyForReference(world, canonicalReference, { order: 'oldest', limit });
    
  return {
    reference: canonicalReference,
    focus,
    count: events.length,
    limit,
    entries: events.map((event) => {
      const entry = chronicleEntryForEvent(world, event);
      return {
        eventId: event.id,
        eventType: event.type,
        year: entry.year,
        icon: entry.icon,
        headline: entry.headline,
        detail: entry.detail
      };
    })
  };
}

export function canonicalFocusReference(reference) {
  if (!isSupportedStoryFocus(reference)) throw new RangeError('unsupported story focus reference');
  if (reference.kind === 'event') return { kind: 'event', id: reference.id };
  return { kind: 'entity', entityKind: reference.entityKind, id: reference.id };
}
