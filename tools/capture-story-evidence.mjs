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
    const timeline = document.querySelector('#timeline');
    if (timeline) timeline.open = true;
    return pause.dataset.active === 'true' && timeline?.open === true;
  })()`);
  if (!paused) throw new Error('failed to pause world and open Chronicle');
  await delay(120);

  const candidates = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    if (!world) throw new Error('world unavailable');
    const current = (ref) => {
      if (ref?.kind !== 'entity') return null;
      if (ref.entityKind === 'human') return world.entities.find((value) => value.kind === 'human' && value.id === ref.id) ?? null;
      if (ref.entityKind === 'creature') return world.creatures.find((value) => value.id === ref.id) ?? null;
      if (ref.entityKind === 'settlement') return world.settlements.find((value) => value.id === ref.id) ?? null;
      if (ref.entityKind === 'warband') return world.warbands.find((value) => value.id === ref.id) ?? null;
      if (ref.entityKind === 'polity') {
        const polity = world.polities.find((value) => value.id === ref.id) ?? null;
        if (!polity) return null;
        const capital = world.settlements.find((value) => value.id === polity.capitalSettlementId) ?? null;
        return capital ? { ...polity, x: capital.x, y: capital.y } : null;
      }
      return null;
    };
    const rows = [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => {
      const eventId = Number(button.dataset.eventId);
      const historyEvent = world.history.find((value) => value.id === eventId);
      const rect = button.getBoundingClientRect();
      const retainedEventCause = historyEvent?.causes?.find((ref) => ref.kind === 'event' && world.history.some((value) => value.id === ref.id)) ?? null;
      const refs = historyEvent ? [historyEvent.subject, ...(historyEvent.causes ?? [])].filter(Boolean) : [];
      const mapRef = refs.find((ref) => current(ref)) ?? null;
      return historyEvent ? {
        eventId,
        eventType: historyEvent.type,
        retainedEventCause,
        mapRef,
        button: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: button.textContent ?? ''
      } : null;
    }).filter(Boolean);
    return {
      rows,
      eventCandidate: rows.find((row) => row.retainedEventCause) ?? null,
      mapCandidate: rows.find((row) => row.mapRef) ?? null,
      worldFingerprint: JSON.stringify(world)
    };
  })()`);

  if (!candidates.eventCandidate) {
    throw new Error(`no visible Chronicle event had a retained event cause; visible=${JSON.stringify(candidates.rows)}`);
  }
  if (!candidates.mapCandidate) {
    throw new Error(`no visible Chronicle event had a current map-capable authoritative ref; visible=${JSON.stringify(candidates.rows)}`);
  }

  const eventCandidate = candidates.eventCandidate;
  await clickPoint(cdp, eventCandidate.button);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventCandidate.eventId}'`, 3_000);
  const eventCard = await cardEvidence(cdp);
  if (eventCard.eventButtons < 1) throw new Error('Causal Event Card did not expose retained event cause navigation');
  if (!eventCard.text.includes('Causes')) throw new Error('Causal Event Card is missing Causes section');
  await captureScreenshot(cdp, join(outDir, 'story-causal-event-card-1440x900.png'));

  const eventCauseId = eventCandidate.retainedEventCause.id;
  const eventCausePoint = await elementCenter(cdp, '#history-detail button[data-event-card-nav="event"]');
  await clickPoint(cdp, eventCausePoint);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventCauseId}'`, 3_000);
  const causeCard = await cardEvidence(cdp);
  if (causeCard.eventId !== eventCauseId) throw new Error('event-cause navigation opened the wrong retained event');
  await captureScreenshot(cdp, join(outDir, 'story-event-cause-opened-1440x900.png'));

  const mapCandidate = candidates.mapCandidate;
  await clickPoint(cdp, mapCandidate.button);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${mapCandidate.eventId}'`, 3_000);
  const mapCard = await cardEvidence(cdp);
  if (mapCard.mapButtons < 1) throw new Error('map-capable Chronicle event did not expose a map navigation button');

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
  if (!mapTarget) throw new Error('map navigation target disappeared from Event Card');
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
    return { inspector, expected, worldFingerprint: JSON.stringify(world) };
  })()`);
  if (!mapEvidence.expected || !mapEvidence.inspector.includes(mapEvidence.expected)) {
    throw new Error(`map navigation inspector did not identify referenced object: expected ${mapEvidence.expected}; got ${mapEvidence.inspector}`);
  }
  if (mapEvidence.worldFingerprint !== candidates.worldFingerprint) throw new Error('story navigation mutated authoritative world state');
  await captureScreenshot(cdp, join(outDir, 'story-map-reference-navigation-1440x900.png'));

  writeFileSync(join(outDir, 'story-evidence.json'), `${JSON.stringify({
    eventNavigation: {
      selectedEvent: { id: eventCandidate.eventId, type: eventCandidate.eventType, label: eventCandidate.text },
      retainedCauseEventId: eventCauseId,
      card: eventCard,
      causeCard
    },
    mapNavigation: {
      selectedEvent: { id: mapCandidate.eventId, type: mapCandidate.eventType, label: mapCandidate.text },
      target: { entityKind: mapTarget.entityKind, entityId: mapTarget.entityId, x: mapTarget.tileX, y: mapTarget.tileY },
      card: mapCard,
      inspector: mapEvidence.inspector
    }
  }, null, 2)}\n`);

  console.log(
    `World Stories evidence: event #${eventCandidate.eventId} ${eventCandidate.eventType} → event #${eventCauseId}; `
    + `map event #${mapCandidate.eventId} ${mapCandidate.eventType} → ${mapTarget.entityKind} #${mapTarget.entityId}`
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
