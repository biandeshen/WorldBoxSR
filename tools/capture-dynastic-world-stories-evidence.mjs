import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-dynastic-world-stories-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-dynastic-stories-'));
const logFd = openSync(join(outDir, 'dynastic-world-stories-chrome-runtime.log'), 'w');
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

  // Pause as soon as the real WorldScene + Pause listener exist so this gate
  // inspects the deterministic exact-Y40 retained story window without adding
  // any test-only ruler/event mutation.
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world != null`, 5_000);
  await pauseWorld(cdp);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day === 14400`, 3_000);

  const baseline = await fingerprint(cdp);
  await openChronicle(cdp);
  await selectRuleLens(cdp);
  const rule = await ruleEvidence(cdp);
  if (rule.ids.length < 1 || rule.ids.length > 7) throw new Error(`invalid Rule lens size: ${JSON.stringify(rule)}`);
  if (!strictlyDescending(rule.ids)) throw new Error(`Rule lens lost newest-first order: ${rule.ids.join(',')}`);

  const descendant = rule.events.find((event) => event.type === 'polity.ruler_succeeded' && event.successionPath === 'descendant') ?? null;
  const openSelection = rule.events.find((event) => event.type === 'polity.ruler_succeeded' && event.successionPath === 'open_selection') ?? null;
  if (!descendant || !openSelection) {
    throw new Error(`exact-Y40 Rule lens must expose descendant + open-selection stories; got ${JSON.stringify(rule.events)}`);
  }

  await openEventCard(cdp, descendant.id);
  const descendantCard = await cardState(cdp);
  assertDescendantCard(descendantCard, descendant);
  if ((await fingerprint(cdp)) !== baseline) throw new Error('opening descendant succession Event Card mutated authority');
  await scrollIntoView(cdp, '#history-detail');
  await captureScreenshot(cdp, join(outDir, 'dynastic-descendant-event-card-1440x900.png'));

  const navigation = await followOneRecordedReference(cdp, descendant.id);
  if ((await fingerprint(cdp)) !== baseline) throw new Error('dynastic Event Card navigation mutated authority');

  await selectRuleLens(cdp);
  const ruleAfterNavigation = await ruleEvidence(cdp);
  if (!sameArray(ruleAfterNavigation.ids, rule.ids)) {
    throw new Error(`Rule lens changed after read-only navigation: ${JSON.stringify({ before: rule.ids, after: ruleAfterNavigation.ids })}`);
  }

  await openEventCard(cdp, openSelection.id);
  const openCard = await cardState(cdp);
  assertOpenSelectionCard(openCard, openSelection);
  if ((await fingerprint(cdp)) !== baseline) throw new Error('opening new-line succession Event Card mutated authority');
  await scrollIntoView(cdp, '#history-detail');
  await captureScreenshot(cdp, join(outDir, 'dynastic-new-line-event-card-1440x900.png'));

  const finalRule = await ruleEvidence(cdp);
  if (!finalRule.ids.includes(descendant.id) || !finalRule.ids.includes(openSelection.id)) {
    throw new Error(`tested dynastic transitions disappeared from Rule lens: ${JSON.stringify(finalRule)}`);
  }
  if ((await fingerprint(cdp)) !== baseline) throw new Error('Dynastic World Stories gate changed authoritative world');

  writeFileSync(join(outDir, 'dynastic-world-stories-evidence.json'), `${JSON.stringify({
    day: 14400,
    ruleEventIds: rule.ids,
    descendant: {
      eventId: descendant.id,
      polityId: descendant.polityId,
      rulerId: descendant.rulerId,
      founderId: descendant.rulingLineFounderId,
      lineSequence: descendant.rulingLineSequence,
      distance: descendant.descendantDistance,
      headline: descendantCard.headline,
      detail: descendantCard.detail
    },
    openSelection: {
      eventId: openSelection.id,
      polityId: openSelection.polityId,
      rulerId: openSelection.rulerId,
      founderId: openSelection.rulingLineFounderId,
      lineSequence: openSelection.rulingLineSequence,
      headline: openCard.headline,
      detail: openCard.detail
    },
    navigation,
    ruleMembershipOrderUnchanged: true,
    paused: true,
    readOnlyAuthorityUnchanged: true
  }, null, 2)}\n`);

  console.log(`Dynastic World Stories evidence: Rule ${rule.ids.join(',')} · descendant #${descendant.id} line ${descendant.rulingLineSequence} distance ${descendant.descendantDistance} · open selection #${openSelection.id} line ${openSelection.rulingLineSequence} · ${navigation.kind} navigation · authority unchanged`);
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

function assertDescendantCard(card, event) {
  if (card.eventId !== event.id) throw new Error(`wrong descendant Event Card: ${JSON.stringify(card)}`);
  if (!card.headline.includes('ruling bloodline continues')) throw new Error(`descendant headline not readable: ${card.headline}`);
  if (!card.detail.includes(`continues ruling line ${event.rulingLineSequence}`)) throw new Error(`descendant detail lost ruling line: ${card.detail}`);
  const distance = event.descendantDistance;
  const relation = distance === 1 ? 'a child' : distance === 2 ? 'a grandchild' : `${distance} generations from the founder`;
  if (!card.detail.includes(relation)) throw new Error(`descendant detail lost recorded distance ${distance}: ${card.detail}`);
  if (!card.detail.includes(`founder Human #${event.rulingLineFounderId}`)) throw new Error(`descendant detail lost recorded founder: ${card.detail}`);
  if (/heir|legitim|primogen|claim/i.test(card.detail)) throw new Error(`descendant story invented political semantics: ${card.detail}`);
}

