import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-world-stories-gate.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-world-stories-gate-'));
const logFd = openSync(join(outDir, 'world-stories-gate-chrome-runtime.log'), 'w');
const chrome = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--window-size=1440,900', '--force-device-scale-factor=1', '--run-all-compositor-stages-before-draw',
  '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=0', '--remote-allow-origins=*', '--enable-logging=stderr', '--log-level=0',
  `--user-data-dir=${userDataDir}`, baseUrl
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

  const setup = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    paused: document.querySelector('#pause')?.dataset?.active === 'true',
    activeLens: document.querySelector('#chronicle-lenses button[data-active="true"]')?.dataset?.chronicleLens ?? '',
    highlights: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId)),
    watchlistCount: Number(document.querySelector('#story-watchlist')?.dataset?.watchlistCount ?? 0),
    storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks')
  }))()`);
  if (!setup.paused || setup.activeLens !== 'highlights') throw new Error(`canonical Chronicle did not start paused on Highlights: ${JSON.stringify(setup)}`);
  if (!setup.highlights.length) throw new Error('canonical Highlights is empty');
  if (setup.watchlistCount !== 0 || (setup.storage && setup.storage !== '[]')) throw new Error(`fresh profile Watchlist was not empty: ${JSON.stringify(setup)}`);

  const candidate = await findCanonicalStory(cdp);
  if (!candidate) {
    throw new Error('no player-visible retained seed45 event exposed a retained event cause, current map reference, and explicit entity story with >=2 retained events');
  }
  await clearFocusIfPresent(cdp);
  await assertAuthority(cdp, setup.fingerprint, 'candidate discovery');

  await selectLens(cdp, candidate.lens);
  await openChronicleEvent(cdp, candidate.sourceEventId);
  const sourceCard = await cardEvidence(cdp);
  assertReadableCard(sourceCard, candidate.sourceEventId);
  if (!sourceCard.text.includes('Subject') || !sourceCard.text.includes('Causes')) throw new Error('canonical source Event Card is missing Subject/Causes');
  if (!sourceCard.eventIds.includes(candidate.causeEventId)) throw new Error(`retained cause #${candidate.causeEventId} disappeared from source Event Card`);
  if (!sourceCard.mapRefs.some((ref) => sameMapRef(ref, candidate.mapRef))) throw new Error('canonical map reference disappeared from source Event Card');
  await scrollIntoView(cdp, '#history-detail');
  await captureScreenshot(cdp, join(outDir, 'world-stories-canonical-event-1440x900.png'));
  await assertAuthority(cdp, setup.fingerprint, 'opening canonical Event Card');

  await clickSelector(cdp, `#history-detail button[data-event-card-nav="event"][data-event-id="${candidate.causeEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${candidate.causeEventId}'`, 3_000);
  const causeCard = await cardEvidence(cdp);
  assertReadableCard(causeCard, candidate.causeEventId);
  await assertAuthority(cdp, setup.fingerprint, 'following retained event cause');

  await selectLens(cdp, candidate.lens);
  await openChronicleEvent(cdp, candidate.sourceEventId);
  await clickSelector(cdp, mapSelector(candidate.mapRef));
  await delay(150);
  const mapResult = await mapEvidence(cdp, candidate.mapRef);
  if (!mapResult.expected || !mapResult.inspector.includes(mapResult.expected)) {
    throw new Error(`map navigation did not identify explicit reference ${candidate.mapRef.entityKind}:${candidate.mapRef.entityId}: ${JSON.stringify(mapResult)}`);
  }
  await assertAuthority(cdp, setup.fingerprint, 'map navigation');

  await clickSelector(cdp, `#history-detail button[data-event-card-bookmark][data-ref-kind="event"][data-ref-id="${candidate.sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '1'`, 2_000);
  await clickSelector(cdp, entityBookmarkSelector(candidate.focusRef));
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '2'`, 2_000);
  const watchlist = await watchlistEvidence(cdp);
  const eventKey = `event:${candidate.sourceEventId}`;
  const entityKey = `${candidate.focusRef.entityKind}:${candidate.focusRef.entityId}`;
  assertKeys(watchlist.keys, [eventKey, entityKey], 'canonical Watchlist');
  if (watchlist.storageCount !== 2) throw new Error(`Watchlist storage did not contain exactly two refs: ${JSON.stringify(watchlist)}`);
  await assertAuthority(cdp, setup.fingerprint, 'pinning canonical refs');

  await clickSelector(cdp, entityFollowSelector(candidate.focusRef));
  await waitForExpression(cdp, `document.querySelector('#story-trail')?.hidden === false`, 2_000);
  const trail = await focusedTrailEvidence(cdp);
  if (trail.focusKey !== entityKey || trail.eventIds.length < 2) throw new Error(`canonical focused trail mismatch: ${JSON.stringify(trail)}`);
  if (!isStrictlyAscending(trail.eventIds)) throw new Error(`canonical focused trail is not chronological: ${trail.eventIds.join(',')}`);
  await scrollIntoView(cdp, '#story-trail');
  await captureScreenshot(cdp, join(outDir, 'world-stories-canonical-follow-1440x900.png'));
  await assertAuthority(cdp, setup.fingerprint, 'following canonical entity story');

  const trailEventId = trail.eventIds[Math.min(1, trail.eventIds.length - 1)];
  await clickSelector(cdp, `#story-trail button[data-story-trail-event-id="${trailEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${trailEventId}'`, 3_000);
  const openedTrailCard = await cardEvidence(cdp);
  assertReadableCard(openedTrailCard, trailEventId);
  const presentationBeforeLenses = await presentationEvidence(cdp);
  if (presentationBeforeLenses.focusKey !== entityKey) throw new Error('trail event navigation lost canonical focus');
  assertKeys(presentationBeforeLenses.watchlistKeys, [eventKey, entityKey], 'Watchlist before lens round-trip');
  await assertAuthority(cdp, setup.fingerprint, 'opening focused trail event');

  const lensEvidence = {};
  for (const lensId of ['recent', 'conflict', 'rule']) {
    await selectLens(cdp, lensId);
    const state = await lensState(cdp);
    if (!state.ids.length) throw new Error(`${lensId} unexpectedly empty in canonical seed45 gate`);
    const presentation = await presentationEvidence(cdp);
    if (presentation.eventCardId !== trailEventId || presentation.focusKey !== entityKey) {
      throw new Error(`${lensId} lens disturbed Event Card/focus: ${JSON.stringify(presentation)}`);
    }
    assertKeys(presentation.watchlistKeys, [eventKey, entityKey], `Watchlist during ${lensId}`);
    await assertAuthority(cdp, setup.fingerprint, `${lensId} lens`);
    lensEvidence[lensId] = state.ids;
  }

  await selectLens(cdp, 'highlights');
  const restored = await lensState(cdp);
  if (!sameArray(restored.ids, setup.highlights)) {
    throw new Error(`canonical Highlights did not restore exactly: expected ${setup.highlights.join(',')} got ${restored.ids.join(',')}`);
  }
  const finalPresentation = await presentationEvidence(cdp);
  if (finalPresentation.eventCardId !== trailEventId || finalPresentation.focusKey !== entityKey) {
    throw new Error(`Highlights restoration disturbed Event Card/focus: ${JSON.stringify(finalPresentation)}`);
  }
  assertKeys(finalPresentation.watchlistKeys, [eventKey, entityKey], 'Watchlist after Highlights restore');
  await scrollIntoView(cdp, '#chronicle-lenses');
  await captureScreenshot(cdp, join(outDir, 'world-stories-canonical-recovered-1440x900.png'));
  await assertAuthority(cdp, setup.fingerprint, 'final canonical story recovery');

  const finalState = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    paused: document.querySelector('#pause')?.dataset?.active === 'true',
    rawCodeSurface: Boolean(document.querySelector('#history-detail pre, #history-detail code, #story-trail pre, #story-trail code, #story-watchlist pre, #story-watchlist code'))
  }))()`);
  if (finalState.rawCodeSurface) throw new Error('canonical World Stories path exposed a raw code/JSON surface');
  if (!finalState.paused || finalState.fingerprint !== setup.fingerprint) throw new Error('canonical World Stories gate changed authoritative world state');

  writeFileSync(join(outDir, 'world-stories-gate-evidence.json'), `${JSON.stringify({
    defaultHighlightsEventIds: setup.highlights,
    source: {
      lens: candidate.lens,
      eventId: candidate.sourceEventId,
      text: sourceCard.text
    },
    retainedCauseEventId: candidate.causeEventId,
    mapReference: candidate.mapRef,
    mapInspector: mapResult.inspector,
    watchlistKeys: [eventKey, entityKey],
    focus: { ...candidate.focusRef, key: entityKey },
    focusedTrailEventIds: trail.eventIds,
    openedTrailEventId: trailEventId,
    lensRoundTrip: lensEvidence,
    restoredHighlightsEventIds: restored.ids,
    eventCardPreservedThroughLenses: true,
    focusPreservedThroughLenses: true,
    watchlistPreservedThroughLenses: true,
    rawEngineJsonExposed: false,
    authorityUnchanged: true
  }, null, 2)}\n`);

  console.log(
    `Canonical World Stories gate: ${candidate.lens} event #${candidate.sourceEventId} → cause #${candidate.causeEventId}; `
    + `map ${candidate.mapRef.entityKind}:${candidate.mapRef.entityId}; pin ${eventKey} + ${entityKey}; `
    + `focus ${trail.eventIds.join(',')}; open #${trailEventId}; lenses Recent/Conflict/Rule → exact Highlights restored; authority unchanged`
  );
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch (error) {
    console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`);
  }
}

async function findCanonicalStory(cdpClient) {
  for (const lens of ['highlights', 'conflict', 'rule', 'recent']) {
    await selectLens(cdpClient, lens);
    const eventIds = await evaluate(cdpClient, `[...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId))`);
    for (const sourceEventId of eventIds) {
      await openChronicleEvent(cdpClient, sourceEventId);
      const card = await cardEvidence(cdpClient);
      if (!card.eventIds.length || !card.mapRefs.length || !card.followRefs.length) continue;

      for (const focusRef of card.followRefs) {
        const followSelector = entityFollowSelector(focusRef);
        if (!(await elementCenter(cdpClient, followSelector, false))) continue;
        await clickSelector(cdpClient, followSelector);
        const trail = await focusedTrailEvidence(cdpClient);
        if (trail.visible && trail.eventIds.length >= 2) {
          return {
            lens,
            sourceEventId,
            causeEventId: card.eventIds[0],
            mapRef: card.mapRefs[0],
            focusRef
          };
        }
        await clearFocusIfPresent(cdpClient);
      }
    }
  }
  return null;
}

function assertReadableCard(card, expectedEventId) {
  if (card.eventId !== expectedEventId) throw new Error(`wrong Event Card: expected #${expectedEventId}, got ${JSON.stringify(card)}`);
  if (!card.headline || !card.detail || !card.provenance) throw new Error(`Event Card lacks readable headline/detail/provenance: ${JSON.stringify(card)}`);
  if (card.rawCodeSurface || /\{\s*"[A-Za-z0-9_]+"\s*:/.test(card.text)) throw new Error('Event Card exposed raw JSON/code');
}

