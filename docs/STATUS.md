# Project status

Last updated: 2026-08-25

## Management state

**v0.3.0 — Civilizations Rise is at the release checkpoint.** The implementation backlog is closed; this release branch contains only version/release documentation and the package version that triggers the tag/release workflow when merged.

The next product-development stage is **v0.4.0 — God Power Sandbox**. No v0.4 gameplay code belongs in the v0.3 release PR.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events. Phaser projects this state and never becomes a second authoritative world.

The v0.3 story surface is presentation-only over authoritative causal history. It turns founding, succession, war/peace, battle, conquest and rebellion into readable Chronicle entries and high-value pulses without inventing canonical facts.

## v0.3 release evidence

- default seed45 by year 40 independently produces multiple powers with rulers, war, multiple engagements, conquest and rebellion;
- deterministic collision gate uses real engine systems and passes reproducibly;
- Chronicle selection keeps war/battle/outcome history visible despite frequent ruler churn;
- merged v0.3 implementation passed PR CI/Chromium and is being re-verified on `main` before the release PR is merged;
- release notes and canonical browser QA live in `docs/releases/v0.3.0.md` and `docs/demos/v0.3.0.md`.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction is allowed; no hidden survival controller.
- Civilization depth is paused after v0.3; do not turn WorldBoxSR into a strategy-game feature race.
- Ecology research remains frozen until v0.6.
- v0.4 should strengthen the satisfying god-hand loop and its causal consequences, not reopen v0.3 mechanics.

## Current decision gate

1. require merged-`main` CI, Pages and Chromium success for the v0.3 implementation;
2. merge the minimal v0.3 release PR;
3. verify tag/release `v0.3.0` plus final Pages deployment;
4. close release gate #181;
5. open a finite v0.4 backlog around the smallest coherent God Power Sandbox slice.
