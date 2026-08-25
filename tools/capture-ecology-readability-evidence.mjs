import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-ecology-readability-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-ecology-readability-'));
const logFd = openSync(join(outDir, 'ecology-readability-chrome-runtime.log'), 'w');
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
  if (selected !== 'living_ecology') throw new Error('failed to choose Living Ecology for readability gate');
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await clickPauseTo(cdp, true);

  await waitForExpression(cdp, `document.querySelector('#stats [data-ecology-vegetation]')?.textContent?.startsWith('🌿 ') === true`, 2_000);
  const initialVegetation = await vegetationEvidence(cdp);

  const spawnPoint = await wolfSpawnPoint(cdp);
  if (!spawnPoint) throw new Error('no visible clear Wolf spawn tile 2..searchRadius cells from living Grazer');
  const tool = await evaluate(cdp, `(() => {
    const select = document.querySelector('#tool');
    if (!select) return null;
    select.value = 'spawn_wolf';
    return select.value;
  })()`);
  if (tool !== 'spawn_wolf') throw new Error('hidden Wolf QA tool option unavailable');
  await clickPoint(cdp, spawnPoint, 0);
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.creatures?.some((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${spawnPoint.tileX} && creature.y === ${spawnPoint.tileY}) === true;
  })()`, 2_000);

  const spawned = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${spawnPoint.tileX} && creature.y === ${spawnPoint.tileY});
    const event = world?.history?.findLast((entry) => entry.type === 'god.spawn_creature' && entry.species === 'wolf');
    return wolf && event ? {
      wolfId: wolf.id,
      spawnEventId: event.id,
      x: wolf.x,
      y: wolf.y,
      godCreatureSpawns: world.history.filter((entry) => entry.type === 'god.spawn_creature').length
    } : null;
  })()`);
  if (!spawned) throw new Error('explicit Wolf authority unavailable after setup');

  const wolfPoint = await creatureScreenPoint(cdp, spawned.wolfId);
  if (!wolfPoint) throw new Error('spawned Wolf is not visible for resting inspector gate');
  await altClickPoint(cdp, wolfPoint);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.includes('behavior resting') === true`, 2_000);
  const restingInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if (!restingInspector.startsWith(`Wolf #${spawned.wolfId}`)) throw new Error(`wrong resting inspector: ${restingInspector}`);

  const speed = await evaluate(cdp, `(() => {
    const select = document.querySelector('#speed');
    if (!select) return null;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (speed !== '1') throw new Error('failed to set ordinary Time control to one day');
  await clickPauseTo(cdp, false);

  const predation = await waitForPredation(cdp, spawned.wolfId, 22_000);
  if (!predation) throw new Error(`Wolf #${spawned.wolfId} produced no bounded predation for readability gate`);
  if (predation.godCreatureSpawns !== spawned.godCreatureSpawns) throw new Error('hidden creature spawn occurred after explicit Wolf setup');
  await clickPauseTo(cdp, true);

  await waitForExpression(cdp, `(() => [...document.querySelectorAll('#world-event-pulse .world-event-card strong')].some((node) => node.textContent === 'Wolf #${spawned.wolfId} hunted Grazer #${predation.preyCreatureId}'))()`, 2_500);
  const pulse = await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('#world-event-pulse .world-event-card')].find((node) => node.querySelector('strong')?.textContent === 'Wolf #${spawned.wolfId} hunted Grazer #${predation.preyCreatureId}');
    return card ? { title: card.querySelector('strong')?.textContent ?? '', detail: card.querySelector('small')?.textContent ?? '' } : null;
  })()`);
  if (!pulse) throw new Error('predation Pulse was not visible after authoritative hunt');

  const postVegetation = await vegetationEvidence(cdp);
  const frozenFingerprint = await fingerprint(cdp);

  if (!(await evaluate(cdp, `document.querySelector('#timeline')?.open === true`))) {
    await clickSelector(cdp, '#timeline > summary');
    await waitForExpression(cdp, `document.querySelector('#timeline')?.open === true`, 1_500);
  }
  await clickSelector(cdp, '[data-chronicle-lens="recent"]');
  await waitForExpression(cdp, `document.querySelector('[data-chronicle-lens="recent"]')?.dataset?.active === 'true'`, 1_500);
  await waitForExpression(cdp, `document.querySelector('#history-list button[data-event-id="${predation.eventId}"]') !== null`, 2_000);
  const recentRow = await evaluate(cdp, `document.querySelector('#history-list button[data-event-id="${predation.eventId}"]')?.textContent ?? ''`);
  const expectedHeadline = `Wolf #${spawned.wolfId} hunted Grazer #${predation.preyCreatureId}`;
  if (!recentRow.includes(expectedHeadline)) throw new Error(`Recent predation row is not readable: ${recentRow}`);
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'Recent lens');

  await clickSelector(cdp, `#history-list button[data-event-id="${predation.eventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail .event-card')?.textContent?.includes(${JSON.stringify(expectedHeadline)}) === true`, 2_000);
  const eventCard = await evaluate(cdp, `(() => {
    const card = document.querySelector('#history-detail .event-card');
    if (!card) return null;
    const unresolved = [...card.querySelectorAll('[data-status="unresolved"]')].map((node) => node.textContent.trim());
    const resolved = [...card.querySelectorAll('[data-status="resolved"]')].map((node) => node.textContent.trim());
    const wolfMapSelector = '[data-event-card-nav="map"][data-entity-kind="creature"][data-entity-id="${spawned.wolfId}"]';
    return {
      text: card.textContent.trim(),
      unresolved,
      resolved,
      wolfMapAvailable: Boolean(card.querySelector(wolfMapSelector))
    };
  })()`);
  if (!eventCard) throw new Error('predation Event Card did not open');
  const detail = `Predation at ${predation.x},${predation.y} · hunger ${Math.round(predation.hungerBefore * 100)}% → ${Math.round(predation.hungerAfter * 100)}%`;
  if (!eventCard.text.includes(detail)) throw new Error(`predation Event Card detail is not authoritative/readable: ${eventCard.text}`);
  if (!eventCard.unresolved.some((text) => text.includes(`Creature #${predation.preyCreatureId}`) && text.includes('not currently present'))) {
    throw new Error(`dead prey Subject did not remain truthfully unavailable: ${JSON.stringify(eventCard.unresolved)}`);
  }
  if (!eventCard.resolved.some((text) => text.includes(`Wolf #${spawned.wolfId}`)) || !eventCard.wolfMapAvailable) {
    throw new Error(`living Wolf Cause did not remain resolved/map-navigable: ${JSON.stringify(eventCard)}`);
  }
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'predation Event Card');

  await captureScreenshot(cdp, join(outDir, 'living-ecology-readability-1440x900.png'));
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'readability screenshot');

  const wolfMapSelector = `[data-event-card-nav="map"][data-entity-kind="creature"][data-entity-id="${spawned.wolfId}"]`;
  await clickSelector(cdp, wolfMapSelector);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.startsWith('Wolf #${spawned.wolfId}') === true`, 2_000);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.includes('behavior resting') === true`, 2_000);
  const postMapInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'Wolf Cause map navigation');

  const evidence = {
    initialVegetation,
    explicitWolf: {
      wolfId: spawned.wolfId,
      spawnEventId: spawned.spawnEventId,
      tile: [spawned.x, spawned.y],
      nearestGrazerDistance: spawnPoint.nearestGrazerDistance,
      restingInspector
    },
    predation: {
      eventId: predation.eventId,
      deathEventId: predation.deathEventId,
      predatorCreatureId: predation.predatorCreatureId,
      preyCreatureId: predation.preyCreatureId,
      huntTile: [predation.x, predation.y],
      hungerBefore: predation.hungerBefore,
      hungerAfter: predation.hungerAfter,
      pulse
    },
    postPredationVegetation: postVegetation,
    recentRow,
    eventCard,
    postMapInspector,
    readOnlyAuthorityUnchanged: true,
    worldFingerprint: fnv1a(frozenFingerprint)
  };
  writeFileSync(join(outDir, 'ecology-readability-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Ecology readability evidence: 🌿 ${postVegetation.percent}% matches authority; Pulse + Recent + Event Card explain Wolf #${spawned.wolfId} → Grazer #${predation.preyCreatureId}; prey unavailable, Wolf Cause navigable; read-only authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function waitForPredation(cdpClient, wolfId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(cdpClient, `(() => {
      const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
      const event = world?.history?.findLast((entry) => entry.type === 'creature.predated' && entry.predatorCreatureId === ${wolfId});
      const death = event ? world?.history?.find((entry) => entry.id > event.id && entry.type === 'creature.died' && entry.creatureId === event.preyCreatureId && entry.cause === 'predation') : null;
      const wolf = world?.creatures?.find((creature) => creature.alive && creature.id === ${wolfId});
      return event && death && wolf ? {
        eventId: event.id,
        deathEventId: death.id,
        predatorCreatureId: event.predatorCreatureId,
        preyCreatureId: event.preyCreatureId,
        hungerBefore: event.predatorHungerBefore,
        hungerAfter: event.predatorHungerAfter,
        x: event.x,
        y: event.y,
        wolf: { id: wolf.id, x: wolf.x, y: wolf.y, hunger: wolf.hunger, health: wolf.health, ageDays: wolf.ageDays },
        godCreatureSpawns: world.history.filter((entry) => entry.type === 'god.spawn_creature').length
      } : null;
    })()`);
    if (value) return value;
    await delay(55);
  }
  return null;
}

async function vegetationEvidence(cdpClient, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await evaluate(cdpClient, `(() => {
      const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
      if (!world) return null;
      let vegetation = 0;
      let capacity = 0;
      for (const tile of world.tiles) {
        vegetation += tile.vegetation;
        capacity += tile.vegetationCapacity;
      }
      const percent = capacity > 0 ? Math.round((vegetation / capacity) * 100) : 0;
      return { percent, hud: document.querySelector('#stats [data-ecology-vegetation]')?.textContent ?? '' };
    })()`);
    if (lastState && lastState.hud === `🌿 ${lastState.percent}%`) return lastState;
    await delay(50);
  }
  throw new Error(`vegetation HUD did not converge to current authority: ${JSON.stringify(lastState)}`);
}

async function wolfSpawnPoint(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const radius = world.config.wolfPreySearchRadius;
    const grazers = world.creatures.filter((creature) => creature.alive && creature.species === 'grazer');
    const occupied = new Set([
      ...world.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => entity.x + ',' + entity.y),
      ...world.creatures.filter((creature) => creature.alive).map((creature) => creature.x + ',' + creature.y),
      ...(world.warbands ?? []).filter((band) => band.active).map((band) => band.x + ',' + band.y)
    ]);
    const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    for (const tile of world.tiles.filter((value) => value.passable).sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (occupied.has(tile.x + ',' + tile.y)) continue;
      const nearest = grazers.reduce((best, grazer) => Math.min(best, cheb(tile, grazer)), Infinity);
      if (nearest < 2 || nearest > radius) continue;
      const worldX = (tile.x + 0.5) * tileSize;
      const worldY = (tile.y + 0.5) * tileSize;
      const x = camera.x + (worldX - camera.worldView.x) * camera.zoom;
      const y = camera.y + (worldY - camera.worldView.y) * camera.zoom;
      if (x < 30 || x > 1120 || y < 75 || y > 790) continue;
      return { x, y, tileX: tile.x, tileY: tile.y, nearestGrazerDistance: nearest };
    }
    return null;
  })()`);
}

async function creatureScreenPoint(cdpClient, creatureId) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    const creature = world?.creatures?.find((value) => value.alive && value.id === ${creatureId});
    if (!world || !camera || !creature) return null;
    const tileSize = 28;
    const worldX = (creature.x + 0.5) * tileSize;
    const worldY = (creature.y + 0.5) * tileSize;
    const x = camera.x + (worldX - camera.worldView.x) * camera.zoom;
    const y = camera.y + (worldY - camera.worldView.y) * camera.zoom;
    if (x < 30 || x > 1120 || y < 75 || y > 790) return null;
    return { x, y, tileX: creature.x, tileY: creature.y, id: creature.id };
  })()`);
}

async function clickPauseTo(cdpClient, paused) {
  const current = await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (current !== paused) await clickSelector(cdpClient, '#pause');
  await waitForExpression(cdpClient, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 1_500);
  return true;
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

function assertFingerprint(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mutated paused authoritative world state`);
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

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
