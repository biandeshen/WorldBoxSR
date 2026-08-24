import { historyCursor, projectHistoryPulse } from './world_event_pulse.js';

const POLL_MS = 900;
const CARD_LIFETIME_MS = 3600;
const MAX_VISIBLE = 3;
const MAX_BATCH_EVENTS = 120;

const host = document.querySelector('#world-event-pulse');
const bootStatus = document.querySelector('#boot-status');
let scene = null;
let observedWorld = null;
let lastEventId = 0;
let lastPollAt = -Infinity;
let ready = false;
let attachTimer = null;

attachWhenReady();

function attachWhenReady() {
  const game = globalThis.__PHASER_GAME__;
  const candidate = game?.scene?.getScene?.('world');
  if (!candidate?.world || !candidate?.events) {
    attachTimer = window.setTimeout(attachWhenReady, 30);
    return;
  }

  scene = candidate;
  observedWorld = scene.world;
  lastEventId = historyCursor(observedWorld.history);
  scene.events.on('update', pollHistory);
}

function pollHistory(time) {
  if (!scene?.world || !host) return;
  if (scene.world !== observedWorld) resetCursor(scene.world);

  const showcaseReady = bootStatus?.textContent?.includes('showcase ready');
  if (!ready) {
    if (!showcaseReady) return;
    ready = true;
    lastEventId = historyCursor(scene.world.history);
    lastPollAt = time;
    return;
  }

  if (!showcaseReady) {
    ready = false;
    return;
  }
  if (time - lastPollAt < POLL_MS) return;
  lastPollAt = time;

  const history = scene.world.history || [];
  const fresh = history
    .filter((event) => Number.isInteger(event?.id) && event.id > lastEventId)
    .slice(-MAX_BATCH_EVENTS);
  lastEventId = historyCursor(history);
  if (fresh.length === 0) return;

  const cards = projectHistoryPulse(fresh, { daysPerYear: scene.world.config.daysPerYear });
  for (const card of cards) showCard(card);
}

function resetCursor(world) {
  observedWorld = world;
  lastEventId = historyCursor(world?.history || []);
  ready = false;
  host?.replaceChildren();
}

function showCard(card) {
  const element = document.createElement('article');
  element.className = 'world-event-card';
  element.dataset.tone = card.tone;
  element.innerHTML = [
    `<span class="world-event-icon" aria-hidden="true">${escapeHtml(card.icon)}</span>`,
    '<span class="world-event-copy">',
    `<strong>${escapeHtml(card.title)}</strong>`,
    `<small>${escapeHtml(card.detail)}</small>`,
    '</span>'
  ].join('');

  host.prepend(element);
  while (host.children.length > MAX_VISIBLE) host.lastElementChild?.remove();

  const timer = window.setTimeout(() => {
    element.dataset.leaving = 'true';
    window.setTimeout(() => element.remove(), 220);
  }, CARD_LIFETIME_MS);
  element.addEventListener('click', () => {
    window.clearTimeout(timer);
    element.remove();
  }, { once: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
