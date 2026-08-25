import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browser, baseUrl, outDir] = process.argv.slice(2);
if (!browser || !baseUrl || !outDir) {
  console.error('usage: node tools/capture-scenario-setup-evidence.mjs <browser> <base-url> <out-dir>');
  process.exit(2);
}

// Fixed seed45 Sandbox coordinates. These are intentionally pre-registered and
// far enough right to remain real-clickable with the compact Setup card open.
const SETUP = Object.freeze([
  Object.freeze({ placement: 'human', x: 12, y: 8, count: 1 }),
  Object.freeze({ placement: 'grazer', x: 16, y: 12, count: 1 }),
  Object.freeze({ placement: 'wolf', x: 14, y: 7, count: 1 })
]);
const IMPASSABLE = Object.freeze({ x: 18, y: 12 });
const SCENARIO_NAME = 'Seed 45 trio';
const TILE_SIZE = 28;

mkdirSync(outDir, { recursive: true });
const userDataDir = mkdtempSync(join(tmpdir(), 'worldboxsr-scenario-setup-'));
const logFd = openSync(join(outDir, 'scenario-setup-chrome-runtime.log'), 'w');
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
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.attached === true`, 4_000);

  // Establish one exact ordinary seed45 Sandbox ready world while paused.
  await clickPauseTo(cdp, true);
  await clickSelector(cdp, '#reset');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('evolving showcase') === true`, 3_000);
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('showcase ready') === true`, 25_000);
  await waitForExpression(cdp, `document.querySelector('#pause')?.dataset?.active === 'true'`, 1_500);

  const ordinary = await setupState(cdp);
  if (ordinary.day !== 40 * 360 || ordinary.preset !== 'sandbox' || !ordinary.paused || ordinary.active) {
    throw new Error(`ordinary seed45 Sandbox baseline mismatch: ${JSON.stringify(ordinary)}`);
  }
  const baseFingerprint = await fingerprint(cdp);
  const baseIdentity = await authorityIdentity(cdp);

  // Visible entry must rematerialize exactly the same ready base and lock the
  // ordinary world controls while Setup owns the map.
  await clickSelector(cdp, '#scenario-setup-enter');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario Setup ready') === true`, 25_000);
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioSetup === 'true'`, 2_000);
  const entered = await setupState(cdp);
  assertActiveSetup(entered, 0, 'enter');
  assertLocked(entered, true, 'enter');
  if (entered.name !== 'Untitled scenario') throw new Error(`unexpected initial Scenario name: ${entered.name}`);
  if ((await fingerprint(cdp)) !== baseFingerprint) throw new Error('entering Scenario Setup did not rebuild exact ordinary Sandbox ready authority');

  const firstBuild = await placeThreeActions(cdp, baseIdentity);
  assertSetupRecipe(firstBuild.recipe);
  assertOrderedEvents(firstBuild.newEvents, baseIdentity.nextCommandId);
  assertPlacedAuthority(firstBuild, 'first build');
  if (firstBuild.countText !== '3/32 actions') throw new Error(`three-action Setup count mismatch: ${firstBuild.countText}`);
  const threeActionFingerprint = await fingerprint(cdp);
  const preRenameRecipe = JSON.stringify(firstBuild.recipe);

  // Real sea click must be rejected without changing accepted recipe or any
  // command/entity/event identity.
  const rejectedBefore = await authorityIdentity(cdp);
  const rejectedFingerprint = await fingerprint(cdp);
  const rejectedRecipe = await currentDraftString(cdp);
  await clickPoint(cdp, await fixedTilePoint(cdp, IMPASSABLE.x, IMPASSABLE.y), 0);
  await delay(160);
  if (await currentDraftString(cdp) !== rejectedRecipe) throw new Error('impassable Setup click changed accepted recipe draft');
  if ((await fingerprint(cdp)) !== rejectedFingerprint) throw new Error('impassable Setup click changed authoritative world');
  if (JSON.stringify(await authorityIdentity(cdp)) !== JSON.stringify(rejectedBefore)) throw new Error('impassable Setup click allocated identity');
  if ((await evaluate(cdp, `document.querySelector('#scenario-setup-count')?.textContent`)) !== '3/32 actions') throw new Error('impassable Setup click changed action count');

  // Rename through the real input. Blur fires the product change handler.
  await replaceInputText(cdp, '#scenario-name', SCENARIO_NAME);
  await clickSelector(cdp, '#scenario-setup-heading');
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.name === ${JSON.stringify(SCENARIO_NAME)}`, 2_000);
  if ((await fingerprint(cdp)) !== threeActionFingerprint) throw new Error('renaming Scenario Setup mutated authoritative world');
  const renamedRecipe = await currentDraft(cdp);
  if (renamedRecipe.name !== SCENARIO_NAME || renamedRecipe.setup.length !== 3) throw new Error(`Scenario rename did not preserve setup: ${JSON.stringify(renamedRecipe)}`);
  if (JSON.stringify(renamedRecipe) === preRenameRecipe) throw new Error('Scenario rename did not change recipe identity');

  const visuals = await visualEvidence(cdp, firstBuild.ids);
  if (!visuals.humanPresent || visuals.grazerSpecies !== 'grazer' || visuals.wolfSpecies !== 'wolf') {
    throw new Error(`placed Setup actors are not present on the shared Phaser entity surface: ${JSON.stringify(visuals)}`);
  }
  await captureScreenshot(cdp, join(outDir, 'scenario-setup-three-actions-1440x900.png'));
  if ((await fingerprint(cdp)) !== threeActionFingerprint) throw new Error('Scenario Setup screenshot mutated authority');

  // Clear is deterministic rebuild, never reverse/delete-in-place.
  await clickSelector(cdp, '#scenario-setup-clear');
  await waitForExpression(cdp, `document.querySelector('#boot-status')?.textContent?.includes('Scenario Setup ready') === true`, 25_000);
  await waitForExpression(cdp, `document.querySelector('#scenario-setup-count')?.textContent === '0/32 actions'`, 2_000);
  const cleared = await setupState(cdp);
  assertActiveSetup(cleared, 0, 'clear');
  assertLocked(cleared, true, 'clear');
  if (cleared.name !== SCENARIO_NAME) throw new Error(`Clear did not preserve Scenario name: ${cleared.name}`);
  if ((await fingerprint(cdp)) !== baseFingerprint) throw new Error('Clear Setup did not restore exact empty ready base');
  const clearIdentity = await authorityIdentity(cdp);
  if (JSON.stringify(clearIdentity) !== JSON.stringify(baseIdentity)) throw new Error('Clear Setup did not restore base authoritative identity counters');

  // Same ordered real clicks after Clear must reproduce exactly the same start.
  const secondBuild = await placeThreeActions(cdp, baseIdentity);
  assertSetupRecipe(secondBuild.recipe);
  assertOrderedEvents(secondBuild.newEvents, baseIdentity.nextCommandId);
  assertPlacedAuthority(secondBuild, 'second build');
  if (secondBuild.recipe.name !== SCENARIO_NAME) throw new Error('rebuild after Clear lost Scenario name');
  const rebuiltFingerprint = await fingerprint(cdp);
  if (rebuiltFingerprint !== threeActionFingerprint) throw new Error('same ordered Setup did not reproduce exact start after Clear');
  const startRecipeString = await currentDraftString(cdp);

  // Run freezes the recipe in presentation state and restores ordinary controls
  // without touching the starting world.
  await clickSelector(cdp, '#scenario-setup-run');
  await waitForExpression(cdp, `document.documentElement.dataset.scenarioSetup === 'false'`, 2_000);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.frozen?.setup?.length === 3`, 2_000);
  const running = await setupState(cdp);
  if (running.active || running.panelVisible || !running.badge.includes('SCENARIO · 3')) throw new Error(`Run Scenario did not exit Setup cleanly: ${JSON.stringify(running)}`);
  assertLocked(running, false, 'run');
  if ((await fingerprint(cdp)) !== rebuiltFingerprint) throw new Error('Run Scenario changed starting authoritative world');
  const frozenBeforePlay = await frozenRecipeString(cdp);
  if (frozenBeforePlay !== startRecipeString) throw new Error('Run Scenario frozen recipe differs from accepted Setup draft');
  await captureScreenshot(cdp, join(outDir, 'scenario-running-start-1440x900.png'));

  // Ordinary product Time/Play changes authority but must never rewrite the
  // frozen setup identity.
  await setSpeed(cdp, '1');
  const runStartDay = await evaluate(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day`);
  await clickPauseTo(cdp, false);
  await waitForExpression(cdp, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world?.day > ${runStartDay}`, 3_000);
  await clickPauseTo(cdp, true);
  const afterPlayFingerprint = await fingerprint(cdp);
  if (afterPlayFingerprint === rebuiltFingerprint) throw new Error('ordinary gameplay after Run did not change authoritative world');
  if (await frozenRecipeString(cdp) !== frozenBeforePlay) throw new Error('ordinary gameplay rewrote frozen Scenario recipe');
  const finalState = await setupState(cdp);
  if (finalState.active || finalState.frozenActions !== 3) throw new Error(`ordinary gameplay disturbed frozen Scenario presentation identity: ${JSON.stringify(finalState)}`);

  const evidence = {
    seed: 45,
    preset: 'sandbox',
    fixedTiles: { setup: SETUP, impassable: IMPASSABLE },
    ordinaryBase: { day: ordinary.day, fingerprint: fnv1a(baseFingerprint), identity: baseIdentity },
    enteredSetup: { exactBaseRestored: true, controlsLocked: true, actionCount: 0 },
    firstBuild: {
      recipe: renamedRecipe,
      authorityIds: firstBuild.ids,
      newEvents: firstBuild.newEvents,
      fingerprint: fnv1a(threeActionFingerprint),
      impassableRejectedWithoutMutation: true,
      renameAuthorityNeutral: true,
      visuals
    },
    clear: { exactBaseRestored: true, namePreserved: true, identity: clearIdentity },
    rebuild: { exactThreeActionStartRestored: true, recipe: secondBuild.recipe, fingerprint: fnv1a(rebuiltFingerprint) },
    runBoundary: { startFingerprintUnchanged: true, frozenRecipe: JSON.parse(frozenBeforePlay), ordinaryControlsRestored: true },
    ordinaryPlay: { worldChanged: true, frozenRecipeUnchanged: true, finalDay: finalState.day, finalFingerprint: fnv1a(afterPlayFingerprint) }
  };
  writeFileSync(join(outDir, 'scenario-setup-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(
    `Scenario Setup evidence: exact seed45 Sandbox base → Human 12,8 → Grazer 16,12 → Wolf 14,7; `
    + `impassable 18,12 rejected without identity/world change; rename authority-neutral; Clear restored exact base; `
    + `same 3-action start rebuilt exactly; Run preserved start and ordinary Play changed world while frozen recipe stayed unchanged`
  );
} finally {
  try { cdp?.close(); } catch {}
  await stopChrome(chrome);
  try { closeSync(logFd); } catch {}
  try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 }); }
  catch (error) { console.warn(`Could not fully remove temporary Chrome profile ${userDataDir}: ${error?.message || error}`); }
}

async function placeThreeActions(cdpClient, baseIdentity) {
  for (let index = 0; index < SETUP.length; index += 1) {
    const action = SETUP[index];
    await clickSelector(cdpClient, `[data-scenario-setup-tool="${action.placement}"]`);
    await clickPoint(cdpClient, await fixedTilePoint(cdpClient, action.x, action.y), 0);
    await waitForExpression(cdpClient, `globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft?.setup?.length === ${index + 1}`, 2_000);
    await waitForExpression(cdpClient, `document.querySelector('#scenario-setup-count')?.textContent === '${index + 1}/32 actions'`, 1_500);
  }

  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const events = world?.history?.filter((event) => event.id >= ${baseIdentity.nextEventId}) ?? [];
    const humanEvent = events.find((event) => event.type === 'god.spawn_human');
    const grazerEvent = events.find((event) => event.type === 'god.spawn_creature' && event.species === 'grazer');
    const wolfEvent = events.find((event) => event.type === 'god.spawn_creature' && event.species === 'wolf');
    return {
      recipe: structuredClone(scene?.scenarioSetup?.draft ?? null),
      countText: document.querySelector('#scenario-setup-count')?.textContent ?? '',
      newEvents: events.map((event) => ({
        id: event.id, type: event.type, species: event.species ?? null, x: event.x, y: event.y,
        count: event.count, commandId: event.causes?.[0]?.kind === 'command' ? event.causes[0].id : null
      })),
      ids: {
        humanId: humanEvent?.entityIds?.[0] ?? null,
        grazerId: grazerEvent?.creatureIds?.[0] ?? null,
        wolfId: wolfEvent?.creatureIds?.[0] ?? null
      },
      humansAtFixed: world?.entities?.filter((entity) => entity.kind === 'human' && entity.alive && entity.x === 12 && entity.y === 8).map((entity) => entity.id) ?? [],
      grazersAtFixed: world?.creatures?.filter((creature) => creature.alive && creature.species === 'grazer' && creature.x === 16 && creature.y === 12).map((creature) => creature.id) ?? [],
      wolvesAtFixed: world?.creatures?.filter((creature) => creature.alive && creature.species === 'wolf' && creature.x === 14 && creature.y === 7).map((creature) => creature.id) ?? []
    };
  })()`);
}

