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
  let contrast = null;
  // Prefer the ordinary Y40 showcase. If it does not yet contain two materially
  // distinct visible reserves, advance only through the visible Time/Play
  // controls. Evidence code never writes foodStored.
  for (let attempt = 0; !pair && attempt < 5; attempt += 1) {
    const beforeDay = await evaluate(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day ?? 0`);
    await setSpeed(cdp, '360');
    await setPaused(cdp, false);
    await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day >= ${beforeDay + 720}`, 8_000);
    await setPaused(cdp, true);
    pair = await reservePair(cdp);
  }

  // A resource-abundant world can converge to similar reserve ratios. #328
  // explicitly permits a deterministic bounded setup through ordinary God +
  // Time controls when the default showcase does not expose enough contrast.
  // Raise one small settlement's *capacity* with real Shift-click Spawn Human,
  // then let the existing monthly membership/territory/harvest cadence run.
  // This creates a truthful reserve-ratio contrast without injecting reserve.
  if (!pair) {
    contrast = await createReserveContrast(cdp);
    pair = contrast.pair;
  }
  if (!pair) {
    const diagnostics = await reserveDiagnostics(cdp);
    throw new Error(`production controls did not produce two materially different visible active settlement reserve ratios: ${JSON.stringify(diagnostics)}`);
  }

  const baseline = await fingerprint(cdp);
  const targetSettlement = pair.low.inspectable ? pair.low : pair.high;
  const expectedLine = `Food reserve ${formatAmount(targetSettlement.stored)} / ${formatAmount(targetSettlement.capacity)} · ${targetSettlement.state}`;

  // Use the real player interaction path. Only the settlement we inspect must
  // have a clear center; the other visible settlement may contain life at its
  // center because that does not hide its map Granary presentation.
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
  const setup = contrast
    ? 'ordinary public simulation + visible Shift-click Spawn Human capacity contrast + one settlement cadence through visible Time/Play; foodStored never written by evidence code'
    : 'ordinary public simulation + visible Time/Play controls only; foodStored never written by evidence code';
  const evidence = {
    settlementFoodReserveComplete: true,
    day: pair.day,
    paused: true,
    ratioSpread: pair.spread,
    low: pair.low,
    high: pair.high,
    contrast: contrast ? {
      targetSettlementId: contrast.targetSettlementId,
      targetSettlementName: contrast.targetSettlementName,
      spawnedHumans: contrast.spawnedHumans,
      spawnPoint: contrast.spawnPoint,
      beforePopulation: contrast.beforePopulation,
      afterPopulation: contrast.afterPopulation,
      beforeDay: contrast.beforeDay,
      afterDay: contrast.afterDay,
      settlementCheckIntervalDays: contrast.settlementCheckIntervalDays,
      interaction: 'real Spawn Human tool + Shift-click on owned passable tile, then visible Time/Play'
    } : null,
    inspector: {
      settlementId: targetSettlement.id,
      interaction: 'real Alt-click on visible clear settlement center',
      expectedLine,
      text: inspectorText,
      matchesSharedFacts: inspectorText.includes(expectedLine)
    },
    mapGranaryDiffers: rendered.low.visualSignature !== rendered.high.visualSignature && rendered.low.fillSegments !== rendered.high.fillSegments,
    readOnlyAuthorityUnchanged: afterInspection === baseline,
    setup
  };
  writeFileSync(join(outDir, 'settlement-food-reserve-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Settlement food reserve evidence: day ${pair.day}; ${pair.low.name} ${formatAmount(pair.low.stored)}/${pair.low.capacity} ${pair.low.state} (${pair.low.fillSegments}/5) vs ${pair.high.name} ${formatAmount(pair.high.stored)}/${pair.high.capacity} ${pair.high.state} (${pair.high.fillSegments}/5); real Alt-click Inspector matched; authority unchanged${contrast ? `; bounded God/Time contrast spawned ${contrast.spawnedHumans} humans at ${contrast.targetSettlementName}` : ''}`);
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
        point, inspectable: centerClear(settlement),
        visualSignature: scene.settlements.visuals.get(settlement.id)?.signature ?? null
      };
    };
    const active = world.settlements
      .filter((settlement) => settlement.active)
      .map(profile)
      .filter((value) => value.visualSignature && visible(value.point));
    let best = null;
    for (let a = 0; a < active.length; a += 1) {
      for (let b = a + 1; b < active.length; b += 1) {
        const low = active[a].ratio <= active[b].ratio ? active[a] : active[b];
        const high = low === active[a] ? active[b] : active[a];
        const spread = high.ratio - low.ratio;
        if (spread < 0.15 || low.fillSegments === high.fillSegments) continue;
        if (!low.inspectable && !high.inspectable) continue;
        if (!best || spread > best.spread || (spread === best.spread && low.id < best.low.id)) best = { low, high, spread };
      }
    }
    return best ? { day: world.day, ...best } : null;
  })()`);
}

async function createReserveContrast(cdpClient) {
  const target = await reserveContrastTarget(cdpClient);
  if (!target) throw new Error('no visible active settlement with an owned passable Spawn Human tile was available for bounded reserve contrast');

  // Worst case assumes the reserve starts full and the next monthly harvest uses
  // its entire 0.5×population budget. Solve for enough new residents to move the
  // post-harvest ratio below 0.8, round to real Shift-click batches of 10, and
  // keep the setup bounded to at most 40 humans for the canonical seed45 scale.
  const required = Math.floor((0.9 * target.population + 0.4) / 1.1) + 1;
  const spawnedHumans = Math.min(40, Math.max(20, Math.ceil(required / 10) * 10));
  await selectTool(cdpClient, 'spawn_human');

  const before = await evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const settlement = world?.settlements?.find((candidate) => candidate.id === ${target.id});
    return {
      day: world?.day ?? null,
      entityCount: world?.entities?.length ?? null,
      population: settlement?.population ?? null,
      interval: world?.config?.settlementCheckIntervalDays ?? null
    };
  })()`);
  if (!Number.isInteger(before?.day) || !Number.isInteger(before?.entityCount) || !Number.isFinite(before?.population) || !Number.isInteger(before?.interval) || before.interval <= 0) {
    throw new Error(`invalid pre-contrast world facts: ${JSON.stringify(before)}`);
  }

  for (let spawned = 0; spawned < spawnedHumans; spawned += 10) {
    await shiftClickPoint(cdpClient, target.spawnPoint);
  }
  await waitForExpression(cdpClient, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.entities?.length >= ${before.entityCount + spawnedHumans}`, 3_500);

  await setSpeed(cdpClient, '10');
  await setPaused(cdpClient, false);
  await waitForExpression(cdpClient, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day >= ${before.day + before.interval}`, 8_000);
  await setPaused(cdpClient, true);

  const after = await evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const settlement = world?.settlements?.find((candidate) => candidate.id === ${target.id});
    return { day: world?.day ?? null, population: settlement?.population ?? null };
  })()`);
  if (!(after?.population >= before.population + spawnedHumans)) {
    throw new Error(`Spawn Human contrast did not join the target settlement on the next membership cadence: before ${before.population}, after ${after?.population}, spawned ${spawnedHumans}`);
  }

  return {
    pair: await reservePair(cdpClient),
    targetSettlementId: target.id,
    targetSettlementName: target.name,
    spawnedHumans,
    spawnPoint: target.spawnPoint,
    beforePopulation: before.population,
    afterPopulation: after.population,
    beforeDay: before.day,
    afterDay: after.day,
    settlementCheckIntervalDays: before.interval
  };
}

async function reserveContrastTarget(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const life = [
      ...world.entities.filter((human) => human.kind === 'human' && human.alive),
      ...(world.creatures ?? []).filter((creature) => creature.alive),
      ...(world.warbands ?? []).filter((band) => band.active)
    ];
    const occupied = (x, y) => life.some((entity) => entity.x === x && entity.y === y);
    const screenPoint = (x, y) => {
      const worldX = (x + 0.5) * tileSize;
      const worldY = (y + 0.5) * tileSize;
      return {
        x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
        y: camera.y + (worldY - camera.worldView.y) * camera.zoom
      };
    };
    const visible = (point) => point.x >= 280 && point.x <= 1110 && point.y >= 80 && point.y <= 790;
    const candidates = [];
    for (const settlement of world.settlements.filter((candidate) => candidate.active).sort((a, b) => a.population - b.population || a.id - b.id)) {
      const centerPoint = screenPoint(settlement.x, settlement.y);
      if (!visible(centerPoint)) continue;
      const spawnTiles = [];
      for (let index = 0; index < world.tiles.length; index += 1) {
        const tile = world.tiles[index];
        if (!tile.passable || tile.ownerSettlementId !== settlement.id) continue;
        const x = index % world.width;
        const y = Math.floor(index / world.width);
        if (x === settlement.x && y === settlement.y) continue;
        const distance = Math.max(Math.abs(x - settlement.x), Math.abs(y - settlement.y));
        if (distance > world.config.settlementMembershipRadius || occupied(x, y)) continue;
        const point = screenPoint(x, y);
        if (!visible(point)) continue;
        spawnTiles.push({ x, y, point, distance });
      }
      spawnTiles.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
      if (spawnTiles.length > 0) candidates.push({
        id: settlement.id,
        name: settlement.name,
        population: settlement.population,
        spawnPoint: spawnTiles[0].point,
        spawnTile: { x: spawnTiles[0].x, y: spawnTiles[0].y }
      });
    }
    return candidates[0] ?? null;
  })()`);
}

