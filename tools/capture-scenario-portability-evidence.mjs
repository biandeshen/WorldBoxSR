import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const [browser, baseUrl, outDirArgument] = process.argv.slice(2);
if (!browser || !baseUrl || !outDirArgument) {
  console.error('usage: node tools/capture-scenario-portability-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}
const outDir = resolve(outDirArgument);

const TILE_SIZE = 28;
const NAME = 'Portable trio';
const SETUP = Object.freeze([
  Object.freeze({ placement: 'human', x: 12, y: 8 }),
  Object.freeze({ placement: 'grazer', x: 16, y: 12 }),
  Object.freeze({ placement: 'wolf', x: 14, y: 7 })
]);
const IMPASSABLE = Object.freeze({ x: 18, y: 12 });
const sessions = [];
mkdirSync(outDir, { recursive: true });

try {
  const author = await launchBrowser('portable-author', baseUrl);
  sessions.push(author);
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForScenarioRuntime(author.cdp);
  await clickPauseTo(author.cdp, true);
  await clickSelector(author.cdp, '#reset');
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(author.cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`, 2_000);

  const ordinaryDay = await evaluate(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day`);
  if (ordinaryDay !== 40 * 360) throw new Error(`portable author base drifted from exact Y40: ${ordinaryDay}`);

  await clickSelector(author.cdp, '#scenario-setup-enter');
  await waitForExpression(author.cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario Setup ready') === true`, 25_000);
  await replaceTextAndCommit(author.cdp, '#scenario-name', NAME);
  await waitForExpression(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.name === ${JSON.stringify(NAME)}`, 2_000);

  for (let index = 0; index < SETUP.length; index += 1) {
    const action = SETUP[index];
    await clickSelector(author.cdp, `[data-scenario-setup-tool="${action.placement}"]`);
    const point = await fixedTilePoint(author.cdp, action.x, action.y, true);
    await clickPoint(author.cdp, point);
    await waitForExpression(author.cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === ${index + 1}`, 2_000);
  }

  const authored = await scenarioState(author.cdp);
  if (!authored.active || authored.paused !== true || authored.recipe?.setup?.length !== 3) {
    throw new Error(`portable author Scenario mismatch: ${JSON.stringify(authored)}`);
  }
  assertRecipe(authored.recipe);
  const canonical = JSON.stringify(authored.recipe);
  const startFingerprint = authored.fingerprint;

  await clickSelector(author.cdp, '#scenario-portability-toggle');
  await waitForExpression(author.cdp, `document.querySelector('#scenario-portability-panel')?.hidden === false`, 2_000);
  await waitForExpression(author.cdp, `getComputedStyle(document.querySelector('#scenario-portability-panel')).position === 'fixed'`, 2_000);
  await waitForExpression(author.cdp, `document.querySelector('#scenario-portability-summary')?.textContent?.includes(${JSON.stringify(NAME)}) === true`, 2_000);

  await clickSelector(author.cdp, '#scenario-copy-link');
  await waitForExpression(author.cdp, `document.querySelector('#scenario-recipe-text')?.value?.includes('scenario=') === true`, 2_000);
  const sharedUrl = await evaluate(author.cdp, `document.querySelector('#scenario-recipe-text')?.value ?? ''`);
  const copyStatus = await evaluate(author.cdp, `document.querySelector('#scenario-portability-status')?.textContent ?? ''`);
  const shared = new URL(sharedUrl);
  if (shared.origin !== new URL(baseUrl).origin || shared.pathname !== new URL(baseUrl).pathname) {
    throw new Error(`Copy Link changed project origin/path: ${sharedUrl}`);
  }
  if (shared.searchParams.has('renderer')) throw new Error(`canonical share link should target Phaser: ${sharedUrl}`);
  const token = shared.searchParams.get('scenario');
  if (!token || !/^[A-Za-z0-9_-]+$/u.test(token) || token.includes('=')) throw new Error('share token is not unpadded base64url');
  const independentlyDecoded = Buffer.from(token, 'base64url').toString('utf8');
  if (independentlyDecoded !== canonical) throw new Error('Copy Link token does not decode to the exact canonical Recipe string');
  if (!/copied|shown/iu.test(copyStatus)) throw new Error(`Copy Link gave no truthful result: ${copyStatus}`);

  const downloadPath = join(outDir, `${NAME.replaceAll(' ', '-')}.worldboxsr-scenario.json`);
  try { rmSync(downloadPath, { force: true }); } catch {}
  await author.cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await clickSelector(author.cdp, '#scenario-export-json');
  await waitForExpression(author.cdp, `document.querySelector('#scenario-recipe-text')?.value === ${JSON.stringify(canonical)}`, 2_000);
  await waitForFile(downloadPath, 3_000);
  const exportedJson = readFileSync(downloadPath, 'utf8');
  if (exportedJson !== canonical) throw new Error('downloaded Scenario JSON is not the canonical Recipe string');
  if ((await fingerprint(author.cdp)) !== startFingerprint) throw new Error('Copy/Export mutated authored Scenario authority');
  await captureScreenshot(author.cdp, join(outDir, 'scenario-portable-share-1440x900.png'));

  const sharedTab = await launchBrowser('portable-shared', sharedUrl);
  sessions.push(sharedTab);
  await waitForExpression(sharedTab.cdp, `document.querySelector('#boot-status')?.textContent?.includes('shared Scenario ready') === true`, 25_000);
  await waitForScenarioRuntime(sharedTab.cdp);
  const sharedState = await scenarioState(sharedTab.cdp);
  if (sharedState.fingerprint !== startFingerprint || sharedState.paused !== true || sharedState.day !== 40 * 360) {
    throw new Error(`fresh shared link did not reproduce exact paused start: ${JSON.stringify(sharedState)}`);
  }
  if (JSON.stringify(sharedState.recipe) !== canonical || sharedState.active || sharedState.badge !== 'SCENARIO · 3') {
    throw new Error(`fresh shared link lost frozen Recipe identity: ${JSON.stringify(sharedState)}`);
  }
  await clickSelector(sharedTab.cdp, '#scenario-portability-toggle');
  await waitForExpression(sharedTab.cdp, `document.querySelector('#scenario-portability-summary')?.textContent?.includes(${JSON.stringify(NAME)}) === true`, 2_000);
  await captureScreenshot(sharedTab.cdp, join(outDir, 'scenario-portable-shared-start-1440x900.png'));

  const importer = await launchBrowser('portable-import', baseUrl);
  sessions.push(importer);
  await waitForExpression(importer.cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForScenarioRuntime(importer.cdp);
  await clickSelector(importer.cdp, '#scenario-portability-toggle');
  await waitForExpression(importer.cdp, `document.querySelector('#scenario-portability-panel')?.hidden === false`, 2_000);
  const importSearchBefore = await evaluate(importer.cdp, `window.location.search`);
  await replaceText(importer.cdp, '#scenario-recipe-text', canonical);
  await clickSelector(importer.cdp, '#scenario-import-json');
  await waitForExpression(importer.cdp, `document.querySelector('#boot-status')?.textContent?.includes('imported Scenario ready') === true`, 25_000);
  await waitForExpression(importer.cdp, `document.querySelector('#scenario-portability-status')?.textContent?.startsWith('Imported ') === true`, 2_000);
  const imported = await scenarioState(importer.cdp);
  if (imported.fingerprint !== startFingerprint || imported.paused !== true || imported.day !== 40 * 360) {
    throw new Error(`visible JSON Import did not reproduce exact paused start: ${JSON.stringify(imported)}`);
  }
  if (JSON.stringify(imported.recipe) !== canonical || imported.active || imported.badge !== 'SCENARIO · 3') {
    throw new Error(`visible JSON Import lost frozen Recipe identity: ${JSON.stringify(imported)}`);
  }
  if ((await evaluate(importer.cdp, `window.location.search`)) !== importSearchBefore) throw new Error('Import JSON mutated the current URL');

  const beforeRejected = await rejectedState(importer.cdp);
  const invalid = JSON.stringify({
    kind: 'worldboxsr-scenario',
    version: 1,
    name: 'Rejected sea wolf',
    base: { seed: 45, preset: 'sandbox' },
    setup: [{ type: 'spawn_creature', species: 'wolf', x: IMPASSABLE.x, y: IMPASSABLE.y, count: 1 }]
  });
  await replaceText(importer.cdp, '#scenario-recipe-text', invalid);
  await clickSelector(importer.cdp, '#scenario-import-json');
  await waitForExpression(importer.cdp, `document.querySelector('#scenario-portability-status')?.textContent?.startsWith('Import rejected:') === true`, 25_000);
  const afterRejected = await rejectedState(importer.cdp);
  if (JSON.stringify(afterRejected) !== JSON.stringify(beforeRejected)) {
    throw new Error(`rejected import changed current world/recipe/url/status boundary: ${JSON.stringify({ beforeRejected, afterRejected })}`);
  }
  const rejectText = await evaluate(importer.cdp, `document.querySelector('#scenario-portability-status')?.textContent ?? ''`);
  if (!/impassable/iu.test(rejectText)) throw new Error(`rejected import did not explain the actual validation failure: ${rejectText}`);
  await captureScreenshot(importer.cdp, join(outDir, 'scenario-portable-imported-1440x900.png'));

  writeFileSync(join(outDir, 'scenario-portability-evidence.json'), `${JSON.stringify({
    source: {
      name: NAME,
      setup: SETUP,
      canonicalRecipe: canonical,
      fingerprint: fnv1a(startFingerprint),
      copyStatus,
      shareUrl: sharedUrl,
      tokenUnpaddedBase64Url: true,
      independentlyDecodedExactRecipe: true,
      exportedJsonExactRecipe: true,
      exportFile: basename(downloadPath)
    },
    freshSharedLink: {
      paused: sharedState.paused,
      day: sharedState.day,
      recipeExact: JSON.stringify(sharedState.recipe) === canonical,
      fingerprint: fnv1a(sharedState.fingerprint)
    },
    visibleJsonImport: {
      paused: imported.paused,
      day: imported.day,
      recipeExact: JSON.stringify(imported.recipe) === canonical,
      fingerprint: fnv1a(imported.fingerprint),
      urlUnchanged: true
    },
    rejectedImport: {
      impassable: IMPASSABLE,
      worldRecipeUrlAndBootStatusUnchanged: true,
      error: rejectText
    },
    allThreeStartsByteIdentical: true
  }, null, 2)}\n`);

  console.log(
    `Portable Scenario evidence: ${NAME} ${SETUP.length} actions → Copy Link token exact → JSON export exact → `
    + `fresh shared URL fingerprint ${fnv1a(startFingerprint)} → visible JSON Import same fingerprint; `
    + `impassable ${IMPASSABLE.x},${IMPASSABLE.y} rejected atomically`
  );
} finally {
  for (const session of sessions.reverse()) await closeBrowser(session);
}

function assertRecipe(recipe) {
  if (!recipe || recipe.kind !== 'worldboxsr-scenario' || recipe.version !== 1 || recipe.name !== NAME
      || recipe.base?.seed !== 45 || recipe.base?.preset !== 'sandbox') {
    throw new Error(`portable Recipe identity mismatch: ${JSON.stringify(recipe)}`);
  }
  const expected = SETUP.map((action) => action.placement === 'human'
    ? { type: 'spawn_human', x: action.x, y: action.y, count: 1 }
    : { type: 'spawn_creature', species: action.placement, x: action.x, y: action.y, count: 1 });
  if (JSON.stringify(recipe.setup) !== JSON.stringify(expected)) throw new Error(`portable Recipe setup mismatch: ${JSON.stringify(recipe.setup)}`);
}

async function waitForScenarioRuntime(cdp) {
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.attached === true`, 5_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioPortability?.attached === true`, 5_000);
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
      recipe: recipe ? structuredClone(recipe) : null,
      badge: document.querySelector('#scenario-state-badge')?.textContent ?? '',
      boot: document.querySelector('#boot-status')?.textContent ?? '',
      url: window.location.href
    };
  })()`);
}

async function rejectedState(cdp) {
  return evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const setup = scene?.scenarioSetup;
    const recipe = setup?.currentRecipe?.() ?? (setup?.active ? setup?.draft : setup?.frozen) ?? null;
    return {
      fingerprint: JSON.stringify(scene?.world),
      recipe: JSON.stringify(recipe),
      url: window.location.href,
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      boot: document.querySelector('#boot-status')?.textContent ?? ''
    };
  })()`);
}

