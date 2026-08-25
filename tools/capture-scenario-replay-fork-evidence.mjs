import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-scenario-replay-fork-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

const TILE_SIZE = 28;
const SOURCE = {
  kind: 'worldboxsr-scenario',
  version: 1,
  name: 'Portable trio',
  base: { seed: 45, preset: 'sandbox' },
  setup: [
    { type: 'spawn_human', x: 12, y: 8, count: 1 },
    { type: 'spawn_creature', species: 'grazer', x: 16, y: 12, count: 1 },
    { type: 'spawn_creature', species: 'wolf', x: 14, y: 7, count: 1 }
  ]
};
const SOURCE_CANONICAL = JSON.stringify(SOURCE);
const SOURCE_TOKEN = Buffer.from(SOURCE_CANONICAL, 'utf8').toString('base64url');
const FORK_ACTION = { type: 'spawn_human', x: 12, y: 8, count: 1 };

mkdirSync(outDir, { recursive: true });
const sharedUrl = new URL(baseUrl);
sharedUrl.searchParams.set('scenario', SOURCE_TOKEN);

const session = await launchBrowser(sharedUrl.href);
let cdp = session.cdp;
try {
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('shared Scenario ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.attached === true`, 5_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioPortability?.attached === true`, 5_000);
  await waitForExpression(cdp, `document.querySelector('#scenario-replay') !== null && document.querySelector('#scenario-fork') !== null`, 3_000);

  const source = await scenarioState(cdp);
  if (source.day !== 14400 || !source.paused || source.active || source.badge !== 'SCENARIO · 3') {
    throw new Error(`shared source did not start frozen/paused at exact Y40: ${JSON.stringify(source)}`);
  }
  if (source.recipe !== SOURCE_CANONICAL) throw new Error('shared source normalized Recipe differs from canonical Portable trio');
  const sourceFingerprint = source.fingerprint;

  // Establish stale presentation and one stable Watchlist ref before Replay.
  await openChronicle(cdp);
  const sourceEventId = await evaluate(cdp, `Number(document.querySelector('#history-list button[data-event-id]')?.dataset?.eventId)`);
  if (!Number.isInteger(sourceEventId)) throw new Error('shared source Chronicle has no visible event');
  await clickSelector(cdp, `#history-list button[data-event-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${sourceEventId}'`, 2_500);
  await clickSelector(cdp, `#history-detail button[data-event-card-follow][data-ref-kind="event"][data-ref-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-trail')?.hidden === false`, 2_000);
  await clickSelector(cdp, `#history-detail button[data-event-card-bookmark][data-ref-kind="event"][data-ref-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.dataset?.watchlistCount === '1'`, 2_000);
  const bookmarkStorage = await evaluate(cdp, `sessionStorage.getItem('worldboxsr.v0.5.bookmarks')`);
  if (!bookmarkStorage || bookmarkStorage === '[]') throw new Error('Replay gate failed to establish stable Watchlist ref');

  const sourceTile = await fixedTilePoint(cdp, 12, 8);
  await clickPoint(cdp, sourceTile, 1);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent !== 'Alt-click a tile or entity to inspect it.'`, 2_000);

  // Diverge authority through ordinary Time/Play and a real destructive God Power.
  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > 14400`, 3_000);
  await clickPauseTo(cdp, true);
  await clickSelector(cdp, '[data-tool-button="meteor"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, 12, 8), 0);
  await delay(150);
  const dirtyFingerprint = await fingerprint(cdp);
  if (dirtyFingerprint === sourceFingerprint) throw new Error('ordinary gameplay + Meteor did not diverge source authority');
  if (await frozenRecipeString(cdp) !== SOURCE_CANONICAL) throw new Error('ordinary gameplay rewrote frozen source Recipe');

  // Replay is rematerialization, not rewind: exact source start and identity return.
  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-replay');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Replay Scenario ready') === true`, 25_000);
  const replay = await scenarioState(cdp);
  if (replay.fingerprint !== sourceFingerprint || replay.day !== 14400 || !replay.paused || replay.active || replay.badge !== 'SCENARIO · 3') {
    throw new Error(`Replay did not restore exact frozen source start: ${JSON.stringify(replay)}`);
  }
  if (replay.recipe !== SOURCE_CANONICAL) throw new Error('Replay changed source Recipe identity');
  const transient = await evaluate(cdp, `(() => ({
    eventCardId: document.querySelector('#history-detail')?.dataset?.eventCardId ?? '',
    historyText: document.querySelector('#history-detail')?.textContent ?? '',
    trailHidden: document.querySelector('#story-trail')?.hidden === true,
    inspector: document.querySelector('#inspector')?.textContent ?? '',
    watchlistHidden: document.querySelector('#story-watchlist')?.hidden === true,
    storage: sessionStorage.getItem('worldboxsr.v0.5.bookmarks')
  }))()`);
  if (transient.eventCardId || transient.historyText.trim() !== 'Select an event' || !transient.trailHidden
      || transient.inspector.trim() !== 'Alt-click a tile or entity to inspect it.' || transient.storage !== bookmarkStorage) {
    throw new Error(`Replay did not clear transient presentation while preserving stable bookmark storage: ${JSON.stringify(transient)}`);
  }
  await openChronicle(cdp);
  await clickSelector(cdp, `#history-list button[data-event-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-watchlist')?.hidden === false`, 2_000);
  await captureScreenshot(cdp, join(outDir, 'scenario-replay-restored-1440x900.png'));

  // Fork rematerializes the source start, preserves source canonical identity,
  // and enters the same Setup workspace with an independent editable copy.
  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-fork');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioFork === 'true' && document.documentElement.dataset.scenarioSetup === 'true'`, 25_000);
  const forkBase = await forkState(cdp);
  if (forkBase.fingerprint !== sourceFingerprint || forkBase.draft !== SOURCE_CANONICAL || forkBase.source !== SOURCE_CANONICAL
      || forkBase.count !== '3/32 actions' || forkBase.state !== 'FORK · EDITING · PAUSED' || forkBase.badge !== 'FORK · 3') {
    throw new Error(`Fork did not start as exact editable source copy: ${JSON.stringify(forkBase)}`);
  }
  await captureScreenshot(cdp, join(outDir, 'scenario-fork-editing-1440x900.png'));

  await clickSelector(cdp, '[data-scenario-setup-tool="human"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, FORK_ACTION.x, FORK_ACTION.y), 0);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === 4`, 2_000);
  const forkEdited = await forkState(cdp);
  if (forkEdited.source !== SOURCE_CANONICAL) throw new Error('editing fork mutated original source canonical Recipe');
  const forkRecipe = JSON.parse(forkEdited.draft);
  if (forkRecipe.setup.length !== 4 || JSON.stringify(forkRecipe.setup[3]) !== JSON.stringify(FORK_ACTION)) {
    throw new Error(`fork Recipe did not contain exactly the fixed fourth action: ${forkEdited.draft}`);
  }
  if (forkEdited.draft === SOURCE_CANONICAL || forkEdited.fingerprint === sourceFingerprint) {
    throw new Error('fork edit did not create a distinct Recipe/world start');
  }
  const forkFingerprint = forkEdited.fingerprint;
  const forkCanonical = forkEdited.draft;

  await clickSelector(cdp, '#scenario-setup-run');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioSetup === 'false'`, 2_000);
  if (await frozenRecipeString(cdp) !== forkCanonical) throw new Error('Run did not freeze edited fork Recipe');
  if ((await forkSourceString(cdp)) !== SOURCE_CANONICAL) throw new Error('Run of fork lost immutable source Recipe identity');

  // Dirty fork, then Replay current frozen fork back to exact fork start.
  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > 14400`, 3_000);
  await clickPauseTo(cdp, true);
  if ((await fingerprint(cdp)) === forkFingerprint) throw new Error('ordinary fork gameplay did not diverge fork start');
  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-replay');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Replay Scenario ready') === true`, 25_000);
  if ((await fingerprint(cdp)) !== forkFingerprint || (await frozenRecipeString(cdp)) !== forkCanonical) {
    throw new Error('Replay of frozen fork did not return exact fork start/Recipe');
  }
  if ((await forkSourceString(cdp)) !== SOURCE_CANONICAL) throw new Error('Replay of fork mutated original source identity');
  await captureScreenshot(cdp, join(outDir, 'scenario-fork-replayed-1440x900.png'));

  writeFileSync(join(outDir, 'scenario-replay-fork-evidence.json'), `${JSON.stringify({
    source: {
      canonicalRecipe: SOURCE_CANONICAL,
      fingerprint: fnv1a(sourceFingerprint),
      day: 14400,
      bookmarkedEventId: sourceEventId
    },
    divergence: { fingerprint: fnv1a(dirtyFingerprint), gameplayAndMeteorChangedWorld: true, sourceRecipeUnchanged: true },
    replaySource: {
      fingerprint: fnv1a(replay.fingerprint),
      exactSourceRestored: true,
      staleEventCardFocusInspectorCleared: true,
      bookmarkStoragePreserved: true
    },
    fork: {
      sourceCanonicalUnchanged: true,
      addedAction: FORK_ACTION,
      canonicalRecipe: forkCanonical,
      fingerprint: fnv1a(forkFingerprint),
      distinctFromSource: true
    },
    replayFork: {
      exactForkStartRestored: true,
      fingerprint: fnv1a(forkFingerprint),
      sourceCanonicalStillUnchanged: true
    }
  }, null, 2)}\n`);

  console.log(
    `Replay/Fork evidence: source ${fnv1a(sourceFingerprint)} → dirty ${fnv1a(dirtyFingerprint)} → Replay exact source; `
    + `Fork + Human @12,8 → ${fnv1a(forkFingerprint)} with source Recipe unchanged → Replay exact fork`
  );
} finally {
  await closeBrowser(session);
}

async function scenarioState(cdp) {
  return evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const setup = scene?.scenarioSetup;
    const recipe = setup?.currentRecipe?.() ?? null;
    return {
      fingerprint: JSON.stringify(scene?.world),
      day: scene?.world?.day ?? -1,
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      active: Boolean(setup?.active),
      badge: document.querySelector('#scenario-state-badge')?.textContent ?? '',
      recipe: recipe ? JSON.stringify(recipe) : null
    };
  })()`);
}

