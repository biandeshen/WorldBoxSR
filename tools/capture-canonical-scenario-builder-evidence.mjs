import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-canonical-scenario-builder-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

const TILE_SIZE = 28;
const NAME = 'Portable trio';
const SETUP = Object.freeze([
  Object.freeze({ placement: 'human', x: 12, y: 8 }),
  Object.freeze({ placement: 'grazer', x: 16, y: 12 }),
  Object.freeze({ placement: 'wolf', x: 14, y: 7 })
]);
const FORK_ACTION = Object.freeze({ type: 'spawn_human', x: 12, y: 8, count: 1 });
const EXPECTED_SOURCE_HASH = '7f07ed67';
const EXPECTED_FORK_HASH = '67543ff4';
const sessions = [];
mkdirSync(outDir, { recursive: true });

try {
  // Author through the ordinary production startup + visible Scenario Setup UI.
  const author = await launchBrowser('canonical-scenario-author', baseUrl);
  sessions.push(author);
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForScenarioRuntime(author.cdp);
  await clickPauseTo(author.cdp, true);
  await clickSelector(author.cdp, '#reset');
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(author.cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`, 2_000);
  const authorBaseDay = await evaluate(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day`);
  if (authorBaseDay !== 14400) throw new Error(`canonical author base drifted from exact Y40: ${authorBaseDay}`);

  await clickSelector(author.cdp, '#scenario-setup-enter');
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario Setup ready') === true`, 25_000);
  await replaceTextAndCommit(author.cdp, '#scenario-name', NAME);
  await waitForExpression(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.name === ${JSON.stringify(NAME)}`, 2_000);

  for (let index = 0; index < SETUP.length; index += 1) {
    const action = SETUP[index];
    await clickSelector(author.cdp, `[data-scenario-setup-tool="${action.placement}"]`);
    await clickPoint(author.cdp, await fixedTilePoint(author.cdp, action.x, action.y), 0);
    await waitForExpression(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === ${index + 1}`, 2_000);
  }

  const authored = await scenarioState(author.cdp);
  assertSourceStart(authored, 'authored source');
  const sourceCanonical = authored.recipe;
  const sourceFingerprint = authored.fingerprint;
  if (fnv1a(sourceFingerprint) !== EXPECTED_SOURCE_HASH) {
    throw new Error(`canonical source fingerprint drifted: expected ${EXPECTED_SOURCE_HASH}, got ${fnv1a(sourceFingerprint)}`);
  }
  assertPortableTrio(sourceCanonical);

  await openRecipePanel(author.cdp);
  await clickSelector(author.cdp, '#scenario-copy-link');
  await waitForExpression(author.cdp, `document.querySelector('#scenario-recipe-text')?.value?.includes('scenario=') === true`, 2_000);
  const sharedUrl = await evaluate(author.cdp, `document.querySelector('#scenario-recipe-text')?.value ?? ''`);
  const copyStatus = await evaluate(author.cdp, `document.querySelector('#scenario-portability-status')?.textContent ?? ''`);
  const shared = new URL(sharedUrl);
  const base = new URL(baseUrl);
  if (shared.origin !== base.origin || shared.pathname !== base.pathname || shared.searchParams.has('renderer')) {
    throw new Error(`canonical Copy Link changed Phaser project identity: ${sharedUrl}`);
  }
  const token = shared.searchParams.get('scenario');
  if (!token || !/^[A-Za-z0-9_-]+$/u.test(token) || token.includes('=')) throw new Error('canonical scenario token is not unpadded base64url');
  const independentlyDecoded = Buffer.from(token, 'base64url').toString('utf8');
  if (independentlyDecoded !== sourceCanonical) throw new Error('canonical Copy Link token did not decode to exact authored Recipe');
  if (!/copied|shown/iu.test(copyStatus)) throw new Error(`canonical Copy Link has no truthful result: ${copyStatus}`);
  if ((await fingerprint(author.cdp)) !== sourceFingerprint) throw new Error('Copy Link mutated authored source authority');
  await captureScreenshot(author.cdp, join(outDir, 'scenario-canonical-authored-share-1440x900.png'));

  // A genuinely fresh profile must reconstruct the exact same frozen source.
  const sharedSession = await launchBrowser('canonical-scenario-shared', sharedUrl);
  sessions.push(sharedSession);
  const cdp = sharedSession.cdp;
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('shared Scenario ready') === true`, 25_000);
  await waitForScenarioRuntime(cdp);
  const sharedStart = await scenarioState(cdp);
  assertSourceStart(sharedStart, 'fresh shared source');
  if (sharedStart.fingerprint !== sourceFingerprint || sharedStart.recipe !== sourceCanonical) {
    throw new Error('fresh shared URL did not reproduce authored Recipe/world byte-exactly');
  }

  // Establish transient story/inspection state so Replay must clean stale UI.
  await openChronicle(cdp);
  const sourceEventId = await evaluate(cdp, `Number(document.querySelector('#history-list button[data-event-id]')?.dataset?.eventId)`);
  if (!Number.isInteger(sourceEventId)) throw new Error('canonical shared source Chronicle has no retained event');
  await clickSelector(cdp, `#history-list button[data-event-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${sourceEventId}'`, 2_500);
  await clickSelector(cdp, `#history-detail button[data-event-card-follow][data-ref-kind="event"][data-ref-id="${sourceEventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#story-trail')?.hidden === false`, 2_000);
  await clickPoint(cdp, await fixedTilePoint(cdp, 12, 8), 1);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent !== 'Alt-click a tile or entity to inspect it.'`, 2_000);

  // Ordinary Time/Play + an existing destructive God Power must diverge authority only.
  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > 14400`, 3_000);
  await clickPauseTo(cdp, true);
  await clickSelector(cdp, '[data-tool-button="meteor"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, 12, 8), 0);
  await delay(150);
  const dirtySource = await scenarioState(cdp);
  if (dirtySource.fingerprint === sourceFingerprint || dirtySource.day <= 14400) {
    throw new Error(`ordinary source gameplay did not diverge authority: ${JSON.stringify(dirtySource)}`);
  }
  if (dirtySource.recipe !== sourceCanonical) throw new Error('ordinary source gameplay rewrote source Recipe');

  // Replay means exact rematerialization of the source Recipe, never rewind.
  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-replay');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Replay Scenario ready') === true`, 25_000);
  const replayedSource = await scenarioState(cdp);
  assertSourceStart(replayedSource, 'replayed source');
  if (replayedSource.fingerprint !== sourceFingerprint || replayedSource.recipe !== sourceCanonical) {
    throw new Error('Replay did not restore exact canonical source start/Recipe');
  }
  const transientAfterReplay = await transientPresentation(cdp);
  if (transientAfterReplay.eventCardId || transientAfterReplay.historyText.trim() !== 'Select an event'
      || !transientAfterReplay.trailHidden
      || transientAfterReplay.inspector.trim() !== 'Alt-click a tile or entity to inspect it.') {
    throw new Error(`Replay left stale source presentation: ${JSON.stringify(transientAfterReplay)}`);
  }
  await openRecipePanel(cdp);
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-source-replayed-1440x900.png'));

  // Fork/Edit starts from the exact source world + an independent editable copy.
  await clickSelector(cdp, '#scenario-fork');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioFork === 'true' && document.documentElement.dataset.scenarioSetup === 'true'`, 25_000);
  const forkBase = await forkState(cdp);
  if (forkBase.fingerprint !== sourceFingerprint || forkBase.draft !== sourceCanonical || forkBase.source !== sourceCanonical
      || forkBase.count !== '3/32 actions' || forkBase.state !== 'FORK · EDITING · PAUSED' || forkBase.badge !== 'FORK · 3') {
    throw new Error(`canonical Fork did not start from exact source copy: ${JSON.stringify(forkBase)}`);
  }
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-fork-editing-1440x900.png'));

  await clickSelector(cdp, '[data-scenario-setup-tool="human"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, FORK_ACTION.x, FORK_ACTION.y), 0);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === 4`, 2_000);
  const forkEdited = await forkState(cdp);
  if (forkEdited.source !== sourceCanonical) throw new Error('Fork edit mutated original source canonical Recipe');
  const forkRecipe = JSON.parse(forkEdited.draft);
  if (forkRecipe.setup.length !== 4 || JSON.stringify(forkRecipe.setup[3]) !== JSON.stringify(FORK_ACTION)) {
    throw new Error(`canonical fork lacks exact fixed fourth Human action: ${forkEdited.draft}`);
  }
  if (forkEdited.draft === sourceCanonical || forkEdited.fingerprint === sourceFingerprint) {
    throw new Error('canonical fork edit did not create distinct Recipe/world');
  }
  const forkCanonical = forkEdited.draft;
  const forkFingerprint = forkEdited.fingerprint;
  if (fnv1a(forkFingerprint) !== EXPECTED_FORK_HASH) {
    throw new Error(`canonical fork fingerprint drifted: expected ${EXPECTED_FORK_HASH}, got ${fnv1a(forkFingerprint)}`);
  }

  await clickSelector(cdp, '#scenario-setup-run');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioSetup === 'false'`, 2_000);
  if ((await frozenRecipeString(cdp)) !== forkCanonical) throw new Error('Run did not freeze canonical fork Recipe');
  if ((await forkSourceString(cdp)) !== sourceCanonical) throw new Error('Run of canonical fork lost immutable source identity');

  // Dirty the fork through ordinary gameplay, then Replay current fork exactly.
  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > 14400`, 3_000);
  await clickPauseTo(cdp, true);
  const dirtyForkFingerprint = await fingerprint(cdp);
  if (dirtyForkFingerprint === forkFingerprint) throw new Error('ordinary fork gameplay did not diverge fork start');
  if ((await forkSourceString(cdp)) !== sourceCanonical) throw new Error('ordinary fork gameplay mutated original source identity');

  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-replay');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Replay Scenario ready') === true`, 25_000);
  const replayedFork = await scenarioState(cdp);
  if (replayedFork.fingerprint !== forkFingerprint || replayedFork.recipe !== forkCanonical || replayedFork.day !== 14400
      || !replayedFork.paused || replayedFork.active || replayedFork.badge !== 'SCENARIO · 4') {
    throw new Error(`Replay did not restore exact canonical fork: ${JSON.stringify(replayedFork)}`);
  }
  if ((await forkSourceString(cdp)) !== sourceCanonical) throw new Error('Replay of fork mutated original source identity');
  await openRecipePanel(cdp);
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-fork-replayed-1440x900.png'));

  writeFileSync(join(outDir, 'canonical-scenario-builder-evidence.json'), `${JSON.stringify({
    author: {
      canonicalRecipe: sourceCanonical,
      fingerprint: fnv1a(sourceFingerprint),
      day: authored.day,
      shareUrl: sharedUrl,
      tokenUnpaddedBase64Url: true,
      independentlyDecodedExactRecipe: true,
      copyStatus
    },
    freshShared: {
      canonicalRecipeExact: sharedStart.recipe === sourceCanonical,
      fingerprint: fnv1a(sharedStart.fingerprint),
      day: sharedStart.day,
      paused: sharedStart.paused,
      byteIdenticalToAuthor: sharedStart.fingerprint === sourceFingerprint
    },
    dirtySource: {
      fingerprint: fnv1a(dirtySource.fingerprint),
      day: dirtySource.day,
      diverged: true,
      sourceRecipeUnchanged: dirtySource.recipe === sourceCanonical
    },
    replaySource: {
      fingerprint: fnv1a(replayedSource.fingerprint),
      exactSourceRestored: true,
      staleStoryAndInspectorCleared: true,
      sourceRecipeUnchanged: replayedSource.recipe === sourceCanonical
    },
    fork: {
      sourceCanonicalUnchanged: forkEdited.source === sourceCanonical,
      addedAction: FORK_ACTION,
      canonicalRecipe: forkCanonical,
      fingerprint: fnv1a(forkFingerprint),
      distinctFromSource: forkFingerprint !== sourceFingerprint
    },
    dirtyFork: {
      fingerprint: fnv1a(dirtyForkFingerprint),
      diverged: true,
      sourceCanonicalUnchanged: true
    },
    replayFork: {
      fingerprint: fnv1a(replayedFork.fingerprint),
      exactForkRestored: true,
      forkRecipeExact: replayedFork.recipe === forkCanonical,
      originalSourceCanonicalStillUnchanged: true
    },
    canonicalJourneyComplete: true
  }, null, 2)}\n`);

  console.log(
    `Canonical Scenario Builder gate: author/share ${fnv1a(sourceFingerprint)} → fresh shared exact → dirty source ${fnv1a(dirtySource.fingerprint)} `
    + `→ Replay source exact → Fork + Human @12,8 ${fnv1a(forkFingerprint)} → dirty fork ${fnv1a(dirtyForkFingerprint)} → Replay fork exact`
  );
} finally {
  for (const session of sessions.reverse()) await closeBrowser(session);
}

function assertSourceStart(state, label) {
  if (state.day !== 14400 || !state.paused || state.recipe === null) throw new Error(`${label} is not paused exact-Y40 Scenario: ${JSON.stringify(state)}`);
  if (state.active && label !== 'authored source') throw new Error(`${label} unexpectedly remained editable Setup: ${JSON.stringify(state)}`);
  if (!state.active && state.badge !== 'SCENARIO · 3') throw new Error(`${label} lost frozen Scenario badge: ${JSON.stringify(state)}`);
  if (state.active && state.badge !== 'SETUP · 3') throw new Error(`${label} lost authored Setup badge: ${JSON.stringify(state)}`);
}

function assertPortableTrio(canonical) {
  const recipe = JSON.parse(canonical);
  if (recipe.kind !== 'worldboxsr-scenario' || recipe.version !== 1 || recipe.name !== NAME
      || recipe.base?.seed !== 45 || recipe.base?.preset !== 'sandbox' || recipe.setup?.length !== 3) {
    throw new Error(`canonical authored Recipe identity mismatch: ${canonical}`);
  }
  const expected = SETUP.map((action) => action.placement === 'human'
    ? { type: 'spawn_human', x: action.x, y: action.y, count: 1 }
    : { type: 'spawn_creature', species: action.placement, x: action.x, y: action.y, count: 1 });
  if (JSON.stringify(recipe.setup) !== JSON.stringify(expected)) throw new Error(`canonical authored setup mismatch: ${canonical}`);
}

async function waitForScenarioRuntime(cdp) {
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.attached === true`, 5_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioPortability?.attached === true`, 5_000);
  await waitForExpression(cdp, `document.querySelector('#scenario-replay') !== null && document.querySelector('#scenario-fork') !== null`, 3_000);
}

async function scenarioState(cdp) {
  return evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const setup = scene?.scenarioSetup;
    const recipe = setup?.currentRecipe?.() ?? (setup?.active ? setup?.draft : setup?.frozen) ?? null;
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

async function transientPresentation(cdp) {
  return evaluate(cdp, `(() => ({
    eventCardId: document.querySelector('#history-detail')?.dataset?.eventCardId ?? '',
    historyText: document.querySelector('#history-detail')?.textContent ?? '',
    trailHidden: document.querySelector('#story-trail')?.hidden === true,
    inspector: document.querySelector('#inspector')?.textContent ?? ''
  }))()`);
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

async function replaceTextAndCommit(cdp, selector, value) {
  const input = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return false;
    element.focus();
    element.select();
    return document.activeElement === element && element.selectionStart === 0 && element.selectionEnd === element.value.length;
  })()`);
  if (!input) throw new Error(`canonical Scenario input could not be focused/selected: ${selector}`);
  await cdp.send('Input.insertText', { text: value });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  await delay(100);
}

