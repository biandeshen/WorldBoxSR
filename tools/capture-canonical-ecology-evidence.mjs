import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-canonical-ecology-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

const Y34 = Object.freeze({ year: 34, grazers: 136, vegetation: 0.3431, births: 150 });
const Y40 = Object.freeze({ year: 40, grazers: 116, vegetation: 0.1750, births: 156 });
const Y50 = Object.freeze({ year: 50, grazers: 68, vegetation: 0.3744, births: 160 });
const WOLF_TILE = Object.freeze({ x: 0, y: 8, nearestGrazerDistance: 3 });
const TILE_SIZE = 28;

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-canonical-ecology-'));
const logFd = openSync(join(outDir, 'canonical-ecology-chrome-runtime.log'), 'w');
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

  // Freeze the player clock before switching presets so the Living Ecology
  // warmup lands on exact Y40 instead of drifting a few days before QA pauses.
  await clickPauseTo(cdp, true);
  const preset = await evaluate(cdp, `(() => {
    const select = document.querySelector('#world-preset');
    if (!select) return null;
    select.value = 'living_ecology';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (preset !== 'living_ecology') throw new Error('failed to choose Living Ecology for canonical release gate');
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`, 1_500);

  const y40 = await checkpoint(cdp, 40);
  assertCheckpoint(y40, Y40, 'Y40 trough');
  if (y40.godCreatureSpawns !== 0 || y40.wolves !== 0) throw new Error(`Y40 must remain natural Grazer-only authority: ${JSON.stringify(y40)}`);
  if (!y40.hud.includes('🐾 116') || !y40.hud.includes('🌿 18%')) throw new Error(`Y40 HUD did not expose trough state: ${y40.hud}`);
  await captureScreenshot(cdp, join(outDir, 'living-ecology-canonical-trough-y40-1440x900.png'));

  // Advance through the real product Time control in exact one-year steps.
  await setSpeed(cdp, '360');
  await clickPauseTo(cdp, false);
  await waitForExactDay(cdp, 50 * 360, 5_000);
  await clickPauseTo(cdp, true);
  const y50 = await checkpoint(cdp, 50);
  assertCheckpoint(y50, Y50, 'Y50 recovery');
  if (y50.vegetation - y40.vegetation < 0.19 || y50.grazers >= y40.grazers) {
    throw new Error(`browser did not reproduce lower-pressure vegetation recovery: ${JSON.stringify({ y40, y50 })}`);
  }
  if (!y50.hud.includes('🐾 68') || !y50.hud.includes('🌿 37%')) throw new Error(`Y50 HUD did not expose recovered state: ${y50.hud}`);
  await captureScreenshot(cdp, join(outDir, 'living-ecology-canonical-recovery-y50-1440x900.png'));

  const wolfPoint = await fixedWolfSpawnPoint(cdp);
  if (!wolfPoint) throw new Error('fixed canonical Wolf tile 0,8 is unavailable or not real-clickable at Y50');
  const tool = await evaluate(cdp, `(() => {
    const select = document.querySelector('#tool');
    if (!select) return null;
    select.value = 'spawn_wolf';
    return select.value;
  })()`);
  if (tool !== 'spawn_wolf') throw new Error('hidden Wolf QA setup option unavailable');
  await clickPoint(cdp, wolfPoint, 0);
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.creatures?.some((creature) => creature.alive && creature.species === 'wolf' && creature.x === 0 && creature.y === 8) === true;
  })()`, 2_000);
  const spawned = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.species === 'wolf' && creature.x === 0 && creature.y === 8);
    const event = world?.history?.findLast((entry) => entry.type === 'god.spawn_creature' && entry.species === 'wolf');
    return wolf && event ? {
      wolfId: wolf.id,
      spawnEventId: event.id,
      x: wolf.x,
      y: wolf.y,
      godCreatureSpawns: world.history.filter((entry) => entry.type === 'god.spawn_creature').length
    } : null;
  })()`);
  if (!spawned || spawned.godCreatureSpawns !== 1) throw new Error(`canonical explicit Wolf setup mismatch: ${JSON.stringify(spawned)}`);

  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  const hunt = await observeMovementAndPredation(cdp, spawned.wolfId, 7_000);
  if (!hunt?.firstMovement || !hunt.predation) throw new Error(`canonical Wolf did not produce movement + predation: ${JSON.stringify(hunt)}`);
  if (JSON.stringify(hunt.firstMovement.from) !== JSON.stringify({ x: 0, y: 8 }) || JSON.stringify(hunt.firstMovement.to) !== JSON.stringify({ x: 1, y: 9 })) {
    throw new Error(`canonical first Wolf movement drifted: ${JSON.stringify(hunt.firstMovement)}`);
  }
  await clickPauseTo(cdp, true);
  const postHunt = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.id === ${spawned.wolfId});
    const event = world?.history?.find((entry) => entry.id === ${hunt.predation.eventId});
    const death = event ? world?.history?.find((entry) => entry.id > event.id && entry.type === 'creature.died' && entry.creatureId === event.preyCreatureId && entry.cause === 'predation') : null;
    return event && death && wolf ? {
      day: world.day,
      wolf: { id: wolf.id, x: wolf.x, y: wolf.y, hunger: wolf.hunger, health: wolf.health, ageDays: wolf.ageDays },
      eventId: event.id,
      deathEventId: death.id,
      preyCreatureId: event.preyCreatureId,
      hungerBefore: event.predatorHungerBefore,
      hungerAfter: event.predatorHungerAfter,
      preyStillAlive: world.creatures.some((creature) => creature.alive && creature.id === event.preyCreatureId),
      grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
      godCreatureSpawns: world.history.filter((entry) => entry.type === 'god.spawn_creature').length
    } : null;
  })()`);
  if (!postHunt || postHunt.preyStillAlive || postHunt.godCreatureSpawns !== 1 || !(postHunt.hungerAfter < postHunt.hungerBefore)) {
    throw new Error(`canonical predation authority mismatch: ${JSON.stringify(postHunt)}`);
  }

  const expectedHeadline = `Wolf #${spawned.wolfId} hunted Grazer #${postHunt.preyCreatureId}`;
  await waitForExpression(cdp, `(() => [...document.querySelectorAll('#world-event-pulse .world-event-card strong')].some((node) => node.textContent === ${JSON.stringify(expectedHeadline)}))()`, 2_500);
  const pulse = await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('#world-event-pulse .world-event-card')].find((node) => node.querySelector('strong')?.textContent === ${JSON.stringify(expectedHeadline)});
    return card ? { title: card.querySelector('strong')?.textContent ?? '', detail: card.querySelector('small')?.textContent ?? '' } : null;
  })()`);
  if (!pulse) throw new Error('canonical predation Pulse was not visible');

  const frozenFingerprint = await fingerprint(cdp);
  if (!(await evaluate(cdp, `document.querySelector('#timeline')?.open === true`))) {
    await clickSelector(cdp, '#timeline > summary');
    await waitForExpression(cdp, `document.querySelector('#timeline')?.open === true`, 1_500);
  }
  await clickSelector(cdp, '[data-chronicle-lens="recent"]');
  await waitForExpression(cdp, `document.querySelector('[data-chronicle-lens="recent"]')?.dataset?.active === 'true'`, 1_500);
  await waitForExpression(cdp, `document.querySelector('#history-list button[data-event-id="${postHunt.eventId}"]') !== null`, 2_000);
  const recentRow = await evaluate(cdp, `document.querySelector('#history-list button[data-event-id="${postHunt.eventId}"]')?.textContent ?? ''`);
  if (!recentRow.includes(expectedHeadline)) throw new Error(`canonical Recent row is not readable: ${recentRow}`);
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'Recent navigation');

  await clickSelector(cdp, `#history-list button[data-event-id="${postHunt.eventId}"]`);
  await waitForExpression(cdp, `document.querySelector('#history-detail .event-card')?.textContent?.includes(${JSON.stringify(expectedHeadline)}) === true`, 2_000);
  const eventCard = await evaluate(cdp, `(() => {
    const card = document.querySelector('#history-detail .event-card');
    if (!card) return null;
    return {
      text: card.textContent.trim(),
      unavailable: [...card.querySelectorAll('[data-status="unresolved"]')].map((node) => node.textContent.trim()),
      resolved: [...card.querySelectorAll('[data-status="resolved"]')].map((node) => node.textContent.trim()),
      wolfMap: Boolean(card.querySelector('[data-event-card-nav="map"][data-entity-kind="creature"][data-entity-id="${spawned.wolfId}"]'))
    };
  })()`);
  if (!eventCard?.unavailable.some((text) => text.includes(`Creature #${postHunt.preyCreatureId}`) && text.includes('not currently present'))) {
    throw new Error(`canonical dead prey Subject is not truthfully unavailable: ${JSON.stringify(eventCard)}`);
  }
  if (!eventCard.resolved.some((text) => text.includes(`Wolf #${spawned.wolfId}`)) || !eventCard.wolfMap) {
    throw new Error(`canonical living Wolf Cause is not resolved/map-navigable: ${JSON.stringify(eventCard)}`);
  }
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'Event Card navigation');
  await captureScreenshot(cdp, join(outDir, 'living-ecology-canonical-predation-1440x900.png'));
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'canonical predation screenshot');

  const mapSelector = `[data-event-card-nav="map"][data-entity-kind="creature"][data-entity-id="${spawned.wolfId}"]`;
  await clickSelector(cdp, mapSelector);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.startsWith('Wolf #${spawned.wolfId}') === true`, 2_000);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.includes('behavior resting') === true`, 2_000);
  const inspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  assertFingerprint(await fingerprint(cdp), frozenFingerprint, 'Wolf map/inspection navigation');

  const evidence = {
    frozenHeadlessTrajectory: { y34: Y34, y40: Y40, y50: Y50 },
    browserTrough: y40,
    browserRecovery: y50,
    recoveryObservedThroughProductTimeControl: true,
    explicitWolf: { ...spawned, tile: [WOLF_TILE.x, WOLF_TILE.y], nearestGrazerDistance: WOLF_TILE.nearestGrazerDistance },
    firstMovement: hunt.firstMovement,
    predation: { ...postHunt, pulse },
    recentRow,
    eventCard,
    inspector,
    readOnlyAuthorityUnchanged: true,
    worldFingerprint: fnv1a(frozenFingerprint)
  };
  writeFileSync(join(outDir, 'canonical-ecology-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Canonical Living Ecology browser gate: Y40 ${y40.grazers}/${(y40.vegetation * 100).toFixed(2)}% → Y50 ${y50.grazers}/${(y50.vegetation * 100).toFixed(2)}%; Wolf #${spawned.wolfId} moved 0,8→1,9 and predated Grazer #${postHunt.preyCreatureId}; Pulse + Recent + Event Card + current inspector readable; paused navigation authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function checkpoint(cdpClient, expectedYear) {
  await waitForHudConvergence(cdpClient, 2_000);
  return evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    if (!world) return null;
    let vegetation = 0; let capacity = 0;
    for (const tile of world.tiles) { vegetation += tile.vegetation; capacity += tile.vegetationCapacity; }
    return {
      year: world.day / world.config.daysPerYear,
      day: world.day,
      grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
      wolves: world.creatures.filter((creature) => creature.alive && creature.species === 'wolf').length,
      vegetation: Number((capacity > 0 ? vegetation / capacity : 0).toFixed(4)),
      births: world.counters.creatureBirths,
      godCreatureSpawns: world.history.filter((event) => event.type === 'god.spawn_creature').length,
      hud: document.querySelector('#stats')?.textContent ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      preset: document.querySelector('#world-preset')?.value ?? ''
    };
  })()`);
}

function assertCheckpoint(actual, expected, label) {
  if (!actual || actual.year !== expected.year || actual.grazers !== expected.grazers || actual.vegetation !== expected.vegetation || actual.births !== expected.births || actual.wolves !== 0 || !actual.paused || actual.preset !== 'living_ecology') {
    throw new Error(`${label} drifted from frozen canonical authority: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