async function forkState(cdp) {
  return evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const setup = scene?.scenarioSetup;
    return {
      fingerprint: JSON.stringify(scene?.world),
      draft: setup?.draft ? JSON.stringify(setup.draft) : null,
      source: setup?.forkSourceRecipe?.() ? JSON.stringify(setup.forkSourceRecipe()) : null,
      count: document.querySelector('#scenario-setup-count')?.textContent ?? '',
      state: document.querySelector('#scenario-setup-state')?.textContent ?? '',
      badge: document.querySelector('#scenario-state-badge')?.textContent ?? ''
    };
  })()`);
}

async function frozenRecipeString(cdp) {
  return evaluate(cdp, `(() => {
    const value = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.frozen;
    return value ? JSON.stringify(value) : null;
  })()`);
}

async function forkSourceString(cdp) {
  return evaluate(cdp, `(() => {
    const value = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.forkSourceRecipe?.();
    return value ? JSON.stringify(value) : null;
  })()`);
}

async function openChronicle(cdp) {
  const open = await evaluate(cdp, `document.querySelector('#timeline')?.open === true`);
  if (!open) await clickSelector(cdp, '#timeline > summary');
  await waitForExpression(cdp, `document.querySelector('#timeline')?.open === true`, 1_500);
}

async function openRecipePanel(cdp) {
  const open = await evaluate(cdp, `document.querySelector('#scenario-portability-panel')?.hidden === false`);
  if (!open) await clickSelector(cdp, '#scenario-portability-toggle');
  await waitForExpression(cdp, `document.querySelector('#scenario-portability-panel')?.hidden === false`, 1_500);
}

async function setSpeed(cdp, value) {
  const actual = await evaluate(cdp, `(() => {
    const select = document.querySelector('#speed');
    if (!select || select.disabled) return null;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set Time control to ${value}`);
}

async function clickPauseTo(cdp, paused) {
  const current = await evaluate(cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (current !== paused) await clickSelector(cdp, '#pause');
  await waitForExpression(cdp, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 1_500);
}

async function fixedTilePoint(cdp, x, y) {
  const point = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tile = world.tiles[${y} * world.width + ${x}];
    if (!tile?.passable) return null;
    const worldX = (${x} + 0.5) * ${TILE_SIZE};
    const worldY = (${y} + 0.5) * ${TILE_SIZE};
    return {
      x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
      y: camera.y + (worldY - camera.worldView.y) * camera.zoom
    };
  })()`);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`fixed Replay/Fork tile ${x},${y} unavailable`);
  const obscured = await evaluate(cdp, `Boolean(document.elementFromPoint(${point.x}, ${point.y})?.closest?.('#scenario-setup-panel, #scenario-portability-panel, #topbar, #inspector-panel, #power-dock'))`);
  if (obscured) throw new Error(`fixed Replay/Fork tile ${x},${y} is obscured by UI`);
  return point;
}

