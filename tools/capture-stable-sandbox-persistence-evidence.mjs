import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SNAPSHOT_VERSION } from '../engine/core/world.js';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-stable-sandbox-persistence-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

const LOCAL_SAVE_KEY = 'worldboxsr:local-world:v1';
mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-stable-sandbox-'));
const logPath = join(outDir, 'stable-sandbox-chrome-runtime.log');
const logFd = openSync(logPath, 'w');
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
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 30_000);
  await waitForExpression(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    return scene?.localWorldPersistence?.attached === true && scene?.scenarioSetup?.attached === true;
  })()`, 8_000);

  await clickPauseTo(cdp, true);
  await evaluate(cdp, `(() => {
    const panel = document.querySelector('#session-persistence');
    if (!panel) throw new Error('missing Session persistence panel');
    panel.open = true;
    return true;
  })()`);
  await waitForExpression(cdp, `document.querySelector('#session-save-now')?.disabled === false`, 8_000);

  await clickSelector(cdp, '#session-save-now');
  await waitForExpression(cdp, `localStorage.getItem(${JSON.stringify(LOCAL_SAVE_KEY)}) !== null`, 5_000);
  const saved = await worldSnapshot(cdp);
  if (!saved.paused) throw new Error('ordinary world was not paused after Save now');
  if (saved.envelope?.formatVersion !== 1) throw new Error(`unexpected local save format: ${saved.envelope?.formatVersion}`);
  if (saved.envelope?.snapshotVersion !== SNAPSHOT_VERSION) throw new Error(`unexpected embedded snapshot version: ${saved.envelope?.snapshotVersion}; expected current ${SNAPSHOT_VERSION}`);
  if (saved.envelope?.day !== saved.day) throw new Error(`save envelope day mismatch: ${saved.envelope?.day} != ${saved.day}`);
  if (saved.envelope?.preset !== 'sandbox') throw new Error(`unexpected saved preset: ${saved.envelope?.preset}`);

  await setSpeed(cdp, '1');
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > ${saved.day}`, 5_000);
  await clickPauseTo(cdp, true);
  const mutated = await worldSnapshot(cdp);
  if (mutated.day <= saved.day) throw new Error(`ordinary world did not advance: ${saved.day} -> ${mutated.day}`);
  if (mutated.fingerprint === saved.fingerprint) throw new Error('ordinary world fingerprint did not diverge after Time/Play');

  await clickSelector(cdp, '#session-restore');
  await waitForExpression(cdp, `globalThis.__WORLDBOXSR_LOCAL_SAVE_RESTORED__?.day === ${saved.day}`, 5_000);
  await waitForExpression(cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`, 2_000);
  const restored = await worldSnapshot(cdp);
  if (restored.fingerprint !== saved.fingerprint) throw new Error('Restore did not return exact saved authoritative JSON fingerprint');
  if (restored.day !== saved.day) throw new Error(`Restore day mismatch: ${restored.day} != ${saved.day}`);
  if (!restored.paused) throw new Error('restored local world was not paused');
  if (!restored.boot.includes('local world restored · paused')) throw new Error(`restore boot status did not expose paused local restore: ${restored.boot}`);
  if (restored.restoreSignal?.day !== saved.day) throw new Error(`restore signal day mismatch: ${JSON.stringify(restored.restoreSignal)}`);
  await captureScreenshot(cdp, join(outDir, 'stable-sandbox-local-world-restored-1440x900.png'));

  const rawBeforeScenario = restored.rawSave;
  if (!rawBeforeScenario) throw new Error('ordinary local save disappeared before Scenario transition');
  await clickSelector(cdp, '#scenario-setup-enter');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioSetup === 'true'`, 30_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario Setup ready') === true`, 30_000);
  await waitForExpression(cdp, `document.querySelector('#session-persistence-status')?.textContent === 'Scenario active · use Recipe / Replay / Fork'`, 5_000);

  const scenario = await evaluate(cdp, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    return {
      active: scene?.scenarioSetup?.active === true,
      saveDisabled: document.querySelector('#session-save-now')?.disabled === true,
      restoreDisabled: document.querySelector('#session-restore')?.disabled === true,
      status: document.querySelector('#session-persistence-status')?.textContent ?? '',
      rawSave: localStorage.getItem(${JSON.stringify(LOCAL_SAVE_KEY)}),
      paused: document.querySelector('#pause')?.dataset?.active === 'true'
    };
  })()`);
  if (!scenario.active || !scenario.saveDisabled || !scenario.restoreDisabled) {
    throw new Error(`Scenario Setup did not suppress ordinary persistence: ${JSON.stringify(scenario)}`);
  }
  if (scenario.status !== 'Scenario active · use Recipe / Replay / Fork') {
    throw new Error(`unexpected Scenario persistence status: ${scenario.status}`);
  }
  if (scenario.rawSave !== rawBeforeScenario) throw new Error('Scenario identity overwrote the existing ordinary local save');
  if (!scenario.paused) throw new Error('Scenario Setup was not paused');
  await captureScreenshot(cdp, join(outDir, 'stable-sandbox-scenario-persistence-suppressed-1440x900.png'));

  const evidence = {
    stableSandboxPersistenceComplete: true,
    localSaveKey: LOCAL_SAVE_KEY,
    ordinary: {
      formatVersion: saved.envelope.formatVersion,
      snapshotVersion: saved.envelope.snapshotVersion,
      preset: saved.envelope.preset,
      savedDay: saved.day,
      mutatedDay: mutated.day,
      restoredDay: restored.day,
      savedFingerprint: fnv1a(saved.fingerprint),
      mutatedFingerprint: fnv1a(mutated.fingerprint),
      restoredFingerprint: fnv1a(restored.fingerprint),
      exactRestore: restored.fingerprint === saved.fingerprint,
      pausedAfterRestore: restored.paused,
      restoreSignal: restored.restoreSignal
    },
    scenarioIsolation: {
      scenarioSetupActive: scenario.active,
      saveDisabled: scenario.saveDisabled,
      restoreDisabled: scenario.restoreDisabled,
      status: scenario.status,
      localSaveUnchanged: scenario.rawSave === rawBeforeScenario,
      paused: scenario.paused
    }
  };
  writeFileSync(join(outDir, 'stable-sandbox-persistence-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Stable Sandbox persistence: save day ${saved.day} → mutate ${mutated.day} → exact paused restore ${restored.day}; Scenario persistence suppressed; save ${evidence.ordinary.savedFingerprint}`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
}

