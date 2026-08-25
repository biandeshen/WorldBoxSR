import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKMARK_LIMIT,
  BOOKMARK_STORAGE_KEY,
  bookmarkKey,
  bookmarkProjection,
  loadBookmarks,
  saveBookmarks,
  toggleBookmark
} from '../client/presentation/bookmarks.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { entityRef, eventRef, pushEvent } from '../engine/model/events.js';

test('Watchlist toggles exact stable refs, deduplicates by key, and enforces a six-item cap', () => {
  let bookmarks = [];
  for (let id = 1; id <= BOOKMARK_LIMIT; id += 1) {
    const result = toggleBookmark(bookmarks, eventRef(id));
    assert.equal(result.action, 'added');
    bookmarks = result.bookmarks;
  }
  assert.equal(bookmarks.length, BOOKMARK_LIMIT);
  assert.deepEqual(bookmarks.map(bookmarkKey), ['event:1', 'event:2', 'event:3', 'event:4', 'event:5', 'event:6']);

  const blocked = toggleBookmark(bookmarks, eventRef(7));
  assert.equal(blocked.action, 'limit');
  assert.deepEqual(blocked.bookmarks, bookmarks);

  const removed = toggleBookmark(bookmarks, eventRef(3));
  assert.equal(removed.action, 'removed');
  assert.equal(removed.bookmarks.some((reference) => bookmarkKey(reference) === 'event:3'), false);

  const readded = toggleBookmark(removed.bookmarks, entityRef('polity', 3));
  assert.equal(readded.action, 'added');
  assert.equal(readded.bookmarks.at(-1).entityKind, 'polity');
});

test('session storage roundtrip is stable while corrupt, duplicate, unsupported and over-cap entries are ignored', () => {
  const storage = fakeStorage();
  const bookmarks = [eventRef(2), entityRef('human', 7), entityRef('polity', 4)];
  assert.equal(saveBookmarks(storage, bookmarks), true);
  assert.deepEqual(loadBookmarks(storage), bookmarks);

  storage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify([
    eventRef(2),
    eventRef(2),
    entityRef('human', 7),
    { kind: 'entity', entityKind: 'lineage', id: 9 },
    { kind: 'command', id: 1, commandType: 'test' },
    eventRef(3), eventRef(4), eventRef(5), eventRef(6), eventRef(7), eventRef(8)
  ]));
  const sanitized = loadBookmarks(storage);
  assert.equal(sanitized.length, BOOKMARK_LIMIT);
  assert.deepEqual(sanitized.map(bookmarkKey), ['event:2', 'human:7', 'event:3', 'event:4', 'event:5', 'event:6']);

  storage.setItem(BOOKMARK_STORAGE_KEY, '{not json');
  assert.deepEqual(loadBookmarks(storage), []);
});

test('Watchlist re-resolves current authority instead of freezing entity availability', () => {
  const world = createWorld({ seed: 301, width: 8, height: 8, population: 1 });
  const references = [eventRef(1), entityRef('human', 1)];

  let rows = bookmarkProjection(world, references);
  assert.equal(rows[0].status, 'resolved');
  assert.equal(rows[0].navigation.kind, 'event');
  assert.equal(rows[1].status, 'resolved');
  assert.equal(rows[1].navigation.kind, 'map');

  world.entities = [];
  rows = bookmarkProjection(world, references);
  assert.equal(rows[0].status, 'resolved', 'retained event remains openable');
  assert.equal(rows[1].status, 'unresolved', 'removed entity remains pinned but unavailable');
  assert.equal(rows[1].navigation, null);
  assert.match(rows[1].note, /not currently present/i);
});

test('an evicted event remains pinned as a truthful unavailable stable reference', () => {
  const world = createWorld({ seed: 302, width: 8, height: 8, population: 0, config: { maxEventHistory: 2 } });
  const original = world.history[0];
  pushEvent(world, { type: 'test.one' });
  pushEvent(world, { type: 'test.two' });
  pushEvent(world, { type: 'test.three' });
  assert.equal(world.history.some((event) => event.id === original.id), false);

  const [row] = bookmarkProjection(world, [eventRef(original.id)]);
  assert.equal(row.key, `event:${original.id}`);
  assert.equal(row.status, 'unresolved');
  assert.equal(row.navigation, null);
  assert.match(row.note, /no longer retained/i);
});

test('bookmark projection and storage helpers do not mutate world snapshots or consume RNG', () => {
  const world = createWorld({ seed: 303, width: 8, height: 8, population: 2 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const storage = fakeStorage();
  let bookmarks = [];
  bookmarks = toggleBookmark(bookmarks, eventRef(1)).bookmarks;
  bookmarks = toggleBookmark(bookmarks, entityRef('human', 1)).bookmarks;
  saveBookmarks(storage, bookmarks);
  const loaded = loadBookmarks(storage);
  bookmarkProjection(world, loaded);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});

test('bookmark validation rejects unsupported reference kinds without widening story scope', () => {
  assert.throws(() => toggleBookmark([], { kind: 'world' }), /unsupported bookmark reference kind/);
  assert.throws(() => toggleBookmark([], entityRef('lineage', 1)), /unsupported bookmark entity kind/);
  assert.throws(() => toggleBookmark([], { kind: 'entity', entityKind: 'human', id: 0 }), /positive integer/);
});

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}
