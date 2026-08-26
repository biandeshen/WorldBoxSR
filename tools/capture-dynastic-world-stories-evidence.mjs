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

  // Pause as soon as the real WorldScene + Pause listener exist so we first
  // preserve the deterministic exact-Y40 open-selection story window.
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world != null`, 5_000);
  await pauseWorld(cdp);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day === 14400`, 3_000);

  await openChronicle(cdp);
  await selectRuleLens(cdp);
  const initialRule = await ruleEvidence(cdp);
  if (initialRule.ids.length < 1 || initialRule.ids.length > 7 || !strictlyDescending(initialRule.ids)) {
    throw new Error(`invalid exact-Y40 Rule lens: ${JSON.stringify(initialRule)}`);
  }
  const openSelection = initialRule.events.find((event) => event.type === 'polity.ruler_succeeded' && event.successionPath === 'open_selection') ?? null;
  if (!openSelection) throw new Error(`exact-Y40 Rule lens exposes no recorded open-selection story: ${JSON.stringify(initialRule.events)}`);

  // Capability 2 intentionally changes authority. Use an existing real player
  // action (Lightning) to trigger one new ordinary succession whose current
  // ruling-line founder already has a surviving eligible descendant. The test
  // selects the target from explicit genealogy only; it never writes ruler or
  // history state directly.
  const targetRuler = await descendantSuccessionTarget(cdp);
  if (!targetRuler) throw new Error('exact-Y40 seed45 has no visible ruler with a surviving eligible ruling-line descendant');

  await selectTool(cdp, 'lightning');
  await clickPoint(cdp, { x: targetRuler.screenX, y: targetRuler.screenY });
  await delay(120);
  const death = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const death = world?.history?.findLast((event) => event.type === 'human.died'
      && event.entityId === ${targetRuler.rulerId} && event.cause === 'lightning') ?? null;
    return death ? { id: death.id, rulerStillPresent: world.entities.some((human) => human.kind === 'human' && human.id === ${targetRuler.rulerId}) } : null;
  })()`);
  if (!death || death.rulerStillPresent) throw new Error('real Lightning did not remove the selected ruler through authoritative death');

  await setSpeed(cdp, '1');
  await setPaused(cdp, false);
  await waitForExpression(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world?.history?.some((event) => event.type === 'polity.ruler_succeeded'
      && event.polityId === ${targetRuler.polityId}
      && event.previousRulerId === ${targetRuler.rulerId}
      && event.successionPath === 'descendant'
      && event.causes?.some((cause) => cause.kind === 'event' && cause.id === ${death.id})) === true;
  })()`, 5_000);
  await setPaused(cdp, true);

  const descendant = await evaluate(cdp, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    const event = world?.history?.findLast((candidate) => candidate.type === 'polity.ruler_succeeded'
      && candidate.polityId === ${targetRuler.polityId}
      && candidate.previousRulerId === ${targetRuler.rulerId}
      && candidate.successionPath === 'descendant') ?? null;
    if (!event) return null;
    return {
      id: event.id,
      type: event.type,
      polityId: event.polityId,
      rulerId: event.rulerId,
      successionPath: event.successionPath,
      rulingLineFounderId: event.rulingLineFounderId,
      rulingLineSequence: event.rulingLineSequence,
      descendantDistance: event.descendantDistance,
      reason: event.reason ?? null
    };
  })()`);
  if (!descendant) throw new Error('descendant succession disappeared after detection');

  // From this post-causality pause onward the rest of the gate is strictly
  // read-only World Stories navigation.
  const baseline = await fingerprint(cdp);
  await selectRuleLens(cdp);
  const rule = await ruleEvidence(cdp);
  if (rule.ids.length < 1 || rule.ids.length > 7 || !strictlyDescending(rule.ids)) throw new Error(`invalid post-succession Rule lens: ${JSON.stringify(rule)}`);
  if (!rule.ids.includes(descendant.id) || !rule.ids.includes(openSelection.id)) {
    throw new Error(`post-succession Rule lens must retain descendant #${descendant.id} + open selection #${openSelection.id}: ${JSON.stringify(rule.events)}`);
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

  if ((await fingerprint(cdp)) !== baseline) throw new Error('Dynastic World Stories read-only navigation changed authoritative world');

  writeFileSync(join(outDir, 'dynastic-world-stories-evidence.json'), `${JSON.stringify({
    initialDay: 14400,
    lightningSetup: {
      polityId: targetRuler.polityId,
      polityName: targetRuler.polityName,
      struckRulerId: targetRuler.rulerId,
      rulingLineFounderId: targetRuler.founderId,
      eligibleSurvivingDescendantIds: targetRuler.descendantIds,
      deathEventId: death.id
    },
    postSuccessionDay: await currentDay(cdp),
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

  console.log(`Dynastic World Stories evidence: Lightning ruler #${targetRuler.rulerId} → descendant #${descendant.id} line ${descendant.rulingLineSequence} distance ${descendant.descendantDistance}; retained open selection #${openSelection.id} line ${openSelection.rulingLineSequence}; Rule ${rule.ids.join(',')}; ${navigation.kind} navigation; post-causality authority unchanged`);
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

async function descendantSuccessionTarget(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    if (!world || !camera) return null;
    const adultAgeDays = world.config.adultAgeYears * world.config.daysPerYear;
    const tileSize = 28;
    const adjacency = new Map();
    const add = (parentId, childId) => {
      if (!Number.isInteger(parentId) || !Number.isInteger(childId) || parentId === childId) return;
      if (!adjacency.has(parentId)) adjacency.set(parentId, new Set());
      adjacency.get(parentId).add(childId);
    };
    for (const union of world.unions ?? []) {
      if (union?.kind !== 'parental_union') continue;
      for (const parentId of union.partnerIds ?? []) for (const childId of union.childIds ?? []) add(parentId, childId);
    }
    for (const human of world.entities ?? []) {
      if (human?.kind !== 'human') continue;
      for (const parentId of human.parentIds ?? []) add(parentId, human.id);
    }
    const distances = (founderId) => {
      const result = new Map();
      const seen = new Set([founderId]);
      let frontier = [founderId];
      let distance = 0;
      while (frontier.length) {
        distance += 1;
        const next = [];
        for (const parentId of frontier) {
          for (const childId of adjacency.get(parentId) ?? []) {
            if (seen.has(childId)) continue;
            seen.add(childId);
            result.set(childId, distance);
            next.push(childId);
          }
        }
        frontier = next;
      }
      return result;
    };
    const candidates = [];
    for (const polity of (world.polities ?? []).filter((value) => value.active).sort((a, b) => a.id - b.id)) {
      if (!Number.isInteger(polity.rulerId) || !Number.isInteger(polity.rulingLineFounderId)) continue;
      const memberSettlements = new Set((world.settlements ?? [])
        .filter((settlement) => settlement.active && settlement.polityId === polity.id)
        .map((settlement) => settlement.id));
      const adults = (world.entities ?? []).filter((human) => human.kind === 'human' && human.alive
        && human.ageDays >= adultAgeDays && memberSettlements.has(human.settlementId));
      const ruler = adults.find((human) => human.id === polity.rulerId);
      if (!ruler) continue;
      const distanceById = distances(polity.rulingLineFounderId);
      const survivingDescendants = adults
        .filter((human) => human.id !== ruler.id && (human.x !== ruler.x || human.y !== ruler.y) && distanceById.has(human.id))
        .map((human) => ({ human, distance: distanceById.get(human.id) }))
        .sort((a, b) => a.distance - b.distance || b.human.ageDays - a.human.ageDays || a.human.id - b.human.id);
      if (!survivingDescendants.length) continue;
      const worldX = (ruler.x + 0.5) * tileSize;
      const worldY = (ruler.y + 0.5) * tileSize;
      const screenX = camera.x + (worldX - camera.worldView.x) * camera.zoom;
      const screenY = camera.y + (worldY - camera.worldView.y) * camera.zoom;
      if (screenX < 280 || screenX > 1110 || screenY < 85 || screenY > 785) continue;
      candidates.push({
        polityId: polity.id,
        polityName: polity.name,
        rulerId: ruler.id,
        founderId: polity.rulingLineFounderId,
        x: ruler.x,
        y: ruler.y,
        screenX,
        screenY,
        descendantIds: survivingDescendants.map((entry) => entry.human.id),
        topDistance: survivingDescendants[0].distance
      });
    }
    return candidates.sort((a, b) => a.topDistance - b.topDistance || a.polityId - b.polityId)[0] ?? null;
  })()`);
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
    if (map) return { kind: 'map', entityKind: map.dataset.entityKind, entityId: Number(map.dataset.entityId) };
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

async function selectTool(cdpClient, toolName) {
  const selected = await evaluate(cdpClient, `(() => {
    const tool = document.querySelector('#tool');
    if (!tool) return null;
    tool.value = ${JSON.stringify(toolName)};
    tool.dispatchEvent(new Event('change', { bubbles: true }));
    return { value: tool.value, active: document.querySelector('[data-tool-button="${toolName}"]')?.dataset?.active === 'true' };
  })()`);
  if (selected?.value !== toolName || !selected.active) throw new Error(`${toolName} did not become active: ${JSON.stringify(selected)}`);
}

async function setSpeed(cdpClient, value) {
  const actual = await evaluate(cdpClient, `(() => {
    const speed = document.querySelector('#speed');
    if (!speed) return null;
    speed.value = ${JSON.stringify(value)};
    speed.dispatchEvent(new Event('change', { bubbles: true }));
    return speed.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set Time control to ${value}`);
}

async function setPaused(cdpClient, paused) {
  const state = await evaluate(cdpClient, `(() => {
    const button = document.querySelector('#pause');
    if (!button) return null;
    const current = button.dataset.active === 'true';
    if (current !== ${paused}) button.click();
    return button.dataset.active === 'true';
  })()`);
  if (state !== paused) throw new Error(`failed to set paused=${paused}`);
  await delay(100);
}

async function pauseWorld(cdpClient) { await setPaused(cdpClient, true); }
async function currentDay(cdpClient) { return evaluate(cdpClient, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day ?? -1`); }
async function fingerprint(cdpClient) { return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`); }

async function clickSelector(cdpClient, selector) { await clickPoint(cdpClient, await elementCenter(cdpClient, selector)); }

async function clickPoint(cdpClient, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || point.x < 0 || point.x > 1440 || point.y < 0 || point.y > 900) {
    throw new Error(`invalid pointer target: ${JSON.stringify(point)}`);
  }
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

function strictlyDescending(values) { for (let index = 1; index < values.length; index += 1) if (values[index] >= values[index - 1]) return false; return true; }
function sameArray(a, b) { return a.length === b.length && a.every((value, index) => value === b[index]); }

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
      return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
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
  return Promise.race([new Promise((resolve) => child.once('exit', () => resolve(true))), delay(timeoutMs).then(() => false)]);
}

function ensureAlive(child) { if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
