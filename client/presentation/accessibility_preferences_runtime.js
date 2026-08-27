import {
  currentAccessibilityPreferences,
  initializeAccessibilityPreferences,
  setCurrentAccessibilityPreferences
} from './accessibility_preferences.js';

const reduceMotion = document.querySelector('#accessibility-reduce-motion');
const muteSound = document.querySelector('#accessibility-mute-sound');
const status = document.querySelector('#accessibility-preferences-status');
const systemMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;

if (reduceMotion && muteSound && status) {
  const loaded = initializeAccessibilityPreferences();
  reduceMotion.checked = loaded.preferences.reduceMotion;
  muteSound.checked = loaded.preferences.muteSound;
  renderStatus({ error: loaded.error, persisted: loaded.persisted, initial: true });

  reduceMotion.addEventListener('change', savePreferences);
  muteSound.addEventListener('change', savePreferences);
  systemMotion?.addEventListener?.('change', () => renderStatus({ error: null, persisted: true, initial: false }));
}

function savePreferences() {
  const result = setCurrentAccessibilityPreferences({
    reduceMotion: Boolean(reduceMotion?.checked),
    muteSound: Boolean(muteSound?.checked)
  });
  renderStatus({ error: result.error, persisted: result.persisted, initial: false });
}

function renderStatus({ error = null, persisted = false, initial = false } = {}) {
  if (!status) return;
  const preferences = currentAccessibilityPreferences();
  const systemReduced = Boolean(systemMotion?.matches);
  const motion = systemReduced
    ? 'system reduced motion active'
    : (preferences.reduceMotion ? 'reduced motion on' : 'system motion');
  const sound = preferences.muteSound ? 'sound muted' : 'sound on';

  if (error) {
    status.textContent = `${motion} · ${sound} · applies this session; local save unavailable`;
    status.dataset.state = 'error';
    return;
  }
  if (initial && !persisted) {
    status.textContent = `${motion} · ${sound} · defaults`;
    status.dataset.state = 'idle';
    return;
  }
  status.textContent = `${motion} · ${sound} · saved locally`;
  status.dataset.state = 'saved';
}
