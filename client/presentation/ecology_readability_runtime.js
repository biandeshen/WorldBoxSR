import { creatureBehaviorLabel, livingEcologyVegetationHud } from './ecology_readability.js';
import { showcasePresetForWorld, worldSummary } from './world_adapter.js';

if (document.documentElement.dataset.renderer === 'phaser') attachWhenReady();

function attachWhenReady() {
  const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
  const inspector = document.querySelector('#inspector');
  const stats = document.querySelector('#stats');
  if (!scene?.world || !inspector || !stats) {
    window.setTimeout(attachWhenReady, 30);
    return;
  }

  const inspectorObserver = new MutationObserver(() => renderInspectorBehavior(scene, inspector));
  inspectorObserver.observe(inspector, { childList: true, characterData: true, subtree: true });
  const statsObserver = new MutationObserver(() => renderVegetationHud(scene, stats));
  statsObserver.observe(stats, { childList: true, characterData: true, subtree: true });

  renderInspectorBehavior(scene, inspector);
  renderVegetationHud(scene, stats);
}

function renderInspectorBehavior(scene, inspector) {
  const current = inspector.textContent ?? '';
  const lines = current.split('\n').filter((line) => !line.startsWith('behavior '));
  const match = /^(Grazer|Wolf) #(\d+)$/.exec(lines[0] ?? '');
  if (!match) return;

  const creatureId = Number(match[2]);
  const creature = scene.world?.creatures?.find((candidate) => candidate.alive && candidate.id === creatureId);
  if (!creature) return;
  const behavior = creatureBehaviorLabel(creature, scene.world.config);
  if (!behavior) return;

  const desired = [lines[0], `behavior ${behavior}`, ...lines.slice(1)].join('\n');
  if (desired !== current) inspector.textContent = desired;
}

function renderVegetationHud(scene, stats) {
  const summary = worldSummary(scene.world);
  const text = livingEcologyVegetationHud(summary, showcasePresetForWorld(scene.world));
  const existing = stats.querySelector('[data-ecology-vegetation]');
  if (!text) {
    existing?.remove();
    return;
  }
  if (existing) {
    if (existing.textContent !== text) existing.textContent = text;
    return;
  }
  const span = document.createElement('span');
  span.dataset.ecologyVegetation = 'true';
  span.textContent = text;
  span.title = 'Current world vegetation utilization';
  stats.append(span);
}