async function setSpeed(cdp, value) {
  const actual = await evaluate(cdp, `(() => {
    const select = document.querySelector('#speed');
    if (!select || select.disabled) return null;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set canonical Time control to ${value}`);
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
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`canonical fixed tile ${x},${y} unavailable`);
  const obscured = await evaluate(cdp, `Boolean(document.elementFromPoint(${point.x}, ${point.y})?.closest?.('#scenario-setup-panel, #scenario-portability-panel, #topbar, #inspector-panel, #power-dock'))`);
  if (obscured) throw new Error(`canonical fixed tile ${x},${y} is obscured by UI`);
  return point;
}

async function fingerprint(cdp) {
  return evaluate(cdp, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function launchBrowser(label, url) {
  const userDataDir = mkdtempSync(join(tmpdir(), `worldboxsr-${label}-`));
  const logFd = openSync(join(outDir, `${label}-chrome-runtime.log`), 'w');
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
  return { label, child, userDataDir, logFd, cdp };
}

async function closeBrowser(session) {
  try { session.cdp?.close(); } catch {}
  await stopChrome(session.child);
  try { closeSync(session.logFd); } catch {}
  try { rmSync(session.userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove ${session.label} profile: ${error?.message || error}`); }
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
  throw new Error(`Chrome page target did not become ready for ${url}`);
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
