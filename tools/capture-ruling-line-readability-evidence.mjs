import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-ruling-line-readability-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-ruling-line-readability-'));
const logFd = openSync(join(outDir, 'ruling-line-readability-chrome-runtime.log'), 'w');
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

  // Pause as soon as the product control exists so post-warmup inspection is
  // anchored to the exact deterministic Y40 showcase instead of a later tick.
  await waitForExpression(cdp, `document.querySelector('#pause') !== null`, 5_000);
  await pauseWorld(cdp);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day === 14400`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#inspector')?.dataset?.rulingLineRuntime === 'true'`, 3_000);

  const baseline = await fingerprint(cdp);
  const candidate = await inspectionCandidate(cdp);
  if (!candidate) throw new Error('no visible current ruler + clear polity settlement pair available for ruling-line inspection');

  const founderSuffix = candidate.founderAvailable ? '' : ' · unavailable';
  const expectedLine = `ruling line ${candidate.lineSequence} · reign ${candidate.reignCount} · founder Human #${candidate.founderId}${founderSuffix}`;
  const expectedTransition = transitionText(candidate.successionPath, candidate.descendantDistance);

  await altClickPoint(cdp, candidate.rulerPoint);
  await waitForExpression(cdp, `(() => {
    const text = document.querySelector('#inspector')?.textContent ?? '';
    return text.startsWith('Human #${candidate.rulerId}') && text.includes(${JSON.stringify(expectedLine)});
  })()`, 2_500);
  const rulerInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if (!rulerInspector.includes(`♛ ruler of ${candidate.polityName}`)) {
    throw new Error(`ruler Inspector lost polity identity: ${rulerInspector}`);
  }
  if (expectedTransition && !rulerInspector.includes(expectedTransition)) {
    throw new Error(`ruler Inspector lost retained transition ${expectedTransition}: ${rulerInspector}`);
  }
  if ((await fingerprint(cdp)) !== baseline) throw new Error('ruler inspection mutated authoritative world');
  await captureScreenshot(cdp, join(outDir, 'ruling-line-ruler-inspector-1440x900.png'));

  await altClickPoint(cdp, candidate.settlementPoint);
  await waitForExpression(cdp, `(() => {
    const text = document.querySelector('#inspector')?.textContent ?? '';
    return text.startsWith(${JSON.stringify(candidate.settlementName)}) && text.includes(${JSON.stringify(expectedLine)});
  })()`, 2_500);
  const settlementInspector = await evaluate(cdp, `document.querySelector('#inspector')?.textContent ?? ''`);
  if (!settlementInspector.includes(`♔ ruler Human #${candidate.rulerId}`)) {
    throw new Error(`settlement Inspector lost current ruler identity: ${settlementInspector}`);
  }
  if (expectedTransition && !settlementInspector.includes(expectedTransition)) {
    throw new Error(`settlement Inspector lost retained transition ${expectedTransition}: ${settlementInspector}`);
  }
  if ((await fingerprint(cdp)) !== baseline) throw new Error('settlement inspection mutated authoritative world');
  await captureScreenshot(cdp, join(outDir, 'ruling-line-settlement-inspector-1440x900.png'));

  writeFileSync(join(outDir, 'ruling-line-readability-evidence.json'), `${JSON.stringify({
    day: 14400,
    polity: {
      id: candidate.polityId,
      name: candidate.polityName,
      rulerId: candidate.rulerId,
      rulingLineFounderId: candidate.founderId,
      rulingLineSequence: candidate.lineSequence,
      rulingLineReignCount: candidate.reignCount,
      successionPath: candidate.successionPath,
      descendantDistance: candidate.descendantDistance
    },
    inspectedSettlement: { id: candidate.settlementId, name: candidate.settlementName },
    expectedLine,
    expectedTransition,
    rulerInspector,
    settlementInspector,
    paused: true,
    readOnlyAuthorityUnchanged: true
  }, null, 2)}\n`);

  console.log(`Ruling-line readability evidence: ${candidate.polityName} ruler #${candidate.rulerId}; ${expectedLine}${expectedTransition ? `; ${expectedTransition}` : ''}; ruler + settlement Inspector authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function inspectionCandidate(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const tileSize = 28;
    const screen = (x, y) => {
      const worldX = (x + 0.5) * tileSize;
      const worldY = (y + 0.5) * tileSize;
      return {
        x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
        y: camera.y + (worldY - camera.worldView.y) * camera.zoom,
        tileX: x,
        tileY: y
      };
    };
    const visible = (point) => point.x >= 280 && point.x <= 1110 && point.y >= 80 && point.y <= 790;
    const activeWarbands = (world.warbands ?? []).filter((band) => band.active);
    const livingCreatures = (world.creatures ?? []).filter((creature) => creature.alive);
    const humansAt = (x, y) => world.entities
      .filter((human) => human.kind === 'human' && human.x === x && human.y === y)
      .sort((a, b) => a.id - b.id);
    const occupiedBeforeSettlement = (x, y) =>
      activeWarbands.some((band) => band.x === x && band.y === y) ||
      humansAt(x, y).length > 0 ||
      livingCreatures.some((creature) => creature.x === x && creature.y === y);

    const candidates = [];
    for (const polity of world.polities.filter((value) => value.active).sort((a, b) => a.id - b.id)) {
      if (!Number.isInteger(polity.rulerId) || !Number.isInteger(polity.rulingLineFounderId) || polity.rulingLineSequence < 1) continue;
      const ruler = world.entities.find((human) => human.kind === 'human' && human.alive && human.id === polity.rulerId);
      if (!ruler) continue;
      if (activeWarbands.some((band) => band.x === ruler.x && band.y === ruler.y)) continue;
      if (humansAt(ruler.x, ruler.y)[0]?.id !== ruler.id) continue;
      const rulerPoint = screen(ruler.x, ruler.y);
      if (!visible(rulerPoint)) continue;

      const settlement = world.settlements
        .filter((value) => value.active && value.polityId === polity.id && !occupiedBeforeSettlement(value.x, value.y))
        .sort((a, b) => Number(b.id === polity.capitalSettlementId) - Number(a.id === polity.capitalSettlementId) || a.id - b.id)
        .map((value) => ({ value, point: screen(value.x, value.y) }))
        .find(({ point }) => visible(point));
      if (!settlement) continue;

      const transition = world.history.findLast((event) =>
        (event.type === 'polity.ruler_appointed' || event.type === 'polity.ruler_succeeded') &&
        event.polityId === polity.id && event.rulerId === ruler.id
      ) ?? null;
      const founderAvailable = world.entities.some((human) => human.kind === 'human' && human.alive && human.id === polity.rulingLineFounderId);
      candidates.push({
        polityId: polity.id,
        polityName: polity.name,
        rulerId: ruler.id,
        founderId: polity.rulingLineFounderId,
        founderAvailable,
        lineSequence: polity.rulingLineSequence,
        reignCount: polity.rulingLineReignCount,
        successionPath: transition?.successionPath ?? null,
        descendantDistance: Number.isInteger(transition?.descendantDistance) ? transition.descendantDistance : null,
        settlementId: settlement.value.id,
        settlementName: settlement.value.name,
        rulerPoint,
        settlementPoint: settlement.point,
        score: transition?.successionPath === 'descendant' ? 0 : (transition ? 1 : 2)
      });
    }
    return candidates.sort((a, b) => a.score - b.score || a.polityId - b.polityId)[0] ?? null;
  })()`);
}

function transitionText(path, distance) {
  if (path === 'founding') return 'founding line';
  if (path === 'open_selection') return 'new ruling line · open selection';
  if (path !== 'descendant') return null;
  if (distance === 1) return 'bloodline continued · child';
  if (distance === 2) return 'bloodline continued · grandchild';
  return Number.isInteger(distance) && distance > 0 ? `bloodline continued · ${distance} generations` : 'bloodline continued';
}

async function pauseWorld(cdpClient) {
  const paused = await evaluate(cdpClient, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) return false;
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('failed to pause ruling-line readability world');
  await delay(100);
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function altClickPoint(cdpClient, point) {
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1, modifiers: 1 });
  await delay(120);
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
