import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-meteor-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-meteor-'));
const logPath = join(outDir, 'meteor-chrome-runtime.log');
const logFd = openSync(logPath, 'w');
const chrome = spawn(browser, [
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
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);

  await evaluate(cdp, `(() => {
    const tool = document.querySelector('#tool');
    if (!tool) throw new Error('missing #tool');
    tool.value = 'meteor';
    tool.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelector('[data-tool-button="meteor"]')?.dataset?.active === 'true';
  })()`);

  const targetPoint = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    if (!scene?.world || !scene?.cameras?.main) throw new Error('world scene unavailable');
    const camera = scene.cameras.main;
    const tileSize = 28;
    const life = [
      ...scene.world.entities.filter((entity) => entity.kind === 'human' && entity.alive),
      ...scene.world.creatures.filter((creature) => creature.alive)
    ];
    if (life.length === 0) throw new Error('no living targets available for Meteor evidence');

    const candidates = new Map();
    for (const entity of life) candidates.set(entity.x + ',' + entity.y, { x: entity.x, y: entity.y });
    const scoreAt = (x, y) => {
      const lives = life.filter((entity) => Math.max(Math.abs(entity.x - x), Math.abs(entity.y - y)) <= 2).length;
      let vegetation = 0;
      for (let ty = Math.max(0, y - 2); ty <= Math.min(scene.world.height - 1, y + 2); ty += 1) {
        for (let tx = Math.max(0, x - 2); tx <= Math.min(scene.world.width - 1, x + 2); tx += 1) {
          const tile = scene.world.tiles[ty * scene.world.width + tx];
          if (tile.passable) vegetation += tile.vegetation;
        }
      }
      return lives * 10000 + vegetation;
    };
    const toScreen = (x, y) => {
      const worldX = (x + 0.5) * tileSize;
      const worldY = (y + 0.5) * tileSize;
      return {
        screenX: camera.x + (worldX - camera.worldView.x) * camera.zoom,
        screenY: camera.y + (worldY - camera.worldView.y) * camera.zoom
      };
    };

    return [...candidates.values()]
      .map((candidate) => ({ ...candidate, ...toScreen(candidate.x, candidate.y), score: scoreAt(candidate.x, candidate.y) }))
      .filter((candidate) => candidate.screenX >= 40 && candidate.screenX <= 1110 && candidate.screenY >= 85 && candidate.screenY <= 785)
      .sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x)[0] ?? null;
  })()`);
  if (!targetPoint) throw new Error('no visible populated Meteor target found');

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: targetPoint.screenX, y: targetPoint.screenY });
  await delay(140);
  await captureScreenshot(cdp, join(outDir, 'meteor-target-preview-1440x900.png'));

  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: targetPoint.screenX, y: targetPoint.screenY, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetPoint.screenX, y: targetPoint.screenY, button: 'left', clickCount: 1 });
  await delay(80);
  await captureScreenshot(cdp, join(outDir, 'meteor-impact-1440x900.png'));

  const evidence = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const event = scene?.world?.history?.findLast?.((candidate) => candidate.type === 'god.meteor') ?? null;
    return {
      event,
      toast: document.querySelector('#event-toast')?.textContent ?? '',
      population: scene?.world?.entities?.length ?? null,
      creatures: scene?.world?.creatures?.length ?? null
    };
  })()`);
  if (!evidence.event) throw new Error('real pointer click did not create authoritative god.meteor event');
  if (evidence.event.noEffect) throw new Error('Meteor evidence target unexpectedly produced no effect');
  if ((evidence.event.humanCount ?? 0) + (evidence.event.creatureCount ?? 0) < 1) throw new Error('Meteor evidence did not hit a living target');
  if (!/Meteor impact/.test(evidence.toast)) throw new Error(`Meteor hit feedback missing from toast: ${evidence.toast}`);

  const dom = await evaluate(cdp, 'document.documentElement.outerHTML');
  if (!/Meteor devastates/.test(dom)) throw new Error('World Chronicle did not project the authoritative Meteor event');
  writeFileSync(join(outDir, 'meteor-dom.html'), dom);
  writeFileSync(join(outDir, 'meteor-evidence.json'), `${JSON.stringify({ target: targetPoint, ...evidence }, null, 2)}\n`);

  await evaluate(cdp, `(() => { const timeline = document.querySelector('#timeline'); if (timeline) timeline.open = true; return timeline?.open ?? false; })()`);
  await delay(760);
  await captureScreenshot(cdp, join(outDir, 'meteor-aftermath-chronicle-1440x900.png'));
  console.log(`Meteor visual evidence: target ${targetPoint.x},${targetPoint.y}; ${evidence.event.humanCount} human(s), ${evidence.event.creatureCount} creature(s), ${evidence.event.vegetationRemoved.toFixed(1)} vegetation`);
} finally {
  try { cdp?.close(); } catch {}
  chrome.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => chrome.once('exit', resolve)), delay(1500)]);
  if (chrome.exitCode === null) chrome.kill('SIGKILL');
  closeFd(logFd);
  rmSync(userDataDir, { recursive: true, force: true });
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

function ensureAlive(child) {
  if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
}

function closeFd(fd) {
  try { closeSync(fd); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
