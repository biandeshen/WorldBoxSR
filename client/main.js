import { applyCommand } from '../engine/core/commands.js';
import { findHistoryEvent } from '../engine/analysis/history_query.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld, tileAt } from '../engine/core/world.js';
import { createCamera, panCamera, resetCamera, screenToTile, worldToScreen, zoomCameraAt } from './camera.js';
import {
  formatHistoryEventDetail,
  formatHistoryEventLabel,
  timelineEvents,
  timelineScopeLabel
} from './history_view.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const stats = document.querySelector('#stats');
const inspector = document.querySelector('#inspector');
const pauseButton = document.querySelector('#pause');
const speedSelect = document.querySelector('#speed');
const toolSelect = document.querySelector('#tool');
const seedInput = document.querySelector('#seed');
const historyScopeSelect = document.querySelector('#history-scope');
const historyOrderSelect = document.querySelector('#history-order');
const historyScopeLabel = document.querySelector('#history-scope-label');
const historyList = document.querySelector('#history-list');
const historyDetail = document.querySelector('#history-detail');

let world = makeWorld(seedInput.value);
const camera = createCamera();
let selection = null;
let selectedHistoryEventId = null;
let paused = false;
let lastStatsFrame = 0;
let pointerDrag = null;

function makeWorld(seedToken) {
  const seed = /^[-+]?\d+$/.test(seedToken) ? Number(seedToken) : seedToken;
  return createWorld({ seed, width: 48, height: 32, population: 30 });
}

function reset() {
  world = makeWorld(seedInput.value.trim() || '42');
  selection = null;
  selectedHistoryEventId = null;
  resetCamera(camera);
  refreshHud();
}

document.querySelector('#reset').addEventListener('click', reset);
document.querySelector('#reset-camera').addEventListener('click', () => resetCamera(camera));
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});
historyScopeSelect.addEventListener('change', () => {
  selectedHistoryEventId = null;
  updateHistoryTimeline();
});
historyOrderSelect.addEventListener('change', updateHistoryTimeline);
historyList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-event-id]');
  if (!button) return;
  selectedHistoryEventId = Number(button.dataset.eventId);
  updateHistoryTimeline();
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);
  pointerDrag = {
    id: event.pointerId,
    pointerType: event.pointerType,
    startX: point.x,
    startY: point.y,
    lastX: point.x,
    lastY: point.y,
    moved: false,
    altKey: event.altKey,
    shiftKey: event.shiftKey
  };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
  const point = canvasPoint(event);
  const dx = point.x - pointerDrag.lastX;
  const dy = point.y - pointerDrag.lastY;
  const total = Math.hypot(point.x - pointerDrag.startX, point.y - pointerDrag.startY);
  if (total > 5 * deviceScale()) pointerDrag.moved = true;
  if (pointerDrag.moved) panCamera(camera, dx, dy);
  pointerDrag.lastX = point.x;
  pointerDrag.lastY = point.y;
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
  const drag = pointerDrag;
  pointerDrag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (drag.moved) return;

  const tile = tileFromScreen(drag.lastX, drag.lastY);
  if (!tile) return;
  if (drag.pointerType === 'touch' || drag.altKey) {
    cycleSelectionAt(tile.x, tile.y);
    return;
  }
  applyToolAt(tile.x, tile.y, drag.shiftKey);
});

canvas.addEventListener('pointercancel', () => { pointerDrag = null; });
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const tile = tileFromScreen(point.x, point.y);
  if (tile) cycleSelectionAt(tile.x, tile.y);
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const factor = Math.exp(-event.deltaY * 0.0015);
  zoomCameraAt(camera, factor, point.x, point.y);
}, { passive: false });

function applyToolAt(x, y, shiftKey) {
  if (toolSelect.value === 'meteor') {
    meteorAt(x, y);
    return;
  }
  if (toolSelect.value === 'erase') {
    eraseAt(x, y);
    return;
  }
  if (toolSelect.value === 'lightning') {
    lightningAt(x, y);
    return;
  }
  if (toolSelect.value === 'spawn_grazer') {
    spawnGrazerAt(x, y, shiftKey ? 10 : 1);
    return;
  }
  spawnAt(x, y, shiftKey ? 10 : 1);
}