function assertSetupRecipe(recipe) {
  if (!recipe || recipe.kind !== 'worldboxsr-scenario' || recipe.version !== 1 || recipe.base?.seed !== 45 || recipe.base?.preset !== 'sandbox') {
    throw new Error(`Scenario Setup draft contract mismatch: ${JSON.stringify(recipe)}`);
  }
  const expected = SETUP.map((action) => action.placement === 'human'
    ? { type: 'spawn_human', x: action.x, y: action.y, count: action.count }
    : { type: 'spawn_creature', species: action.placement, x: action.x, y: action.y, count: action.count });
  if (JSON.stringify(recipe.setup) !== JSON.stringify(expected)) throw new Error(`Scenario Setup ordered recipe mismatch: ${JSON.stringify(recipe.setup)}`);
}

function assertOrderedEvents(events, firstCommandId) {
  if (events.length !== 3) throw new Error(`Scenario Setup should add exactly three authoritative events: ${JSON.stringify(events)}`);
  const expected = [
    { type: 'god.spawn_human', species: null, x: 12, y: 8, count: 1, commandId: firstCommandId },
    { type: 'god.spawn_creature', species: 'grazer', x: 16, y: 12, count: 1, commandId: firstCommandId + 1 },
    { type: 'god.spawn_creature', species: 'wolf', x: 14, y: 7, count: 1, commandId: firstCommandId + 2 }
  ];
  for (let index = 0; index < expected.length; index += 1) {
    for (const key of Object.keys(expected[index])) {
      if (events[index][key] !== expected[index][key]) throw new Error(`Scenario Setup event order drifted at ${index}: ${JSON.stringify(events)}`);
    }
  }
}

