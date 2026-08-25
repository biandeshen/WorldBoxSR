import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-story-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-story-'));
const logPath = join(outDir, 'story-chrome-runtime.log');
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
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('failed to pause canonical world');

  const successionTarget = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) throw new Error('world scene unavailable');
    const adultAgeDays = world.config.adultAgeYears * world.config.daysPerYear;
    const tileSize = 28;
    const candidates = [];
    for (const polity of world.polities.filter((value) => value.active).sort((a, b) => a.id - b.id)) {
      if (!Number.isInteger(polity.rulerId)) continue;
      const memberSettlements = new Set(world.settlements
        .filter((settlement) => settlement.active && settlement.polityId === polity.id)
        .map((settlement) => settlement.id));
      const adults = world.entities
        .filter((human) => human.kind === 'human' && human.alive && human.ageDays >= adultAgeDays && memberSettlements.has(human.settlementId))
        .sort((a, b) => b.ageDays - a.ageDays || a.id - b.id);
      const ruler = adults.find((human) => human.id === polity.rulerId);
      if (!ruler || adults.length < 2) continue;
      const worldX = (ruler.x + 0.5) * tileSize;
      const worldY = (ruler.y + 0.5) * tileSize;
      const screenX = camera.x + (worldX - camera.worldView.x) * camera.zoom;
      const screenY = camera.y + (worldY - camera.worldView.y) * camera.zoom;
      if (screenX < 40 || screenX > 1110 || screenY < 85 || screenY > 785) continue;
      candidates.push({
        polityId: polity.id,
        polityName: polity.name,
        rulerId: ruler.id,
        x: ruler.x,
        y: ruler.y,
        screenX,
        screenY,
        eligibleAdults: adults.length,
        day: world.day
      });
    }
    return candidates.sort((a, b) => b.eligibleAdults - a.eligibleAdults || a.polityId - b.polityId)[0] ?? null;
  })()`);
  if (!successionTarget) throw new Error('no visible polity had a ruler plus deterministic successor candidate');

  await selectTool(cdp, 'lightning');
  await clickPoint(cdp, { x: successionTarget.screenX, y: successionTarget.screenY });
  await delay(120);

  const death = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    if (!world) return null;
    const death = world.history.findLast((event) => event.type === 'human.died' && event.entityId === ${successionTarget.rulerId} && event.cause === 'lightning') ?? null;
    const strike = world.history.findLast((event) => event.type === 'god.lightning' && event.x === ${successionTarget.x} && event.y === ${successionTarget.y}) ?? null;
    return { death, strike, rulerStillPresent: world.entities.some((human) => human.kind === 'human' && human.id === ${successionTarget.rulerId}) };
  })()`);
  if (!death?.death || !death?.strike) throw new Error('real Lightning pointer action did not create ruler death + god.lightning authority');
  if (death.rulerStillPresent) throw new Error('Lightning evidence ruler remained in authoritative entities');

  const resumed = await evaluate(cdp, `(() => {
    const speed = document.querySelector('#speed');
    if (speed) {
      speed.value = '1';
      speed.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const pause = document.querySelector('#pause');
    if (!pause) throw new Error('missing #pause');
    if (pause.dataset.active === 'true') pause.click();
    return pause.dataset.active !== 'true';
  })()`);
  if (!resumed) throw new Error('failed to resume world for succession tick');

  const deathEventId = death.death.id;
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.history?.some((event) => event.type === 'polity.ruler_succeeded'
      && event.polityId === ${successionTarget.polityId}
      && event.causes?.some((cause) => cause.kind === 'event' && cause.id === ${deathEventId})) === true;
  })()`, 5_000);

  const storySetup = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const pause = document.querySelector('#pause');
    if (pause?.dataset.active !== 'true') pause?.click();
    const timeline = document.querySelector('#timeline');
    if (timeline) timeline.open = true;
    const succession = world.history.findLast((event) => event.type === 'polity.ruler_succeeded'
      && event.polityId === ${successionTarget.polityId}
      && event.causes?.some((cause) => cause.kind === 'event' && cause.id === ${deathEventId})) ?? null;
    if (!succession) return null;
    const button = [...document.querySelectorAll('#history-list button[data-event-id]')]
      .find((candidate) => Number(candidate.dataset.eventId) === succession.id) ?? null;
    const rect = button?.getBoundingClientRect?.();
    return {
      succession,
      button: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null,
      visibleChronicle: [...document.querySelectorAll('#history-list button[data-event-id]')].map((candidate) => ({ id: Number(candidate.dataset.eventId), text: candidate.textContent ?? '' })),
      worldFingerprint: JSON.stringify(world),
      paused: pause?.dataset.active === 'true'
    };
  })()`);
  if (!storySetup?.succession) throw new Error('succession event disappeared after detection');
  if (!storySetup.button) throw new Error(`fresh causal succession was not visible in Chronicle: ${JSON.stringify(storySetup.visibleChronicle)}`);
  if (!storySetup.paused) throw new Error('world was not paused before story navigation');
  await delay(120);

  await clickPoint(cdp, storySetup.button);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${storySetup.succession.id}'`, 3_000);
  const successionCard = await cardEvidence(cdp);
  if (successionCard.eventButtons < 1) throw new Error('succession Event Card did not expose retained death-event cause');
  if (successionCard.mapButtons < 1) throw new Error('succession Event Card did not expose current polity/successor map navigation');
  if (!successionCard.text.includes('Subject') || !successionCard.text.includes('Causes')) throw new Error('succession Event Card is missing Subject/Causes sections');
  await captureScreenshot(cdp, join(outDir, 'story-causal-event-card-1440x900.png'));

  const eventCausePoint = await elementCenter(cdp, `#history-detail button[data-event-card-nav="event"][data-event-id="${deathEventId}"]`);
  await clickPoint(cdp, eventCausePoint);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${deathEventId}'`, 3_000);
  const causeCard = await cardEvidence(cdp);
  if (causeCard.eventId !== deathEventId) throw new Error('event-cause navigation opened the wrong retained death event');
  if (causeCard.unavailableRows < 1) throw new Error('death Event Card did not truthfully expose the removed ruler as unavailable');
  await captureScreenshot(cdp, join(outDir, 'story-event-cause-opened-1440x900.png'));

  await clickPoint(cdp, storySetup.button);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${storySetup.succession.id}'`, 3_000);
  const mapTarget = await evaluate(cdp, `(() => {
    const button = document.querySelector('#history-detail button[data-event-card-nav="map"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      entityKind: button.dataset.entityKind,
      entityId: Number(button.dataset.entityId),
      tileX: Number(button.dataset.x),
      tileY: Number(button.dataset.y)
    };
  })()`);
  if (!mapTarget) throw new Error('map navigation target disappeared from succession Event Card');
  await clickPoint(cdp, mapTarget);
  await delay(160);

  const mapEvidence = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const inspector = document.querySelector('#inspector')?.textContent ?? '';
    const refKind = ${JSON.stringify(mapTarget.entityKind)};
    const refId = ${mapTarget.entityId};
    let expected = '';
    if (refKind === 'human') expected = 'Human #' + refId;
    else if (refKind === 'creature') expected = '#' + refId;
    else if (refKind === 'settlement') expected = world.settlements.find((value) => value.id === refId)?.name ?? ('Settlement #' + refId);
    else if (refKind === 'warband') expected = 'Warband #' + refId;
    else if (refKind === 'polity') expected = world.polities.find((value) => value.id === refId)?.name ?? ('Polity #' + refId);
    return { inspector, expected, worldFingerprint: JSON.stringify(world), paused: document.querySelector('#pause')?.dataset?.active === 'true' };
  })()`);
  if (!mapEvidence.expected || !mapEvidence.inspector.includes(mapEvidence.expected)) {
    throw new Error(`map navigation inspector did not identify referenced object: expected ${mapEvidence.expected}; got ${mapEvidence.inspector}`);
  }
  if (!mapEvidence.paused) throw new Error('world resumed during Event Card navigation');
  if (mapEvidence.worldFingerprint !== storySetup.worldFingerprint) throw new Error('story navigation mutated authoritative world state');
  await captureScreenshot(cdp, join(outDir, 'story-map-reference-navigation-1440x900.png'));

  writeFileSync(join(outDir, 'story-evidence.json'), `${JSON.stringify({
    setup: successionTarget,
    lightningEventId: death.strike.id,
    deathEventId,
    successionEventId: storySetup.succession.id,
    successorId: storySetup.succession.rulerId,
    successionCard,
    causeCard,
    mapTarget: { entityKind: mapTarget.entityKind, entityId: mapTarget.entityId, x: mapTarget.tileX, y: mapTarget.tileY },
    inspector: mapEvidence.inspector
  }, null, 2)}\n`);

  console.log(
    `World Stories evidence: Lightning killed ruler #${successionTarget.rulerId} of ${successionTarget.polityName}; `
    + `succession event #${storySetup.succession.id} → death event #${deathEventId}; `
    + `map ${mapTarget.entityKind} #${mapTarget.entityId}; authoritative navigation fingerprint unchanged`
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

async function cardEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const detail = document.querySelector('#history-detail');
    return {
      eventId: Number(detail?.dataset?.eventCardId),
      text: detail?.textContent ?? '',
      eventButtons: detail?.querySelectorAll('button[data-event-card-nav="event"]')?.length ?? 0,
      mapButtons: detail?.querySelectorAll('button[data-event-card-nav="map"]')?.length ?? 0,
      unavailableRows: detail?.querySelectorAll('.event-card-ref[data-status="unresolved"]')?.length ?? 0
    };
  })()`);
}

async function elementCenter(cdpClient, selector) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`element not found: ${selector}`);
  return point;
}

async function clickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
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
