import Phaser from 'phaser';
import { EntityLayer } from './presentation/entity_layer.js';
import { playToolEffect } from './presentation/effects_layer.js';
import { SettlementLayer } from './presentation/settlement_layer.js';
import { createTerrainLayer, renderTerrain } from './presentation/terrain_layer.js';
import {
  advanceWorld,
  applyGodTool,
  createShowcaseWorld,
  evolveShowcaseWorld,
  selectionAt,
  SHOWCASE,
  worldSummary,
  worldView
} from './presentation/world_adapter.js';

const TILE_SIZE = 28;
const STEP_INTERVAL_MS = 110;

const seedInput = document.querySelector('#seed');
const resetButton = document.querySelector('#reset');
const resetCameraButton = document.querySelector('#reset-camera');
const pauseButton = document.querySelector('#pause');
const speedSelect = document.querySelector('#speed');
const toolSelect = document.querySelector('#tool');
const stats = document.querySelector('#stats');
const inspector = document.querySelector('#inspector');
const historyScopeLabel = document.querySelector('#history-scope-label');
const historyList = document.querySelector('#history-list');
const historyDetail = document.querySelector('#history-detail');
const bootStatus = document.querySelector('#boot-status');
const eventToast = document.querySelector('#event-toast');

if (bootStatus) bootStatus.textContent = 'Phaser 4 · module loaded · starting scene…';