function assertPlacedAuthority(state, label) {
  if (!Number.isInteger(state.ids.humanId) || !state.humansAtFixed.includes(state.ids.humanId)) throw new Error(`${label}: Human setup authority missing at 12,8: ${JSON.stringify(state)}`);
  if (!Number.isInteger(state.ids.grazerId) || !state.grazersAtFixed.includes(state.ids.grazerId)) throw new Error(`${label}: Grazer setup authority missing at 16,12: ${JSON.stringify(state)}`);
  if (!Number.isInteger(state.ids.wolfId) || !state.wolvesAtFixed.includes(state.ids.wolfId)) throw new Error(`${label}: Wolf setup authority missing at 14,7: ${JSON.stringify(state)}`);
}

async function visualEvidence(cdpClient, ids) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const human = scene?.world?.entities?.find((entity) => entity.kind === 'human' && entity.alive && entity.id === ${ids.humanId});
    const grazerVisual = scene?.entities?.creatures?.get?.(${ids.grazerId});
    const wolfVisual = scene?.entities?.creatures?.get?.(${ids.wolfId});
    return {
      humanPresent: Boolean(human),
      grazerSpecies: grazerVisual?.species ?? null,
      wolfSpecies: wolfVisual?.species ?? null,
      grazerChildren: grazerVisual?.container?.list?.length ?? -1,
      wolfChildren: wolfVisual?.container?.list?.length ?? -1
    };
  })()`);
}

async function setupState(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const setup = scene?.scenarioSetup;
    const disabled = (selector) => Boolean(document.querySelector(selector)?.disabled);
    return {
      day: scene?.world?.day ?? -1,
      preset: document.querySelector('#world-preset')?.value ?? '',
      paused: document.querySelector('#pause')?.dataset?.active === 'true',
      active: Boolean(setup?.active),
      busy: Boolean(setup?.busy),
      name: setup?.draft?.name ?? setup?.frozen?.name ?? '',
      draftActions: setup?.draft?.setup?.length ?? 0,
      frozenActions: setup?.frozen?.setup?.length ?? 0,
      countText: document.querySelector('#scenario-setup-count')?.textContent ?? '',
      panelVisible: document.querySelector('#scenario-setup-panel')?.hidden === false,
      badge: document.querySelector('#scenario-state-badge')?.textContent ?? '',
      locks: {
        seed: disabled('#seed'), preset: disabled('#world-preset'), reset: disabled('#reset'),
        pause: disabled('#pause'), speed: disabled('#speed')
      },
      godDockHidden: getComputedStyle(document.querySelector('#power-dock')).display === 'none',
      pulseHidden: getComputedStyle(document.querySelector('#world-event-pulse')).display === 'none'
    };
  })()`);
}

