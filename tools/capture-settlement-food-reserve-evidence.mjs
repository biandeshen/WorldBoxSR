import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-settlement-food-reserve-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-settlement-food-reserve-'));
const logFd = openSync(join(outDir, 'settlement-food-reserve-chrome-runtime.log'), 'w');
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
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world != null`, 8_000);
  await setPaused(cdp, true);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 30_000);

  let pair = await reservePair(cdp);
  // Prefer the ordinary Y40 showcase. If it does not yet contain two materially
  // distinct, visibly inspectable reserves, advance only through the visible
  // Time/Play controls. Evidence code never writes foodStored.
  for (let attempt = 0; !pair && attempt < 5; attempt += 1) {
    const beforeDay = await evaluate(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day ?? 0`);
    await setSpeed(cdp, '360');
    await setPaused(cdp, false);
    await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day >= ${beforeDay + 720}`, 8_000);
    await setPaused(cdp, true);
    pair = await reservePair(cdp);
  }
  if (!pair) throw new Error('ordinary production simulation did not produce two materially different, visibly inspectable active settlement reserve ratios');

  const baseline = await fingerprint(cdp);
  const targetSettlement = pair.low;
  const expectedLine = `Food reserve ${formatAmount(targetSettlement.stored)} / ${formatAmount(targetSettlement.capacity)} · ${targetSettlement.state}`;

  // Use the real player interaction path. Candidate selection deliberately
  // excludes settlement centers occupied by humans/creatures/warbands so the
  // existing selection precedence resolves the Alt-click to the settlement.
  await altClickPoint(cdp, targetSettlement.point);
  await waitForExpression(cdp, `(() => {
    const text = document.querySelector('#inspector')?.textContent ?? '';
    return text.startsWith(${JSON.stringify(targetSettlement.name)}) && text.includes(${JSON.stringify(expectedLine)});
  })()`, 2_500);
  const inspectorText = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  const afterInspection = await fingerprint(cdp);
  if (afterInspection !== baseline) throw new Error('settlement reserve Alt-click inspection mutated authoritative world');

  const rendered = await reservePair(cdp);
  if (!rendered) throw new Error('reserve pair disappeared after read-only inspection');
  if (rendered.low.visualSignature === rendered.high.visualSignature) {
    throw new Error(`map Granary signatures did not differ: ${rendered.low.visualSignature}`);
  }
  if (rendered.low.fillSegments === rendered.high.fillSegments) {
    throw new Error(`map Granary fill did not differ: ${rendered.low.fillSegments}`);
  }

  await captureScreenshot(cdp, join(outDir, 'settlement-food-reserves-granary-inspector-1440x900.png'));
  const evidence = {
    settlementFoodReserveComplete: true,
    day: pair.day,
    paused: true,
    ratioSpread: pair.spread,
    low: pair.low,
    high: pair.high,
    inspector: {
      settlementId: targetSettlement.id,
      interaction: 'real Alt-click on visible clear settlement center',
      expectedLine,
      text: inspectorText,
      matchesSharedFacts: inspectorText.includes(expectedLine)
    },
    mapGranaryDiffers: rendered.low.visualSignature !== rendered.high.visualSignature && rendered.low.fillSegments !== rendered.high.fillSegments,
    readOnlyAuthorityUnchanged: afterInspection === baseline,
    setup: 'ordinary public simulation + visible Time/Play controls only; foodStored never written by evidence code'
  };
  writeFileSync(join(outDir, 'settlement-food-reserve-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Settlement food reserve evidence: day ${pair.day}; ${pair.low.name} ${formatAmount(pair.low.stored)}/${pair.low.capacity} ${pair.low.state} (${pair.low.fillSegments}/5) vs ${pair.high.name} ${formatAmount(pair.high.stored)}/${pair.high.capacity} ${pair.high.state} (${pair.high.fillSegments}/5); real Alt-click Inspector matched; authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
}

async function reservePair(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera || !scene?.settlements?.visuals) return null;
    const tileSize = 28;
    const activeWarbands = (world.warbands ?? []).filter((band) => band.active);
    const livingHumans = world.entities.filter((human) => human.kind === 'human' && human.alive);
    const livingCreatures = (world.creatures ?? []).filter((creature) => creature.alive);
    const centerClear = (settlement) =>
      !activeWarbands.some((band) => band.x === settlement.x && band.y === settlement.y) &&
      !livingHumans.some((human) => human.x === settlement.x && human.y === settlement.y) &&
      !livingCreatures.some((creature) => creature.x === settlement.x && creature.y === settlement.y);
    const screenPoint = (settlement) => {
      const worldX = (settlement.x + 0.5) * tileSize;
      const worldY = (settlement.y + 0.5) * tileSize;
      return {
        x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
        y: camera.y + (worldY - camera.worldView.y) * camera.zoom
      };
    };
    const visible = (point) => point.x >= 280 && point.x <= 1110 && point.y >= 80 && point.y <= 790;
    const profile = (settlement) => {
      const capacity = 2 + 2 * Math.max(0, Math.floor(Number.isFinite(settlement.population) ? settlement.population : 0));
      const stored = Math.min(capacity, Math.max(0, Number.isFinite(settlement.foodStored) ? settlement.foodStored : 0));
      const ratio = capacity > 0 ? stored / capacity : 0;
      const state = stored <= 1e-9 ? 'depleted' : ratio < 0.4 ? 'low' : ratio < 0.8 ? 'stable' : 'full';
      const fillSegments = stored <= 1e-9 ? 0 : Math.max(1, Math.min(5, Math.round(ratio * 5)));
      const point = screenPoint(settlement);
      return {
        id: settlement.id, name: settlement.name, x: settlement.x, y: settlement.y,
        population: settlement.population, stored, capacity, ratio, state, fillSegments,
        point,
        visualSignature: scene.settlements.visuals.get(settlement.id)?.signature ?? null
      };
    };
    const active = world.settlements
      .filter((settlement) => settlement.active && centerClear(settlement))
      .map(profile)
      .filter((value) => value.visualSignature && visible(value.point));
    let best = null;
    for (let a = 0; a < active.length; a += 1) {
      for (let b = a + 1; b < active.length; b += 1) {
        const low = active[a].ratio <= active[b].ratio ? active[a] : active[b];
        const high = low === active[a] ? active[b] : active[a];
        const spread = high.ratio - low.ratio;
        if (spread < 0.15 || low.fillSegments === high.fillSegments) continue;
        if (!best || spread > best.spread || (spread === best.spread && low.id < best.low.id)) best = { low, high, spread };
      }
    }
    return best ? { day: world.day, ...best } : null;
  })()`);
}

