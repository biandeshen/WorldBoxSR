import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-bookmark-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-watchlist-'));
const logFd = openSync(join(outDir, 'watchlist-chrome-runtime.log'), 'w');
const chrome = spawn(browser, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--window-size=1440,900',
  '--force-device-scale-factor=1',
  '--run-all-compositor-stages-before-draw',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=0',
  '--remote-allow-origins=*',
  '--enable-logging=stderr',
  '--log-level=0',
  `--user-data-dir=${userDataDir}`,
  baseUrl
], { stdio: ['ignore', logFd, logFd] });

let cdp = null;
try {
  const port = await waitForDevToolsPort(userDataDir, chrome);
  const target = await waitForPageTarget(port, baseUrl, chrome);
  cdp = await createCdpClient(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await freezeChronicle(cdp);

  const setup = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return {
      fingerprint: JSON.stringify(world),
      visibleEventIds: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId)),
      storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks')
    };
  })()`);
  if (!setup.visibleEventIds.length) throw new Error('Chronicle has no visible events for Watchlist evidence');
  if (setup.storage && setup.storage !== '[]') throw new Error(`fresh Watchlist profile was not empty: ${setup.storage}`);

  const chosen = await chooseBookmarkableCard(cdp, setup.visibleEventIds);
  if (!chosen) throw new Error('no visible Event Card exposed a bookmarkable entity reference');

  await clickSelector(cdp, `#history-detail button[data-event-card-bookmark][data-ref-kind="event"][data-ref-id="${chosen.eventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '1'`, 2_000);
  await clickSelector(cdp, `#history-detail button[data-event-card-bookmark][data-ref-kind="entity"][data-ref-entity-kind="${chosen.entityKind}"][data-ref-id="${chosen.entityId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '2'`, 2_000);

  const pinned = await watchlistEvidence(cdp);
  const eventKey = `event:${chosen.eventId}`;
  const entityKey = `${chosen.entityKind}:${chosen.entityId}`;
  assertKeys(pinned.keys, [eventKey, entityKey], 'initial Watchlist');
  if (pinned.storageCount !== 2) throw new Error(`sessionStorage did not persist both pins: ${JSON.stringify(pinned)}`);

  const alternateEventId = setup.visibleEventIds.find((id) => id !== chosen.eventId);
  if (!alternateEventId) throw new Error('Chronicle needs a second visible event to prove Watchlist survives browsing');
  await clickSelector(cdp, `#history-list button[data-event-id="${alternateEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${alternateEventId}'`, 3_000);
  const afterBrowse = await watchlistEvidence(cdp);
  assertKeys(afterBrowse.keys, [eventKey, entityKey], 'Watchlist after browsing another event');

  await clickSelector(cdp, `#story-watchlist [data-bookmark-key="${eventKey}"] button[data-watchlist-open-event]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${chosen.eventId}'`, 3_000);
  await scrollIntoView(cdp, '#story-watchlist');
  await captureScreenshot(cdp, join(outDir, 'story-watchlist-pinned-1440x900.png'));

  const beforeReload = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    paused: document.querySelector('#pause')?.dataset?.active === 'true',
    storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks')
  }))()`);
  if (!beforeReload.paused) throw new Error('world resumed during Watchlist actions');
  if (beforeReload.fingerprint !== setup.fingerprint) throw new Error('Pin/browse/open Watchlist actions mutated authoritative world state');

  await cdp.send('Page.reload', { ignoreCache: false });
  await delay(250);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await freezeChronicle(cdp);
  const reloadStart = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks')
  }))()`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '2' && document.querySelector('#story-watchlist')?.hidden === false`, 5_000);

  const rehydrated = await watchlistEvidence(cdp);
  assertKeys(rehydrated.keys, [eventKey, entityKey], 'Watchlist after same-tab reload');
  if (rehydrated.storageCount !== 2) throw new Error(`reload lost sessionStorage pins: ${JSON.stringify(rehydrated)}`);
  const postRehydrateFingerprint = await worldFingerprint(cdp);
  if (postRehydrateFingerprint !== reloadStart.fingerprint) throw new Error('Watchlist rehydration mutated authoritative world state');

  await clickSelector(cdp, `#story-watchlist [data-bookmark-key="${eventKey}"] button[data-watchlist-open-event]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${chosen.eventId}'`, 3_000);
  await scrollIntoView(cdp, '#story-watchlist');
  await captureScreenshot(cdp, join(outDir, 'story-watchlist-reloaded-1440x900.png'));

  await clickSelector(cdp, `#story-watchlist [data-bookmark-key="${entityKey}"] button[data-watchlist-unpin]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '1'`, 2_000);
  await clickSelector(cdp, '#story-watchlist button[data-watchlist-clear]');
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.hidden === true`, 2_000);

  const finalState = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    paused: document.querySelector('#pause')?.dataset?.active === 'true',
    storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks'),
    watchlistHidden: document.querySelector('#story-watchlist')?.hidden === true,
    watchlistCount: document.querySelector('#story-watchlist')?.dataset?.watchlistCount
  }))()`);
  if (!finalState.paused) throw new Error('world resumed during post-reload Watchlist cleanup');
  if (finalState.fingerprint !== reloadStart.fingerprint) throw new Error('Unpin/Clear actions mutated authoritative world state');
  if (!finalState.watchlistHidden || finalState.watchlistCount !== '0') throw new Error(`Clear all did not empty Watchlist: ${JSON.stringify(finalState)}`);
  if (finalState.storage !== '[]') throw new Error(`Clear all did not persist empty session list: ${finalState.storage}`);

  writeFileSync(join(outDir, 'watchlist-evidence.json'), `${JSON.stringify({
    sourceEventId: chosen.eventId,
    eventBookmarkKey: eventKey,
    entityBookmark: { kind: chosen.entityKind, id: chosen.entityId, key: entityKey },
    pinnedBeforeReload: pinned.keys,
    persistedStorageBeforeReload: JSON.parse(beforeReload.storage),
    rehydratedAfterReload: rehydrated.keys,
    cleared: true,
    authorityUnchangedBeforeReload: true,
    authorityUnchangedAfterReload: true
  }, null, 2)}\n`);

  console.log(`Watchlist evidence: pinned ${eventKey} + ${entityKey}; browsed; reopened event; same-tab reload restored 2/2; Unpin/Clear left authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  closeFd(logFd);
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch (error) {
    console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`);
  }
}

