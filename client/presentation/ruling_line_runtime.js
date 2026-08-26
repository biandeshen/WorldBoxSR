import { rulingLinePresentation } from './ruling_line_presentation.js';

const RUNTIME_FLAG = 'rulingLineRuntime';
const LINE_PREFIX = 'ruling line ';
const TRANSITION_PREFIXES = ['bloodline continued', 'new ruling line', 'founding line'];

export function installRulingLineInspectorRuntime() {
  const inspector = document.querySelector('#inspector');
  if (!inspector || inspector.dataset[RUNTIME_FLAG] === 'true') return false;

  inspector.dataset[RUNTIME_FLAG] = 'true';
  let applying = false;

  const enhance = () => {
    if (applying) return;
    const scene = globalThis.__PHASER_GAME__?.scene?.getScene?.('world');
    const world = scene?.world;
    if (!world) return;

    const original = String(inspector.textContent ?? '');
    const baseLines = original
      .split('\n')
      .filter((line) => line && !line.startsWith(LINE_PREFIX) && !TRANSITION_PREFIXES.some((prefix) => line.startsWith(prefix)));
    const target = inspectorTarget(world, baseLines);
    if (!target?.polity) return;

    const projection = rulingLinePresentation(world, target.polity);
    if (!projection || !projection.lineText) return;

    const additions = [projection.lineText];
    if (projection.transitionText) additions.push(projection.transitionText);
    const insertAt = Math.min(baseLines.length, Math.max(0, target.insertAfter + 1));
    const desiredLines = [
      ...baseLines.slice(0, insertAt),
      ...additions,
      ...baseLines.slice(insertAt)
    ];
    const desired = desiredLines.join('\n');
    if (desired === original) return;

    applying = true;
    inspector.textContent = desired;
    applying = false;
  };

  const observer = new MutationObserver(enhance);
  observer.observe(inspector, { childList: true, subtree: true, characterData: true });
  enhance();
  return true;
}

function inspectorTarget(world, lines) {
  if (!Array.isArray(lines) || lines.length < 1) return null;

  const humanMatch = /^Human #(\d+)$/u.exec(lines[0]);
  if (humanMatch) {
    const humanId = Number(humanMatch[1]);
    const human = world.entities?.find((candidate) => candidate?.kind === 'human' && candidate.id === humanId) ?? null;
    const settlement = Number.isInteger(human?.settlementId)
      ? world.settlements?.find((candidate) => candidate.id === human.settlementId) ?? null
      : null;
    const polity = Number.isInteger(settlement?.polityId)
      ? world.polities?.find((candidate) => candidate.id === settlement.polityId) ?? null
      : null;
    if (!polity || polity.rulerId !== humanId) return null;
    return { polity, insertAfter: lines.findIndex((line) => line.startsWith('♛ ruler of ')) };
  }

  const centerIndex = lines.findIndex((line) => /^center \d+,\d+$/u.test(line));
  if (centerIndex < 0) return null;
  const centerMatch = /^center (\d+),(\d+)$/u.exec(lines[centerIndex]);
  const x = Number(centerMatch?.[1]);
  const y = Number(centerMatch?.[2]);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  const settlement = world.settlements?.find((candidate) => candidate.x === x && candidate.y === y) ?? null;
  const polity = Number.isInteger(settlement?.polityId)
    ? world.polities?.find((candidate) => candidate.id === settlement.polityId) ?? null
    : null;
  if (!polity) return null;
  const rulerIndex = lines.findIndex((line) => line.startsWith('♔ ruler '));
  return { polity, insertAfter: rulerIndex >= 0 ? rulerIndex : 2 };
}
