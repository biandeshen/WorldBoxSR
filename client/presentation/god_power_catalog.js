const POWERS = Object.freeze({
  spawn_human: Object.freeze({
    id: 'spawn_human', label: 'Create humans', shortLabel: 'Human', shortcut: '1', category: 'creation', targetRadius: 0,
    targetColor: 0x8ad6ff, targetFillAlpha: 0.11, requiresPassable: true
  }),
  spawn_grazer: Object.freeze({
    id: 'spawn_grazer', label: 'Create grazers', shortLabel: 'Grazer', shortcut: '2', category: 'creation', targetRadius: 0,
    targetColor: 0xf0bf68, targetFillAlpha: 0.11, requiresPassable: true
  }),
  erase: Object.freeze({
    id: 'erase', label: 'Erase humans', shortLabel: 'Erase', shortcut: '3', category: 'destruction', targetRadius: 0,
    targetColor: 0xff6f6f, targetFillAlpha: 0.09, requiresPassable: false
  }),
  lightning: Object.freeze({
    id: 'lightning', label: 'Lightning', shortLabel: 'Lightning', shortcut: '4', category: 'destruction', targetRadius: 0,
    targetColor: 0xffdf68, targetFillAlpha: 0.13, requiresPassable: false
  }),
  meteor: Object.freeze({
    id: 'meteor', label: 'Meteor · radius 2', shortLabel: 'Meteor', shortcut: '5', category: 'destruction', targetRadius: 2,
    targetColor: 0xff8b55, targetFillAlpha: 0.14, requiresPassable: false
  }),
  rain: Object.freeze({
    id: 'rain', label: 'Rain · radius 2', shortLabel: 'Rain', shortcut: '6', category: 'restoration', targetRadius: 2,
    targetColor: 0x6ed4ff, targetFillAlpha: 0.13, requiresPassable: false
  })
});

const ORDER = Object.freeze(['spawn_human', 'spawn_grazer', 'erase', 'lightning', 'meteor', 'rain']);
const SHORTCUTS = Object.freeze(Object.fromEntries(ORDER.map((id) => [POWERS[id].shortcut, id])));

export function godPowerMeta(id) {
  return POWERS[id] ?? POWERS.spawn_human;
}

export function godPowerIds() {
  return [...ORDER];
}

export function godPowerForShortcut(key) {
  return SHORTCUTS[String(key)] ?? null;
}

export function godPowerTargetRadius(id) {
  return godPowerMeta(id).targetRadius;
}
