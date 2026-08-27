import { polityColor } from './polity_style.js';
import { targetFootprint, targetStyle, territoryCells, territoryRenderStyle, territorySignature } from './world_overlay.js';

const TILE_SIZE = 28;
const TERRITORY_DEPTH = 6;
const TARGET_DEPTH = 900;
const toolSelect = document.querySelector('#tool');

let scene = null;
let territoryGraphics = null;
let targetGraphics = null;
let lastTerritorySignature = null;
let lastTerritoryCheck = -Infinity;
let lastPointer = null;
let attachTimer = null;

attachWhenReady();
window.addEventListener('pointermove', (event) => {
  if (event.target?.closest?.('#topbar, #inspector-panel, #power-dock')) clearTarget();
});
toolSelect?.addEventListener('change', () => {
  if (lastPointer) drawTarget(lastPointer.x, lastPointer.y);
});

function attachWhenReady() {
  const game = globalThis.__PHASER_GAME__;
  const candidate = game?.scene?.getScene?.('world');
  if (!candidate?.view?.tiles || !candidate?.cameras?.main || !candidate?.input) {
    attachTimer = window.setTimeout(attachWhenReady, 30);
    return;
  }

  scene = candidate;
  territoryGraphics = scene.add.graphics().setDepth(TERRITORY_DEPTH);
  targetGraphics = scene.add.graphics().setDepth(TARGET_DEPTH);
  redrawTerritory(true);

  scene.events.on('update', (time) => {
    if (time - lastTerritoryCheck < 180) return;
    lastTerritoryCheck = time;
    redrawTerritory(false);
  });
  scene.input.on('pointermove', (pointer) => {
    lastPointer = { x: pointer.x, y: pointer.y };
    drawTarget(pointer.x, pointer.y);
  });
  scene.input.on('gameout', clearTarget);
}

function redrawTerritory(force) {
  if (!scene?.view || !territoryGraphics) return;
  const signature = territorySignature(scene.view);
  if (!force && signature === lastTerritorySignature) return;
  lastTerritorySignature = signature;
  territoryGraphics.clear();

  const style = territoryRenderStyle(TILE_SIZE);
  for (const cell of territoryCells(scene.view)) {
    const color = polityColor(cell.colorIndex);
    const x = cell.x * TILE_SIZE;
    const y = cell.y * TILE_SIZE;
    const inset = style.fillInset;

    territoryGraphics.fillStyle(color, style.fillAlpha);
    territoryGraphics.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

    drawEdgeAccents(territoryGraphics, cell.edges, x, y, color, style);
    drawBoundaryLayer(territoryGraphics, cell.edges, x, y, 0x071017, style.shadowWidth, style.shadowAlpha);
    drawBoundaryLayer(territoryGraphics, cell.edges, x, y, color, style.borderWidth, style.borderAlpha);
  }
}

function drawEdgeAccents(graphics, edges, x, y, color, style) {
  const inset = style.fillInset;
  const length = TILE_SIZE - inset * 2;
  const accent = style.accentWidth;
  graphics.fillStyle(color, style.accentAlpha);
  if (edges.left) graphics.fillRect(x + inset, y + inset, accent, length);
  if (edges.right) graphics.fillRect(x + TILE_SIZE - inset - accent, y + inset, accent, length);
  if (edges.top) graphics.fillRect(x + inset, y + inset, length, accent);
  if (edges.bottom) graphics.fillRect(x + inset, y + TILE_SIZE - inset - accent, length, accent);
}

function drawBoundaryLayer(graphics, edges, x, y, color, width, alpha) {
  const inset = 1;
  const left = x + inset;
  const right = x + TILE_SIZE - inset;
  const top = y + inset;
  const bottom = y + TILE_SIZE - inset;
  graphics.lineStyle(width, color, alpha);
  if (edges.left) graphics.lineBetween(left, top, left, bottom);
  if (edges.right) graphics.lineBetween(right, top, right, bottom);
  if (edges.top) graphics.lineBetween(left, top, right, top);
  if (edges.bottom) graphics.lineBetween(left, bottom, right, bottom);
}

function drawTarget(screenX, screenY) {
  if (!scene?.view || !targetGraphics) return;
  const camera = scene.cameras.main;
  if (screenX < camera.x || screenY < camera.y || screenX >= camera.x + camera.width || screenY >= camera.y + camera.height) {
    clearTarget();
    return;
  }

  const worldPoint = camera.getWorldPoint(screenX, screenY);
  const centerX = Math.floor(worldPoint.x / TILE_SIZE);
  const centerY = Math.floor(worldPoint.y / TILE_SIZE);
  if (centerX < 0 || centerY < 0 || centerX >= scene.view.width || centerY >= scene.view.height) {
    clearTarget();
    return;
  }

  const tool = toolSelect?.value || 'spawn_human';
  const footprint = targetFootprint(tool, centerX, centerY, scene.view.width, scene.view.height);
  const inset = tool === 'meteor' ? 1 : 2;
  const corner = Math.max(5, TILE_SIZE * 0.22);
  targetGraphics.clear();

  for (const cell of footprint) {
    const tile = scene.view.tiles[cell.y * scene.view.width + cell.x];
    const style = targetStyle(tool, tile);
    const px = cell.x * TILE_SIZE;
    const py = cell.y * TILE_SIZE;
    targetGraphics.fillStyle(style.color, cell.center ? style.fillAlpha * 1.25 : style.fillAlpha * 0.7);
    targetGraphics.fillRect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
    targetGraphics.lineStyle(Math.max(1.2, TILE_SIZE * 0.05), style.color, cell.center ? 0.98 : 0.54);
    targetGraphics.strokeRect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

    if (!cell.center) continue;
    targetGraphics.lineStyle(Math.max(2.4, TILE_SIZE * 0.09), 0xffffff, 0.82);
    drawCorners(targetGraphics, px + inset, py + inset, TILE_SIZE - inset * 2, corner);
    if (style.invalid) {
      targetGraphics.lineStyle(Math.max(2.4, TILE_SIZE * 0.085), style.color, 0.95);
      targetGraphics.lineBetween(px + 7, py + 7, px + TILE_SIZE - 7, py + TILE_SIZE - 7);
      targetGraphics.lineBetween(px + TILE_SIZE - 7, py + 7, px + 7, py + TILE_SIZE - 7);
    }
  }
}

function drawCorners(graphics, x, y, size, length) {
  const right = x + size;
  const bottom = y + size;
  graphics.lineBetween(x, y, x + length, y);
  graphics.lineBetween(x, y, x, y + length);
  graphics.lineBetween(right, y, right - length, y);
  graphics.lineBetween(right, y, right, y + length);
  graphics.lineBetween(x, bottom, x + length, bottom);
  graphics.lineBetween(x, bottom, x, bottom - length);
  graphics.lineBetween(right, bottom, right - length, bottom);
  graphics.lineBetween(right, bottom, right, bottom - length);
}

function clearTarget() {
  targetGraphics?.clear();
}
