import { clearStoryFocus } from './event_card_runtime.js';

const historyDetail = document.querySelector('#history-detail');
const inspector = document.querySelector('#inspector');
const watchlist = document.querySelector('#story-watchlist');

// Replay/Fork/import rematerialize a world rather than rewinding it. Any
// presentation that points into the previous world must therefore be cleared.
// Stable Watchlist refs are deliberately not removed from sessionStorage; the
// existing Event Card runtime will re-resolve them the next time it renders.
globalThis.addEventListener?.('worldboxsr:world-replaced', () => {
  clearStoryFocus();
  if (historyDetail) {
    historyDetail.textContent = 'Select an event';
    delete historyDetail.dataset.eventCardId;
  }
  if (inspector) inspector.textContent = 'Alt-click a tile or entity to inspect it.';
  if (watchlist) watchlist.hidden = true;
});
