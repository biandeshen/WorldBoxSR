# Project status

Last updated: 2026-08-25

## Management state

The project is in **v0.4.0 — God Power Sandbox release-candidate handoff**. Release gate: #200. Finite backlog: `docs/backlog/v0.4.md`.

v0.3.0 — Civilizations Rise is shipped. v0.4 gameplay implementation now consists of two deliberately bounded vertical slices plus one final product-gate consolidation:

- Meteor — destructive radius-2 intervention with authoritative cross-kind mortality, vegetation removal, truthful no-effect, strong accessible feedback and World Chronicle memory;
- Rain — constructive radius-2 restoration of existing food/vegetation capacities with truthful saturation/no-effect, accessible feedback and World Chronicle memory;
- God Power product gate — shared presentation metadata/outcome contract plus deterministic headless Meteor→Rain verification and real browser interaction evidence.

No seventh power belongs in the v0.4 implementation scope.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

God powers act only through authoritative commands. Presentation owns target previews, generated FX/SFX, outcome wording and Chronicle projection; it does not maintain a second world model.

Meteor and Rain share a radius-2 targeting contract while keeping opposite semantic effects:
- Meteor clears vegetation and kills in-footprint humans/grazers through lifecycle authority;
- Rain restores existing food/vegetation capacity without changing climate, terrain, capacities, identity or politics and without resurrecting life.

## v0.4 evidence

- Meteor #202 and Rain #204 both merged after normal CI + real Chromium interaction review;
- merged Rain `main` passes CI, Pages and interactive Chromium;
- canonical interactive seed45 gate pauses year 40, uses real browser pointer input to strike tile 15,13 with Meteor, then restore the same footprint with Rain;
- evidence verifies vegetation 189.077 → 0 → 189.077/189.077 and food 163.212 → 165.464/165.464 across all 25 passable tiles;
- final Chronicle keeps `Rain renews 15,13` followed by `Meteor devastates 15,13`;
- headless product gate in #206 uses real engine commands and requires deterministic damage→recovery, non-resurrection, stable terrain/capacities/RNG and causal event order.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Natural coherent collapse/extinction remains allowed; no hidden survival controller.
- Civilization depth remains paused after v0.3.
- Ecology research remains deferred until v0.6.
- v0.4 stops at six visible powers; do not turn release handoff into feature accumulation.
- No generic power/disaster framework unless a later shipped capability proves it necessary.

## Current decision gate

1. finish #206 CI + Chromium and merge the final implementation gate;
2. verify merged `main` CI, Pages and Chromium;
3. open a **release-only** v0.4 PR: package 0.4.0, release notes, canonical demo/QA, README/ROADMAP/STATUS version handoff;
4. verify tag/release `v0.4.0` plus final public Pages deployment;
5. close #200;
6. only then begin v0.5 World Stories planning.