function assertActiveSetup(state, actionCount, label) {
  if (!state.active || state.busy || !state.paused || !state.panelVisible || state.draftActions !== actionCount || state.frozenActions !== 0) {
    throw new Error(`${label}: Scenario Setup state mismatch: ${JSON.stringify(state)}`);
  }
  if (state.countText !== `${actionCount}/32 actions` || !state.godDockHidden || !state.pulseHidden) {
    throw new Error(`${label}: Scenario Setup presentation boundary mismatch: ${JSON.stringify(state)}`);
  }
}

function assertLocked(state, locked, label) {
  for (const [key, value] of Object.entries(state.locks)) {
    if (value !== locked) throw new Error(`${label}: ${key} lock expected ${locked}, got ${value}`);
  }
}

async function authorityIdentity(cdpClient) {
  return evaluate(cdpClient, `(() => {
    const world = globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world;
    return world ? {
      nextCommandId: world.nextCommandId, nextEventId: world.nextEventId,
      nextEntityId: world.nextEntityId, nextCreatureId: world.nextCreatureId,
      entities: world.entities.length, creatures: world.creatures.length, history: world.history.length
    } : null;
  })()`);
}

async function currentDraft(cdpClient) {
  return evaluate(cdpClient, `structuredClone(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft ?? null)`);
}

