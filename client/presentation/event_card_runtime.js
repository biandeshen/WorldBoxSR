import { findHistoryEvent, resolveHistoryReference } from '../../engine/analysis/history_query.js';
import { eventCardForEvent } from './event_card.js';
import { isSupportedStoryFocus, storyTrailForFocus } from './story_trail.js';
import {
  BOOKMARK_LIMIT,
  bookmarkKey,
  bookmarkProjection,
  loadBookmarks,
  saveBookmarks,
  toggleBookmark
} from './bookmarks.js';

const TILE_SIZE = 28;
const historyList = document.querySelector('#history-list');
const historyDetail = document.querySelector('#history-detail');
const inspector = document.querySelector('#inspector');
const resetButton = document.querySelector('#reset');
const storyTrail = ensureStoryTrailContainer();
const storyWatchlist = ensureWatchlistContainer();
let focusedReference = null;
let bookmarks = loadBookmarks(safeSessionStorage());
let watchlistNotice = '';

historyList?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-event-id]');
  if (!button) return;
  const eventId = Number(button.dataset.eventId);
  if (!Number.isInteger(eventId)) return;
  queueMicrotask(() => renderEventCard(eventId));
});

historyDetail?.addEventListener('click', (event) => {
  const bookmark = event.target.closest('button[data-event-card-bookmark]');
  if (bookmark) {
    const reference = referenceFromDataset(bookmark.dataset);
    if (reference) toggleBookmarkReference(reference);
    return;
  }

  const follow = event.target.closest('button[data-event-card-follow]');
  if (follow) {
    const reference = referenceFromDataset(follow.dataset);
    if (reference) setStoryFocus(reference);
    return;
  }

  const button = event.target.closest('button[data-event-card-nav]');
  if (!button) return;
  const kind = button.dataset.eventCardNav;
  if (kind === 'event') {
    const eventId = Number(button.dataset.eventId);
    if (Number.isInteger(eventId)) renderEventCard(eventId);
    return;
  }
  if (kind === 'map') navigateMapReference(button);
});

storyTrail?.addEventListener('click', (event) => {
  const clear = event.target.closest('button[data-story-trail-clear]');
  if (clear) {
    clearStoryFocus();
    return;
  }

  const map = event.target.closest('button[data-story-trail-map]');
  if (map) {
    navigateMapReference(map);
    return;
  }

  const row = event.target.closest('button[data-story-trail-event-id]');
  if (!row) return;
  const eventId = Number(row.dataset.storyTrailEventId);
  if (Number.isInteger(eventId)) renderEventCard(eventId);
});

storyWatchlist?.addEventListener('click', (event) => {
  const clear = event.target.closest('button[data-watchlist-clear]');
  if (clear) {
    bookmarks = [];
    watchlistNotice = '';
    persistBookmarks();
    renderWatchlist();
    refreshCurrentEventCard();
    return;
  }

  const unpin = event.target.closest('button[data-watchlist-unpin]');
  if (unpin) {
    const reference = referenceFromDataset(unpin.dataset);
    if (reference) toggleBookmarkReference(reference);
    return;
  }

  const follow = event.target.closest('button[data-watchlist-follow]');
  if (follow) {
    const reference = referenceFromDataset(follow.dataset);
    if (reference) setStoryFocus(reference);
    return;
  }

  const open = event.target.closest('button[data-watchlist-open-event]');
  if (open) {
    const eventId = Number(open.dataset.eventId);
    if (Number.isInteger(eventId)) renderEventCard(eventId);
    return;
  }

  const map = event.target.closest('button[data-watchlist-map]');
  if (map) navigateMapReference(map);
});

resetButton?.addEventListener('click', () => {
  clearStoryFocus();
  if (storyWatchlist) storyWatchlist.hidden = true;
  waitForWorldThenRenderWatchlist();
});

renderWatchlist();
if (bookmarks.length > 0 && !worldReady()) waitForWorldThenRenderWatchlist();

