import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-focused-story-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-focused-story-'));
const logPath = join(outDir, 'focused-story-chrome-runtime.log');
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

  const setup = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const pause = document.querySelector('#pause');
    const timeline = document.querySelector('#timeline');
    if (!world || !pause || !timeline) throw new Error('story UI unavailable');
    if (pause.dataset.active !== 'true') pause.click();
    timeline.open = true;
    return {
      paused: pause.dataset.active === 'true',
      worldFingerprint: JSON.stringify(world),
      visibleEventIds: [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId))
    };
  })()`);
  if (!setup.paused) throw new Error('failed to pause canonical world');
  if (setup.visibleEventIds.length < 1) throw new Error('Chronicle has no visible events');
  await delay(120);

  let chosen = null;
  for (const eventId of setup.visibleEventIds) {
    const eventPoint = await elementCenter(cdp, `#history-list button[data-event-id="${eventId}"]`);
    await clickPoint(cdp, eventPoint);
    await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventId}'`, 3_000);

    const followCandidates = await evaluate(cdp, `(() => [...document.querySelectorAll('#history-detail button[data-event-card-follow][data-ref-kind="entity"]')].map((button) => ({
      entityKind: button.dataset.refEntityKind,
      entityId: Number(button.dataset.refId),
      text: button.textContent ?? ''
    })))()`);

    for (const candidate of followCandidates) {
      const selector = `#history-detail button[data-event-card-follow][data-ref-kind="entity"][data-ref-entity-kind="${candidate.entityKind}"][data-ref-id="${candidate.entityId}"]`;
      const followPoint = await elementCenter(cdp, selector, false);
      if (!followPoint) continue;
      await clickPoint(cdp, followPoint);
      await delay(100);
      const trail = await focusedTrailEvidence(cdp);
      if (trail.visible && trail.eventCount >= 2) {
        chosen = { sourceEventId: eventId, ...candidate, trail };
        break;
      }
      const clearPoint = await elementCenter(cdp, '#story-trail button[data-story-trail-clear]', false);
      if (clearPoint) await clickPoint(cdp, clearPoint);
    }
    if (chosen) break;
  }

  if (!chosen) throw new Error('no visible Chronicle reference produced a focused trail with at least two explicit retained events');
  if (!chosen.trail.focusKey.includes(`${chosen.entityKind}:${chosen.entityId}`)) {
    throw new Error(`focused trail identity mismatch: ${JSON.stringify(chosen)}`);
  }
  if (!isStrictlyAscending(chosen.trail.eventIds)) throw new Error(`focused trail is not chronological: ${chosen.trail.eventIds.join(',')}`);
  await captureScreenshot(cdp, join(outDir, 'story-focused-trail-1440x900.png'));

  const trailEventId = chosen.trail.eventIds[Math.min(1, chosen.trail.eventIds.length - 1)];
  const trailPoint = await elementCenter(cdp, `#story-trail button[data-story-trail-event-id="${trailEventId}"]`);
  await clickPoint(cdp, trailPoint);
  await waitForExpression(cdp, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${trailEventId}'`, 3_000);
  const opened = await evaluate(cdp, `(() => ({
    eventCardId: Number(document.querySelector('#history-detail')?.dataset?.eventCardId),
    cardText: document.querySelector('#history-detail')?.textContent ?? '',
    trailStillVisible: document.querySelector('#story-trail')?.hidden === false,
    focusKey: document.querySelector('#story-trail')?.dataset?.storyFocus ?? ''
  }))()`);
  if (opened.eventCardId !== trailEventId || !opened.trailStillVisible) throw new Error(`trail event did not open while preserving focus: ${JSON.stringify(opened)}`);
  if (opened.focusKey !== chosen.trail.focusKey) throw new Error('opening a trail event changed the focused story identity');
  await captureScreenshot(cdp, join(outDir, 'story-focused-trail-event-opened-1440x900.png'));

  const clearPoint = await elementCenter(cdp, '#story-trail button[data-story-trail-clear]');
  await clickPoint(cdp, clearPoint);
  await waitForExpression(cdp, `document.querySelector('#story-trail')?.hidden === true`, 2_000);

  const finalState = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    return {
      worldFingerprint: JSON.stringify(scene?.world),
      trailHidden: document.querySelector('#story-trail')?.hidden === true,
      focusKey: document.querySelector('#story-trail')?.dataset?.storyFocus ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
  if (!finalState.trailHidden || finalState.focusKey) throw new Error(`Clear did not remove presentation focus: ${JSON.stringify(finalState)}`);
  if (!finalState.paused) throw new Error('world resumed during focused story navigation');
  if (finalState.worldFingerprint !== setup.worldFingerprint) throw new Error('focused story navigation mutated authoritative world state');

  writeFileSync(join(outDir, 'focused-story-evidence.json'), `${JSON.stringify({
    sourceEventId: chosen.sourceEventId,
    focus: { entityKind: chosen.entityKind, entityId: chosen.entityId, key: chosen.trail.focusKey },
    trailEventIds: chosen.trail.eventIds,
    openedEventId: trailEventId,
    trailText: chosen.trail.text,
    cleared: true
  }, null, 2)}\n`);
  console.log(`Focused Story evidence: ${chosen.entityKind} #${chosen.entityId}; ${chosen.trail.eventCount} retained events; opened #${trailEventId}; cleared with authority unchanged`);
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

async function focusedTrailEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const trail = document.querySelector('#story-trail');
    const rows = [...(trail?.querySelectorAll('button[data-story-trail-event-id]') ?? [])];
    return {
      visible: trail?.hidden === false,
      focusKey: trail?.dataset?.storyFocus ?? '',
      eventCount: rows.length,
      eventIds: rows.map((row) => Number(row.dataset.storyTrailEventId)),
      text: trail?.textContent ?? ''
    };
  })()`);
}

async function elementCenter(cdpClient, selector, required = true) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: element.textContent ?? '' };
  })()`);
  if (!point) {
    if (required) throw new Error(`element not found: ${selector}`);
    return null;
  }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1440 || point.y < 0 || point.y > 900) {
    if (required) throw new Error(`element outside viewport: ${selector} ${JSON.stringify(point)}`);
    return null;
  }
  await delay(60);
  return point;
}

async function clickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

function isStrictlyAscending(values) {
  for (let index = 1; index < values.length; index += 1) if (values[index] <= values[index - 1]) return false;
  return true;
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
