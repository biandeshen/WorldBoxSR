import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-natural-fauna-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-natural-fauna-'));
const logFd = openSync(join(outDir, 'natural-fauna-chrome-runtime.log'), 'w');
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

  const sandbox = await stateEvidence(cdp);
  if (sandbox.preset !== 'sandbox') throw new Error(`Sandbox was not the default world mode: ${JSON.stringify(sandbox)}`);
  if (sandbox.birthChance !== 0 || sandbox.oldAgeEnabled !== false) throw new Error(`Sandbox ecology defaults changed: ${JSON.stringify(sandbox)}`);
  if (sandbox.livingGrazers !== 8 || sandbox.godGrazerSpawns !== 8) throw new Error(`Sandbox showcase grazer contract changed: ${JSON.stringify(sandbox)}`);

  const changed = await evaluate(cdp, `(() => {
    const preset = document.querySelector('#world-preset');
    if (!preset) return null;
    preset.value = 'living_ecology';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
    return preset.value;
  })()`);
  if (changed !== 'living_ecology') throw new Error('failed to select Living Ecology through visible world-mode control');
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);

  const ecology = await stateEvidence(cdp);
  if (ecology.preset !== 'living_ecology') throw new Error(`Living Ecology selection did not survive reset: ${JSON.stringify(ecology)}`);
  if (ecology.width !== 24 || ecology.height !== 24) throw new Error(`Living Ecology must remain supported 24x24 scope: ${JSON.stringify(ecology)}`);
  if (ecology.birthChance !== 0.001 || ecology.oldAgeEnabled !== true) throw new Error(`Living Ecology config mismatch: ${JSON.stringify(ecology)}`);
  if (ecology.godGrazerSpawns !== 0) throw new Error(`Living Ecology founders were misrepresented as god spawns: ${JSON.stringify(ecology)}`);
  if (ecology.creatureBirths < 1 || ecology.retainedNaturalBirths < 1) throw new Error(`Living Ecology warmup produced no retained natural grazer birth: ${JSON.stringify(ecology)}`);
  if (ecology.livingGrazers < 1) throw new Error(`Living Ecology has no living grazers at showcase ready: ${JSON.stringify(ecology)}`);

  await pauseWorld(cdp);
  const beforeInspect = await fingerprint(cdp);
  const targetGrazer = await visibleGrazerTarget(cdp);
  if (!targetGrazer) throw new Error('no inspectable Living Ecology grazer was visible in canonical viewport');
  await altClickPoint(cdp, targetGrazer);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.includes('Grazer #${targetGrazer.id}') === true`, 2_000);
  const inspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  const afterInspect = await fingerprint(cdp);
  if (afterInspect !== beforeInspect) throw new Error('grazer inspection mutated authoritative world state');

  await captureScreenshot(cdp, join(outDir, 'living-ecology-natural-fauna-1440x900.png'));
  const final = await stateEvidence(cdp);
  if (!final.paused) throw new Error('Living Ecology world resumed during read-only inspection');
  if (final.preset !== 'living_ecology') throw new Error('world-mode control drifted after inspection');

  writeFileSync(join(outDir, 'natural-fauna-evidence.json'), `${JSON.stringify({
    sandbox: {
      preset: sandbox.preset,
      birthChance: sandbox.birthChance,
      oldAgeEnabled: sandbox.oldAgeEnabled,
      livingGrazers: sandbox.livingGrazers,
      godGrazerSpawns: sandbox.godGrazerSpawns
    },
    livingEcology: {
      preset: ecology.preset,
      width: ecology.width,
      height: ecology.height,
      year: ecology.year,
      birthChance: ecology.birthChance,
      oldAgeEnabled: ecology.oldAgeEnabled,
      livingGrazers: ecology.livingGrazers,
      creatureBirths: ecology.creatureBirths,
      retainedNaturalBirths: ecology.retainedNaturalBirths,
      godGrazerSpawns: ecology.godGrazerSpawns
    },
    inspectedGrazer: { id: targetGrazer.id, x: targetGrazer.tileX, y: targetGrazer.tileY },
    inspector,
    readOnlyInspectionAuthorityUnchanged: true
  }, null, 2)}\n`);

  console.log(`Natural fauna evidence: Sandbox 8 manual showcase grazers → Living Ecology ${ecology.livingGrazers} living, ${ecology.creatureBirths} natural births by Y${ecology.year.toFixed(1)}, no god founder spawns; inspected Grazer #${targetGrazer.id}; authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function stateEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    return {
      preset: document.querySelector('#world-preset')?.value ?? '',
      width: world?.width,
      height: world?.height,
      year: world?.day / world?.config?.daysPerYear,
      birthChance: world?.config?.grazerBirthChancePerEligiblePairPerDay,
      oldAgeEnabled: world?.config?.grazerOldAgeMortalityEnabled,
      livingGrazers: world?.creatures?.filter((creature) => creature.alive && creature.species === 'grazer').length ?? -1,
      creatureBirths: world?.counters?.creatureBirths ?? -1,
      retainedNaturalBirths: world?.history?.filter((event) => event.type === 'creature.born' && event.species === 'grazer').length ?? -1,
      godGrazerSpawns: world?.history?.filter((event) => event.type === 'god.spawn_creature' && event.species === 'grazer').length ?? -1,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
}

async function pauseWorld(cdpClient) {
  const result = await evaluate(cdpClient, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) return false;
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!result) throw new Error('failed to pause Living Ecology world');
  await delay(100);
}

async function visibleGrazerTarget(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const humanTiles = new Set(world.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => entity.x + ',' + entity.y));
    for (const grazer of world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').sort((a, b) => a.id - b.id)) {
      if (humanTiles.has(grazer.x + ',' + grazer.y)) continue;
      const worldX = (grazer.x + 0.5) * tileSize;
      const worldY = (grazer.y + 0.5) * tileSize;
      const screenX = camera.x + (worldX - camera.worldView.x) * camera.zoom;
      const screenY = camera.y + (worldY - camera.worldView.y) * camera.zoom;
      if (screenX < 30 || screenX > 1120 || screenY < 75 || screenY > 790) continue;
      return { id: grazer.id, x: screenX, y: screenY, tileX: grazer.x, tileY: grazer.y };
    }
    return null;
  })()`);
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await clickPoint(cdpClient, point, 0);
  await delay(80);
}

async function altClickPoint(cdpClient, point) {
  await clickPoint(cdpClient, point, 1);
  await delay(100);
}

async function clickPoint(cdpClient, point, modifiers) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers });
}

async function elementCenter(cdpClient, selector) {
  const point = await evaluate(cdpClient, `(() => {
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
  const result = await cdpClient.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
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

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