async function chooseBookmarkableCard(cdpClient, visibleEventIds) {
  for (const eventId of visibleEventIds) {
    await clickSelector(cdpClient, `#history-list button[data-event-id="${eventId}"]`);
    await waitForExpression(cdpClient, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventId}'`, 3_000);
    const candidate = await evaluate(cdpClient, `(() => {
      const button = document.querySelector('#history-detail button[data-event-card-bookmark][data-ref-kind="entity"]');
      if (!button) return null;
      return { entityKind: button.dataset.refEntityKind, entityId: Number(button.dataset.refId) };
    })()`);
    if (candidate?.entityKind && Number.isInteger(candidate.entityId)) return { eventId, ...candidate };
  }
  return null;
}

async function freezeChronicle(cdpClient) {
  const result = await evaluate(cdpClient, `(() => {
    const pause = document.querySelector('#pause');
    const timeline = document.querySelector('#timeline');
    if (!pause || !timeline) return null;
    if (pause.dataset.active !== 'true') pause.click();
    timeline.open = true;
    return { paused: pause.dataset.active === 'true', open: timeline.open };
  })()`);
  if (!result?.paused || !result.open) throw new Error(`failed to freeze/open Chronicle: ${JSON.stringify(result)}`);
  await delay(100);
}

async function watchlistEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const watchlist = document.querySelector('#story-watchlist');
    let stored = [];
    try { stored = JSON.parse(sessionStorage.getItem('worldboxsr.v0.5.bookmarks') ?? '[]'); } catch {}
    return {
      visible: watchlist?.hidden === false,
      count: Number(watchlist?.dataset?.watchlistCount ?? -1),
      keys: [...(watchlist?.querySelectorAll('[data-bookmark-key]') ?? [])].map((row) => row.dataset.bookmarkKey),
      storageCount: Array.isArray(stored) ? stored.length : -1,
      text: watchlist?.textContent ?? ''
    };
  })()`);
}

async function worldFingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

function assertKeys(actual, expected, label) {
  if (actual.length !== expected.length || expected.some((key) => !actual.includes(key))) {
    throw new Error(`${label} mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(70);
}

async function scrollIntoView(cdpClient, selector) {
  const found = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  if (!found) throw new Error(`element not found for scroll: ${selector}`);
  await delay(90);
}

async function elementCenter(cdpClient, selector) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: element.textContent ?? '' };
  })()`);
  if (!point) throw new Error(`element not found: ${selector}`);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1440 || point.y < 0 || point.y > 900) {
    throw new Error(`element outside viewport: ${selector} ${JSON.stringify(point)}`);
  }
  await delay(70);
  return point;
}

async function waitForDevToolsPort(dataDir, child) {
  const marker = join(dataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    if (existsSync(marker)) {
      const [port] = readFileSync(marker, 'utf8').trim().split(/\r?\n/);
      if (/^\d+$/.test(port)) return Number(port);
    }
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become ready');
}

async function waitForPageTarget(port, url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((candidate) => candidate.type === 'page' && candidate.url.startsWith(url));
        if (target?.webSocketDebuggerUrl) return target;
      }
    } catch {}
    await delay(80);
  }
  throw new Error('Chrome page target did not become ready');
}

async function createCdpClient(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP websocket open timed out')), 10_000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP websocket failed')); }, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(`${message.error.message} (${message.error.code})`));
    else waiter.resolve(message.result ?? {});
  });
  socket.addEventListener('close', () => {
    for (const waiter of pending.values()) waiter.reject(new Error('CDP websocket closed'));
    pending.clear();
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function evaluate(cdpClient, expression) {
  const result = await cdpClient.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Runtime.evaluate failed';
    throw new Error(message);
  }
  return result.result?.value;
}

async function waitForExpression(cdpClient, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(cdpClient, expression)) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function captureScreenshot(cdpClient, path) {
  const result = await cdpClient.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  if (!result.data) throw new Error(`No screenshot bytes returned for ${path}`);
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

async function stopChrome(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  if (await waitForExit(child, 2_000)) return;
  child.kill('SIGKILL');
  await waitForExit(child, 2_000);
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return true;
  return Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    delay(timeoutMs).then(() => false)
  ]);
}

function ensureAlive(child) {
  if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
}

function closeFd(fd) {
  try { closeSync(fd); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
