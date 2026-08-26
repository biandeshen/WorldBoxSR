# Project status

Last updated: 2026-08-27

## Management state

**v0.7.0 — Scenario Builder & Sharing is shipped and closed.**
- implementation freeze `1043a63375fee4ccaa72141da7f1e026a550b989`;
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606`;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green.

**v0.8.0 — Ruling Lines & Succession implementation is complete and frozen. Release candidate publication is active under #267.**

Implementation freeze:
`1556a8a8e1e058db54a1ac93a2eed1a69020c191`

Merged-main delivery:
- CI **#863** green — 396/396 tests + smoke + Pages build/check;
- Pages **#65** green — build, deploy and final public `/play/` verification;
- full visual-qa **#356** green.

No v0.8 product behavior may change in the release handoff.

## v0.8 player promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

## Delivered v0.8 capabilities

### 1. Genealogical succession resolver + trajectory audit — DONE

- pure `engine/core/succession_genealogy.js` over explicit current-parent and retained parental-union child records;
- cycle-safe descendant distance;
- deterministic ranking: distance asc → age desc → stable ID asc;
- no mutation or RNG consumption;
- frozen first real selection divergence: seed45, Eldergate Realm #1, day `9150`, previous ruler/founder Human #23, old baseline successor #28, only eligible descendant Human #31 (direct child, distance 1).

Merged as `88ab84b626b30a1635e23c702b5dba30824d3bb7` with CI #827, Pages #61 and visual #320 green.

### 2. Authoritative ruling-line succession — DONE

- founding keeps existing oldest-eligible-adult selection;
- later succession first considers eligible descendants of the current ruling-line founder;
- no eligible descendant preserves the exact old open-selection fallback and starts a new line;
- vacancy preserves the line for a later valid fill;
- no succession RNG;
- polity persists only minimal founder/sequence/since-day/reign-count political identity;
- ruler events record explicit succession-path and ruling-line facts while preserving old cause/reason facts;
- snapshot v16 migrates older polity state deterministically without fabricated history;
- canonical day 9150 result is Human #31 continuing founder #23 / line #13, reign 2.

Merged as `80c55a742efbb5c94f4ade855a60605f4bcbd958` with CI #838, Pages #62 and visual #331 green.

### 3. Ruling-line readability — DONE

- pure `rulingLinePresentation(world, polity)` reads current polity + retained recorded transition facts only;
- current ruler and polity settlement Inspector show the same line sequence, reign count and founder Human #ID;
- transitions distinguish founding, descendant continuation and open selection;
- missing founder remains a stable unavailable ID rather than being inferred;
- exact-Y40 browser evidence remained serialized-world neutral.

Merged as `998d179b0122457f2a5950c0dfe857f305fd4281` with CI #848, Pages #63 and visual #341 green.

### 4. Dynastic World Stories — DONE

- pure `dynasticRulerStoryForEvent()` renders only recorded ruler-event facts;
- descendant continuation and open-selection/new-line transitions use existing Event Card / Rule lens / event-map references;
- Rule membership/order/limit are unchanged;
- no inferred legitimacy, claim, election, primogeniture, usurpation or motive;
- production gate at Y44 records real Lightning-caused ruler death Event #229, descendant succession Event #235 (Human #31 continues founder #23 / line #67), and retained open-selection Event #227 (Lindenvale Dominion Human #11 begins line #28);
- paused story/navigation path leaves authority byte-identical.

Merged as `9058f6b91306ccd2e23e2c1d50d32a6f49700509`; merged-main CI #859, Pages #64 and visual #352 green.

### 5. Canonical Ruling Lines gate — DONE

Headless canonical path:
- seed45 · 24×24 · population 30;
- day `9149`: Eldergate Realm #1 ruler/founder Human #23, line #13, reign 1;
- retained real open-selection event that began line #13;
- day `9150`: Human #31 succeeds #23 through `descendant`, distance 1, same line #13, reign 2;
- duplicate run and day-9149 save/load continuation reach byte-identical authority;
- Inspector/story/Event Card projection leaves snapshot + RNG unchanged.

Browser composition gate reuses the existing exact-Y40 Inspector and Dynastic World Stories production paths rather than creating a second political flow.

Merged as implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`; CI #863, Pages #65 and visual #356 green.

## Semantic guards

- `parental_union` remains historical co-parent identity, not marriage/household/spouse/exclusivity.
- existing `lineage` remains the maternal lineage primitive, not a noble house/dynasty.
- a political ruling line is derived from explicit parent→child descent + recorded succession.
- no second ancestry database.
- no succession RNG.
- no eligible descendant means current oldest-eligible-adult fallback, not a manufactured heir.
- presentation never invents legitimacy, claims, elections, primogeniture, usurpation or political motive.

## Release handoff — active

Issue #267 permits exactly seven release/package/doc files:
- `package.json` → `0.8.0`;
- `docs/releases/v0.8.0.md`;
- `docs/demos/v0.8.0.md`;
- `README.md`;
- `docs/ROADMAP.md`;
- `docs/STATUS.md`;
- `docs/backlog/v0.8.md`.

Forbidden in this handoff: engine/client/content/test/QA behavior changes or v0.9 implementation.

After the release PR merges, require:
1. existing release workflow succeeds;
2. annotated tag `v0.8.0` targets exactly the release merge commit;
3. GitHub Release `WorldBoxSR v0.8.0` is published from checked-in notes;
4. release-commit CI succeeds;
5. release-commit Pages/public `/play/` succeeds;
6. release-commit full Chromium succeeds.

## Process correction after v0.8

Current engineering throughput is strong, but perceived product throughput is weaker because visible world/game-feel work has received too little of the budget relative to validation depth.

v0.9 planning therefore shifts toward **World Feel & Public Alpha Polish**:
- world uses much more of the viewport;
- less dead screen/panel space;
- stronger terrain/building/unit/polity visual hierarchy;
- more visible civilization growth/conflict/destruction/recovery;
- bounded animation/FX/audio for high-feedback events;
- then onboarding/accessibility/performance/recovery hardening.

Target allocation: roughly 60–65% visible player value, 25–30% reliability/performance, ≤10% docs/process. Determinism, save/load and sole-authority boundaries remain hard invariants.

## Explicit v0.8 non-goals

No economy/trade/storage/currency, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil wars, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing dynasty survival.

## Current decision gate

1. finish exact seven-file release candidate #267 with no behavior changes;
2. require candidate CI + full Chromium;
3. squash merge and let the existing release workflow create immutable `v0.8.0`;
4. verify release-commit CI + Pages/public `/play/` + full Chromium;
5. close #267/#255 only after publication evidence;
6. then open bounded v0.9 world-feel planning before any new deep system work.
