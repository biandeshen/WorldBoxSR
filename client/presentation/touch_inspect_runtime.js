import {
  isTouchPointer,
  pointerDistance,
  TOUCH_INSPECT_HOLD_MS,
  TOUCH_INSPECT_MOVE_THRESHOLD_PX,
  touchInspectIntent
} from './touch_inspect_intent.js';

const hint = document.querySelector('#hint');

if (document.documentElement.dataset.renderer === 'phaser') attachWhenReady();

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  if (!scene?.input || !scene?.pointerTile || !scene?.inspectTile) {
    window.setTimeout(attachWhenReady, 30);
    return;
  }
  if (scene.touchInspect?.attached) return;

  const state = {
    attached: true,
    pointerId: null,
    pointer: null,
    startX: 0,
    startY: 0,
    startedAt: 0,
    timer: null
  };
  scene.touchInspect = state;

  scene.input.on('pointerdown', (pointer) => beginTouchHold(scene, state, pointer));
  scene.input.on('pointermove', (pointer) => updateTouchHold(state, pointer));
  scene.input.on('pointerup', (pointer) => finishTouchHold(state, pointer));
  scene.input.on('pointerupoutside', (pointer) => finishTouchHold(state, pointer));

  if (globalThis.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches && hint) {
    hint.textContent = 'Tap: use selected tool · Hold: inspect · Drag: pan';
  }
}

function beginTouchHold(scene, state, pointer) {
  cancelTouchHold(state);
  if (!isTouchPointer(pointer) || !pointer?.isDown) return;
  const tile = scene.pointerTile(pointer);
  if (!tile) return;

  state.pointerId = pointerIdentity(pointer);
  state.pointer = pointer;
  state.startX = pointer.x;
  state.startY = pointer.y;
  state.startedAt = performance.now();
  state.timer = window.setTimeout(() => commitTouchInspect(scene, state), TOUCH_INSPECT_HOLD_MS);
}

function updateTouchHold(state, pointer) {
  if (!sameActivePointer(state, pointer)) return;
  const distancePx = pointerDistance(pointer, state.startX, state.startY);
  const intent = touchInspectIntent({
    touch: isTouchPointer(pointer),
    isDown: Boolean(pointer?.isDown),
    elapsedMs: performance.now() - state.startedAt,
    distancePx
  });
  if (intent === 'drag' || intent === 'ignore') cancelTouchHold(state);
}

function finishTouchHold(state, pointer) {
  if (!sameActivePointer(state, pointer)) return;
  cancelTouchHold(state);
}

function commitTouchInspect(scene, state) {
  const pointer = state.pointer;
  if (!pointer || !sameActivePointer(state, pointer)) return cancelTouchHold(state);
  const distancePx = pointerDistance(pointer, state.startX, state.startY);
  const intent = touchInspectIntent({
    touch: isTouchPointer(pointer),
    isDown: Boolean(pointer.isDown),
    elapsedMs: Math.max(TOUCH_INSPECT_HOLD_MS, performance.now() - state.startedAt),
    distancePx,
    holdMs: TOUCH_INSPECT_HOLD_MS,
    moveThresholdPx: TOUCH_INSPECT_MOVE_THRESHOLD_PX
  });
  if (intent !== 'inspect') return cancelTouchHold(state);

  const tile = scene.pointerTile(pointer);
  if (!tile) return cancelTouchHold(state);

  // The authoritative Scene pointerup handler only uses a tool when its drag
  // object survives and was not moved. Clearing that existing presentation
  // gesture state means this long-press ends as inspection without adding a
  // second tool/command path or wrapping Scenario's useTool delegation.
  scene.drag = null;
  scene.inspectTile(tile.x, tile.y);
  scene.showToast?.(`Inspect · ${tile.x},${tile.y}`);
  cancelTouchHold(state);
}

function sameActivePointer(state, pointer) {
  return state.pointerId !== null && state.pointerId === pointerIdentity(pointer);
}

function pointerIdentity(pointer) {
  if (Number.isInteger(pointer?.id)) return `id:${pointer.id}`;
  if (Number.isInteger(pointer?.pointerId)) return `pointer:${pointer.pointerId}`;
  return pointer ? pointer : null;
}

function cancelTouchHold(state) {
  if (state.timer !== null) window.clearTimeout(state.timer);
  state.pointerId = null;
  state.pointer = null;
  state.startX = 0;
  state.startY = 0;
  state.startedAt = 0;
  state.timer = null;
}