async function reserveDiagnostics(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const activeWarbands = (world.warbands ?? []).filter((band) => band.active);
    const livingHumans = world.entities.filter((human) => human.kind === 'human' && human.alive);
    const livingCreatures = (world.creatures ?? []).filter((creature) => creature.alive);
    const centerClear = (settlement) =>
      !activeWarbands.some((band) => band.x === settlement.x && band.y === settlement.y) &&
      !livingHumans.some((human) => human.x === settlement.x && human.y === settlement.y) &&
      !livingCreatures.some((creature) => creature.x === settlement.x && creature.y === settlement.y);
    const pointFor = (settlement) => {
      const worldX = (settlement.x + 0.5) * tileSize;
      const worldY = (settlement.y + 0.5) * tileSize;
      return { x: camera.x + (worldX - camera.worldView.x) * camera.zoom, y: camera.y + (worldY - camera.worldView.y) * camera.zoom };
    };
    const visible = (point) => point.x >= 280 && point.x <= 1110 && point.y >= 80 && point.y <= 790;
    return {
      day: world.day,
      settlements: world.settlements.filter((settlement) => settlement.active).map((settlement) => {
        const capacity = 2 + 2 * settlement.population;
        const stored = Math.min(capacity, Math.max(0, settlement.foodStored ?? 0));
        const point = pointFor(settlement);
        return {
          id: settlement.id,
          name: settlement.name,
          population: settlement.population,
          stored,
          capacity,
          ratio: capacity > 0 ? stored / capacity : 0,
          inspectable: centerClear(settlement),
          visible: visible(point),
          visualSignature: scene.settlements?.visuals?.get(settlement.id)?.signature ?? null
        };
      })
    };
  })()`);
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

async function shiftClickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers: 8 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 8 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 8 });
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
