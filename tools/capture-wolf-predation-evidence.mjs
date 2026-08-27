import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-wolf-predation-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-wolf-predation-'));
const logFd = openSync(join(outDir, 'wolf-predation-chrome-runtime.log'), 'w');
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
  if (selected !== 'living_ecology') throw new Error('failed to choose Living Ecology for Wolf predation gate');
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await pauseWorld(cdp);

  const setup = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    return world ? {
      preset: document.querySelector('#world-preset')?.value ?? '',
      day: world.day,
      daysPerYear: world.config.daysPerYear,
      grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
      wolves: world.creatures.filter((creature) => creature.alive && creature.species === 'wolf').length,
      godCreatureSpawns: world.history.filter((event) => event.type === 'god.spawn_creature').length,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    } : null;
  })()`);
  if (!setup || setup.preset !== 'living_ecology' || !setup.paused || setup.wolves !== 0 || setup.grazers < 1) {
    throw new Error(`unexpected Wolf predation setup: ${JSON.stringify(setup)}`);
  }

  const spawnPoint = await wolfSpawnPoint(cdp);
  if (!spawnPoint) throw new Error('no visible clear Wolf spawn tile 2..searchRadius cells from a reachable living Grazer');

  const toolResult = await evaluate(cdp, `(() => {
    const tool = document.querySelector('#tool');
    if (!tool) return null;
    tool.value = 'spawn_wolf';
    return tool.value;
  })()`);
  if (toolResult !== 'spawn_wolf') throw new Error('hidden Wolf QA tool option unavailable');
  await clickPoint(cdp, spawnPoint, 0);
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.creatures?.some((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${spawnPoint.tileX} && creature.y === ${spawnPoint.tileY}) === true;
  })()`, 2_000);

  const spawned = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.species === 'wolf' && creature.x === ${spawnPoint.tileX} && creature.y === ${spawnPoint.tileY});
    const event = world?.history?.findLast((entry) => entry.type === 'god.spawn_creature' && entry.species === 'wolf');
    return wolf && event ? {
      wolfId: wolf.id,
      x: wolf.x,
      y: wolf.y,
      ageDays: wolf.ageDays,
      health: wolf.health,
      hunger: wolf.hunger,
      spawnEventId: event.id,
      grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
      godCreatureSpawns: world.history.filter((entry) => entry.type === 'god.spawn_creature').length,
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    } : null;
  })()`);
  if (!spawned || !spawned.paused || spawned.godCreatureSpawns !== setup.godCreatureSpawns + 1) {
    throw new Error(`explicit Wolf spawn authority mismatch: ${JSON.stringify(spawned)}`);
  }

  const speed = await evaluate(cdp, `(() => {
    const select = document.querySelector('#speed');
    if (!select) return null;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (speed !== '1') throw new Error('failed to set ordinary Time control to one day');

  const origin = { x: spawned.x, y: spawned.y };
  let previous = { ...origin };
  let firstMove = null;
  let predation = null;
  const unpaused = await clickPauseTo(cdp, false);
  if (!unpaused) throw new Error('failed to unpause Wolf predation world');

  const deadline = Date.now() + 22_000;
  while (Date.now() < deadline) {
    const state = await evaluate(cdp, `(() => {
      const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
      const world = scene?.world;
      const wolf = world?.creatures?.find((creature) => creature.alive && creature.species === 'wolf' && creature.id === ${spawned.wolfId});
      const predation = world?.history?.findLast((event) => event.type === 'creature.predated' && event.predatorCreatureId === ${spawned.wolfId});
      const death = predation ? world?.history?.find((event) => event.id > predation.id && event.type === 'creature.died' && event.creatureId === predation.preyCreatureId && event.cause === 'predation') : null;
      return world ? {
        day: world.day,
        wolf: wolf ? { id: wolf.id, x: wolf.x, y: wolf.y, ageDays: wolf.ageDays, health: wolf.health, hunger: wolf.hunger } : null,
        predation: predation ? {
          id: predation.id,
          predatorCreatureId: predation.predatorCreatureId,
          preyCreatureId: predation.preyCreatureId,
          predatorHungerBefore: predation.predatorHungerBefore,
          predatorHungerAfter: predation.predatorHungerAfter,
          x: predation.x,
          y: predation.y
        } : null,
        death: death ? { id: death.id, creatureId: death.creatureId, cause: death.cause } : null,
        preyStillCurrent: predation ? world.creatures.some((creature) => creature.alive && creature.id === predation.preyCreatureId) : null,
        grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
        godCreatureSpawns: world.history.filter((event) => event.type === 'god.spawn_creature').length
      } : null;
    })()`);
    if (!state?.wolf) throw new Error(`Wolf #${spawned.wolfId} died before supported browser predation`);
    const current = { x: state.wolf.x, y: state.wolf.y };
    if (!firstMove && (current.x !== previous.x || current.y !== previous.y)) {
      firstMove = { from: { ...previous }, to: { ...current }, day: state.day };
    }
    previous = current;
    if (state.predation) {
      predation = state;
      break;
    }
    await delay(55);
  }

  if (!firstMove) throw new Error(`Wolf #${spawned.wolfId} produced no observable movement through ordinary Time control`);
  if (!predation?.predation || !predation.death) throw new Error(`Wolf #${spawned.wolfId} produced no bounded authoritative browser predation`);
  if (predation.preyStillCurrent !== false) throw new Error(`predated Grazer #${predation.predation.preyCreatureId} remained current`);
  if (!(predation.predation.predatorHungerAfter < predation.predation.predatorHungerBefore)) {
    throw new Error(`Wolf feeding did not reduce hunger: ${JSON.stringify(predation.predation)}`);
  }
  if (predation.godCreatureSpawns !== spawned.godCreatureSpawns) {
    throw new Error('hidden creature reseed/spawn occurred after explicit Wolf setup');
  }

  const pausedAfter = await clickPauseTo(cdp, true);
  if (!pausedAfter) throw new Error('failed to pause after Wolf predation');
  await waitForExpression(cdp, `document.querySelector('#stats')?.textContent?.includes('🐺 1') === true`, 2_000);

  const postKill = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const wolf = world?.creatures?.find((creature) => creature.alive && creature.id === ${spawned.wolfId});
    return wolf ? {
      wolf: { id: wolf.id, x: wolf.x, y: wolf.y, ageDays: wolf.ageDays, health: wolf.health, hunger: wolf.hunger },
      grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
      hud: document.querySelector('#stats')?.textContent ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    } : null;
  })()`);
  if (!postKill?.paused) throw new Error(`post-predation pause/state mismatch: ${JSON.stringify(postKill)}`);

  const frozenFingerprint = await fingerprint(cdp);
  const wolfPoint = await creatureScreenPoint(cdp, spawned.wolfId);
  if (!wolfPoint) throw new Error('surviving Wolf is not visible for real post-predation inspection');
  await altClickPoint(cdp, wolfPoint);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.textContent?.startsWith('Wolf #${spawned.wolfId}') === true`, 2_000);
  const inspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if ((await fingerprint(cdp)) !== frozenFingerprint) throw new Error('post-predation Wolf inspection mutated paused authority');

  await captureScreenshot(cdp, join(outDir, 'living-ecology-wolf-predation-1440x900.png'));
  if ((await fingerprint(cdp)) !== frozenFingerprint) throw new Error('post-predation screenshot path mutated paused authority');

  const evidence = {
    livingEcologyBaseline: {
      year: setup.day / setup.daysPerYear,
      grazers: setup.grazers,
      wolves: setup.wolves,
      godCreatureSpawns: setup.godCreatureSpawns
    },
    explicitWolfSpawn: {
      wolfId: spawned.wolfId,
      eventId: spawned.spawnEventId,
      origin,
      nearestGrazerDistanceAtSetup: spawnPoint.nearestGrazerDistance,
      hunger: spawned.hunger,
      grazers: spawned.grazers
    },
    ordinaryTimeControl: { daysPerStep: 1 },
    firstMovement: firstMove,
    predation: {
      eventId: predation.predation.id,
      deathEventId: predation.death.id,
      predatorCreatureId: predation.predation.predatorCreatureId,
      preyCreatureId: predation.predation.preyCreatureId,
      huntTile: [predation.predation.x, predation.predation.y],
      hungerBeforeFeed: predation.predation.predatorHungerBefore,
      hungerAfterFeed: predation.predation.predatorHungerAfter,
      preyRemovedFromCurrentAuthority: predation.preyStillCurrent === false,
      godCreatureSpawnsAfterHunt: predation.godCreatureSpawns
    },
    postPredation: {
      wolf: postKill.wolf,
      livingGrazers: postKill.grazers,
      hud: postKill.hud,
      inspector,
      pausedReadOnlyAuthorityUnchanged: true,
      worldFingerprint: fnv1a(frozenFingerprint)
    }
  };
  writeFileSync(join(outDir, 'wolf-predation-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Wolf predation evidence: Wolf #${spawned.wolfId} moved ${firstMove.from.x},${firstMove.from.y}→${firstMove.to.x},${firstMove.to.y}; predated Grazer #${predation.predation.preyCreatureId} in Event #${predation.predation.id} / death #${predation.death.id}; hunger ${predation.predation.predatorHungerBefore.toFixed(2)}→${predation.predation.predatorHungerAfter.toFixed(2)}; paused inspection authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
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
    const passable = new Set(world.tiles.filter((tile) => tile.passable).map((tile) => tile.x + ',' + tile.y));
    const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const chosenPrey = (tile) => grazers
      .map((grazer) => ({ grazer, distance: distance(tile, grazer) }))
      .filter((entry) => entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance || a.grazer.id - b.grazer.id)[0] ?? null;
    const reducingStep = (tile, prey) => {
      const currentDistance = distance(tile, prey);
      const candidates = [];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const next = { x: tile.x + dx, y: tile.y + dy };
          if (!passable.has(next.x + ',' + next.y)) continue;
          const nextDistance = distance(next, prey);
          if (nextDistance >= currentDistance) continue;
          candidates.push({ tile: next, distance: nextDistance, manhattan: manhattan(next, prey) });
        }
      }
      return candidates.sort((a, b) => a.distance - b.distance || a.manhattan - b.manhattan || a.tile.y - b.tile.y || a.tile.x - b.tile.x)[0] ?? null;
    };
    const screen = (tile) => {
      const worldX = (tile.x + 0.5) * tileSize;
      const worldY = (tile.y + 0.5) * tileSize;
      return { x: camera.x + (worldX - camera.worldView.x) * camera.zoom, y: camera.y + (worldY - camera.worldView.y) * camera.zoom };
    };
    const candidates = world.tiles
      .filter((tile) => tile.passable && !occupied.has(tile.x + ',' + tile.y))
      .map((tile) => ({ tile, prey: chosenPrey(tile) }))
      .filter(({ prey }) => prey && prey.distance >= 2 && prey.distance <= radius)
      .map(({ tile, prey }) => ({ tile, prey, firstStep: reducingStep(tile, prey.grazer), point: screen(tile) }))
      .filter(({ firstStep }) => firstStep)
      .filter(({ point }) => point.x >= 30 && point.x <= 1120 && point.y >= 75 && point.y <= 790)
      .sort((a, b) => a.prey.distance - b.prey.distance || a.tile.y - b.tile.y || a.tile.x - b.tile.x);
    const chosen = candidates[0];
    return chosen ? {
      x: chosen.point.x,
      y: chosen.point.y,
      tileX: chosen.tile.x,
      tileY: chosen.tile.y,
      nearestGrazerDistance: chosen.prey.distance
    } : null;
  })()`);
}

async function creatureScreenPoint(cdpClient, creatureId) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    const creature = world?.creatures?.find((candidate) => candidate.alive && candidate.id === ${creatureId});
    if (!world || !camera || !creature) return null;
    const tileSize = 28;
    const worldX = (creature.x + 0.5) * tileSize;
    const worldY = (creature.y + 0.5) * tileSize;
    const x = camera.x + (worldX - camera.worldView.x) * camera.zoom;
    const y = camera.y + (worldY - camera.worldView.y) * camera.zoom;
    if (x < 30 || x > 1120 || y < 75 || y > 790) return null;
    const humanOverlap = world.entities.some((entity) => entity.kind === 'human' && entity.alive && entity.x === creature.x && entity.y === creature.y);
    if (humanOverlap) return null;
    return { x, y, tileX: creature.x, tileY: creature.y };
  })()`);
}

async function pauseWorld(cdpClient) {
  if (!(await clickPauseTo(cdpClient, true))) throw new Error('failed to pause Wolf predation world');
}

async function clickPauseTo(cdpClient, paused) {
  const current = await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (Boolean(current) !== paused) await clickSelector(cdpClient, '#pause');
  await waitForExpression(cdpClient, `document.querySelector('#pause')?.dataset?.active === ${paused ? "'true'" : "'false'"}`, 2_000);
  await delay(80);
  return (await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`)) === paused;
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

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
