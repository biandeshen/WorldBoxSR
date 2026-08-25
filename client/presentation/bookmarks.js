import { resolveHistoryReference } from '../../engine/analysis/history_query.js';
import { referenceRow } from './event_card.js';

export const BOOKMARK_LIMIT = 6;
export const BOOKMARK_STORAGE_KEY = 'worldboxsr.v0.5.bookmarks';

export function bookmarkKey(reference) {
  validateBookmarkReference(reference);
  if (reference.kind === 'event') return `event:${reference.id}`;
  return `${reference.entityKind}:${reference.id}`;
}

export function normalizeBookmarkReference(reference) {
  validateBookmarkReference(reference);
  return reference.kind === 'event'
    ? { kind: 'event', id: reference.id }
    : { kind: 'entity', entityKind: reference.entityKind, id: reference.id };
}

export function toggleBookmark(bookmarks, reference, { limit = BOOKMARK_LIMIT } = {}) {
  if (!Array.isArray(bookmarks)) throw new TypeError('bookmarks must be an array');
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('bookmark limit must be a positive integer');
  const normalized = normalizeBookmarkReference(reference);
  const key = bookmarkKey(normalized);
  const index = bookmarks.findIndex((candidate) => bookmarkKey(candidate) === key);
  if (index >= 0) return { bookmarks: bookmarks.filter((_, candidateIndex) => candidateIndex !== index), action: 'removed', key };
  if (bookmarks.length >= limit) return { bookmarks: [...bookmarks], action: 'limit', key };
  return { bookmarks: [...bookmarks, normalized], action: 'added', key };
}

export function bookmarkProjection(world, bookmarks) {
  if (!world || !Array.isArray(world.history)) throw new TypeError('world.history is required');
  if (!Array.isArray(bookmarks)) throw new TypeError('bookmarks must be an array');
  return bookmarks.slice(0, BOOKMARK_LIMIT).map((reference) => {
    const normalized = normalizeBookmarkReference(reference);
    const resolution = resolveHistoryReference(world, normalized);
    const row = referenceRow(world, resolution);
    return {
      key: bookmarkKey(normalized),
      reference: normalized,
      status: row.status,
      label: row.label,
      note: row.note,
      navigation: row.navigation
    };
  });
}

export function loadBookmarks(storage) {
  if (!storage?.getItem) return [];
  try {
    const parsed = JSON.parse(storage.getItem(BOOKMARK_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const result = [];
    const seen = new Set();
    for (const reference of parsed) {
      try {
        const normalized = normalizeBookmarkReference(reference);
        const key = bookmarkKey(normalized);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= BOOKMARK_LIMIT) break;
      } catch {}
    }
    return result;
  } catch {
    return [];
  }
}

export function saveBookmarks(storage, bookmarks) {
  if (!storage?.setItem) return false;
  const normalized = bookmarks.slice(0, BOOKMARK_LIMIT).map(normalizeBookmarkReference);
  try {
    storage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

function validateBookmarkReference(reference) {
  if (!reference || typeof reference !== 'object') throw new TypeError('bookmark reference must be an object');
  if (reference.kind === 'event') {
    positiveInteger(reference.id, 'event bookmark id');
    return;
  }
  if (reference.kind === 'entity') {
    if (!['human', 'creature', 'settlement', 'polity', 'warband'].includes(reference.entityKind)) {
      throw new TypeError(`unsupported bookmark entity kind: ${reference.entityKind}`);
    }
    positiveInteger(reference.id, 'entity bookmark id');
    return;
  }
  throw new TypeError(`unsupported bookmark reference kind: ${reference.kind}`);
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}