async function worldSnapshot(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const rawSave = localStorage.getItem(${JSON.stringify(LOCAL_SAVE_KEY)});
    const parsed = rawSave ? JSON.parse(rawSave) : null;
    return {
      day: scene?.world?.day ?? null,
      fingerprint: scene?.world ? JSON.stringify(scene.world) : null,
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      boot: document.querySelector('#boot-status')?.textContent ?? '',
      rawSave,
      envelope: parsed ? {
        formatVersion: parsed.formatVersion,
        preset: parsed.preset,
        savedAt: parsed.savedAt,
        snapshotVersion: parsed.snapshot?.snapshotVersion,
        day: parsed.snapshot?.day
      } : null,
      restoreSignal: globalThis.__WORLDBOXSR_LOCAL_SAVE_RESTORED__ ?? null
    };
  })()`);
}

async function setSpeed(cdpClient, value) {
  const result = await evaluate(cdpClient, `(() => {
    const speed = document.querySelector('#speed');
    if (!speed) throw new Error('missing #speed');
    speed.value = ${JSON.stringify(value)};
    speed.dispatchEvent(new Event('change', { bubbles: true }));
    return speed.value;
  })()`);
  if (result !== value) throw new Error(`failed to set Time control to ${value}: ${result}`);
}

async function clickPauseTo(cdpClient, paused) {
  const current = await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (Boolean(current) !== paused) await clickSelector(cdpClient, '#pause');
  await waitForExpression(cdpClient, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 2_000);
}

async function clickSelector(cdpClient, selector) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, disabled: Boolean(element.disabled) };
  })()`);
  if (!point) throw new Error(`missing selector: ${selector}`);
  if (point.disabled) throw new Error(`selector is disabled: ${selector}`);
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(100);
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
    try {
      if (await evaluate(cdpClient, expression)) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for expression: ${expression}${lastError ? `; last error: ${lastError.message}` : ''}`);
}

async function waitForDevToolsPort(userDataDirPath, processHandle) {
  const path = join(userDataDirPath, 'DevToolsActivePort');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw new Error(`Chrome exited early with ${processHandle.exitCode}`);
    try {
      const text = (await import('node:fs')).readFileSync(path, 'utf8');
      const port = Number(text.split(/\r?\n/u)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become available');
}

async function waitForPageTarget(port, expectedUrl, processHandle) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw new Error(`Chrome exited early with ${processHandle.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.url.startsWith(expectedUrl));
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

async function stopChrome(processHandle) {
  if (processHandle.exitCode !== null) return;
  processHandle.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    delay(2_000)
  ]);
  if (processHandle.exitCode === null) processHandle.kill('SIGKILL');
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
