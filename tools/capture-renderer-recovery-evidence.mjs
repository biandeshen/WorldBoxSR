import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-renderer-recovery-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-renderer-recovery-'));
const logPath = join(outDir, 'renderer-recovery-chrome-runtime.log');
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
  'about:blank'
], { stdio: ['ignore', logFd, logFd] });

let cdp = null;
try {
  const port = await waitForDevToolsPort(userDataDir, chrome);
  const target = await waitForAnyPageTarget(port, chrome);
  cdp = await createCdpClient(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*phaser_main-*'] });

  const failureUrl = new URL(baseUrl);
  failureUrl.searchParams.set('recoveryProof', '1');
  await cdp.send('Page.navigate', { url: failureUrl.href });
  await waitForExpression(cdp, `document.querySelector('#renderer-recovery')?.getAttribute('role') === 'alert'`, 20_000);

  const failure = await evaluate(cdp, `(() => {
    const panel = document.querySelector('#renderer-recovery');
    const retry = document.querySelector('#renderer-recovery-retry');
    const legacy = document.querySelector('#renderer-recovery-legacy');
    return {
      url: location.href,
      renderer: document.documentElement.dataset.renderer,
      boot: document.querySelector('#boot-status')?.textContent ?? '',
      heading: document.querySelector('#renderer-recovery-heading')?.textContent ?? '',
      message: document.querySelector('#renderer-recovery-message')?.textContent ?? '',
      note: document.querySelector('#renderer-recovery-note')?.textContent ?? '',
      retryLabel: retry?.textContent ?? '',
      retryHref: retry?.dataset?.href ?? null,
      legacyLabel: legacy?.textContent ?? '',
      legacyHref: legacy?.dataset?.href ?? null,
      legacyHidden: legacy?.hidden ?? null,
      panelVisible: Boolean(panel && panel.getBoundingClientRect().width > 0 && panel.getBoundingClientRect().height > 0)
    };
  })()`);

  if (failure.renderer !== 'phaser') throw new Error(`failure page lost Phaser identity: ${failure.renderer}`);
  if (!failure.boot.startsWith('Renderer failed:')) throw new Error(`blocked Phaser chunk did not reach existing failure signal: ${failure.boot}`);
  if (!failure.panelVisible) throw new Error('renderer recovery panel is not visibly actionable');
  if (failure.heading !== 'Phaser renderer could not start') throw new Error(`unexpected recovery heading: ${failure.heading}`);
  if (failure.retryLabel !== 'Retry Phaser') throw new Error(`unexpected retry label: ${failure.retryLabel}`);
  if (failure.retryHref !== failure.url) throw new Error(`retry destination changed the failed URL: ${failure.retryHref} != ${failure.url}`);
  if (failure.legacyHidden || failure.legacyLabel !== 'Compatibility renderer' || !failure.legacyHref) {
    throw new Error(`Phaser failure did not expose compatibility action: ${JSON.stringify(failure)}`);
  }
  const compatibilityUrl = new URL(failure.legacyHref);
  if (compatibilityUrl.searchParams.get('renderer') !== 'legacy') throw new Error(`compatibility action does not use existing legacy contract: ${failure.legacyHref}`);
  if (compatibilityUrl.searchParams.get('recoveryProof') !== '1') throw new Error('compatibility action did not preserve unrelated URL params');

  await captureScreenshot(cdp, join(outDir, 'renderer-recovery-phaser-failure-1440x900.png'));

  const clicked = await evaluate(cdp, `(() => {
    const button = document.querySelector('#renderer-recovery-legacy');
    if (!button || button.hidden) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error('compatibility renderer button was not clickable');

  await waitForExpression(cdp, `document.documentElement.dataset.renderer === 'legacy'`, 12_000);
  await waitForExpression(cdp, `document.querySelector('#stats')?.textContent?.includes('year:') === true`, 12_000);
  const legacy = await evaluate(cdp, `(() => {
    const canvas = document.querySelector('#game');
    const panel = document.querySelector('#renderer-recovery');
    return {
      url: location.href,
      renderer: document.documentElement.dataset.renderer,
      stats: document.querySelector('#stats')?.textContent ?? '',
      canvasDisplay: canvas ? getComputedStyle(canvas).display : 'missing',
      canvasWidth: canvas?.getBoundingClientRect?.().width ?? 0,
      recoveryPanelPresent: Boolean(panel),
      boot: document.querySelector('#boot-status')?.textContent ?? ''
    };
  })()`);

  const launchedUrl = new URL(legacy.url);
  if (legacy.renderer !== 'legacy') throw new Error(`compatibility navigation did not select Legacy: ${legacy.renderer}`);
  if (launchedUrl.searchParams.get('renderer') !== 'legacy') throw new Error(`Legacy URL lost renderer contract: ${legacy.url}`);
  if (launchedUrl.searchParams.get('recoveryProof') !== '1') throw new Error('Legacy navigation lost unrelated proof param');
  if (!legacy.stats.includes('year:') || legacy.canvasDisplay === 'none' || legacy.canvasWidth <= 0) {
    throw new Error(`Legacy renderer did not become playable: ${JSON.stringify(legacy)}`);
  }
  if (legacy.recoveryPanelPresent) throw new Error('failure recovery panel leaked across successful Legacy navigation');

  await captureScreenshot(cdp, join(outDir, 'renderer-recovery-legacy-success-1440x900.png'));
  writeFileSync(join(outDir, 'renderer-recovery-evidence.json'), `${JSON.stringify({ failure, legacy }, null, 2)}\n`);
  console.log(`Renderer recovery evidence: blocked Phaser app chunk -> recovery UI -> Legacy world started at ${legacy.url}`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  closeSync(logFd);
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); } catch {}
}

async function captureScreenshot(cdpClient, filepath) {
  const result = await cdpClient.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(filepath, Buffer.from(result.data, 'base64'));
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

async function waitForAnyPageTarget(port, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    ensureAlive(child);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((candidate) => candidate.type === 'page');
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
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
    else resolve(message.result ?? {});
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
  const result = await cdpClient.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  return result.result?.value;
}

async function waitForExpression(cdpClient, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(cdpClient, expression)) return;
    } catch {}
    await delay(80);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

function ensureAlive(child) {
  if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
}

async function stopChrome(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  const deadline = Date.now() + 4_000;
  while (child.exitCode === null && Date.now() < deadline) await delay(50);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