export function renderEventCard(eventId) {
  const scene = worldScene();
  if (!scene?.world || !historyDetail) return false;
  const selectedEvent = findHistoryEvent(scene.world, eventId);
  if (!selectedEvent) {
    historyDetail.textContent = `Event #${eventId}\nnot retained in bounded world history`;
    delete historyDetail.dataset.eventCardId;
    renderWatchlist();
    return false;
  }
  const card = eventCardForEvent(scene.world, selectedEvent);
  historyDetail.innerHTML = eventCardHtml(card);
  historyDetail.dataset.eventCardId = String(card.eventId);
  renderWatchlist();
  return true;
}

export function setStoryFocus(reference) {
  const scene = worldScene();
  if (!scene?.world || !storyTrail || !isSupportedStoryFocus(reference)) return false;
  const trail = storyTrailForFocus(scene.world, reference);
  focusedReference = trail.reference;
  storyTrail.innerHTML = storyTrailHtml(trail);
  storyTrail.hidden = false;
  storyTrail.dataset.storyFocus = serializedReferenceKey(trail.reference);
  return true;
}

export function clearStoryFocus() {
  focusedReference = null;
  if (!storyTrail) return;
  storyTrail.replaceChildren();
  storyTrail.hidden = true;
  delete storyTrail.dataset.storyFocus;
}

export function currentStoryFocus() {
  return focusedReference ? structuredClone(focusedReference) : null;
}

export function currentBookmarks() {
  return bookmarks.map((reference) => structuredClone(reference));
}

function toggleBookmarkReference(reference) {
  const result = toggleBookmark(bookmarks, reference);
  if (result.action === 'limit') {
    watchlistNotice = `Watchlist full · ${BOOKMARK_LIMIT}/${BOOKMARK_LIMIT}`;
  } else {
    bookmarks = result.bookmarks;
    watchlistNotice = result.action === 'added' ? 'Pinned to Watchlist' : '';
    persistBookmarks();
  }
  renderWatchlist();
  refreshCurrentEventCard();
}

function persistBookmarks() {
  saveBookmarks(safeSessionStorage(), bookmarks);
}

function renderWatchlist() {
  const scene = worldScene();
  if (!storyWatchlist) return false;
  if (!scene?.world || scene.booting !== false) {
    storyWatchlist.hidden = true;
    return false;
  }

  const entries = bookmarkProjection(scene.world, bookmarks);
  storyWatchlist.innerHTML = watchlistHtml(entries);
  storyWatchlist.hidden = entries.length === 0;
  storyWatchlist.dataset.watchlistCount = String(entries.length);
  return true;
}

function waitForWorldThenRenderWatchlist(attempt = 0) {
  if (worldReady()) {
    renderWatchlist();
    return;
  }
  if (attempt >= 300) return;
  globalThis.setTimeout?.(() => waitForWorldThenRenderWatchlist(attempt + 1), 100);
}

function worldReady() {
  const scene = worldScene();
  return Boolean(scene?.world && scene.booting === false);
}

function refreshCurrentEventCard() {
  const eventId = Number(historyDetail?.dataset?.eventCardId);
  if (Number.isInteger(eventId)) renderEventCard(eventId);
}

