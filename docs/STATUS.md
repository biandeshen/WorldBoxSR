# Project status

Last updated: 2026-08-25

## Management state

The project is in **v0.3.0 — Civilizations Rise release-candidate handoff**. Release gate: #181. Finite backlog: `docs/backlog/v0.3.md`.

v0.2.0 — Playable World is closed and tagged. The complete v0.3 civilization implementation is now assembled in #198 after the polity, ruler, relations, visible conflict, and political-outcome slices were merged independently.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events. Phaser projects this state and never becomes a second authoritative world.

The v0.3 story surface is presentation-only over authoritative causal history. It turns founding, succession, war/peace, battle, conquest and rebellion into readable Chronicle entries and high-value pulses without inventing canonical facts. A cursor prevents old warmup events from being replayed as newly occurring events.

## Canonical evidence

- deterministic collision gate uses real engine polity/ruler/relation/warband/conquest systems and passes reproducibly;
- default seed45 by year 40 independently produces multiple powers with rulers, a war, multiple engagements, conquest and rebellion;
- Chronicle selection prevents ruler churn from crowding war/battle/outcome history out of the player-visible story;
- the final code head after removing the temporary seed45 probe passes both CI and Chromium Visual QA;
- rendered DOM shows player-readable default-showcase entries including rebellion, peace, conquest and army destruction.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction is allowed; no hidden survival controller.
- Ecology research remains frozen until v0.6.
- v0.3 does not expand into trade/economy/religion/technology or sophisticated tactics.
- Rulers are real humans, not separate decorative NPCs.
- Civilization depth stops at the v0.3 release gate; do not turn the project into a strategy-game feature race.

## Current decision gate

Merge #198, verify the merged `main` player surface, then perform a minimal v0.3 release PR: version/release notes/current-release documentation only. After v0.3 ships, the roadmap moves to **v0.4 God Power Sandbox**, restoring focus to satisfying intervention and its visible causal consequences rather than adding more civilization depth.
