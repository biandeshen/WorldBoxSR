# Project status

Last updated: 2026-08-24

## Current state

`main` contains a deterministic living-world simulation with:

- seeded, serializable RNG and fixed-tick world state;
- procedural elevation/moisture, land/ocean, renewable food, and movement constraints;
- human hunger, movement, eating, aging, reproduction, death, ancestry, and lineage history;
- emergent settlement formation, weak home cohesion, abandonment, territory, and causal history;
- behavior-neutral settlement resource accounting;
- persistent historical co-parent (`parental_union`) edges;
- derived social/reproduction research instruments;
- isolated/checkpointable Simulation Lab, deterministic save/load, long-run regressions, and 10k-agent benchmark coverage;
- a minimal Canvas client/inspector that remains downstream of authoritative simulation state.

Current clean CI after #80: **123/123 tests + smoke**.

## Completed architecture corrections

### Lineage is not household

The original `household` prototype was renamed to **lineage** after 200-year worlds produced surviving records with tens to hundreds of living descendants. Lineage remains a persistent ancestry identity only; it has no co-residence, storage, inheritance, or movement behavior.

### Co-parent edge is not spouse

`parental_union` is a historical edge created by an already-occurring shared birth. The 13-seed 200-year baseline showed almost one new co-parent edge per birth, very low repeated shared parenting, and high multi-union participation. It is not spouse/current-partner state and has no exclusivity or behavior.

### Repeated dyad is not general social bond

Repeated adult dyads can recur for years, but #73/#74 showed annual top-partner identity usually turns over. Six-seed median same-top-next-year was **10.68%**, median same-top across 3 annual windows **1.93%**, and across 5 windows **0.49%**. Rare strong dyads are preserved as observations, not thresholded into an authoritative `social_bond`.

### Local peer field is not stable household membership

#75/#76 measured whole radius-1 local co-presence sets. Adjacent-year recurrence is real: six-seed median prior peer-mass retention is **55.98%**. But 3-window persistence falls sharply: median support intersection/union **13.12%**, weighted min/max **4.64%**, and only **26.43%** of current peer mass comes from peers present in all 3 annual windows.

The best current abstraction is a **fluid local social field**, not a stable household roster. No residential-group entity is justified yet.

### Broad local-meal storage is not a valid scarcity buffer

#79/#80 implemented and tested a conservative, off-by-default settlement shared-food-store prototype, then rejected it before merge. The mechanism was mechanically correct and resource-conserving, but its causal scope was too broad.

At year 200 across seeds 1/4/9/45/80/98, the population center moved only modestly, and seed45 remained unchanged. However seed98 changed from **404 → 452** people and from **6 active + 1 abandoned settlement** to **7 active + 0 abandoned**.

A targeted audit showed that the rescued settlement was exactly resource-rich **Pineford (#5)**: baseline year-100 food remaining was ~96%, and it normally declined to 8/7/3 people at years 120/140/160 before abandonment. With storage enabled it was already 16 at year100 and 29 at year120 while Pineford itself had **zero storage withdrawals and zero store meals**. Storage use elsewhere changed the demographic/spatial trajectory and indirectly rescued it.

The runtime storage code and probes were removed before #80 merged. Storage v0 is a preserved negative experiment, not shipped simulation behavior.

## Empirical checkpoints

### Post-social 100×200 baseline

All 100 seeds completed successfully. Year-200 population median/mean are **489 / 496.68** versus **483 / 495.7** before social cohesion. The minimum rose from **8 to 128** while the center stayed almost unchanged. Median settled-population share is ~86% and median territory coverage ~83%.

### Settlement resource accounting

Resource accounting remains derived-only, but it contains real predictive signal. In the targeted year-100 → year-200 study, territorial food remaining fraction correlated **0.780** with absolute settlement population growth across 37 settlements (**0.864** excluding seed45). Per-member resource measures were also strongly predictive outside the sparse sentinel.

Important counterexample: seed98 settlement #5 had ~96% food remaining at year100 and still died out by year200. Economy is therefore not a universal explanation for settlement survival.

## Active causal gate — Sprint 004

The next step is **settlement-level scarcity episode research**, derived-only and behavior-neutral.

Before any storage v1, distinguish:

1. **territorial scarcity** — owned food is genuinely low relative to current membership;
2. **local meal-path blockage** — hungry current members cannot eat on the current tile or any one-step passable neighbor using the existing meal rule;
3. **access mismatch** — local blockage occurs while settlement territory still contains at least one full meal per member.

Measure episode duration/recurrence and later shrinkage/recovery/abandonment across multiple seeds, with seed98 Pineford as a required sentinel. A future storage mechanism is justified only if recurrent settlement-local scarcity exists and can be gated transparently without broad world coupling.

If scarcity is mostly access mismatch or demographic/spatial failure, do **not** retry storage by parameter search; investigate the relevant access or membership mechanism instead.

## Project-management rule

Do not jump to kingdoms/war or attach behavior to convenient labels. Research observations are not automatically authoritative entities. Add the smallest causal mechanism supported by experiments, keep negative results, and remove mechanisms that flatten world diversity or create uncontrolled demographic feedback.