async function fixedWolfSpawnPoint(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    const canvas = scene?.game?.canvas;
    if (!world || !camera || !canvas) return null;
    const tile = world.tiles[${WOLF_TILE.y} * world.width + ${WOLF_TILE.x}];
    if (!tile?.passable) return null;
    const occupied = [
      ...world.entities.filter((entity) => entity.kind === 'human' && entity.alive),
      ...world.creatures.filter((creature) => creature.alive),
      ...(world.warbands ?? []).filter((warband) => warband.active)
    ].some((entity) => entity.x === ${WOLF_TILE.x} && entity.y === ${WOLF_TILE.y});
    if (occupied) return null;
    const nearest = world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').reduce((min, grazer) => Math.min(min, Math.max(Math.abs(${WOLF_TILE.x} - grazer.x), Math.abs(${WOLF_TILE.y} - grazer.y))), Infinity);
    if (nearest !== ${WOLF_TILE.nearestGrazerDistance}) return null;
    const worldX = (${WOLF_TILE.x} + 0.5) * ${TILE_SIZE};
    const worldY = (${WOLF_TILE.y} + 0.5) * ${TILE_SIZE};
    const x = camera.x + (worldX - camera.worldView.x) * camera.zoom;
    const y = camera.y + (worldY - camera.worldView.y) * camera.zoom;
    const top = document.elementFromPoint(x, y);
    if (x < 20 || x > 1120 || y < 70 || y > 790 || top !== canvas) return null;
    return { x, y, tileX: ${WOLF_TILE.x}, tileY: ${WOLF_TILE.y}, nearestGrazerDistance: nearest };
  })()`);
}

async function observeMovementAndPredation(cdpClient, wolfId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = { x: WOLF_TILE.x, y: WOLF_TILE.y };
  let firstMovement = null;
  while (Date.now() < deadline) {
    const state = await evaluate(cdpClient, `(() => {
      const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
      const wolf = world?.creatures?.find((creature) => creature.alive && creature.id === ${wolfId});
      const event = world?.history?.findLast((entry) => entry.type === 'creature.predated' && entry.predatorCreatureId === ${wolfId});
      return wolf ? { day: world.day, x: wolf.x, y: wolf.y, eventId: event?.id ?? null } : null;
    })()`);
    if (!state) throw new Error(`Wolf #${wolfId} disappeared before canonical predation`);
    if (!firstMovement && (state.x !== last.x || state.y !== last.y)) {
      firstMovement = { day: state.day - 50 * 360, from: { ...last }, to: { x: state.x, y: state.y } };
    }
    last = { x: state.x, y: state.y };
    if (state.eventId) return { firstMovement, predation: { eventId: state.eventId } };
    await delay(20);
  }
  return null;
}

async function setSpeed(cdpClient, value) {
  const actual = await evaluate(cdpClient, `(() => {
    const select = document.querySelector('#speed');
    if (!select) return null;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set ordinary Time control to ${value}`);
}

async function waitForExactDay(cdpClient, targetDay, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const day = await evaluate(cdpClient, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day ?? -1`);
    if (day === targetDay) return;
    if (day > targetDay) throw new Error(`product Time control overshot canonical day ${targetDay}: ${day}`);
    await delay(10);
  }
  throw new Error(`timed out before canonical day ${targetDay}`);
}

async function waitForHudConvergence(cdpClient, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let previous = null;
  while (Date.now() < deadline) {
    const current = await evaluate(cdpClient, `document.querySelector('#stats')?.textContent ?? ''`);
    if (current && current === previous && current.includes('🌿')) return;
    previous = current;
    await delay(80);
  }
}

async function clickPauseTo(cdpClient, paused) {
  const current = await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (current !== paused) await clickSelector(cdpClient, '#pause');
  await waitForExpression(cdpClient, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 1_500);
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

async function clickPoint(cdpClient, point, modifiers = 0) {
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
