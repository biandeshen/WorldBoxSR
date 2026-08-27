import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-touch-inspect-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-touch-inspect-'));
const logPath = join(outDir, 'touch-inspect-chrome-runtime.log');
const logFd = openSync(logPath, 'w');
const chrome = spawn(browser, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--window-size=430,820',
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
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 430,
    height: 820,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 430,
    screenHeight: 820
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.touchInspect?.attached === true`, 8_000);

  const mobileHud = await mobileHudSnapshot(cdp);
  if (mobileHud.documentScrollWidth > mobileHud.viewportWidth + 0.5) {
    throw new Error(`mobile document overflows horizontally: ${mobileHud.documentScrollWidth} > ${mobileHud.viewportWidth}`);
  }
  if (mobileHud.topbar.left < -0.5 || mobileHud.topbar.right > mobileHud.viewportWidth + 0.5) {
    throw new Error(`mobile topbar escapes viewport: ${JSON.stringify(mobileHud.topbar)}`);
  }
  if (mobileHud.row.left < -0.5 || mobileHud.row.right > mobileHud.viewportWidth + 0.5) {
    throw new Error(`mobile control strip escapes viewport: ${JSON.stringify(mobileHud.row)}`);
  }
  if (mobileHud.brandDisplay !== 'none') throw new Error(`mobile brand still consumes compact-strip width: ${mobileHud.brandDisplay}`);
  for (const [name, control] of Object.entries(mobileHud.primaryControls)) {
    if (!control.visibleInViewport) throw new Error(`primary mobile control ${name} is not initially visible: ${JSON.stringify(control)}`);
  }
  for (const [name, control] of Object.entries(mobileHud.reachableControls)) {
    if (!control.present || control.display === 'none' || control.width <= 0) {
      throw new Error(`mobile control ${name} is no longer reachable: ${JSON.stringify(control)}`);
    }
  }
  if (mobileHud.hint.display === 'none' || !mobileHud.hint.visible) {
    throw new Error(`coarse-pointer touch hint is not visible: ${JSON.stringify(mobileHud.hint)}`);
  }
  if (mobileHud.hint.text !== 'Tap: use selected tool · Hold: inspect · Drag: pan') {
    throw new Error(`unexpected touch hint: ${mobileHud.hint.text}`);
  }

  const paused = await evaluate(cdp, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) throw new Error('missing #pause');
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('touch evidence could not pause the world');

  const targetPoint = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    if (!scene?.world || !scene?.cameras?.main) throw new Error('world scene unavailable');
    const camera = scene.cameras.main;
    const tileSize = 28;
    const candidates = scene.world.tiles
      .filter((tile) => tile.passable)
      .map((tile) => {
        const worldX = (tile.x + 0.5) * tileSize;
        const worldY = (tile.y + 0.5) * tileSize;
        return {
          x: tile.x,
          y: tile.y,
          screenX: camera.x + (worldX - camera.worldView.x) * camera.zoom,
          screenY: camera.y + (worldY - camera.worldView.y) * camera.zoom
        };
      })
      .filter((tile) => tile.screenX >= 34 && tile.screenX <= 188 && tile.screenY >= 100 && tile.screenY <= 650)
      .sort((a, b) => Math.abs(a.screenY - 380) - Math.abs(b.screenY - 380) || Math.abs(a.screenX - 110) - Math.abs(b.screenX - 110));
    return candidates[0] ?? null;
  })()`);
  if (!targetPoint) throw new Error('no visible mobile touch target found');

  await evaluate(cdp, `(() => {
    const tool = document.querySelector('#tool');
    tool.value = 'spawn_human';
    tool.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  const before = await authoritySnapshot(cdp);
  await touchTap(cdp, targetPoint.screenX, targetPoint.screenY);
  await delay(180);
  const afterTap = await authoritySnapshot(cdp);
  if (afterTap.humans !== before.humans + 1) {
    throw new Error(`short touch tap did not add exactly one human: ${before.humans} -> ${afterTap.humans}`);
  }
  if (afterTap.nextCommandId !== before.nextCommandId + 1) {
    throw new Error(`short touch tap did not execute exactly one command: ${before.nextCommandId} -> ${afterTap.nextCommandId}`);
  }

  await touchStart(cdp, targetPoint.screenX, targetPoint.screenY);
  await delay(620);
  const duringHold = await authoritySnapshot(cdp);
  if (!/Human #|Creature #|Settlement #|Warband #|TILE /i.test(duringHold.inspector)) {
    throw new Error(`long touch hold did not populate Inspector: ${duringHold.inspector}`);
  }
  if (!/Inspect ·/.test(duringHold.toast)) {
    throw new Error(`long touch hold did not emit inspect feedback: ${duringHold.toast}`);
  }
  if (duringHold.humans !== afterTap.humans || duringHold.nextCommandId !== afterTap.nextCommandId) {
    throw new Error('long touch hold changed authoritative command/world state before release');
  }
  await touchEnd(cdp);
  await delay(160);
  const afterHold = await authoritySnapshot(cdp);
  if (afterHold.humans !== afterTap.humans) {
    throw new Error(`long touch release fired a second spawn: ${afterTap.humans} -> ${afterHold.humans}`);
  }
  if (afterHold.nextCommandId !== afterTap.nextCommandId) {
    throw new Error(`long touch release consumed a command id: ${afterTap.nextCommandId} -> ${afterHold.nextCommandId}`);
  }

  await captureScreenshot(cdp, join(outDir, 'touch-long-press-inspect-430x820.png'));
  writeFileSync(join(outDir, 'touch-inspect-evidence.json'), `${JSON.stringify({ mobileHud, target: targetPoint, before, afterTap, duringHold, afterHold }, null, 2)}\n`);
  console.log(
    `Touch/mobile HUD evidence: topbar ${mobileHud.topbar.width.toFixed(1)}px in ${mobileHud.viewportWidth}px; `
    + `${targetPoint.x},${targetPoint.y}; short tap +1 human; hold command ${afterHold.nextCommandId} unchanged`
  );
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  closeSync(logFd);
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
}

async function mobileHudSnapshot(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const control = (id) => {
      const element = document.querySelector(id);
      if (!element) return { present: false, display: 'missing', width: 0, visibleInViewport: false };
      const box = element.getBoundingClientRect();
      const display = getComputedStyle(element).display;
      return {
        present: true,
        display,
        width: box.width,
        left: box.left,
        right: box.right,
        visibleInViewport: display !== 'none' && box.width > 0 && box.left >= -0.5 && box.right <= innerWidth + 0.5
      };
    };
    const topbar = document.querySelector('#topbar');
    const row = document.querySelector('#row');
    const hint = document.querySelector('#hint');
    const hintBox = hint?.getBoundingClientRect?.();
    return {
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      topbar: rect(topbar),
      row: { ...rect(row), clientWidth: row?.clientWidth ?? 0, scrollWidth: row?.scrollWidth ?? 0, scrollLeft: row?.scrollLeft ?? 0 },
      brandDisplay: getComputedStyle(document.querySelector('.brand')).display,
      primaryControls: {
        pause: control('#pause'),
        view: control('#reset-camera'),
        world: control('#reset')
      },
      reachableControls: {
        mode: control('#world-preset'),
        seed: control('#seed'),
        time: control('#speed'),
        scenario: control('#scenario-setup-enter'),
        recipe: control('#scenario-portability-toggle')
      },
      hint: {
        text: hint?.textContent ?? '',
        display: hint ? getComputedStyle(hint).display : 'missing',
        visible: Boolean(hintBox && hintBox.width > 0 && hintBox.height > 0 && hintBox.left >= -0.5 && hintBox.right <= innerWidth + 0.5 && hintBox.top >= -0.5 && hintBox.bottom <= innerHeight + 0.5),
        rect: hintBox ? { left: hintBox.left, right: hintBox.right, top: hintBox.top, bottom: hintBox.bottom, width: hintBox.width, height: hintBox.height } : null
      }
    };
  })()`);
}

async function authoritySnapshot(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    return {
      humans: scene?.world?.entities?.filter?.((entity) => entity.kind === 'human')?.length ?? null,
      nextCommandId: scene?.world?.nextCommandId ?? null,
      lastEventId: scene?.world?.history?.at?.(-1)?.id ?? null,
      inspector: document.querySelector('#inspector')?.textContent ?? '',
      toast: document.querySelector('#event-toast')?.textContent ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
}

async function touchTap(cdpClient, x, y) {
  await touchStart(cdpClient, x, y);
  await delay(70);
  await touchEnd(cdpClient);
}

async function touchStart(cdpClient, x, y) {
  await cdpClient.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }]
  });
}

async function touchEnd(cdpClient) {
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
    try {
      if (await evaluate(cdpClient, expression)) return;
    } catch {}
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