async function currentDraftString(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.draft ?? null)`);
}

async function frozenRecipeString(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.scenarioSetup?.frozen ?? null)`);
}

async function fixedTilePoint(cdpClient, x, y) {
  const point = await evaluate(cdpClient, `(() => {
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    const camera = scene?.cameras?.main;
    const tile = world?.tiles?.[${y} * world.width + ${x}];
    if (!world || !camera || !tile) return null;
    const worldX = (${x} + 0.5) * ${TILE_SIZE};
    const worldY = (${y} + 0.5) * ${TILE_SIZE};
    return {
      x: camera.x + (worldX - camera.worldView.x) * camera.zoom,
      y: camera.y + (worldY - camera.worldView.y) * camera.zoom,
      tileX: ${x}, tileY: ${y}, passable: tile.passable
    };
  })()`);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1440 || point.y < 0 || point.y > 900) {
    throw new Error(`fixed Scenario Setup tile ${x},${y} is not visible: ${JSON.stringify(point)}`);
  }
  const expectedPassable = !(x === IMPASSABLE.x && y === IMPASSABLE.y);
  if (point.passable !== expectedPassable) throw new Error(`fixed Scenario Setup tile passability drifted at ${x},${y}: ${JSON.stringify(point)}`);
  const overlay = await evaluate(cdpClient, `document.elementFromPoint(${point.x}, ${point.y})?.closest?.('#scenario-setup-panel, #topbar, #inspector-panel')?.id ?? ''`);
  if (overlay) throw new Error(`fixed Scenario Setup tile ${x},${y} is obscured by ${overlay}`);
  return point;
}

async function replaceInputText(cdpClient, selector, value) {
  const point = await elementCenter(cdpClient, selector);
  await clickPoint(cdpClient, point, 0);
  await cdpClient.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 });
  await cdpClient.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 });
  await cdpClient.send('Input.insertText', { text: value });
  await delay(60);
}

async function setSpeed(cdpClient, value) {
  const actual = await evaluate(cdpClient, `(() => {
    const select = document.querySelector('#speed');
    if (!select || select.disabled) return null;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  if (actual !== value) throw new Error(`failed to set ordinary Time control to ${value}`);
}

async function clickPauseTo(cdpClient, paused) {
  const current = await evaluate(cdpClient, `document.querySelector('#pause')?.dataset?.active === 'true'`);
  if (current !== paused) await clickSelector(cdpClient, '#pause');
  await waitForExpression(cdpClient, `document.querySelector('#pause')?.dataset?.active === '${paused ? 'true' : 'false'}'`, 1_500);
}

async function fingerprint(cdpClient) {
  return evaluate(cdpClient, `JSON.stringify(globalThis.__PHASER_GAME__?.scene?.getScene?.('world')?.world)`);
}

async function clickSelector(cdpClient, selector) {
  const point = await elementCenter(cdpClient, selector);
  await clickPoint(cdpClient, point, 0);
  await delay(80);
}

async function clickPoint(cdpClient, point, modifiers = 0) {
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
    await delay(80);
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
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