async function cardEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const detail = document.querySelector('#history-detail');
    const mapRefs = [...(detail?.querySelectorAll('button[data-event-card-nav="map"]') ?? [])].map((button) => ({
      entityKind: button.dataset.entityKind,
      entityId: Number(button.dataset.entityId),
      x: Number(button.dataset.x),
      y: Number(button.dataset.y)
    }));
    const followRefs = [...(detail?.querySelectorAll('button[data-event-card-follow][data-ref-kind="entity"]') ?? [])].map((button) => ({
      entityKind: button.dataset.refEntityKind,
      entityId: Number(button.dataset.refId)
    }));
    return {
      eventId: Number(detail?.dataset?.eventCardId),
      text: detail?.textContent ?? '',
      headline: detail?.querySelector('.event-card-header strong')?.textContent?.trim() ?? '',
      detail: detail?.querySelector('.event-card-header p')?.textContent?.trim() ?? '',
      provenance: detail?.querySelector('.event-card-kicker')?.textContent?.trim() ?? '',
      eventIds: [...(detail?.querySelectorAll('button[data-event-card-nav="event"]') ?? [])].map((button) => Number(button.dataset.eventId)),
      mapRefs,
      followRefs,
      rawCodeSurface: Boolean(detail?.querySelector('pre, code'))
    };
  })()`);
}

async function focusedTrailEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const trail = document.querySelector('#story-trail');
    const rows = [...(trail?.querySelectorAll('button[data-story-trail-event-id]') ?? [])];
    return {
      visible: trail?.hidden === false,
      focusKey: trail?.dataset?.storyFocus ?? '',
      eventIds: rows.map((row) => Number(row.dataset.storyTrailEventId)),
      text: trail?.textContent ?? ''
    };
  })()`);
}

