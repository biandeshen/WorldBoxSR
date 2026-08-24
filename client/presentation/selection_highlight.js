export function selectionDescriptor(selection) {
  if (!selection || typeof selection.kind !== 'string' || !selection.value) return null;
  if (selection.kind === 'tile') {
    return { kind: 'tile', x: selection.value.x, y: selection.value.y };
  }
  if (!Number.isInteger(selection.value.id)) return null;
  return { kind: selection.kind, id: selection.value.id };
}

export function resolveSelection(view, descriptor) {
  if (!view || !descriptor) return null;
  if (descriptor.kind === 'tile') {
    const tile = view.tiles?.find((candidate) => candidate.x === descriptor.x && candidate.y === descriptor.y);
    return tile ? { kind: 'tile', x: tile.x, y: tile.y } : null;
  }

  const collection = descriptor.kind === 'human'
    ? view.humans
    : descriptor.kind === 'creature'
      ? view.grazers
      : descriptor.kind === 'settlement'
        ? view.settlements
        : null;
  const target = collection?.find((candidate) => candidate.id === descriptor.id);
  return target ? { kind: descriptor.kind, x: target.x, y: target.y, id: target.id } : null;
}

export function selectionColor(kind) {
  if (kind === 'human') return 0x8ad6ff;
  if (kind === 'creature') return 0xf0bf68;
  if (kind === 'settlement') return 0xffdf79;
  return 0xffffff;
}
