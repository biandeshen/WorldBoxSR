# Project status

Last updated: 2026-08-28

## Management state

**v1.0.0 — Stable Sandbox Identity is shipped and immutable.**

Immutable release identity:
- implementation freeze `efecf1e91ac88177ce82917c1312577927e26af6`;
- release commit `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- annotated tag object `75e89c559e91cb0128fb35a79bd32c6fa84f02cf` → exact release commit;
- release workflow #14, CI #948, Pages #96/public `/play/`, full historical visual #436 green;
- tagged-release stable-sandbox artifact complete.

The v1.0 compatibility/support contract remains the baseline for future development. Published v1.0.0 and older tags never move.

**v1.1 — Settlement Life & Food Reserves is the active finite product stage. Planning is complete; Capability 1/#328 is the single implementation lane.**

Primary fantasy:

> **A settlement turns the food around it into visible reserves; residents can survive short local shortages from those reserves, and the player can watch scarcity or recovery emerge from the same ecology and God interventions.**

Finite backlog: `docs/backlog/v1.1.md`.
Direction gate: #326.
Capability 1: #328.
UI/UX owning direction: `docs/product/ui-ux-north-star.md`.

## Product/UI direction now explicit

The project now has two distinct planning horizons:

1. **Frozen near-term execution:** v1.1 remains exactly three ordered capabilities, with #328 first.
2. **Provisional V1.x north star:** later directions cover world shaping, migration/settlement dynamics, civilization identity, bounded production/exchange, politics/conflict consequences, deep history, Creator/Scenario 2.0 and final V1 scale/polish. These are directional hypotheses only; none is an open implementation lane until a future evidence gate selects it.

The UI/UX north star does not authorize a standalone visual rewrite. Frontend/interaction improvements should land through bounded player-visible slices unless evidence shows the shell itself is the bottleneck.

### Runtime interface target

The long-term shell is:

- compact **Top HUD** for world identity/time/global facts;
- **Left Tool Dock** for Inspect/God Powers/spawn/world actions;
- world-first central canvas;
- contextual **Right Inspector** using truthful shared projections;
- compact/collapsible **Chronicle tray** for recent meaningful history;
- navigation/mini-map/layers when scale/readability justifies them;
- touch composition using drawers/bottom sheets rather than squeezing desktop panels into 430×820.

Primary product navigation target: World, Settlements, Civilizations, Stories, Scenarios, Encyclopedia, Settings. Empty future pages are explicitly disallowed.

## Post-1.0 audit decision

Weighted candidate result:
- settlement material life / food reserves: **8.5/10** — selected;
- conflict consequence depth: **7.85/10**;
- terrain/biome shaping: **7.6/10**;
- culture/technology/religion identity: **5.95/10**.

### Why Settlement Life wins

Current authority already has:
- tile `food` / `foodCapacity` with deterministic regrowth;
- Human hunger/starvation and direct tile-food consumption;
- Settlement membership/population and deterministic territory ownership;
- Rain restoration and Meteor environmental pressure;
- map/Inspector/World Stories presentation surfaces.

The missing material layer is one settlement-level food reserve. This has high visible payoff and strong causal leverage without requiring a generic economy framework.

### Deferred directions

- **Conflict depth:** real conquest, occupation and rebellion already exist and are visible; more war depth has lower marginal new-capability payoff.
- **Terrain shaping:** high visible payoff but current biome authority is still essentially land/ocean; passability edits would require explicit stranded-entity/settlement/territory policy before a safe small slice.
- **Culture/technology/religion:** little existing authority; too much invisible model before a compact player loop exists.

## v1.1 capability order

### 1. Settlement Food Reserves + visible Granary — ACTIVE / #328

Frozen mechanics in #328:
- authoritative settlement `foodStored`;
- capacity = base `2` + `2 × population`;
- deterministic settlement-check harvest from owned passable tiles only;
- protect `65%` of each source tile’s `foodCapacity` as local ecological floor;
- harvest budget `0.5 × population` per cadence;
- hungry local members consume reserve only after direct current-tile food and only while on territory owned by their own active settlement;
- abandonment clears reserve;
- no harvest/draw RNG or remote/trade semantics.

Persistence contract:
- current snapshot schema advances v16 → v17;
- `SUPPORTED_SNAPSHOT_VERSIONS` becomes v10–v17;
- pre-v17 settlements migrate `foodStored = 0` deterministically;
- local envelope v1 and historical v10–v16 support remain intact.

Player-visible/UI contract:
- compact map Granary/reserve cue from authoritative stored/capacity ratio;
- Settlement Inspector displays `Food reserve X / Y` plus concise ratio-derived state;
- one pure presentation projection feeds map + Inspector so they cannot disagree;
- focused production Chromium evidence shows materially different reserve states without injecting reserve values;
- no economy dashboard, tax/trade/jobs/production labels or controls.

### 2. Scarcity & recovery readability/history — BLOCKED on Capability 1

Meaningful low/depleted/recovered transitions only; truthful Chronicle/Event Card/Inspector presentation; no price/market/job inference.

### 3. Canonical Settlement Life gate — BLOCKED on Capability 2

One deterministic local food→reserve→shortage/drawdown→environmental recovery→reserve recovery journey, exact save/load and historical v0.4–v1.0 browser/support regressions.

## Explicit v1.1 non-goals

No currency, prices, market/trade routes, professions/classes, taxes/wages/ownership, crafting/production chains, wood/stone/ore general resource framework, tech tree, religion/culture or merchant AI.

## Current decision gate

1. publish the UI/UX north-star documentation without changing v1.0 identity or opening another implementation lane;
2. merge that bounded documentation sync after review;
3. continue #328 as the only active implementation issue;
4. first #328 PR must include authoritative reserve mechanics **and** a visible Granary/Inspector difference in the public product surface;
5. frontend/interaction participates in #328 via shared reserve projection and bounded UI integration, not a broad rewrite;
6. keep Capability 2/3 and unrelated V1.x breadth closed until Capability 1 is delivered.