function spawnAt(x, y, count) {
  try {
    applyCommand(world, { type: 'spawn_human', x, y, count });
    refreshHud();
  } catch (error) {
    if (!/impassable/.test(String(error?.message))) throw error;
  }
}

function spawnGrazerAt(x, y, count) {
  try {
    applyCommand(world, { type: 'spawn_creature', species: 'grazer', x, y, count });
    refreshHud();
  } catch (error) {
    if (!/impassable/.test(String(error?.message))) throw error;
  }
}

function eraseAt(x, y) {
  applyCommand(world, { type: 'erase', x, y });
  refreshHud();
}

function lightningAt(x, y) {
  applyCommand(world, { type: 'lightning', x, y });
  refreshHud();
}

function meteorAt(x, y) {
  applyCommand(world, { type: 'meteor', x, y });
  refreshHud();
}

function refreshHud() {
  updateStats();
  updateInspector();
  updateHistoryTimeline();
}

function cycleSelectionAt(x, y) {
  const candidates = world.entities
    .filter((entity) => entity.kind === 'human' && entity.x === x && entity.y === y)
    .sort((a, b) => a.id - b.id)
    .map((human) => ({ kind: 'human', id: human.id }));
  candidates.push(...world.creatures
    .filter((creature) => creature.alive && creature.x === x && creature.y === y)
    .sort((a, b) => a.id - b.id)
    .map((creature) => ({ kind: 'creature', id: creature.id })));
  candidates.push(...world.settlements
    .filter((settlement) => settlement.x === x && settlement.y === y)
    .sort((a, b) => a.id - b.id)
    .map((settlement) => ({ kind: 'settlement', id: settlement.id })));
  candidates.push({ kind: 'tile', x, y });

  const currentIndex = candidates.findIndex((candidate) => sameSelection(candidate, selection));
  selection = candidates[(currentIndex + 1) % candidates.length];
  if (historyScopeSelect.value === 'selection') selectedHistoryEventId = null;
  updateInspector();
  updateHistoryTimeline();
}

function sameSelection(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'tile' ? a.x === b.x && a.y === b.y : a.id === b.id;
}

function frame(timestamp) {
  resize();
  if (!paused) tickWorld(world, Number(speedSelect.value));
  drawWorld();
  if (timestamp - lastStatsFrame > 150) {
    refreshHud();
    lastStatsFrame = timestamp;
  }
  requestAnimationFrame(frame);
}

function drawWorld() {
  const { cellW, cellH } = viewMetrics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const tile of world.tiles) {
    if (tile.biome === 'ocean') {
      const depth = 1 - tile.elevation / world.config.waterLevel;
      ctx.fillStyle = `hsl(205 58% ${24 + (1 - depth) * 12}%)`;
    } else {
      const foodRatio = tile.foodCapacity ? tile.food / tile.foodCapacity : 0;
      const light = 18 + tile.fertility * 16 + foodRatio * 10;
      const saturation = 32 + tile.fertility * 35;
      ctx.fillStyle = `hsl(112 ${saturation}% ${light}%)`;
    }
    const p = worldToScreen(camera, tile.x, tile.y, viewport());
    ctx.fillRect(p.x, p.y, Math.ceil(cellW), Math.ceil(cellH));
  }

  for (const settlement of world.settlements) {
    const p = worldToScreen(camera, settlement.x + 0.5, settlement.y + 0.5, viewport());
    const size = Math.max(4, Math.min(cellW, cellH) * 0.8);
    ctx.save();
    if (!settlement.active) {
      ctx.globalAlpha = 0.38;
      ctx.setLineDash([Math.max(2, size * 0.25), Math.max(2, size * 0.18)]);
    }
    ctx.strokeStyle = '#ffd66b';
    ctx.lineWidth = Math.max(1, Math.min(cellW, cellH) * 0.12);
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
    if (cellW >= 8 && cellH >= 8) {
      ctx.font = `${Math.max(9, Math.floor(Math.min(cellW, cellH) * 0.8))}px ui-monospace, monospace`;
      ctx.fillStyle = '#fff4c7';
      ctx.fillText(settlement.name, p.x + size * 0.65, p.y - size * 0.65);
    }
    ctx.restore();
  }

  const humanRadius = Math.max(1.5, Math.min(cellW, cellH) * 0.25);
  for (const human of world.entities) {
    if (human.kind !== 'human') continue;
    const p = worldToScreen(camera, human.x + 0.5, human.y + 0.5, viewport());
    ctx.beginPath();
    ctx.arc(p.x, p.y, humanRadius, 0, Math.PI * 2);
    ctx.fillStyle = human.sex === 'F' ? '#ffd1dc' : '#d5e8ff';
    ctx.fill();
    ctx.strokeStyle = '#111a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const creatureSize = Math.max(2, Math.min(cellW, cellH) * 0.35);
  for (const creature of world.creatures) {
    if (!creature.alive || creature.species !== 'grazer') continue;
    const p = worldToScreen(camera, creature.x + 0.5, creature.y + 0.5, viewport());
    ctx.fillStyle = '#f0c36a';
    ctx.fillRect(p.x - creatureSize / 2, p.y - creatureSize / 2, creatureSize, creatureSize);
    ctx.strokeStyle = '#111a';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - creatureSize / 2, p.y - creatureSize / 2, creatureSize, creatureSize);
  }

  drawSelection(cellW, cellH);
}