async function fingerprint(cdp) {
  return evaluate(cdp, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function launchBrowser(url) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-replay-fork-'));
  const logFd = openSync(join(outDir, 'scenario-replay-fork-chrome-runtime.log'), 'w');
  const child = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--window-size=1440,900', '--force-device-scale-factor=1', '--run-all-compositor-stages-before-draw',
    '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', '--remote-allow-origins=*', '--enable-logging=stderr', '--log-level=0',
    `--user-data-dir=${userDataDir}`, url
  ], { stdio: ['ignore', logFd, logFd] });
  const port = await waitForDevToolsPort(userDataDir, child);
  const target = await waitForPageTarget(port, url, child);
  const cdp = await createCdpClient(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { child, userDataDir, logFd, cdp };
}

async function closeBrowser(session) {
  try { session.cdp?.close(); } catch {}
  await stopChrome(session.child);
  try { closeSync(session.logFd); } catch {}
  try { rmSync(session.userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove Replay/Fork Chrome profile: ${error?.message || error}`); }
}

async function clickSelector(cdp, selector) {
  const point = await elementCenter(cdp, selector);
  await clickPoint(cdp, point, 0);
  await delay(90);
}

async function clickPoint(cdp, point, modifiers = 0) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
}

async function elementCenter(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`element not found: ${selector}`);
  return point;
}

async function waitForDevToolsPort(dataDir, child) {
  const marker = join(dataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    if (existsSync(marker)) {
      const [port] = readFileSync(marker, 'utf8').trim().split(/\r?\n/u);
      if (/^\d+$/u.test(port)) return Number(port);
    }
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become ready');
}

async function waitForPageTarget(port, url, child) {
  const expected = new URL(url);
  const prefix = `${expected.origin}${expected.pathname}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((candidate) => candidate.type === 'page' && candidate.url.startsWith(prefix));
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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Runtime.evaluate failed';
    throw new Error(message);
  }
  return result.result?.value;
}

async function waitForExpression(cdp, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await delay(80);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function captureScreenshot(cdp, path) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
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

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