async function setSpeed(cdpClient, value) {
  const actual = await evaluate(cdpClient, `(() => {
    const select = document.querySelector('#speed');
    if (!select) return null;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set visible Time control to ${value}: ${actual}`);
}

async function setPaused(cdpClient, paused) {
  const result = await evaluate(cdpClient, `(() => {
    const button = document.querySelector('#pause');
    if (!button) return null;
    const current = button.dataset.active === 'true';
    if (current !== ${paused}) button.click();
    return button.dataset.active === 'true';
  })()`);
  if (Boolean(result) !== paused) throw new Error(`failed to set pause=${paused}`);
  await delay(120);
}

async function altClickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 1 });
  await delay(150);
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

function formatAmount(value) {
  if (Math.abs(value - Math.round(value)) <= 1e-9) return String(Math.round(value));
  return value.toFixed(1).replace(/\.0$/, '');
}

async function captureScreenshot(cdpClient, path) {
  const result = await cdpClient.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

async function evaluate(cdpClient, expression) {
  const result = await cdpClient.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  return result.result?.value;
}

async function waitForExpression(cdpClient, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try { if (await evaluate(cdpClient, expression)) return; }
    catch (error) { lastError = error; }
    await delay(100);
  }
  throw new Error(`Timed out waiting for expression: ${expression}${lastError ? `; last error: ${lastError.message}` : ''}`);
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
  throw new Error('Chrome DevTools port did not become available');
}

async function waitForPageTarget(port, expectedUrl, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
      const page = targets.find((value) => value.type === 'page' && value.url.startsWith(expectedUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await delay(50);
  }
  throw new Error(`Chrome page target did not appear for ${expectedUrl}`);
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result ?? {});
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { socket.close(); }
  };
}

function ensureAlive(child) {
  if (child.exitCode !== null) throw new Error(`Chrome exited early with ${child.exitCode}`);
}

async function stopChrome(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(2_000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
