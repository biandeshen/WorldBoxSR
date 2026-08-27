import { refreshCameraBoundsForZoom } from './camera_composition.js';
import { isTouchPointer } from './touch_inspect_intent.js';
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  focusPreservingScroll,
  pinchDistance,
  pinchMidpoint,
  pinchZoom
} from './pinch_zoom.js';

const TILE_SIZE = 28;

if (document.documentElement.dataset.renderer === 'phaser') attachWhenReady();

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  if (!scene?.input || !scene?.cameras?.main || !scene?.view || !scene?.touchInspect?.attached) {
    window.setTimeout(attachWhenReady, 30);
    return;
  }
  if (scene.pinchZoom?.attached) return;

  scene.input.addPointer?.(2);

  const state = {
    attached: true,
    touches: new Map(),
    pinching: false,
    suppressUntilClear: false,
    pairIds: [],
    startDistance: 0,
    startZoom: scene.cameras.main.zoom
  };
  scene.pinchZoom = state;

  scene.input.on('pointerdown', (pointer) => pointerDown(scene, state, pointer));
  scene.input.on('pointermove', (pointer) => pointerMove(scene, state, pointer));
  scene.input.on('pointerup', (pointer) => pointerUp(scene, state, pointer));
  scene.input.on('pointerupoutside', (pointer) => pointerUp(scene, state, pointer));
}

function pointerDown(scene, state, pointer) {
  if (!isTouchPointer(pointer)) return;
  const id = pointerIdentity(pointer);
  if (id === null) return;
  state.touches.set(id, pointFromPointer(pointer));
  if (state.suppressUntilClear) scene.drag = null;
  if (!state.pinching && state.touches.size >= 2) startPinch(scene, state);
}

function pointerMove(scene, state, pointer) {
  if (!isTouchPointer(pointer)) return;
  const id = pointerIdentity(pointer);
  if (id === null || !state.touches.has(id)) return;
  state.touches.set(id, pointFromPointer(pointer));
  if (state.suppressUntilClear) scene.drag = null;
  if (state.pinching) applyPinch(scene, state);
}

function pointerUp(scene, state, pointer) {
  if (!isTouchPointer(pointer)) return;
  const id = pointerIdentity(pointer);
  if (id !== null) state.touches.delete(id);
  if (state.suppressUntilClear) scene.drag = null;

  if (state.pinching && state.pairIds.includes(id)) {
    state.pinching = false;
    state.pairIds = [];
    state.startDistance = 0;
  }
  if (state.touches.size === 0) {
    state.pinching = false;
    state.suppressUntilClear = false;
    state.pairIds = [];
    state.startDistance = 0;
    state.startZoom = scene.cameras.main.zoom;
  }
}

function startPinch(scene, state) {
  const entries = [...state.touches.entries()].slice(0, 2);
  if (entries.length < 2) return;

  state.suppressUntilClear = true;
  scene.drag = null;
  scene.touchInspect?.cancel?.();

  const distance = pinchDistance(entries[0][1], entries[1][1]);
  if (!Number.isFinite(distance) || distance <= 0) return;
  state.pinching = true;
  state.pairIds = [entries[0][0], entries[1][0]];
  state.startDistance = distance;
  state.startZoom = scene.cameras.main.zoom;
}

function applyPinch(scene, state) {
  const first = state.touches.get(state.pairIds[0]);
  const second = state.touches.get(state.pairIds[1]);
  if (!first || !second) return;
  const midpoint = pinchMidpoint(first, second);
  const currentDistance = pinchDistance(first, second);
  const targetZoom = pinchZoom({
    startZoom: state.startZoom,
    startDistance: state.startDistance,
    currentDistance,
    minZoom: CAMERA_MIN_ZOOM,
    maxZoom: CAMERA_MAX_ZOOM
  });
  if (!midpoint || targetZoom === null) return;

  const camera = scene.cameras.main;
  // getWorldPoint is trustworthy here because it reads the matrix from the
  // current rendered frame. Do not call it again immediately after setZoom:
  // Phaser 4 rebuilds matrixCombined during the next camera preRender.
  const worldBefore = camera.getWorldPoint(midpoint.x, midpoint.y);
  camera.setZoom(targetZoom);
  refreshCameraBoundsForZoom(scene, TILE_SIZE);

  const desiredScroll = focusPreservingScroll({
    worldPoint: worldBefore,
    screenPoint: midpoint,
    viewportX: camera.x,
    viewportY: camera.y,
    viewportWidth: camera.width,
    viewportHeight: camera.height,
    originX: camera.originX,
    originY: camera.originY,
    zoom: targetZoom
  });
  if (desiredScroll) {
    camera.scrollX = camera.useBounds ? camera.clampX(desiredScroll.x) : desiredScroll.x;
    camera.scrollY = camera.useBounds ? camera.clampY(desiredScroll.y) : desiredScroll.y;
  }
  scene.drag = null;
}

function pointFromPointer(pointer) {
  return { x: pointer.x, y: pointer.y };
}

function pointerIdentity(pointer) {
  if (Number.isInteger(pointer?.id)) return `id:${pointer.id}`;
  if (Number.isInteger(pointer?.pointerId)) return `pointer:${pointer.pointerId}`;
  if (Number.isInteger(pointer?.event?.pointerId)) return `event:${pointer.event.pointerId}`;
  return null;
}
