import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-multi-species-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-multi-species-'));
const logFd = openSync(join(outDir, 'multi-species-chrome-runtime.log'), 'w');
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

  const selected = await evaluate(cdp, `(() => {
    const preset = document.querySelector('#world-preset');
    if (!preset) return null;
    preset.value = 'living_ecology';
    preset.dispatchEvent(new Event('change', { bubbles: true }));
    return preset.value;
  })()`);
  if (selected !== 'living_ecology') throw new Error('failed to choose Living Ecology');
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await pauseWorld(cdp);

  const setup = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    return {
      preset: document.querySelector('#world-preset')?.value ?? '',
      wolves: world?.creatures?.filter((creature) => creature.alive && creature.species === 'wolf').length ?? -1,
      grazers: world?.creatures?.filter((creature) => creature.alive && creature.species === 'grazer').length ?? -1,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
  if (setup.preset !== 'living_ecology' || !setup.paused || setup.wolves !== 0 || setup.grazers < 1) {
    throw new Error(`unexpected mixed-species setup: ${JSON.stringify(setup)}`);
  }

  const wolfTile = await clearVisibleTile(cdp);
  if (!wolfTile) throw new Error('no clear visible passable tile available for explicit Wolf QA spawn');
  const toolResult = await evaluate(cdp, `(() => {
    const tool = document.querySelector('#tool');
    if (!tool) return null;
    tool.value = 'spawn_wolf';
    return tool.value;
  })()`);
  if (toolResult !== 'spawn_wolf') throw new Error('hidden Wolf QA tool option unavailable');
  await clickPoint(cdp, wolfTile, 0);
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.creatures?.some((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${wolfTile.tileX} && creature.y === ${wolfTile.tileY}) === true;
  })()`, 2_000);
  // HUD refresh is intentionally throttled by the runtime. Wait for that
  // existing cadence instead of forcing a product-only synchronous refresh for QA.
  await waitForExpression(cdp, `document.querySelector('#stats')?.textContent?.includes('🐺 1') === true`, 2_000);

  const spawned = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${wolfTile.tileX} && creature.y === ${wolfTile.tileY});
    const event = world?.history?.findLast((entry) => entry.type === 'god.spawn_creature' && entry.species === 'wolf');
    return wolf && event ? {
      wolf: { id: wolf.id, x: wolf.x, y: wolf.y, ageDays: wolf.ageDays, health: wolf.health, hunger: wolf.hunger },
      eventId: event.id,
      eventCreatureIds: event.creatureIds,
      wolfCount: world.creatures.filter((creature) => creature.alive && creature.species === 'wolf').length,
      hud: document.querySelector('#stats')?.textContent ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    } : null;
  })()`);
  if (!spawned || spawned.wolfCount !== 1 || !spawned.eventCreatureIds.includes(spawned.wolf.id)) {
    throw new Error(`explicit Wolf authority mismatch: ${JSON.stringify(spawned)}`);
  }
  if (!spawned.paused || !spawned.hud.includes('🐺 1')) throw new Error(`Wolf HUD/pause contract mismatch: ${JSON.stringify(spawned)}`);

  const baseline = await fingerprint(cdp);
  const targets = await inspectionTargets(cdp, spawned.wolf.id);
  if (!targets?.grazer || !targets?.wolf) throw new Error(`mixed-species inspection targets unavailable: ${JSON.stringify(targets)}`);

  await altClickPoint(cdp, targets.grazer);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.startsWith('Grazer #${targets.grazer.id}') === true`, 2_000);
  const grazerInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if ((await fingerprint(cdp)) !== baseline) throw new Error('Grazer inspection mutated post-Wolf-spawn authority');

  await altClickPoint(cdp, targets.wolf);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.startsWith('Wolf #${targets.wolf.id}') === true`, 2_000);
  const wolfInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if ((await fingerprint(cdp)) !== baseline) throw new Error('Wolf inspection mutated post-spawn authority');

  const visuals = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const rows = scene?.entities?.creatures;
    const grazer = rows?.get?.(${targets.grazer.id});
    const wolf = rows?.get?.(${targets.wolf.id});
    const signature = (visual) => visual ? {
      species: visual.species,
      childCount: visual.container?.list?.length ?? -1,
      fills: (visual.container?.list ?? []).map((child) => child.fillColor ?? null).filter((value) => Number.isInteger(value))
    } : null;
    return { grazer: signature(grazer), wolf: signature(wolf) };
  })()`);
  if (visuals?.grazer?.species !== 'grazer' || visuals?.wolf?.species !== 'wolf') {
    throw new Error(`EntityLayer did not retain species visuals: ${JSON.stringify(visuals)}`);
  }
  if (JSON.stringify(visuals.grazer) === JSON.stringify(visuals.wolf)) throw new Error('Grazer and Wolf visual signatures are not materially distinct');

  await captureScreenshot(cdp, join(outDir, 'living-ecology-grazer-wolf-1440x900.png'));
  if ((await fingerprint(cdp)) !== baseline) throw new Error('mixed-species screenshot/inspection path mutated authority');

  writeFileSync(join(outDir, 'multi-species-evidence.json'), `${JSON.stringify({
    livingEcology: { grazers: setup.grazers, wolvesBeforeExplicitSpawn: setup.wolves },
    explicitWolfSpawn: { ...spawned.wolf, eventId: spawned.eventId, tile: [wolfTile.tileX, wolfTile.tileY] },
    grazerInspector,
    wolfInspector,
    visualSignatures: visuals,
    hud: spawned.hud,
    postSpawnReadOnlyAuthorityUnchanged: true
  }, null, 2)}\n`);

  console.log(`Multi-species evidence: Living Ecology ${setup.grazers} grazers + explicit inert Wolf #${spawned.wolf.id}; distinct visuals; Grazer #${targets.grazer.id} and Wolf #${targets.wolf.id} inspected; post-spawn authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function clearVisibleTile(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const occupied = new Set([
      ...world.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => entity.x + ',' + entity.y),
      ...world.creatures.filter((creature) => creature.alive).map((creature) => creature.x + ',' + creature.y),
      ...(world.warbands ?? []).filter((band) => band.active).map((band) => band.x + ',' + band.y)
    ]);
    for (const tile of world.tiles.filter((value) => value.passable).sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (occupied.has(tile.x + ',' + tile.y)) continue;
      const worldX = (tile.x + 0.5) * tileSize;
      const worldY = (tile.y + 0.5) * tileSize;
      const x = camera.x + (worldX - camera.worldView.x) * camera.zoom;
      const y = camera.y + (worldY - camera.worldView.y) * camera.zoom;
      if (x < 30 || x > 1120 || y < 75 || y > 790) continue;
      return { x, y, tileX: tile.x, tileY: tile.y };
    }
    return null;
  })()`);
}

async function inspectionTargets(cdpClient, wolfId) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const humans = new Set(world.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => entity.x + ',' + entity.y));
    const screen = (creature) => {
      const worldX = (creature.x + 0.5) * tileSize;
      const worldY = (creature.y + 0.5) * tileSize;
      return { id: creature.id, x: camera.x + (worldX - camera.worldView.x) * camera.zoom, y: camera.y + (worldY - camera.worldView.y) * camera.zoom, tileX: creature.x, tileY: creature.y };
    };
    const visible = (point) => point.x >= 30 && point.x <= 1120 && point.y >= 75 && point.y <= 790;
    const wolf = world.creatures.find((creature) => creature.alive && creature.species === 'wolf' && creature.id === ${wolfId});
    const grazer = world.creatures
      .filter((creature) => creature.alive && creature.species === 'grazer' && !humans.has(creature.x + ',' + creature.y) && !(wolf && creature.x === wolf.x && creature.y === wolf.y))
      .sort((a, b) => a.id - b.id)
      .map(screen)
      .find(visible);
    const wolfPoint = wolf ? screen(wolf) : null;
    return { grazer: grazer ?? null, wolf: wolfPoint && visible(wolfPoint) ? wolfPoint : null };
  })()`);
}

async function pauseWorld(cdpClient) {
  const paused = await evaluate(cdpClient, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) return false;
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('failed to pause mixed-species world');
  await delay(100);
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
