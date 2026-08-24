const POLITY_COLORS = [
  0xd85f55,
  0x5e8bd8,
  0xe1b453,
  0x6eb878,
  0x9a72cc,
  0xd679b0,
  0x58b8b0,
  0xd07d4e
];

export function polityColor(colorIndex) {
  const index = Number.isInteger(colorIndex) ? colorIndex : 0;
  return POLITY_COLORS[((index % POLITY_COLORS.length) + POLITY_COLORS.length) % POLITY_COLORS.length];
}

export function polityColorCount() {
  return POLITY_COLORS.length;
}
