# Project status

Last updated: 2026-08-25

## Management state

The project is in **v0.3.0 — Civilizations Rise**. Release gate: #181. Finite backlog: `docs/backlog/v0.3.md`.

v0.2.0 — Playable World is closed and tagged. It established the Phaser/Vite public product path, real Chromium visual evidence, player-readable terrain/units/settlements, direct god powers, authoritative territory, persistent inspection, event pulse and executable showcase gates.

## Current authoritative capability

`main` preserves the deterministic living-world engine: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements/territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events. The browser product projects this state through Phaser; presentation never becomes a second authoritative world.

The first v0.3 slice adds **polity identity** as an authoritative domain attached to settlements: stable id/name/capital/membership, deterministic color/banner identity, lifecycle history and snapshot support. Formation consumes no simulation RNG.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction is allowed; no hidden survival controller.
- Ecology research remains frozen until the roadmap returns to Living Ecology (currently v0.6).
- v0.3 does not expand into trade/economy/religion/technology or sophisticated tactics.
- The old Canvas renderer is a v0.2 regression escape hatch, not the v0.3 product path.

## Preserved research evidence

Grazer persistence/initialization research and rejected compact-world hypotheses remain durable in `docs/experiments/` and prior sprint docs. They are evidence for the later ecology stage, not current blockers.

## Current decision gate

Complete #182 polity identity with full deterministic/save-load CI and real Chromium evidence. Then proceed in order: ruler/succession → relations/war state → visible conflict → conquest/rebellion → canonical two-powers collision gate.

Ship coherent slices; do not confuse “there is more to model” with “the current visible capability cannot advance.”
