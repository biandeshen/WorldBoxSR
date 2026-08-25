import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/event_card_runtime.js', import.meta.url));
const cardPath = fileURLToPath(new URL('../client/presentation/event_card.js', import.meta.url));
const trailPath = fileURLToPath(new URL('../client/presentation/story_trail.js', import.meta.url));
const bookmarksPath = fileURLToPath(new URL('../client/presentation/bookmarks.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/event_card.css', import.meta.url));
const bookmarksCssPath = fileURLToPath(new URL('../client/bookmarks.css', import.meta.url));

test('Event Card runtime loads after Phaser bootstrap and owns only presentation navigation/focus/watchlist', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');
  const bootstrapIndex = html.indexOf('./bootstrap.js');
  const eventCardIndex = html.indexOf('./presentation/event_card_runtime.js');

  assert.ok(bootstrapIndex >= 0);
  assert.ok(eventCardIndex > bootstrapIndex);
  assert.match(html, /event_card\.css/);
  assert.match(html, /bookmarks\.css/);
  assert.match(runtime, /data-event-card-nav/);
  assert.match(runtime, /data-event-card-follow/);
  assert.match(runtime, /data-event-card-bookmark/);
  assert.match(runtime, /data-story-trail-event-id/);
  assert.match(runtime, /data-story-trail-clear/);
  assert.match(runtime, /data-watchlist-unpin/);
  assert.match(runtime, /data-watchlist-clear/);
  assert.match(runtime, /sessionStorage/);
  assert.match(runtime, /centerOn/);
  assert.match(runtime, /storyTrailForFocus/);
  assert.match(runtime, /bookmarkProjection/);
  assert.match(runtime, /focusedReference/);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent|createWorld|world\.history\.(push|splice)/);
});

test('Event Card projector is a pure query/presentation layer over history resolution', () => {
  const card = readFileSync(cardPath, 'utf8');
  assert.match(card, /resolveEventReferences/);
  assert.match(card, /chronicleEntryForEvent/);
  assert.match(card, /navigationForResolvedReference/);
  assert.doesNotMatch(card, /applyCommand|tickWorld|pushEvent|createWorld/);
});

test('Focused story projector uses only exact history reference queries', () => {
  const trail = readFileSync(trailPath, 'utf8');
  assert.match(trail, /historyForReference/);
  assert.match(trail, /resolveHistoryReference/);
  assert.match(trail, /chronicleEntryForEvent/);
  assert.match(trail, /STORY_TRAIL_LIMIT = 8/);
  assert.doesNotMatch(trail, /applyCommand|tickWorld|pushEvent|createWorld|Math\.random/);
});

test('Watchlist store is bounded session presentation state that re-resolves authority', () => {
  const bookmarks = readFileSync(bookmarksPath, 'utf8');
  assert.match(bookmarks, /BOOKMARK_LIMIT = 6/);
  assert.match(bookmarks, /BOOKMARK_STORAGE_KEY/);
  assert.match(bookmarks, /resolveHistoryReference/);
  assert.match(bookmarks, /bookmarkProjection/);
  assert.match(bookmarks, /loadBookmarks/);
  assert.match(bookmarks, /saveBookmarks/);
  assert.doesNotMatch(bookmarks, /localStorage|applyCommand|tickWorld|pushEvent|createWorld|Math\.random/);
});

test('story styles expose reference, focused trail, and compact Watchlist states', () => {
  const css = readFileSync(cssPath, 'utf8');
  const bookmarksCss = readFileSync(bookmarksCssPath, 'utf8');
  assert.match(css, /\.event-card/);
  assert.match(css, /event-card-ref\[data-status="unresolved"\]/);
  assert.match(css, /event-card-action/);
  assert.match(css, /#story-trail/);
  assert.match(css, /\.story-trail-event/);
  assert.match(css, /\.event-card-follow/);
  assert.match(bookmarksCss, /#story-watchlist/);
  assert.match(bookmarksCss, /\.watchlist-row\[data-status="unresolved"\]/);
  assert.match(bookmarksCss, /\.event-card-bookmark\[aria-pressed="true"\]/);
});
