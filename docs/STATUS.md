# Project status

Last updated: 2026-08-27

## Management state

**v0.8.0 — Ruling Lines & Succession is shipped and closed.**

Immutable release identity:
- implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`;
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5` → exact release commit;
- GitHub Release `WorldBoxSR v0.8.0` published by release workflow #12;
- release-commit CI #865 green;
- Pages #66 green including final public `/play/` verification;
- full visual-qa #358 green.

The v0.8 implementation and release identities are immutable. Any later docs cleanup must not move the tag.

**v0.7.0 — Scenario Builder & Sharing remains shipped and immutable.**
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606`;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green.

## v0.8 delivered promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

Delivered capabilities:
1. pure explicit descendant resolver with deterministic generation/age/ID ranking and no RNG;
2. descendant-first ruling-line succession with exact old open-selection fallback;
3. minimal persistent line founder/sequence/since-day/reign-count + snapshot-v16 migration;
4. read-only ruling-line context in existing ruler/settlement Inspector;
5. factual descendant continuation vs new-line World Stories through existing Event Card/Rule/navigation paths;
6. canonical seed45 day 9149→9150 Human #23→#31 same-line continuation with duplicate + save/load byte exactness;
7. production Chromium proof that presentation does not mutate authoritative world state and all v0.4–v0.7 browser regressions remain green.

## Semantic guards

- `parental_union` remains historical co-parent identity, not marriage/household/spouse/exclusivity.
- existing `lineage` remains the maternal lineage primitive, not a noble house/dynasty.
- a political ruling line is derived from explicit parent→child descent + recorded succession.
- no second ancestry database.
- no succession RNG.
- no eligible descendant means the existing oldest-eligible-adult open-selection fallback, not a manufactured heir.
- presentation never invents legitimacy, claims, elections, primogeniture, usurpation or political motive.

## Process correction after v0.8

Engineering throughput is strong, but perceived product throughput is weaker because visible world/game-feel work has received too little of the budget relative to validation depth.

The next stage is **v0.9 — World Feel & Public Alpha Polish**:
- make the world use much more of the viewport;
- reduce dead screen/panel space;
- strengthen terrain/building/unit/polity visual hierarchy;
- make civilization growth/conflict/destruction/recovery readable directly from the map;
- add bounded animation/FX/audio for high-feedback changes;
- then finish onboarding/accessibility/performance/recovery hardening.

Target allocation: roughly **60–65% visible player value, 25–30% reliability/performance, ≤10% docs/process**. Determinism, save/load and sole-authority boundaries remain hard invariants. Ordinary micro-slices should default to focused regression + one real-browser smoke/visual check; full canonical proof belongs at meaningful milestone/release gates.

## Current decision gate

1. close release tracking #267 and parent #255 with immutable v0.8 evidence;
2. open one bounded v0.9 world-feel planning issue;
3. first implementation slice should improve world viewport utilization / dead-space immediately;
4. no economy/religion/technology/naval breadth until the visible-world checkpoint improves materially;
5. judge the next checkpoint first by the public demo, not by internal subsystem count.
