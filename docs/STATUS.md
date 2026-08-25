# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is at the release checkpoint.** The gameplay implementation backlog is frozen; this release branch contains only version/release documentation and the package version that triggers the release workflow when merged.

The next product-development stage is **v0.5.0 — World Stories**. No v0.5 gameplay/story feature code belongs in the v0.4 release PR.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

God powers act only through authoritative commands. Presentation owns target previews, generated FX/SFX, accepted/no-effect wording and Chronicle projection; it does not maintain a second world model.

v0.4 intentionally stops at six powers: Human, Grazer, Erase, Lightning, Meteor and Rain.

## v0.4 release evidence

- Meteor #202 and Rain #204 merged after normal CI + real Chromium interaction review;
- final implementation gate #206 merged after full CI + interactive Chromium and froze gameplay scope;
- merged final implementation `main` passes CI and interactive Chromium before release handoff;
- canonical browser gate pauses seed45 year 40, uses real pointer input for Meteor then Rain on tile 15,13 and verifies truthful authoritative deltas;
- evidence records vegetation `189.077 → 0 → 189.077/189.077` and food `163.212 → 165.464/165.464` across all 25 passable footprint tiles;
- World Chronicle keeps `Rain renews 15,13` followed by `Meteor devastates 15,13`;
- headless product gate uses real engine commands and requires deterministic damage→recovery, non-resurrection, stable terrain/capacities/RNG and causal event order;
- release notes and canonical browser QA live in `docs/releases/v0.4.0.md` and `docs/demos/v0.4.0.md`.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction remains allowed; no hidden survival controller.
- Civilization depth remains paused after v0.3.
- Ecology research remains deferred until v0.6.
- v0.4 stops at six visible powers; do not add a seventh during release handoff.
- No generic power/disaster framework unless a later shipped capability proves it necessary.
- v0.5 should strengthen game-facing causal memory rather than reopen power, ecology or civilization breadth.

## Current decision gate

1. require final merged-implementation `main` CI, Pages and Chromium success;
2. merge the **release-only** v0.4 PR: package 0.4.0, release notes, canonical demo/QA and README/ROADMAP/STATUS handoff;
3. verify tag/release `v0.4.0` plus final CI, Chromium and public Pages `/play/` deployment;
4. close release gate #200;
5. only then open a finite v0.5 World Stories release gate/backlog and start the smallest causal-story slice.
