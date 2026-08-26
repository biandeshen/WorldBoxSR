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
const CHROME_STARTUP_TIMEOUT_MS = 30_000;
// Immutable v0.7.0 release/tag evidence remains source 7f07ed67 / fork 67543ff4.
// v0.8 intentionally evolves authoritative political history before the Y40
// Scenario base, so this live regression gate tracks the deterministic
// current-main world baselines while preserving every Recipe/share/Replay/Fork
// exactness assertion below. Never rewrite the historical v0.7 release hashes.
const EXPECTED_SOURCE_HASH = 'b411c106';
const EXPECTED_FORK_HASH = '0f28ca42';
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
    throw new Error('Replay did not restore exact source Recipe authority');
  }
  if (fnv1a(replayedSource.fingerprint) !== EXPECTED_SOURCE_HASH) throw new Error('replayed canonical source hash drifted');
  const replayTransient = await transientPresentation(cdp);
  if (replayTransient.eventCardId !== '' || !replayTransient.trailHidden || replayTransient.inspector !== 'Alt-click a tile or entity to inspect it.') {
    throw new Error(`Replay retained stale transient presentation: ${JSON.stringify(replayTransient)}`);
  }
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-source-replayed-1440x900.png'));

  // Fork/Edit must create an independent Recipe copy while preserving the source.
  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-fork');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Fork Scenario ready') === true`, 25_000);
  await waitForExpression(cdp, `document.querySelector('#scenario-state-badge')?.textContent === 'SETUP · 3'`, 2_000);
  const forkSourceBefore = await forkSourceString(cdp);
  if (forkSourceBefore !== sourceCanonical) throw new Error('Fork did not retain exact immutable source Recipe');
  const forkStartBeforeEdit = await forkState(cdp);
  if (forkStartBeforeEdit.draft !== sourceCanonical || forkStartBeforeEdit.source !== sourceCanonical) {
    throw new Error('Fork did not begin as an independent exact Recipe copy');
  }
  if (forkStartBeforeEdit.fingerprint !== sourceFingerprint) throw new Error('Fork changed world before edit');

  await clickSelector(cdp, '[data-scenario-setup-tool="human"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, FORK_ACTION.x, FORK_ACTION.y), 0);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === 4`, 2_000);
  const editedFork = await forkState(cdp);
  if (editedFork.source !== sourceCanonical) throw new Error('fork edit mutated source Recipe identity');
  const editedRecipe = JSON.parse(editedFork.draft);
  if (editedRecipe.setup.length !== 4 || JSON.stringify(editedRecipe.setup.at(-1)) !== JSON.stringify(FORK_ACTION)) {
    throw new Error(`canonical fork action mismatch: ${editedFork.draft}`);
  }
  const forkFingerprint = editedFork.fingerprint;
  if (forkFingerprint === sourceFingerprint || fnv1a(forkFingerprint) !== EXPECTED_FORK_HASH) {
    throw new Error(`canonical fork fingerprint drifted: expected ${EXPECTED_FORK_HASH}, got ${fnv1a(forkFingerprint)}`);
  }
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-fork-editing-1440x900.png'));

  // Freeze and play the fork, then Replay must rematerialize the exact fork start.
  await clickSelector(cdp, '#scenario-run');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario running') === true`, 2_500);
  const forkCanonical = await frozenRecipeString(cdp);
  if (forkCanonical !== editedFork.draft) throw new Error('Run changed canonical fork Recipe');
  if ((await fingerprint(cdp)) !== forkFingerprint) throw new Error('Run changed canonical fork starting authority');

  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > 14400`, 3_000);
  await clickPauseTo(cdp, true);
  await clickSelector(cdp, '[data-tool-button="meteor"]');
  await clickPoint(cdp, await fixedTilePoint(cdp, 12, 8), 0);
  await delay(150);
  const dirtyFork = await scenarioState(cdp);
  if (dirtyFork.fingerprint === forkFingerprint || dirtyFork.recipe !== forkCanonical) {
    throw new Error('ordinary fork gameplay did not diverge authority cleanly');
  }

  await openRecipePanel(cdp);
  await clickSelector(cdp, '#scenario-replay');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Replay Scenario ready') === true`, 25_000);
  const replayedFork = await scenarioState(cdp);
  if (replayedFork.fingerprint !== forkFingerprint || replayedFork.recipe !== forkCanonical || fnv1a(replayedFork.fingerprint) !== EXPECTED_FORK_HASH) {
    throw new Error('Replay did not restore exact canonical fork authority');
  }
  if ((await forkSourceString(cdp)) !== sourceCanonical) throw new Error('fork Replay mutated source Recipe identity');
  if (replayedFork.badge !== 'SCENARIO · 4') throw new Error(`fork Replay badge drifted: ${replayedFork.badge}`);
  await captureScreenshot(cdp, join(outDir, 'scenario-canonical-fork-replayed-1440x900.png'));

  const evidence = {
    seed: 45,
    source: {
      recipe: JSON.parse(sourceCanonical),
      fingerprint: EXPECTED_SOURCE_HASH,
      dirtyFingerprint: fnv1a(dirtySource.fingerprint)
    },
    fork: {
      recipe: JSON.parse(forkCanonical),
      fingerprint: EXPECTED_FORK_HASH,
      dirtyFingerprint: fnv1a(dirtyFork.fingerprint)
    },
    canonicalJourneyComplete: true
  };
  writeFileSync(join(outDir, 'canonical-scenario-builder-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Canonical Scenario Builder gate: source ${EXPECTED_SOURCE_HASH} → dirty ${evidence.source.dirtyFingerprint} → Replay exact; fork ${EXPECTED_FORK_HASH} → dirty ${evidence.fork.dirtyFingerprint} → Replay exact; immutable source Recipe preserved`);
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
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`canonical tile ${x},${y} unavailable`);
  return point;
}