async function fixedTilePoint(cdp, x, y, passable) {
  const point = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tile = world.tiles[${y} * world.width + ${x}];
    const worldX = (${x} + 0.5) * ${TILE_SIZE};
    const worldY = (${y} + 0.5) * ${TILE_SIZE};
    const sx = camera.x + (worldX - camera.worldView.x) * camera.zoom;
    const sy = camera.y + (worldY - camera.worldView.y) * camera.zoom;
    return { x: sx, y: sy, passable: tile?.passable === true };
  })()`);
  if (!point || point.passable !== passable) throw new Error(`portable fixed tile drifted at ${x},${y}: ${JSON.stringify(point)}`);
  const obstructed = await evaluate(cdp, `(() => {
    const node = document.elementFromPoint(${point.x}, ${point.y});
    return Boolean(node?.closest?.('#scenario-setup-panel, #scenario-portability-panel, #inspector-panel, #topbar, #power-dock'));
  })()`);
  if (obstructed) throw new Error(`portable fixed tile ${x},${y} is obscured by UI`);
  return point;
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

async function replaceTextAndCommit(cdp, selector, value) {
  await replaceText(cdp, selector, value);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  await delay(100);
}

async function replaceText(cdp, selector, value) {
  const prepared = await evaluate(cdp, `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) return false;
    input.focus();
    input.select();
    return document.activeElement === input && input.selectionStart === 0 && input.selectionEnd === input.value.length;
  })()`);
  if (!prepared) throw new Error(`Scenario portability input could not be focused/selected: ${selector}`);
  await cdp.send('Input.insertText', { text: value });
  const actual = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.value ?? ''`);
  if (actual !== value) throw new Error(`Scenario portability input did not contain expected text: ${value}`);
  await delay(80);
}

async function clickPauseTo(cdp, paused) {
  const current = await evaluate(cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (current !== paused) await clickSelector(cdp, '#pause');
  await waitForExpression(cdp, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 2_000);
}

async function fingerprint(cdp) {
  return evaluate(cdp, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function clickSelector(cdp, selector) {
  const point = await elementCenter(cdp, selector);
  await clickPoint(cdp, point);
  await delay(90);
}

async function clickPoint(cdp, point) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
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

async function waitForFile(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await delay(60);
  }
  throw new Error(`timed out waiting for Scenario JSON download: ${path}`);
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
