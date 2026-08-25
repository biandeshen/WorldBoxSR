import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-chronicle-lenses-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

const STORY_TYPES = new Set([
  'god.meteor',
  'god.rain',
  'polity.founded',
  'polity.dissolved',
  'polity.ruler_appointed',
  'polity.ruler_succeeded',
  'polity.ruler_vacant',
  'polity.war_started',
  'polity.peace_made',
  'warband.mobilized',
  'warband.engaged',
  'warband.destroyed',
  'warband.disbanded',
  'settlement.conquered',
  'settlement.rebelled'
]);

const CONFLICT_TYPES = new Set([
  'polity.war_started',
  'polity.peace_made',
  'warband.mobilized',
  'warband.engaged',
  'warband.destroyed',
  'warband.disbanded',
  'settlement.conquered',
  'settlement.rebelled'
]);

const RULE_TYPES = new Set([
  'polity.founded',
  'polity.dissolved',
  'polity.ruler_appointed',
  'polity.ruler_succeeded',
  'polity.ruler_vacant'
]);

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-chronicle-lenses-'));
const logFd = openSync(join(outDir, 'chronicle-lenses-chrome-runtime.log'), 'w');
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

  const setup = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const buttons = [...document.querySelectorAll('#chronicle-lenses button[data-chronicle-lens]')];
    return {
      fingerprint: JSON.stringify(world),
      highlights: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId)),
      activeLens: buttons.find((button) => button.dataset.active === 'true')?.dataset?.chronicleLens ?? '',
      lenses: buttons.map((button) => ({ id: button.dataset.chronicleLens, label: button.textContent?.trim() ?? '' })),
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      historyScope: document.querySelector('#history-scope-label')?.textContent ?? ''
    };
  })()`);

  if (!setup.paused) throw new Error('canonical world was not paused for Chronicle lens gate');
  if (setup.activeLens !== 'highlights') throw new Error(`Highlights was not the default lens: ${JSON.stringify(setup)}`);
  if (setup.highlights.length < 1) throw new Error('Highlights has no representative events');
  assertLensButtons(setup.lenses);

  const sourceEventId = setup.highlights[0];
  await clickSelector(cdp, `#history-list button[data-event-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${sourceEventId}'`, 3_000);

  await clickSelector(cdp, `#history-detail button[data-event-card-follow][data-ref-kind="event"][data-ref-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-trail')?.hidden === false`, 2_000);
  await clickSelector(cdp, `#history-detail button[data-event-card-bookmark][data-ref-kind="event"][data-ref-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '1'`, 2_000);

  const presentationBefore = await presentationState(cdp);
  if (presentationBefore.focusKey !== `event:${sourceEventId}`) {
    throw new Error(`failed to establish focused event before lens switching: ${JSON.stringify(presentationBefore)}`);
  }
  if (presentationBefore.watchlistCount !== 1 || presentationBefore.bookmarksStorage === '[]') {
    throw new Error(`failed to establish Watchlist state before lens switching: ${JSON.stringify(presentationBefore)}`);
  }

  const evidence = {};
  for (const lensId of ['recent', 'conflict', 'rule']) {
    await clickSelector(cdp, `#chronicle-lenses button[data-chronicle-lens="${lensId}"]`);
    await waitForExpression(cdp, `document.querySelector('#history-list')?.dataset?.chronicleLens === '${lensId}' && document.querySelector('#chronicle-lenses button[data-chronicle-lens="${lensId}"]')?.dataset?.active === 'true'`, 2_000);
    const state = await lensState(cdp);
    validateLensState(lensId, state);
    assertPresentationUnchanged(await presentationState(cdp), presentationBefore, `after ${lensId} lens`);
    evidence[lensId] = state;
    if (lensId === 'conflict') {
      await scrollIntoView(cdp, '#timeline');
      await captureScreenshot(cdp, join(outDir, 'story-chronicle-lenses-1440x900.png'));
    }
  }

  const nonDefaultEventId = evidence.rule.ids[0] ?? evidence.conflict.ids[0] ?? evidence.recent.ids[0];
  await clickSelector(cdp, `#history-list button[data-event-id="${nonDefaultEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${nonDefaultEventId}'`, 3_000);
  assertPresentationUnchanged(await presentationState(cdp), presentationBefore, 'after opening a non-default Event Card');
  await scrollIntoView(cdp, '#history-detail');
  await captureScreenshot(cdp, join(outDir, 'story-chronicle-lens-event-opened-1440x900.png'));

  await clickSelector(cdp, '#chronicle-lenses button[data-chronicle-lens="highlights"]');
  await waitForExpression(cdp, `document.querySelector('#history-list')?.dataset?.chronicleLens === 'highlights' && document.querySelector('#chronicle-lenses button[data-chronicle-lens="highlights"]')?.dataset?.active === 'true'`, 2_000);

  const finalState = await evaluate(cdp, `(() => ({
    fingerprint: JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world),
    highlights: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId)),
    activeLens: document.querySelector('#chronicle-lenses button[data-active="true"]')?.dataset?.chronicleLens ?? '',
    eventCardId: Number(document.querySelector('#history-detail')?.dataset?.eventCardId),
    paused: document.querySelector('#pause')?.dataset?.active === 'true'
  }))()`);

  if (finalState.activeLens !== 'highlights') throw new Error(`failed to return to Highlights: ${JSON.stringify(finalState)}`);
  if (!sameArray(finalState.highlights, setup.highlights)) {
    throw new Error(`Highlights representative IDs changed after lens round-trip: ${JSON.stringify({ before: setup.highlights, after: finalState.highlights })}`);
  }
  if (finalState.eventCardId !== nonDefaultEventId) throw new Error('switching back to Highlights destroyed the open Event Card');
  if (!finalState.paused) throw new Error('world resumed during Chronicle lens navigation');
  if (finalState.fingerprint !== setup.fingerprint) throw new Error('Chronicle lens navigation mutated authoritative world state');
  assertPresentationUnchanged(await presentationState(cdp), presentationBefore, 'after returning to Highlights');

  writeFileSync(join(outDir, 'chronicle-lenses-evidence.json'), `${JSON.stringify({
    defaultHighlightsEventIds: setup.highlights,
    sourceEventId,
    presentationBefore,
    lenses: evidence,
    openedNonDefaultEventId: nonDefaultEventId,
    restoredHighlightsEventIds: finalState.highlights,
    focusAndWatchlistPreserved: true,
    authorityUnchanged: true
  }, null, 2)}\n`);

  console.log(`Chronicle lens evidence: Highlights ${setup.highlights.join(',')} → Recent ${evidence.recent.ids.join(',')} → Conflict ${evidence.conflict.ids.join(',')} → Rule ${evidence.rule.ids.join(',')} → Event #${nonDefaultEventId} → Highlights restored; focus/watchlist/authority unchanged`);
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

