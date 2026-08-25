import { selectionAt } from './world_adapter.js';
import { resolveSelection, selectionColor, selectionDescriptor } from './selection_highlight.js';

const TILE_SIZE = 28;
const DEPTH = 880;
let scene = null;
let graphics = null;
let descriptor = null;
let attachTimer = null;

attachWhenReady();

globalThis.addEventListener?.('worldboxsr:world-replaced', clearSelection);

function attachWhenReady() {
  const game = globalThis.__PHASER_GAME__;
  const candidate = game?.scene?.getScene?.('world');
  if (!candidate?.input || !candidate?.cameras?.main || !candidate?.view) {
    attachTimer = window.setTimeout(attachWhenReady, 30);
    return;
  }

  scene = candidate;
  graphics = scene.add.graphics().setDepth(DEPTH);
  scene.input.on('pointerup', handlePointerUp);
  scene.events.on('update', renderSelection);

  document.querySelector('#reset')?.addEventListener('click', clearSelection);
}

function handlePointerUp(pointer) {
  if (!scene?.world || !scene.view) return;
  if (!(pointer.event?.altKey || pointer.rightButtonReleased())) return;

  const point = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  const x = Math.floor(point.x / TILE_SIZE);
  const y = Math.floor(point.y / TILE_SIZE);
  if (x < 0 || y < 0 || x >= scene.view.width || y >= scene.view.height) {
    clearSelection();
    return;
  }

  descriptor = selectionDescriptor(selectionAt(scene.world, x, y));
  renderSelection(scene.time.now);
}

function renderSelection(time = 0) {
  if (!graphics) return;
  graphics.clear();
  if (!descriptor || !scene?.view) return;

  const target = resolveSelection(scene.view, descriptor);
  if (!target) {
    descriptor = null;
    return;
  }

  const color = selectionColor(target.kind);
  const pulse = 0.78 + Math.sin(time * 0.006) * 0.16;
  const x = target.x * TILE_SIZE;
  const y = target.y * TILE_SIZE;
  const inset = target.kind === 'settlement' ? -3 : 2;
  const size = TILE_SIZE - inset * 2;
  const corner = Math.max(6, TILE_SIZE * 0.27);

  graphics.fillStyle(color, 0.055);
  graphics.fillRect(x + inset, y + inset, size, size);
  graphics.lineStyle(Math.max(2, TILE_SIZE * 0.075), color, pulse);
  drawCorners(graphics, x + inset, y + inset, size, corner);

  const centerX = x + TILE_SIZE / 2;
  const topY = y + inset - 5;
  graphics.fillStyle(0x071015, 0.72);
  graphics.fillCircle(centerX, topY, 4.2);
  graphics.fillStyle(color, pulse);
  graphics.fillCircle(centerX, topY, 2.3);
}

function drawCorners(target, x, y, size, length) {
  const right = x + size;
  const bottom = y + size;
  target.lineBetween(x, y, x + length, y);
  target.lineBetween(x, y, x, y + length);
  target.lineBetween(right, y, right - length, y);
  target.lineBetween(right, y, right, y + length);
  target.lineBetween(x, bottom, x + length, bottom);
  target.lineBetween(x, bottom, x, bottom - length);
  target.lineBetween(right, bottom, right - length, bottom);
  target.lineBetween(right, bottom, right, bottom - length);
}

function clearSelection() {
  descriptor = null;
  graphics?.clear();
}