async function watchlistEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const watchlist = document.querySelector('#story-watchlist');
    let stored = [];
    try { stored = JSON.parse(sessionStorage.getItem('worldboxsr.v0.5.bookmarks') ?? '[]'); } catch {}
    return {
      keys: [...(watchlist?.querySelectorAll('[data-bookmark-key]') ?? [])].map((row) => row.dataset.bookmarkKey),
      storageCount: Array.isArray(stored) ? stored.length : -1,
      text: watchlist?.textContent ?? ''
    };
  })()`);
}

async function presentationEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => ({
    eventCardId: Number(document.querySelector('#history-detail')?.dataset?.eventCardId),
    focusKey: document.querySelector('#story-trail')?.dataset?.storyFocus ?? '',
    watchlistKeys: [...(document.querySelector('#story-watchlist')?.querySelectorAll('[data-bookmark-key]') ?? [])].map((row) => row.dataset.bookmarkKey)
  }))()`);
}

async function lensState(cdpClient) {
  return evaluate(cdpClient, `(() => ({
    lens: document.querySelector('#history-list')?.dataset?.chronicleLens ?? '',
    ids: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId))
  }))()`);
}

async function mapEvidence(cdpClient, mapRef) {
  return evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const kind = ${JSON.stringify(mapRef.entityKind)};
    const id = ${mapRef.entityId};
    let expected = '';
    if (kind === 'human') expected = 'Human #' + id;
    else if (kind === 'creature') expected = '#' + id;
    else if (kind === 'settlement') expected = world?.settlements?.find((value) => value.id === id)?.name ?? ('Settlement #' + id);
    else if (kind === 'warband') expected = 'Warband #' + id;
    else if (kind === 'polity') expected = world?.polities?.find((value) => value.id === id)?.name ?? ('Polity #' + id);
    return { inspector: document.querySelector('#inspector')?.textContent ?? '', expected };
  })()`);
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
  if (!result?.paused || !result.open) throw new Error(`failed to pause/open Chronicle: ${JSON.stringify(result)}`);
  await delay(100);
}

async function selectLens(cdpClient, lens) {
  const active = await evaluate(cdpClient, `document.querySelector('#history-list')?.dataset?.chronicleLens ?? ''`);
  if (active !== lens) await clickSelector(cdpClient, `#chronicle-lenses button[data-chronicle-lens="${lens}"]`);
  await waitForExpression(cdpClient, `document.querySelector('#history-list')?.dataset?.chronicleLens === '${lens}' && document.querySelector('#chronicle-lenses button[data-chronicle-lens="${lens}"]')?.dataset?.active === 'true'`, 2_000);
}

