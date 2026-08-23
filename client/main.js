import { applyCommand } from '../engine/core/commands.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const stats = document.querySelector('#stats');
const pauseButton = document.querySelector('#pause');
const speedSelect = document.querySelector('#speed');
const seedInput = document.querySelector('#seed');

let world = makeWorld(seedInput.value);
let paused = false;
let lastStatsFrame = 0;

function makeWorld(seedToken) {
  const seed = /^[-+]?\d+$/.test(seedToken) ? Number(seedToken) : seedToken;
  return createWorld({ seed, width: 48, height: 32, population: 30 });
}

function reset() {
  world = makeWorld(seedInput.value.trim() || '42');
  updateStats();
}

document.querySelector('#reset').addEventListener('click', reset);
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * world.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * world.height);
  try {
    applyCommand(world, { type: 'spawn_human', x, y, count: event.shiftKey ? 10 : 1 });
    updateStats();
  } catch (error) {
    if (!/impassable/.test(String(error?.message))) throw error;
  }
});

function frame(timestamp) {
  resize();
  if (!paused) tickWorld(world, Number(speedSelect.value));
  drawWorld();
  if (timestamp - lastStatsFrame > 150) {
    updateStats();
    lastStatsFrame = timestamp;
  }
  requestAnimationFrame(frame);
}

function drawWorld() {
  const cellW = canvas.width / world.width;
  const cellH = canvas.height / world.height;

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
    ctx.fillRect(tile.x * cellW, tile.y * cellH, Math.ceil(cellW), Math.ceil(cellH));
  }

  const radius = Math.max(1.5, Math.min(cellW, cellH) * 0.25);
  for (const human of world.entities) {
    if (human.kind !== 'human') continue;
    ctx.beginPath();
    ctx.arc((human.x + 0.5) * cellW, (human.y + 0.5) * cellH, radius, 0, Math.PI * 2);
    ctx.fillStyle = human.sex === 'F' ? '#ffd1dc' : '#d5e8ff';
    ctx.fill();
    ctx.strokeStyle = '#111a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function updateStats() {
  const s = summarizeWorld(world);
  stats.innerHTML = [
    `year: <strong>${s.year.toFixed(2)}</strong>`,
    `population: <strong>${s.population}</strong>`,
    `births / deaths: <strong>${s.births} / ${s.deaths}</strong>`,
    `avg age: <strong>${s.averageAgeYears.toFixed(1)}</strong>`,
    `food remaining: <strong>${(s.foodUtilization * 100).toFixed(1)}%</strong>`,
    `normalized seed: <strong>${s.seed}</strong>`
  ].join('<br>');
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

updateStats();
requestAnimationFrame(frame);