class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
    this.world = null;
    this.view = null;
    this.terrain = null;
    this.entities = null;
    this.settlements = null;
    this.paused = false;
    this.booting = false;
    this.worldGeneration = 0;
    this.nextStepAt = 0;
    this.lastHudAt = 0;
    this.drag = null;
  }

  create() {
    try {
      if (bootStatus) bootStatus.textContent = 'Phaser 4 · scene created · preparing world…';
      this.entities = new EntityLayer(this, TILE_SIZE);
      this.settlements = new SettlementLayer(this, TILE_SIZE);
      this.bindInput();
      this.bindDom();
      this.game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
      this.resetWorld();
    } catch (error) {
      this.reportRendererFailure(error);
      throw error;
    }
  }

  update(time) {
    if (!this.world || !this.entities) return;

    if (!this.booting && !this.paused && time >= this.nextStepAt) {
      const days = Math.max(1, Number(speedSelect?.value || 10));
      advanceWorld(this.world, days);
      this.syncWorld(time);
      this.nextStepAt = time + STEP_INTERVAL_MS;
    }

    this.entities.update(time);

    if (time - this.lastHudAt > 220) {
      this.refreshHud();
      this.lastHudAt = time;
    }
  }

  resetWorld() {
    const token = ++this.worldGeneration;
    const seed = seedInput?.value?.trim() || String(SHOWCASE.defaultSeed);
    if (seedInput && !seedInput.value.trim()) seedInput.value = String(SHOWCASE.defaultSeed);

    this.booting = true;
    this.world = createShowcaseWorld(seed);
    this.view = worldView(this.world);

    if (this.terrain) this.terrain.destroy();
    this.settlements.destroy();
    this.entities.destroy();

    this.terrain = createTerrainLayer(this, this.view, TILE_SIZE);
    this.settlements.sync(this.view);
    this.entities.sync(this.view, this.time.now, 0);
    this.resetCamera();
    this.refreshHud();
    this.refreshChronicle();

    if (bootStatus) bootStatus.textContent = `Phaser 4 · authoritative simulation · evolving showcase 0/${SHOWCASE.warmupYears}y`;
    this.showToast(`World ${seed} · evolving toward showcase`);

    window.setTimeout(() => { void this.finishShowcaseWarmup(token, seed); }, 0);
  }

  async finishShowcaseWarmup(token, seed) {
    try {
      await evolveShowcaseWorld(this.world, {
        onProgress: ({ year, targetYear }) => {
          if (token !== this.worldGeneration) return;
          if (bootStatus) bootStatus.textContent = `Phaser 4 · authoritative simulation · evolving showcase ${year.toFixed(0)}/${targetYear}y`;
          if (Math.round(year) % 4 === 0 || year >= targetYear) this.syncWorld(this.time.now);
        }
      });

      if (token !== this.worldGeneration) return;
      this.syncWorld(this.time.now);
      this.booting = false;
      this.nextStepAt = this.time.now + STEP_INTERVAL_MS;
      if (bootStatus) bootStatus.textContent = 'Phaser 4 · authoritative simulation · showcase ready';
      this.showToast(`World ${seed} · showcase ready at year ${SHOWCASE.warmupYears}`);
    } catch (error) {
      if (token !== this.worldGeneration) return;
      this.booting = false;
      this.reportRendererFailure(error);
      console.error(error);
    }
  }

  syncWorld(now) {
    if (!this.world || !this.terrain) return;
    this.view = worldView(this.world);
    renderTerrain(this.terrain, this.view, TILE_SIZE);
    this.settlements.sync(this.view);
    this.entities.sync(this.view, now, Math.min(180, STEP_INTERVAL_MS * 1.3));
    this.refreshChronicle();
  }

  resetCamera() {
    if (!this.view) return;
    const worldWidth = this.view.width * TILE_SIZE;
    const worldHeight = this.view.height * TILE_SIZE;
    const camera = this.cameras.main;
    camera.setBounds(0, 0, worldWidth, worldHeight);
    const fitX = Math.max(0.55, (this.scale.width - 40) / worldWidth);
    const fitY = Math.max(0.55, (this.scale.height - 130) / worldHeight);
    camera.setZoom(Math.min(1.45, fitX, fitY));
    camera.centerOn(worldWidth / 2, worldHeight / 2);
  }

  bindInput() {
    this.input.on('pointerdown', (pointer) => {
      if (!pointer.leftButtonDown()) return;
      this.drag = { startX: pointer.x, startY: pointer.y, lastX: pointer.x, lastY: pointer.y, moved: false };
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.drag || !pointer.isDown) return;
      const dx = pointer.x - this.drag.lastX;
      const dy = pointer.y - this.drag.lastY;
      const total = Math.hypot(pointer.x - this.drag.startX, pointer.y - this.drag.startY);
      if (total > 5) this.drag.moved = true;
      if (this.drag.moved) {
        const camera = this.cameras.main;
        camera.scrollX -= dx / camera.zoom;
        camera.scrollY -= dy / camera.zoom;
      }
      this.drag.lastX = pointer.x;
      this.drag.lastY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
      const drag = this.drag;
      this.drag = null;
      if (!drag || drag.moved || !this.world) return;
      const tile = this.pointerTile(pointer);
      if (!tile) return;
      if (pointer.event?.altKey || pointer.rightButtonReleased()) {
        this.inspectTile(tile.x, tile.y);
        return;
      }
      if (this.booting) {
        this.showToast('World is still evolving into the showcase…');
        return;
      }
      const count = pointer.event?.shiftKey ? 10 : 1;
      this.useTool(tile.x, tile.y, count);
    });

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const camera = this.cameras.main;
      const factor = Math.exp(-deltaY * 0.0013);
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * factor, 0.55, 2.6));
    });
  }

  bindDom() {
    resetButton?.addEventListener('click', () => this.resetWorld());
    resetCameraButton?.addEventListener('click', () => this.resetCamera());
    pauseButton?.addEventListener('click', () => {
      this.paused = !this.paused;
      pauseButton.textContent = this.paused ? '▶ Play' : 'Ⅱ Pause';
      pauseButton.dataset.active = this.paused ? 'true' : 'false';
    });
  }

  pointerTile(pointer) {
    if (!this.view) return null;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const x = Math.floor(point.x / TILE_SIZE);
    const y = Math.floor(point.y / TILE_SIZE);
    if (x < 0 || y < 0 || x >= this.view.width || y >= this.view.height) return null;
    return { x, y };
  }

  useTool(x, y, count) {
    try {
      const result = applyGodTool(this.world, toolSelect?.value || 'spawn_human', x, y, count);
      playToolEffect(this, result.effect, x, y, TILE_SIZE);
      this.syncWorld(this.time.now);
      this.inspectTile(x, y);
      this.showToast(toolMessage(result.effect, count));
    } catch (error) {
      if (/impassable/i.test(String(error?.message))) {
        this.showToast('That power needs passable land');
        return;
      }
      console.error(error);
      this.showToast(`Power failed: ${error?.message || error}`);
    }
  }

  inspectTile(x, y) {
    const selection = selectionAt(this.world, x, y);
    if (!selection || !inspector) return;

    const target = selection.value;
    if (selection.kind === 'human') {
      inspector.textContent = [
        `Human #${target.id}`,
        `${target.sex === 'F' ? 'female' : 'male'} · age ${(target.ageDays / this.world.config.daysPerYear).toFixed(1)}y`,
        `health ${(target.health * 100).toFixed(0)}% · hunger ${(target.hunger * 100).toFixed(0)}%`,
        `tile ${target.x},${target.y} · settlement ${target.settlementId ?? 'none'}`
      ].join('\n');
      return;
    }

    if (selection.kind === 'creature') {
      inspector.textContent = [
        `Grazer #${target.id}`,
        `age ${(target.ageDays / this.world.config.daysPerYear).toFixed(1)}y`,
        `health ${(target.health * 100).toFixed(0)}% · hunger ${(target.hunger * 100).toFixed(0)}%`,
        `tile ${target.x},${target.y}`
      ].join('\n');
      return;
    }

    if (selection.kind === 'settlement') {
      const polity = Number.isInteger(target.polityId)
        ? this.world.polities.find((candidate) => candidate.id === target.polityId)
        : null;
      inspector.textContent = [
        target.name,
        `${target.active ? 'active settlement' : 'abandoned settlement'} · population ${target.population}`,
        polity ? `♛ ${polity.name}${polity.capitalSettlementId === target.id ? ' · capital' : ''}` : 'no polity',
        `founded year ${(target.foundedDay / this.world.config.daysPerYear).toFixed(1)}`,
        `center ${target.x},${target.y}`
      ].join('\n');
      return;
    }

    inspector.textContent = [
      `Tile ${target.x},${target.y}`,
      `${target.biome} · ${target.passable ? 'passable' : 'impassable'}`,
      `elevation ${target.elevation.toFixed(2)} · moisture ${target.moisture.toFixed(2)}`,
      `vegetation ${target.vegetation.toFixed(2)} / ${target.vegetationCapacity.toFixed(2)}`
    ].join('\n');
  }

  refreshHud() {
    if (!stats || !this.world) return;
    const summary = worldSummary(this.world);
    const activePolities = this.world.polities.filter((polity) => polity.active).length;
    stats.innerHTML = [
      `<span><b>Year ${summary.year.toFixed(1)}</b></span>`,
      `<span>👤 ${summary.population}</span>`,
      `<span>🐾 ${summary.grazers}</span>`,
      `<span>♛ ${activePolities}</span>`,
      `<span>⌂ ${summary.activeSettlements}</span>`
    ].join('');
  }

  refreshChronicle() {
    if (!historyList || !historyScopeLabel || !this.world) return;
    historyScopeLabel.textContent = 'World chronicle';
    const rows = this.world.history.slice(-7).reverse();
    historyList.innerHTML = rows.length
      ? rows.map((event) => {
          const year = Number.isFinite(event.day) ? (event.day / this.world.config.daysPerYear).toFixed(1) : '?';
          return `<button class="history-event" type="button" data-event-id="${event.id}">Y${year} · ${escapeHtml(event.type)}</button>`;
        }).join('')
      : '<div id="history-empty">No recorded events yet</div>';

    historyList.querySelectorAll('button[data-event-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const event = this.world.history.find((candidate) => String(candidate.id) === button.dataset.eventId);
        if (historyDetail) historyDetail.textContent = event ? describeEvent(event, this.world.config.daysPerYear) : 'Event unavailable';
      });
    });
  }

  showToast(message) {
    if (!eventToast) return;
    eventToast.textContent = message;
    eventToast.dataset.visible = 'true';
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { eventToast.dataset.visible = 'false'; }, 1500);
  }

  reportRendererFailure(error) {
    const message = error?.stack || error?.message || String(error);
    if (bootStatus) bootStatus.textContent = `Renderer failed: ${message}`;
    this.showToast(`Renderer failed: ${error?.message || error}`);
  }
}

let game;
try {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-root',
    backgroundColor: '#0a1118',
    pixelArt: true,
    roundPixels: true,
    render: { antialias: false, roundPixels: true },
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [WorldScene]
  });
  globalThis.__PHASER_GAME__ = game;
} catch (error) {
  if (bootStatus) bootStatus.textContent = `Renderer failed: ${error?.stack || error?.message || error}`;
  console.error(error);
  throw error;
}

function toolMessage(effect, count) {
  if (effect === 'lightning') return '⚡ Lightning struck';
  if (effect === 'erase') return '✕ Erase applied';
  if (effect === 'spawn_grazer') return `🐾 Spawned ${count} grazer${count === 1 ? '' : 's'}`;
  return `✦ Spawned ${count} human${count === 1 ? '' : 's'}`;
}

function describeEvent(event, daysPerYear) {
  const year = Number.isFinite(event.day) ? (event.day / daysPerYear).toFixed(2) : '?';
  const payload = event.payload && Object.keys(event.payload).length ? `\n${JSON.stringify(event.payload, null, 2)}` : '';
  return `#${event.id} · ${event.type}\nyear ${year}${payload}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
