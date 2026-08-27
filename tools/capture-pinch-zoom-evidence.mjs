import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-pinch-zoom-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-pinch-zoom-'));
const logPath = join(outDir, 'pinch-zoom-chrome-runtime.log');
const logFd = openSync(logPath, 'w');
const chrome = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
  '--window-size=430,820', '--force-device-scale-factor=1', '--run-all-compositor-stages-before-draw',
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
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 430, height: 820, deviceScaleFactor: 1, mobile: true, screenWidth: 430, screenHeight: 820
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.pinchZoom?.attached === true`, 8_000);

  const paused = await evaluate(cdp, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) throw new Error('missing #pause');
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('pinch evidence could not pause the world');

  const target = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const camera = scene?.cameras?.main;
    if (!scene?.world || !camera) throw new Error('world scene unavailable');
    const tileSize = 28;
    const candidates = scene.world.tiles.filter((tile) => tile.passable).map((tile) => {
      const worldX = (tile.x + 0.5) * tileSize;
      const worldY = (tile.y + 0.5) * tileSize;
      return {
        x: tile.x, y: tile.y,
        screenX: camera.x + (worldX - camera.worldView.x) * camera.zoom,
        screenY: camera.y + (worldY - camera.worldView.y) * camera.zoom
      };
    }).filter((tile) => tile.screenX >= 95 && tile.screenX <= 145 && tile.screenY >= 260 && tile.screenY <= 560)
      .sort((a, b) => Math.abs(a.screenY - 410) - Math.abs(b.screenY - 410) || Math.abs(a.screenX - 120) - Math.abs(b.screenX - 120));
    return candidates[0] ?? null;
  })()`);
  if (!target) throw new Error('no clear mobile pinch midpoint found');

  const midpoint = { x: target.screenX, y: target.screenY };
  const startHalfSpan = 24;
  const endHalfSpan = 52;
  const before = await pinchSnapshot(cdp, midpoint);

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touchPoint(1, midpoint.x - startHalfSpan, midpoint.y), touchPoint(2, midpoint.x + startHalfSpan, midpoint.y)]
  });
  await delay(90);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touchPoint(1, midpoint.x - endHalfSpan, midpoint.y), touchPoint(2, midpoint.x + endHalfSpan, midpoint.y)]
  });
  await delay(220);
  const during = await pinchSnapshot(cdp, midpoint);

  if (!(during.zoom > before.zoom + 0.08)) {
    throw new Error(`two-finger pinch did not increase zoom: ${before.zoom} -> ${during.zoom}`);
  }
  const drift = Math.hypot(during.midpointWorld.x - before.midpointWorld.x, during.midpointWorld.y - before.midpointWorld.y);
  if (drift > 0.9) throw new Error(`pinch midpoint world focus drifted by ${drift}`);
  assertAuthorityUnchanged(before, during, 'during pinch');

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(180);
  const after = await pinchSnapshot(cdp, midpoint);
  assertAuthorityUnchanged(before, after, 'after pinch release');
  if (Math.abs(after.zoom - during.zoom) > 1e-9) throw new Error(`pinch zoom changed on release: ${during.zoom} -> ${after.zoom}`);

  const pseudoHint = await evaluate(cdp, `getComputedStyle(document.querySelector('#hint'), '::after').content`);
  if (!/Pinch: zoom/.test(String(pseudoHint))) throw new Error(`mobile hint does not expose pinch: ${pseudoHint}`);

  await touchTap(cdp, midpoint.x, midpoint.y);
  await delay(180);
  const afterFreshTap = await pinchSnapshot(cdp, midpoint);
  if (afterFreshTap.humans !== after.humans + 1 || afterFreshTap.nextCommandId !== after.nextCommandId + 1) {
    throw new Error(`fresh one-finger tap did not resume after pinch: humans ${after.humans}->${afterFreshTap.humans}, command ${after.nextCommandId}->${afterFreshTap.nextCommandId}`);
  }

  await captureScreenshot(cdp, join(outDir, 'touch-pinch-zoom-430x820.png'));
  writeFileSync(join(outDir, 'pinch-zoom-evidence.json'), `${JSON.stringify({
    target, midpoint, startHalfSpan, endHalfSpan, drift, pseudoHint, before, during, after, afterFreshTap
  }, null, 2)}\n`);
  console.log(`Pinch zoom evidence: ${before.zoom.toFixed(3)}x -> ${during.zoom.toFixed(3)}x; midpoint drift ${drift.toFixed(4)} world px; authority unchanged; fresh tap +1 human`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  closeSync(logFd);
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
}

function touchPoint(id, x, y) {
  return { id, x, y, radiusX: 1, radiusY: 1, force: 1 };
}

async function pinchSnapshot(cdpClient, midpoint) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const camera = scene?.cameras?.main;
    const point = camera?.getWorldPoint(${JSON.stringify(midpoint.x)}, ${JSON.stringify(midpoint.y)});
    return {
      zoom: camera?.zoom ?? null,
      scrollX: camera?.scrollX ?? null,
      scrollY: camera?.scrollY ?? null,
      midpointWorld: point ? { x: point.x, y: point.y } : null,
      humans: scene?.world?.entities?.filter?.((entity) => entity.kind === 'human')?.length ?? null,
      nextCommandId: scene?.world?.nextCommandId ?? null,
      lastEventId: scene?.world?.history?.at?.(-1)?.id ?? null,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
}

function assertAuthorityUnchanged(before, after, label) {
  if (after.humans !== before.humans || after.nextCommandId !== before.nextCommandId || after.lastEventId !== before.lastEventId) {
    throw new Error(`${label} mutated authority: ${JSON.stringify({ before, after })}`);
  }
  if (!after.paused) throw new Error(`${label} resumed the world`);
}

async function touchTap(cdpClient, x, y) {
  await cdpClient.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(1, x, y)] });
  await delay(70);
  await cdpClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function captureScreenshot(cdpClient, filepath) {
  const result = await cdpClient.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(filepath, Buffer.from(result.data, 'base64'));
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
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
    else resolve(message.result ?? {});
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
  const result = await cdpClient.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  return result.result?.value;
}

async function waitForExpression(cdpClient, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await evaluate(cdpClient, expression)) return; } catch {}
    await delay(80);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

function ensureAlive(child) {
  if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
}

async function stopChrome(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  const deadline = Date.now() + 4_000;
  while (child.exitCode === null && Date.now() < deadline) await delay(50);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