function drawSelection(cellW, cellH) {
  const target = resolveSelection();
  if (!target) return;
  const p = worldToScreen(camera, target.x, target.y, viewport());
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, Math.min(cellW, cellH) * 0.12);
  ctx.strokeRect(p.x + 1, p.y + 1, Math.max(0, cellW - 2), Math.max(0, cellH - 2));
}

function updateStats() {
  const s = summarizeWorld(world);
  stats.innerHTML = [
    `year: <strong>${s.year.toFixed(2)}</strong>`,
    `population: <strong>${s.population}</strong> · grazers: <strong>${s.grazers}</strong>`,
    `births / deaths: <strong>${s.births} / ${s.deaths}</strong>`,
    `creature meals / deaths: <strong>${s.creatureMeals} / ${s.creatureDeaths}</strong>`,
    `settlements: <strong>${s.activeSettlements}/${s.settlements} active</strong> · settled: <strong>${s.settledPopulation}</strong>`,
    `avg age: <strong>${s.averageAgeYears.toFixed(1)}</strong>`,
    `food remaining: <strong>${(s.foodUtilization * 100).toFixed(1)}%</strong>`,
    `vegetation: <strong>${(s.vegetationUtilization * 100).toFixed(1)}%</strong>`,
    `zoom: <strong>${camera.zoom.toFixed(2)}×</strong>`,
    `normalized seed: <strong>${s.seed}</strong>`
  ].join('<br>');
}

