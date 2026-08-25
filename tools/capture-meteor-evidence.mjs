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
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-god-powers-'));
const logPath = join(outDir, 'god-power-chrome-runtime.log');
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

  const paused = await evaluate(cdp, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) throw new Error('missing #pause');
    pause.click();
    return { active: pause.dataset.active, text: pause.textContent };
  })()`);
  if (paused?.active !== 'true') throw new Error(`Pause control did not freeze the showcase: ${JSON.stringify(paused)}`);

  await selectTool(cdp, 'meteor');
  const targetPoint = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    if (!scene?.world || !scene?.cameras?.main) throw new Error('world scene unavailable');
    const camera = scene.cameras.main;
    const tileSize = 28;
    const life = [
      ...scene.world.entities.filter((entity) => entity.kind === 'human' && entity.alive),
      ...scene.world.creatures.filter((creature) => creature.alive)
    ];
    if (life.length === 0) throw new Error('no living targets available for God Power evidence');

    const candidates = new Map();
    for (const entity of life) candidates.set(entity.x + ',' + entity.y, { x: entity.x, y: entity.y });
    const scoreAt = (x, y) => {
      const lives = life.filter((entity) => Math.max(Math.abs(entity.x - x), Math.abs(entity.y - y)) <= 2).length;
      let vegetation = 0;
      let restorationHeadroom = 0;
      for (let ty = Math.max(0, y - 2); ty <= Math.min(scene.world.height - 1, y + 2); ty += 1) {
        for (let tx = Math.max(0, x - 2); tx <= Math.min(scene.world.width - 1, x + 2); tx += 1) {
          const tile = scene.world.tiles[ty * scene.world.width + tx];
          if (!tile.passable) continue;
          vegetation += tile.vegetation;
          restorationHeadroom += Math.max(0, tile.vegetationCapacity - tile.vegetation) + Math.max(0, tile.foodCapacity - tile.food);
        }
      }
      return lives * 10000 + vegetation * 10 + restorationHeadroom;
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
  if (!targetPoint) throw new Error('no visible populated God Power target found');

  await movePointer(cdp, targetPoint);
  await delay(140);
  await captureScreenshot(cdp, join(outDir, 'meteor-target-preview-1440x900.png'));
  await clickPointer(cdp, targetPoint);
  await delay(80);
  await captureScreenshot(cdp, join(outDir, 'meteor-impact-1440x900.png'));

  const meteorEvidence = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const event = scene?.world?.history?.findLast?.((candidate) => candidate.type === 'god.meteor') ?? null;
    return {
      event,
      toast: document.querySelector('#event-toast')?.textContent ?? '',
      population: scene?.world?.entities?.length ?? null,
      creatures: scene?.world?.creatures?.length ?? null,
      year: scene?.world?.day / scene?.world?.config?.daysPerYear
    };
  })()`);
  if (!meteorEvidence.event) throw new Error('real pointer click did not create authoritative god.meteor event');
  if (meteorEvidence.event.noEffect) throw new Error('Meteor evidence target unexpectedly produced no effect');
  if ((meteorEvidence.event.humanCount ?? 0) + (meteorEvidence.event.creatureCount ?? 0) < 1) throw new Error('Meteor evidence did not hit a living target');
  if (!/Meteor impact/.test(meteorEvidence.toast)) throw new Error(`Meteor hit feedback missing from toast: ${meteorEvidence.toast}`);

  const afterMeteorResources = await footprintResources(cdp, targetPoint.x, targetPoint.y);
  if (!(afterMeteorResources.vegetationHeadroom > 0)) throw new Error('Meteor did not create vegetation headroom for Rain recovery');

  await selectTool(cdp, 'rain');
  await movePointer(cdp, targetPoint);
  await delay(140);
  await captureScreenshot(cdp, join(outDir, 'rain-target-preview-1440x900.png'));
  await clickPointer(cdp, targetPoint);
  await delay(120);
  await captureScreenshot(cdp, join(outDir, 'rain-recovery-1440x900.png'));

  const rainEvidence = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const event = scene?.world?.history?.findLast?.((candidate) => candidate.type === 'god.rain') ?? null;
    const meteor = scene?.world?.history?.findLast?.((candidate) => candidate.type === 'god.meteor') ?? null;
    return {
      event,
      meteorEventId: meteor?.id ?? null,
      toast: document.querySelector('#event-toast')?.textContent ?? '',
      year: scene?.world?.day / scene?.world?.config?.daysPerYear,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
  if (!rainEvidence.event) throw new Error('real pointer click did not create authoritative god.rain event');
  if (rainEvidence.event.noEffect) throw new Error('Rain unexpectedly reported no effect after Meteor damage');
  if (!(rainEvidence.event.vegetationAdded > 0)) throw new Error('Rain did not restore Meteor-cleared vegetation');
  if (!(rainEvidence.event.id > rainEvidence.meteorEventId)) throw new Error('Rain event did not follow Meteor in authoritative history');
  if (!/Rain restored/.test(rainEvidence.toast)) throw new Error(`Rain restoration feedback missing from toast: ${rainEvidence.toast}`);
  if (!rainEvidence.paused) throw new Error('world resumed during the damage/recovery evidence sequence');

  const afterRainResources = await footprintResources(cdp, targetPoint.x, targetPoint.y);
  if (afterRainResources.unsaturatedPassableTiles !== 0) throw new Error(`Rain left ${afterRainResources.unsaturatedPassableTiles} passable tile(s) below capacity`);
  const vegetationDelta = afterRainResources.vegetation - afterMeteorResources.vegetation;
  const foodDelta = afterRainResources.food - afterMeteorResources.food;
  if (Math.abs(vegetationDelta - rainEvidence.event.vegetationAdded) > 1e-8) {
    throw new Error(`Rain vegetation event delta ${rainEvidence.event.vegetationAdded} disagrees with authoritative before/after ${vegetationDelta}`);
  }
  if (Math.abs(foodDelta - rainEvidence.event.foodAdded) > 1e-8) {
    throw new Error(`Rain food event delta ${rainEvidence.event.foodAdded} disagrees with authoritative before/after ${foodDelta}`);
  }

  await evaluate(cdp, `(() => { const timeline = document.querySelector('#timeline'); if (timeline) timeline.open = true; return timeline?.open ?? false; })()`);
  await delay(180);
  const dom = await evaluate(cdp, 'document.documentElement.outerHTML');
  if (!/Rain renews/.test(dom)) throw new Error('World Chronicle did not project the authoritative Rain event');
  if (!/Meteor devastates/.test(dom)) throw new Error('World Chronicle lost the preceding Meteor intervention');
  writeFileSync(join(outDir, 'god-power-dom.html'), dom);
  writeFileSync(join(outDir, 'god-power-evidence.json'), `${JSON.stringify({
    target: targetPoint,
    afterMeteorResources,
    afterRainResources,
    meteor: meteorEvidence,
    rain: rainEvidence
  }, null, 2)}\n`);
  await captureScreenshot(cdp, join(outDir, 'god-power-aftermath-chronicle-1440x900.png'));

  console.log(
    `God Power evidence: target ${targetPoint.x},${targetPoint.y}; `
    + `Meteor ${meteorEvidence.event.humanCount} human(s) + ${meteorEvidence.event.creatureCount} creature(s), `
    + `${meteorEvidence.event.vegetationRemoved.toFixed(1)} vegetation removed; `
    + `Rain +${rainEvidence.event.vegetationAdded.toFixed(1)} vegetation +${rainEvidence.event.foodAdded.toFixed(1)} food; `
    + `year ${rainEvidence.year.toFixed(2)}`
  );
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  closeFd(logFd);
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch (error) {
    console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`);
  }
}

async function selectTool(cdpClient, toolName) {
  const selected = await evaluate(cdpClient, `(() => {
    const tool = document.querySelector('#tool');
    if (!tool) throw new Error('missing #tool');
    tool.value = ${JSON.stringify(toolName)};
    tool.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      value: tool.value,
      active: document.querySelector('[data-tool-button="${toolName}"]')?.dataset?.active === 'true'
    };
  })()`);
  if (selected?.value !== toolName || !selected?.active) throw new Error(`${toolName} did not become active: ${JSON.stringify(selected)}`);
}

async function footprintResources(cdpClient, centerX, centerY) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    if (!world) throw new Error('world unavailable');
    let vegetation = 0;
    let vegetationCapacity = 0;
    let food = 0;
    let foodCapacity = 0;
    let passableTiles = 0;
    let unsaturatedPassableTiles = 0;
    for (let y = Math.max(0, ${centerY} - 2); y <= Math.min(world.height - 1, ${centerY} + 2); y += 1) {
      for (let x = Math.max(0, ${centerX} - 2); x <= Math.min(world.width - 1, ${centerX} + 2); x += 1) {
        const tile = world.tiles[y * world.width + x];
        if (!tile.passable) continue;
        passableTiles += 1;
        vegetation += tile.vegetation;
        vegetationCapacity += tile.vegetationCapacity;
        food += tile.food;
        foodCapacity += tile.foodCapacity;
        if (Math.abs(tile.vegetation - tile.vegetationCapacity) > 1e-9 || Math.abs(tile.food - tile.foodCapacity) > 1e-9) {
          unsaturatedPassableTiles += 1;
        }
      }
    }
    return {
      vegetation,
      vegetationCapacity,
      vegetationHeadroom: vegetationCapacity - vegetation,
      food,
      foodCapacity,
      foodHeadroom: foodCapacity - food,
      passableTiles,
      unsaturatedPassableTiles
    };
  })()`);
}

async function movePointer(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.screenX, y: point.screenY });
}

async function clickPointer(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.screenX, y: point.screenY, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.screenX, y: point.screenY, button: 'left', clickCount: 1 });
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

function closeFd(fd) {
  try { closeSync(fd); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