async function openChronicleEvent(cdpClient, eventId) {
  await clickSelector(cdpClient, `#history-list button[data-event-id="${eventId}"]`);
  await waitForExpression(cdpClient, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventId}'`, 3_000);
}

async function clearFocusIfPresent(cdpClient) {
  const clear = await elementCenter(cdpClient, '#story-trail button[data-story-trail-clear]', false);
  if (clear) {
    await clickPoint(cdpClient, clear);
    await waitForExpression(cdpClient, `document.querySelector('#story-trail')?.hidden === true`, 2_000);
  }
}

async function assertAuthority(cdpClient, expected, label) {
  const state = await evaluate(cdpClient, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    paused: document.querySelector('#pause')?.dataset?.active === 'true'
  }))()`);
  if (!state.paused) throw new Error(`world resumed during ${label}`);
  if (state.fingerprint !== expected) throw new Error(`${label} mutated authoritative world state`);
}

function mapSelector(ref) {
  return `#history-detail button[data-event-card-nav="map"][data-entity-kind="${ref.entityKind}"][data-entity-id="${ref.entityId}"][data-x="${ref.x}"][data-y="${ref.y}"]`;
}

function entityBookmarkSelector(ref) {
  return `#history-detail button[data-event-card-bookmark][data-ref-kind="entity"][data-ref-entity-kind="${ref.entityKind}"][data-ref-id="${ref.entityId}"]`;
}

function entityFollowSelector(ref) {
  return `#history-detail button[data-event-card-follow][data-ref-kind="entity"][data-ref-entity-kind="${ref.entityKind}"][data-ref-id="${ref.entityId}"]`;
}

function sameMapRef(a, b) {
  return a.entityKind === b.entityKind && a.entityId === b.entityId && a.x === b.x && a.y === b.y;
}

function assertKeys(actual, expected, label) {
  if (actual.length !== expected.length || expected.some((key) => !actual.includes(key))) {
    throw new Error(`${label} mismatch: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isStrictlyAscending(values) {
  for (let index = 1; index < values.length; index += 1) if (values[index] <= values[index - 1]) return false;
  return true;
}

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await clickPoint(cdpClient, point);
  await delay(80);
}

async function clickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function scrollIntoView(cdpClient, selector) {
  const found = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  if (!found) throw new Error(`element not found for scroll: ${selector}`);
  await delay(100);
}

async function elementCenter(cdpClient, selector, required = true) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: element.textContent ?? '' };
  })()`);
  if (!point) {
    if (required) throw new Error(`element not found: ${selector}`);
    return null;
  }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1440 || point.y < 0 || point.y > 900) {
    if (required) throw new Error(`element outside viewport: ${selector} ${JSON.stringify(point)}`);
    return null;
  }
  await delay(60);
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
    if (await evaluate(cdpClient, expression)) return;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
