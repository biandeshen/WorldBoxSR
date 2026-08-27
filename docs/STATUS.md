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

**v1.1 — Settlement Life & Food Reserves is the next finite product stage. Planning is complete; Capability 1 is next.**

Primary fantasy:

> **A settlement turns the food around it into visible reserves; residents can survive short local shortages from those reserves, and the player can watch scarcity or recovery emerge from the same ecology and God interventions.**

Finite backlog: `docs/backlog/v1.1.md`.
Direction gate: #326.

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

### 1. Settlement Food Reserves + visible Granary — NEXT

One authoritative conserved food reserve:
- deterministic capacity derived from existing settlement state;
- harvest transfers bounded surplus from settlement-owned tile food into reserve;
- protected local tile-food floor prevents free ecological vacuuming;
- hungry local settlement members may draw reserve before seeking wild tile food;
- no new RNG;
- map-visible Granary/fill state plus matching Settlement Inspector facts;
- first implementation PR must visibly change the public demo.

A persistent reserve may require a new snapshot version. If so, v1.0’s historical v10–v16 support floor remains mandatory and the new current version joins the compatibility matrix.

### 2. Scarcity & recovery readability/history — BLOCKED on Capability 1

Meaningful low/depleted/recovered transitions only; truthful Chronicle/Event Card/Inspector presentation; no price/market/job inference.

### 3. Canonical Settlement Life gate — BLOCKED on Capability 2

One deterministic local food→reserve→shortage/drawdown→environmental recovery→reserve recovery journey, exact save/load and historical v0.4–v1.0 browser/support regressions.

## Explicit v1.1 non-goals

No currency, prices, market/trade routes, professions/classes, taxes/wages/ownership, crafting/production chains, wood/stone/ore general resource framework, tech tree, religion/culture or merchant AI.

## Current decision gate

1. merge the 3-file v1.1 planning sync;
2. close #326 completed;
3. open exactly one Capability-1 implementation issue;
4. implement Food Reserves + visible Granary as the first player-visible slice;
5. keep Capability 2/3 and unrelated breadth closed until Capability 1 is delivered.
