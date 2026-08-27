import { rendererRecoveryDestinations, rendererRecoveryPresentation } from './renderer_recovery.js';

const FAILURE_PREFIX = 'Renderer failed:';
const bootStatus = document.querySelector('#boot-status');
const inspectorPanel = document.querySelector('#inspector-panel');

if (bootStatus && inspectorPanel) {
  const observer = new MutationObserver(() => maybeShowRendererRecovery());
  observer.observe(bootStatus, { childList: true, characterData: true, subtree: true });
  queueMicrotask(() => maybeShowRendererRecovery());
}

function maybeShowRendererRecovery() {
  const text = bootStatus?.textContent?.trim() ?? '';
  if (!text.startsWith(FAILURE_PREFIX)) return;
  const reason = text.slice(FAILURE_PREFIX.length).trim() || 'Unknown renderer startup failure';
  showRendererRecovery(reason);
}

function showRendererRecovery(reason) {
  const renderer = document.documentElement.dataset.renderer === 'legacy' ? 'legacy' : 'phaser';
  const destinations = rendererRecoveryDestinations({ href: window.location.href, renderer });
  const presentation = rendererRecoveryPresentation({
    renderer,
    dropsScenario: destinations.dropsScenario
  });

  let panel = document.querySelector('#renderer-recovery');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'renderer-recovery';
    panel.setAttribute('role', 'alert');
    panel.tabIndex = -1;
    panel.innerHTML = [
      '<strong id="renderer-recovery-heading"></strong>',
      '<div id="renderer-recovery-message"></div>',
      '<div id="renderer-recovery-actions">',
      '  <button id="renderer-recovery-retry" type="button"></button>',
      '  <button id="renderer-recovery-legacy" type="button"></button>',
      '</div>',
      '<small id="renderer-recovery-note"></small>'
    ].join('');
    bootStatus.insertAdjacentElement('afterend', panel);
    installRecoveryStyle();
  }

  if (panel.dataset.failure === reason && panel.dataset.renderer === renderer) return;
  panel.dataset.failure = reason;
  panel.dataset.renderer = renderer;

  const heading = panel.querySelector('#renderer-recovery-heading');
  const message = panel.querySelector('#renderer-recovery-message');
  const retry = panel.querySelector('#renderer-recovery-retry');
  const legacy = panel.querySelector('#renderer-recovery-legacy');
  const note = panel.querySelector('#renderer-recovery-note');

  if (heading) heading.textContent = presentation.heading;
  if (message) message.textContent = reason;
  if (note) note.textContent = presentation.note;

  if (retry) {
    retry.textContent = presentation.retryLabel;
    retry.dataset.href = destinations.retryHref;
    retry.onclick = () => window.location.assign(destinations.retryHref);
  }

  if (legacy) {
    if (destinations.legacyHref && presentation.fallbackLabel) {
      legacy.hidden = false;
      legacy.textContent = presentation.fallbackLabel;
      legacy.dataset.href = destinations.legacyHref;
      legacy.onclick = () => window.location.assign(destinations.legacyHref);
    } else {
      legacy.hidden = true;
      legacy.textContent = '';
      delete legacy.dataset.href;
      legacy.onclick = null;
    }
  }

  panel.focus({ preventScroll: true });
}

function installRecoveryStyle() {
  if (document.querySelector('#renderer-recovery-style')) return;
  const style = document.createElement('style');
  style.id = 'renderer-recovery-style';
  style.textContent = `
    #renderer-recovery {
      display: grid;
      gap: 7px;
      margin: 0 0 9px;
      padding: 9px;
      border-radius: 9px;
      border: 1px solid #f0b06c52;
      background: #2a1816e8;
      color: #f4e3d4;
      outline: none;
    }
    #renderer-recovery-heading { font-size: 11px; color: #ffd6a3; }
    #renderer-recovery-message {
      max-height: 76px;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 9px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #d9b9a2;
    }
    #renderer-recovery-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    #renderer-recovery-actions button { flex: 1 1 105px; min-width: 0; padding: 6px 7px; font-size: 9px; }
    #renderer-recovery-note { color: #b89f91; font: 8px/1.35 ui-monospace, monospace; }
  `;
  document.head.append(style);
}