function assertLensButtons(lenses) {
  const expected = [
    ['highlights', 'Highlights'],
    ['recent', 'Recent'],
    ['conflict', 'Conflict'],
    ['rule', 'Rule']
  ];
  if (lenses.length !== expected.length) throw new Error(`expected exactly four Chronicle lenses, got ${JSON.stringify(lenses)}`);
  for (let index = 0; index < expected.length; index += 1) {
    if (lenses[index]?.id !== expected[index][0] || lenses[index]?.label !== expected[index][1]) {
      throw new Error(`Chronicle lens contract mismatch: ${JSON.stringify(lenses)}`);
    }
  }
}

function validateLensState(lensId, state) {
  if (state.activeLens !== lensId) throw new Error(`${lensId} did not become active: ${JSON.stringify(state)}`);
  if (!state.scope.toLowerCase().includes(lensId)) throw new Error(`${lensId} label did not update Chronicle scope: ${state.scope}`);
  if (state.ids.length < 1) throw new Error(`${lensId} unexpectedly empty on canonical seed45`);
  if (state.ids.length > 7) throw new Error(`${lensId} exceeded fixed Chronicle limit: ${state.ids.length}`);
  if (!isStrictlyDescending(state.ids)) throw new Error(`${lensId} rows are not newest-first: ${state.ids.join(',')}`);

  const allowed = lensId === 'recent' ? STORY_TYPES : lensId === 'conflict' ? CONFLICT_TYPES : RULE_TYPES;
  const invalid = state.types.filter((type) => !allowed.has(type));
  if (invalid.length) throw new Error(`${lensId} contains disallowed event types: ${invalid.join(', ')}`);
}

async function lensState(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const rows = [...document.querySelectorAll('#history-list button[data-event-id]')];
    const ids = rows.map((button) => Number(button.dataset.eventId));
    const byId = new Map((world?.history ?? []).map((event) => [event.id, event.type]));
    return {
      activeLens: document.querySelector('#chronicle-lenses button[data-active="true"]')?.dataset?.chronicleLens ?? '',
      ids,
      types: ids.map((id) => byId.get(id) ?? 'missing'),
      scope: document.querySelector('#history-scope-label')?.textContent ?? '',
      text: document.querySelector('#history-list')?.textContent ?? ''
    };
  })()`);
}

async function presentationState(cdpClient) {
  return evaluate(cdpClient, `(() => ({
    focusKey: document.querySelector('#story-trail')?.dataset?.storyFocus ?? '',
    focusHidden: document.querySelector('#story-trail')?.hidden === true,
    watchlistCount: Number(document.querySelector('#story-watchlist')?.dataset?.watchlistCount ?? -1),
    bookmarksStorage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks') ?? ''
  }))()`);
}

function assertPresentationUnchanged(actual, expected, label) {
  if (actual.focusKey !== expected.focusKey || actual.focusHidden !== expected.focusHidden || actual.watchlistCount !== expected.watchlistCount || actual.bookmarksStorage !== expected.bookmarksStorage) {
    throw new Error(`${label} mutated Focused Trail/Watchlist state: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
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

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(80);
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

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isStrictlyDescending(values) {
  for (let index = 1; index < values.length; index += 1) if (values[index] >= values[index - 1]) return false;
  return true;
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