function navigateMapReference(button) {
  const scene = worldScene();
  if (!scene?.world) return;
  const x = Number(button.dataset.x);
  const y = Number(button.dataset.y);
  const entityKind = button.dataset.entityKind;
  const entityId = Number(button.dataset.entityId);
  if (![x, y, entityId].every(Number.isInteger) || !entityKind) return;

  scene.cameras?.main?.centerOn?.((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE);
  if (inspector) inspector.textContent = describeResolvedEntity(scene.world, entityKind, entityId, x, y);
  pulseNavigationMarker(scene, x, y);
}

function eventCardHtml(card) {
  const eventReference = { kind: 'event', id: card.eventId };
  return `<article class="event-card" data-card-event-id="${card.eventId}">
    <header class="event-card-header">
      <div class="event-card-kicker">Year ${formatYear(card.year)} · ${escapeHtml(card.provenance)}</div>
      <strong>${escapeHtml(card.icon)} ${escapeHtml(card.headline)}</strong>
      <p>${escapeHtml(card.detail)}</p>
      <div class="event-card-toolbar">${followButtonHtml(eventReference, 'Follow this event')}${bookmarkButtonHtml(eventReference)}</div>
    </header>
    ${card.subject ? referenceSection('Subject', [card.subject]) : ''}
    ${referenceSection('Causes', card.causes, 'No recorded causes')}
  </article>`;
}

function referenceSection(title, rows, emptyLabel = 'None') {
  const content = rows.length
    ? rows.map(referenceRowHtml).join('')
    : `<div class="event-card-empty">${escapeHtml(emptyLabel)}</div>`;
  return `<section class="event-card-section"><span class="event-card-section-title">${escapeHtml(title)}</span>${content}</section>`;
}

function referenceRowHtml(row) {
  const status = row.status === 'resolved' ? 'resolved' : 'unresolved';
  const note = row.note ? `<small>${escapeHtml(row.note)}</small>` : '';
  const statusLabel = status === 'resolved' ? 'resolved' : 'unavailable';
  const body = `<span><b>${escapeHtml(row.label)}</b>${note}</span><em>${statusLabel}</em>`;
  const primary = referencePrimaryHtml(row, status, body);
  const follow = isSupportedStoryFocus(row.reference) ? followButtonHtml(row.reference, 'Follow story') : '';
  const bookmark = isBookmarkableReference(row.reference) ? bookmarkButtonHtml(row.reference) : '';
  return `<div class="event-card-ref-shell">${primary}${follow || bookmark ? `<div class="event-card-secondary-actions">${follow}${bookmark}</div>` : ''}</div>`;
}

function referencePrimaryHtml(row, status, body) {
  if (!row.navigation) return `<div class="event-card-ref" data-status="${status}">${body}</div>`;
  if (row.navigation.kind === 'event') {
    return `<button class="event-card-ref" data-status="${status}" data-event-card-nav="event" data-event-id="${row.navigation.eventId}" type="button">${body}<span class="event-card-action">Open event →</span></button>`;
  }
  return `<button class="event-card-ref" data-status="${status}" data-event-card-nav="map" data-entity-kind="${escapeHtml(row.navigation.entityKind)}" data-entity-id="${row.navigation.entityId}" data-x="${row.navigation.x}" data-y="${row.navigation.y}" type="button">${body}<span class="event-card-action">${escapeHtml(row.navigation.label)} →</span></button>`;
}

function followButtonHtml(reference, label) {
  const attrs = referenceDataAttributes(reference);
  if (!attrs || !isSupportedStoryFocus(reference)) return '';
  return `<button class="event-card-follow" data-event-card-follow type="button" ${attrs}>${escapeHtml(label)}</button>`;
}

function bookmarkButtonHtml(reference) {
  const attrs = referenceDataAttributes(reference);
  if (!attrs || !isBookmarkableReference(reference)) return '';
  const pinned = bookmarks.some((candidate) => bookmarkKey(candidate) === bookmarkKey(reference));
  return `<button class="event-card-bookmark" data-event-card-bookmark type="button" ${attrs} aria-pressed="${pinned ? 'true' : 'false'}">${pinned ? 'Unpin' : 'Pin'}</button>`;
}

function storyTrailHtml(trail) {
  const focus = trail.focus;
  const mapAction = focus.navigation?.kind === 'map'
    ? `<button class="story-trail-map" data-story-trail-map data-entity-kind="${escapeHtml(focus.navigation.entityKind)}" data-entity-id="${focus.navigation.entityId}" data-x="${focus.navigation.x}" data-y="${focus.navigation.y}" type="button">${escapeHtml(focus.navigation.label)}</button>`
    : '';
  const status = focus.status === 'resolved' ? 'resolved' : 'unavailable';
  const note = focus.note ? `<small>${escapeHtml(focus.note)}</small>` : '';
  const rows = trail.entries.length
    ? trail.entries.map((entry) => `<button class="story-trail-event" data-story-trail-event-id="${entry.eventId}" type="button"><span>Y${formatTrailYear(entry.year)} · ${escapeHtml(entry.icon)} ${escapeHtml(entry.headline)}</span><small>${escapeHtml(entry.eventType)} · event #${entry.eventId}</small></button>`).join('')
    : '<div class="story-trail-empty">No retained events explicitly reference this focus.</div>';

  return `<aside class="story-trail-card">
    <header class="story-trail-header">
      <div><span>Following story</span><strong>${escapeHtml(focus.label)}</strong>${note}</div>
      <em>${status} · ${trail.count}/${trail.limit} retained</em>
      <div class="story-trail-actions">${mapAction}<button data-story-trail-clear type="button">Clear</button></div>
    </header>
    <div class="story-trail-list">${rows}</div>
  </aside>`;
}

function watchlistHtml(entries) {
  const rows = entries.map((entry) => watchlistRowHtml(entry)).join('');
  const notice = watchlistNotice ? `<span class="watchlist-notice">${escapeHtml(watchlistNotice)}</span>` : '';
  return `<aside class="watchlist-card">
    <header class="watchlist-header">
      <div><span>Watchlist</span><strong>${entries.length}/${BOOKMARK_LIMIT} pinned</strong></div>
      <div class="watchlist-header-actions">${notice}<button data-watchlist-clear type="button">Clear all</button></div>
    </header>
    <div class="watchlist-list">${rows}</div>
  </aside>`;
}

function watchlistRowHtml(entry) {
  const attrs = referenceDataAttributes(entry.reference);
  const status = entry.status === 'resolved' ? 'resolved' : 'unavailable';
  const note = entry.note ? `<small>${escapeHtml(entry.note)}</small>` : '';
  const actions = [];
  if (entry.navigation?.kind === 'event') {
    actions.push(`<button data-watchlist-open-event data-event-id="${entry.navigation.eventId}" type="button">Open</button>`);
  } else if (entry.navigation?.kind === 'map') {
    actions.push(`<button data-watchlist-map data-entity-kind="${escapeHtml(entry.navigation.entityKind)}" data-entity-id="${entry.navigation.entityId}" data-x="${entry.navigation.x}" data-y="${entry.navigation.y}" type="button">Map</button>`);
  }
  if (isSupportedStoryFocus(entry.reference)) actions.push(`<button data-watchlist-follow ${attrs} type="button">Follow</button>`);
  actions.push(`<button data-watchlist-unpin ${attrs} type="button">Unpin</button>`);

  return `<div class="watchlist-row" data-status="${entry.status}" data-bookmark-key="${escapeHtml(entry.key)}">
    <div><b>${escapeHtml(entry.label)}</b>${note}<em>${status}</em></div>
    <div class="watchlist-row-actions">${actions.join('')}</div>
  </div>`;
}

function referenceDataAttributes(reference) {
  if (!reference || !Number.isInteger(reference.id)) return null;
  if (reference.kind === 'event') return `data-ref-kind="event" data-ref-id="${reference.id}"`;
  if (reference.kind === 'entity' && reference.entityKind) {
    return `data-ref-kind="entity" data-ref-entity-kind="${escapeHtml(reference.entityKind)}" data-ref-id="${reference.id}"`;
  }
  return null;
}

function referenceFromDataset(dataset) {
  const id = Number(dataset.refId);
  if (!Number.isInteger(id) || id < 1) return null;
  if (dataset.refKind === 'event') return { kind: 'event', id };
  if (dataset.refKind === 'entity' && dataset.refEntityKind) {
    return { kind: 'entity', entityKind: dataset.refEntityKind, id };
  }
  return null;
}

function isBookmarkableReference(reference) {
  return reference?.kind === 'event' || (
    reference?.kind === 'entity' && ['human', 'creature', 'settlement', 'polity', 'warband'].includes(reference.entityKind)
  );
}

function serializedReferenceKey(reference) {
  return reference.kind === 'event' ? `event:${reference.id}` : `${reference.entityKind}:${reference.id}`;
}

function ensureStoryTrailContainer() {
  if (!historyDetail?.parentElement) return null;
  const existing = document.querySelector('#story-trail');
  if (existing) return existing;
  const element = document.createElement('div');
  element.id = 'story-trail';
  element.hidden = true;
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-label', 'focused story trail');
  historyDetail.insertAdjacentElement('afterend', element);
  return element;
}

function ensureWatchlistContainer() {
  if (!historyDetail?.parentElement) return null;
  const existing = document.querySelector('#story-watchlist');
  if (existing) return existing;
  const element = document.createElement('div');
  element.id = 'story-watchlist';
  element.hidden = true;
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-label', 'story watchlist');
  const anchor = document.querySelector('#story-trail') ?? historyDetail;
  anchor.insertAdjacentElement('afterend', element);
  return element;
}

function safeSessionStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function describeResolvedEntity(world, entityKind, entityId, x, y) {
  const resolution = resolveHistoryReference(world, { kind: 'entity', entityKind, id: entityId });
  if (resolution.status !== 'resolved') {
    return `${humanizeKind(entityKind)} #${entityId}\nreference is no longer currently present\ntile ${x},${y}`;
  }
  const value = resolution.value;
  switch (entityKind) {
    case 'human':
      return [`Human #${entityId}`, value.sex ? `${value.sex === 'F' ? 'female' : 'male'} · age ${(value.ageDays / world.config.daysPerYear).toFixed(1)}y` : '', `health ${percent(value.health)} · hunger ${percent(value.hunger)}`, `tile ${value.x},${value.y}`].filter(Boolean).join('\n');
    case 'creature':
      return [`${humanizeKind(value.species ?? 'creature')} #${entityId}`, `health ${percent(value.health)} · hunger ${percent(value.hunger)}`, `tile ${value.x},${value.y}`].join('\n');
    case 'settlement': {
      const polity = Number.isInteger(value.polityId) ? world.polities?.find((candidate) => candidate.id === value.polityId) : null;
      return [value.name ?? `Settlement #${entityId}`, `${value.active ? 'active' : 'inactive'} settlement · population ${value.population ?? '?'}`, polity ? polity.name : 'no polity', `center ${value.x},${value.y}`].join('\n');
    }
    case 'warband': {
      const polity = world.polities?.find((candidate) => candidate.id === value.polityId);
      return [`Warband #${entityId}`, polity?.name ?? `Polity #${value.polityId ?? '?'}`, `${value.active ? 'active' : 'ended'} · strength ${value.strength ?? '?'}`, `tile ${value.x},${value.y}`].join('\n');
    }
    case 'polity': {
      const capital = world.settlements?.find((settlement) => settlement.id === value.capitalSettlementId);
      return [value.name ?? `Polity #${entityId}`, value.active ? 'active polity' : 'dissolved polity', capital ? `capital ${capital.name}` : 'no current capital', `map focus ${x},${y}`].join('\n');
    }
    default:
      return `${humanizeKind(entityKind)} #${entityId}\nmap focus ${x},${y}`;
  }
}

function pulseNavigationMarker(scene, x, y) {
  if (!scene?.add?.circle) return;
  const marker = scene.add.circle((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, TILE_SIZE * 0.42, 0xffffff, 0.04)
    .setStrokeStyle(Math.max(2, TILE_SIZE * 0.08), 0xffe38b, 0.95)
    .setDepth(1100);
  scene.tweens?.add?.({
    targets: marker,
    alpha: 0,
    scale: 2.1,
    duration: prefersReducedMotion() ? 180 : 420,
    ease: 'Quad.Out',
    onComplete: () => marker.destroy()
  });
}

function worldScene() {
  return globalThis.__PHASER_GAME__?.scene?.getScene?.('world') ?? null;
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : '?';
}

function formatYear(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '?';
}

function formatTrailYear(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '?';
}

function humanizeKind(value) {
  const text = String(value).replaceAll('_', ' ');
  return text.replace(/\b\w/g, (match) => match.toUpperCase());
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