function assertOpenSelectionCard(card, event) {
  if (card.eventId !== event.id) throw new Error(`wrong open-selection Event Card: ${JSON.stringify(card)}`);
  if (!card.headline.includes('begins a new ruling line')) throw new Error(`open-selection headline not readable: ${card.headline}`);
  if (!card.detail.includes(`begins ruling line ${event.rulingLineSequence}`)) throw new Error(`open-selection detail lost line sequence: ${card.detail}`);
  if (!card.detail.includes(`founder Human #${event.rulingLineFounderId}`)) throw new Error(`open-selection detail lost new founder: ${card.detail}`);
  if (/legitim|primogen|claim|elected|usurp/i.test(card.detail)) throw new Error(`open-selection story invented political semantics: ${card.detail}`);
}

async function ruleEvidence(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const ids = [...document.querySelectorAll('#history-list button[data-event-id]')].map((button) => Number(button.dataset.eventId));
    const byId = new Map((world?.history ?? []).map((event) => [event.id, event]));
    return {
      lens: document.querySelector('#history-list')?.dataset?.chronicleLens ?? '',
      ids,
      events: ids.map((id) => byId.get(id)).filter(Boolean).map((event) => ({
        id: event.id,
        type: event.type,
        polityId: event.polityId ?? null,
        rulerId: event.rulerId ?? null,
        successionPath: event.successionPath ?? null,
        rulingLineFounderId: event.rulingLineFounderId ?? null,
        rulingLineSequence: event.rulingLineSequence ?? null,
        descendantDistance: event.descendantDistance ?? null,
        reason: event.reason ?? null
      }))
    };
  })()`);
}

async function cardState(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const detail = document.querySelector('#history-detail');
    return {
      eventId: Number(detail?.dataset?.eventCardId),
      headline: detail?.querySelector('.event-card-header strong')?.textContent?.trim() ?? '',
      detail: detail?.querySelector('.event-card-header p')?.textContent?.trim() ?? '',
      text: detail?.textContent ?? ''
    };
  })()`);
}

async function followOneRecordedReference(cdpClient, sourceEventId) {
  const choice = await evaluate(cdpClient, `(() => {
    const detail = document.querySelector('#history-detail');
    const event = detail?.querySelector('button[data-event-card-nav="event"]');
    if (event) return { kind: 'event', eventId: Number(event.dataset.eventId) };
    const map = detail?.querySelector('button[data-event-card-nav="map"]');
    if (map) return {
      kind: 'map',
      entityKind: map.dataset.entityKind,
      entityId: Number(map.dataset.entityId),
      x: Number(map.dataset.x),
      y: Number(map.dataset.y)
    };
    return null;
  })()`);
  if (!choice) throw new Error(`dynastic Event Card #${sourceEventId} exposes no existing event/map navigation`);

  if (choice.kind === 'event') {
    await clickSelector(cdpClient, `#history-detail button[data-event-card-nav="event"][data-event-id="${choice.eventId}"]`);
    await waitForExpression(cdpClient, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${choice.eventId}'`, 2_500);
    return choice;
  }

  await clickSelector(cdpClient, `#history-detail button[data-event-card-nav="map"][data-entity-kind="${choice.entityKind}"][data-entity-id="${choice.entityId}"]`);
  await delay(150);
  const inspector = await evaluate(cdpClient, `document.querySelector('#inspector')?.textContent ?? ''`);
  return { ...choice, inspector };
}

async function openChronicle(cdpClient) {
  const open = await evaluate(cdpClient, `document.querySelector('#timeline')?.open === true`);
  if (!open) await clickSelector(cdpClient, '#timeline > summary');
  await waitForExpression(cdpClient, `document.querySelector('#timeline')?.open === true`, 1_500);
}

async function selectRuleLens(cdpClient) {
  await openChronicle(cdpClient);
  const active = await evaluate(cdpClient, `document.querySelector('#history-list')?.dataset?.chronicleLens ?? ''`);
  if (active !== 'rule') await clickSelector(cdpClient, '#chronicle-lenses button[data-chronicle-lens="rule"]');
  await waitForExpression(cdpClient, `document.querySelector('#history-list')?.dataset?.chronicleLens === 'rule' && document.querySelector('#chronicle-lenses button[data-chronicle-lens="rule"]')?.dataset?.active === 'true'`, 2_000);
}

async function openEventCard(cdpClient, eventId) {
  await selectRuleLens(cdpClient);
  await clickSelector(cdpClient, `#history-list button[data-event-id="${eventId}"]`);
  await waitForExpression(cdpClient, `document.querySelector('#history-detail')?.dataset?.eventCardId === '${eventId}'`, 2_500);
}

async function pauseWorld(cdpClient) {
  const paused = await evaluate(cdpClient, `(() => {
    const pause = document.querySelector('#pause');
    if (!pause) return false;
    if (pause.dataset.active !== 'true') pause.click();
    return pause.dataset.active === 'true';
  })()`);
  if (!paused) throw new Error('failed to pause Dynastic World Stories world');
  await delay(100);
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdpClient.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(90);
}

async function elementCenter(cdpClient, selector) {
  const point = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`element unavailable: ${selector}`);
  await delay(60);
  return point;
}

async function scrollIntoView(cdpClient, selector) {
  const found = await evaluate(cdpClient, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  if (!found) throw new Error(`element not found for scroll: ${selector}`);
  await delay(100);
}

function strictlyDescending(values) {
  for (let index = 1; index < values.length; index += 1) if (values[index] >= values[index - 1]) return false;
  return true;
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
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