function updateInspector() {
  const target = resolveSelection();
  if (!target) {
    inspector.textContent = 'No selection';
    return;
  }

  if (target.kind === 'human') {
    const settlement = target.settlementId === null ? null : world.settlements.find((candidate) => candidate.id === target.settlementId);
    inspector.textContent = [
      `HUMAN #${target.id}`,
      `sex ${target.sex} · age ${(target.ageDays / world.config.daysPerYear).toFixed(1)}y`,
      `health ${(target.health * 100).toFixed(0)}% · hunger ${(target.hunger * 100).toFixed(0)}%`,
      `position ${target.x},${target.y}`,
      `settlement ${settlement ? `${settlement.name} (#${settlement.id})` : 'none'}`
    ].join('\n');
    return;
  }

  if (target.kind === 'creature') {
    inspector.textContent = [
      `${target.species.toUpperCase()} · CREATURE #${target.id}`,
      `age ${(target.ageDays / world.config.daysPerYear).toFixed(1)}y`,
      `health ${(target.health * 100).toFixed(0)}% · hunger ${(target.hunger * 100).toFixed(0)}%`,
      `position ${target.x},${target.y}`
    ].join('\n');
    return;
  }

  if (target.kind === 'settlement') {
    inspector.textContent = [
      `${target.name.toUpperCase()} · SETTLEMENT #${target.id}`,
      `founded year ${(target.foundedDay / world.config.daysPerYear).toFixed(2)}`,
      `state ${target.active ? 'active' : `abandoned year ${(target.abandonedDay / world.config.daysPerYear).toFixed(2)}`}`,
      `center ${target.x},${target.y}`,
      `population ${target.population}`,
      `members ${target.memberIds.length ? target.memberIds.slice(0, 12).join(', ') + (target.memberIds.length > 12 ? '…' : '') : 'none'}`
    ].join('\n');
    return;
  }

  inspector.textContent = [
    `TILE ${target.x},${target.y}`,
    `biome ${target.biome} · ${target.passable ? 'passable' : 'impassable'}`,
    `elevation ${target.elevation.toFixed(3)} · moisture ${target.moisture.toFixed(3)}`,
    `fertility ${target.fertility.toFixed(3)}`,
    `food ${target.food.toFixed(2)} / ${target.foodCapacity.toFixed(2)}`,
    `vegetation ${target.vegetation.toFixed(2)} / ${target.vegetationCapacity.toFixed(2)}`,
    `settlement candidate ${(target.settlementCandidateDays / world.config.daysPerYear).toFixed(2)}y`
  ].join('\n');
}

function updateHistoryTimeline() {
  const scope = historyScopeSelect.value;
  const order = historyOrderSelect.value;
  historyScopeLabel.textContent = timelineScopeLabel(scope, selection);
  const events = timelineEvents(world, { scope, selection, order });

  historyList.replaceChildren();
  if (events.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'history-empty';
    empty.textContent = scope === 'selection'
      ? 'No explicitly recorded events for this selection.'
      : 'No retained history events.';
    historyList.append(empty);
  } else {
    for (const event of events) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-event';
      button.dataset.eventId = String(event.id);
      button.textContent = formatHistoryEventLabel(event, world.config.daysPerYear);
      button.setAttribute('aria-current', event.id === selectedHistoryEventId ? 'true' : 'false');
      historyList.append(button);
    }
  }

  if (selectedHistoryEventId === null) {
    historyDetail.textContent = 'Select an event';
    return;
  }

  const selectedEvent = findHistoryEvent(world, selectedHistoryEventId);
  if (!selectedEvent) {
    historyDetail.textContent = [
      `EVENT #${selectedHistoryEventId}`,
      'not retained in bounded world history'
    ].join('\n');
    return;
  }
  historyDetail.textContent = formatHistoryEventDetail(world, selectedEvent, world.config.daysPerYear);
}

function resolveSelection() {
  if (!selection) return null;
  if (selection.kind === 'tile') return { kind: 'tile', ...tileAt(world, selection.x, selection.y) };
  if (selection.kind === 'human') {
    const human = world.entities.find((entity) => entity.kind === 'human' && entity.id === selection.id);
    return human ? { ...human, kind: 'human' } : null;
  }
  if (selection.kind === 'creature') {
    const creature = world.creatures.find((entity) => entity.kind === 'creature' && entity.id === selection.id);
    return creature ? { ...creature, kind: 'creature' } : null;
  }
  if (selection.kind === 'settlement') {
    const settlement = world.settlements.find((candidate) => candidate.id === selection.id);
    return settlement ? { ...settlement, kind: 'settlement' } : null;
  }
  return null;
}

function tileFromScreen(x, y) {
  return screenToTile(camera, x, y, viewport());
}

function viewport() {
  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    worldWidth: world.width,
    worldHeight: world.height
  };
}

function viewMetrics() {
  return {
    cellW: (canvas.width / world.width) * camera.zoom,
    cellH: (canvas.height / world.height) * camera.zoom
  };
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function deviceScale() {
  const rect = canvas.getBoundingClientRect();
  return canvas.width / Math.max(1, rect.width);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.floor(innerWidth * dpr);
  const height = Math.floor(innerHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

refreshHud();
requestAnimationFrame(frame);