async function fingerprint(cdp) {
  return evaluate(cdp, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function clickSelector(cdp, selector) {
  const point = await centerForSelector(cdp, selector);
  await clickPoint(cdp, point, 0);
}

async function centerForSelector(cdp, selector) {
  const rect = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
  })()`);
  if (!rect || rect.width <= 0 || rect.height <= 0) throw new Error(`canonical selector unavailable: ${selector}`);
  return { x: rect.x, y: rect.y };
}

async function clickPoint(cdp, point, button) {
  const inspect = button === 1;
  const modifiers = inspect ? 1 : 0; // CDP Alt modifier; product contract is Alt-click or right-click.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
}

async function captureScreenshot(cdp, path) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(image.data, 'base64'));
}

async function waitForExpression(cdp, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(cdp, expression).catch((error) => ({ error: error.message }));
    if (last === true) return;
    await delay(80);
  }
  throw new Error(`canonical wait timed out: ${expression}; last=${JSON.stringify(last)}`);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'runtime evaluation failed');
  return result.result?.value;
}

async function launchBrowser(label, url) {
  const userDataDir = mkdtempSync(join(tmpdir(), `worldboxsr-${label}-`));
  const portFile = join(userDataDir, 'DevToolsActivePort');
  const chromeLog = join(outDir, `${label}-chrome.log`);
  const fd = openSync(chromeLog, 'w');
  const proc = spawn(browser, [
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
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: ['ignore', fd, fd] });
  closeSync(fd);

  try {
    const port = await waitForDevToolsPort(portFile, proc, CHROME_STARTUP_TIMEOUT_MS);
    const [, browserPath] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/u);
    if (!browserPath?.startsWith('/devtools/browser/')) throw new Error('Chrome DevTools browser endpoint missing');
    const cdp = await connectCdp(port, browserPath, proc, CHROME_STARTUP_TIMEOUT_MS);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url });
    return { proc, cdp, userDataDir };
  } catch (error) {
    await terminate(proc);
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch (cleanupError) {
      console.warn(`Could not fully remove failed browser profile ${userDataDir}: ${cleanupError.message}`);
    }
    throw error;
  }
}

async function closeBrowser(session) {
  if (!session) return;
  try { await session.cdp?.send('Browser.close'); } catch {}
  try { session.cdp?.close(); } catch {}
  await terminate(session.proc);
  try { rmSync(session.userDataDir, { recursive: true, force: true }); } catch (error) {
    console.warn(`Could not fully remove ${session.userDataDir}: ${error.message}`);
  }
}

async function terminate(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    delay(1_000).then(() => { if (proc.exitCode === null) proc.kill('SIGKILL'); })
  ]);
}

async function waitForDevToolsPort(portFile, proc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`Chrome exited before DevTools became ready: ${proc.exitCode}`);
    if (existsSync(portFile)) {
      const [port] = readFileSync(portFile, 'utf8').split(/\r?\n/u);
      if (/^\d+$/u.test(port)) return Number(port);
    }
    await delay(50);
  }
  throw new Error('timed out waiting for Chrome DevTools port');
}

async function connectCdp(port, browserPath, proc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`Chrome exited while connecting CDP: ${proc.exitCode}`);
    let browserClient = null;
    try {
      browserClient = new CdpClient(`ws://127.0.0.1:${port}${browserPath}`);
      const targets = await browserClient.send('Target.getTargets');
      let page = targets.targetInfos?.find((entry) => entry.type === 'page') ?? null;
      if (!page) {
        const created = await browserClient.send('Target.createTarget', { url: 'about:blank' });
        page = { targetId: created.targetId };
      }
      const attached = await browserClient.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
      return new CdpSessionClient(browserClient, attached.sessionId);
    } catch (error) {
      lastError = error;
      try { browserClient?.close(); } catch {}
      await delay(80);
    }
  }
  throw new Error(`timed out connecting to Chrome DevTools browser endpoint; last=${lastError?.message ?? 'none'}`);
}

function CdpClient(url) {
  this.socket = new WebSocket(url);
  this.nextId = 1;
  this.pending = new Map();
  this.ready = new Promise((resolve, reject) => {
    this.socket.addEventListener('open', resolve, { once: true });
    this.socket.addEventListener('error', reject, { once: true });
  });
  this.socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result ?? {});
  });

  this.send = async (method, params = {}, sessionId = null) => {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  };

  this.close = () => {
    this.socket.close();
  };
}

function CdpSessionClient(browserClient, sessionId) {
  this.browserClient = browserClient;
  this.sessionId = sessionId;

  this.send = (method, params = {}) => {
    if (method === 'Browser.close') return this.browserClient.send(method, params);
    return this.browserClient.send(method, params, this.sessionId);
  };

  this.close = () => {
    this.browserClient.close();
  };
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
