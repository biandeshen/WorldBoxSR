# Project status

Last updated: 2026-08-25

## Management state

The project is in **v0.3.0 — Civilizations Rise**. Release gate: #181. Finite backlog: `docs/backlog/v0.3.md`.

v0.2.0 — Playable World is closed and tagged. The first v0.3 slice (#182) is merged: settlements now form authoritative named polities with capitals, political colors/banners, lifecycle history, polity-aware territory and snapshot v12 migration.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events. Phaser projects this state and never becomes a second authoritative world.

Current slice #184 adds **real-human rulers and deterministic succession**. Eligible rulers are living adults belonging to polity settlements; selection is oldest-first with stable ID tie break and consumes no simulation RNG. Death can cause a recorded succession or honest vacancy.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction is allowed; no hidden survival controller.
- Ecology research remains frozen until v0.6.
- v0.3 does not expand into trade/economy/religion/technology or sophisticated tactics.
- Rulers are real humans, not separate decorative NPCs.

## Current decision gate

Complete #184 with deterministic succession/save-load CI and Chromium evidence. Once the ruler contract is stable, relations/war-state can proceed in an independent engine lane over polity IDs.
