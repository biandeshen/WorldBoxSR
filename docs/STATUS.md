# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green.

**v0.7.0 — Scenario Builder & Sharing is shipped and closed.**

Immutable release identity:
- implementation freeze `1043a63375fee4ccaa72141da7f1e026a550b989`;
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606` targets exactly the release commit;
- GitHub Release `WorldBoxSR v0.7.0` published from checked-in release notes;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green;
- docs-only closeout #254 merged as `f14b6194a76a57ba77ff4867d95d0ff44b4c6d6e`; closeout CI #819, Pages #59/public `/play/`, visual-qa #313 green;
- release gate #240 and handoff #252 are closed.

Canonical v0.7 source `Portable trio`: seed45 Sandbox + Human `(12,8)` + Grazer `(16,12)` + Wolf `(14,7)`, paused fingerprint `7f07ed67`. Canonical fork adds Human `(12,8)`, fingerprint `67543ff4`.

**v0.8.0 — Ruling Lines & Succession is now the active planning stage.** Release gate: #255. Finite backlog: `docs/backlog/v0.8.md`.

No v0.8 behavior implementation is allowed until this planning-only branch/PR passes normal CI and merges.

## v0.8 player promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

This is one bounded Civilization Depth stage, not the whole economy/religion/technology/naval/diplomacy candidate pool.

## Why this direction

The current authority already provides:
- real-human polity rulers and deterministic succession/vacancy;
- parent IDs, child IDs, persistent parental-union child records, lineage IDs and generations;
- causal ruler history;
- Event Card / Focused Story / Watchlist / Rule-lens presentation;
- deterministic save/load and browser regression gates.

The current succession policy is intentionally shallow: all eligible polity adults are sorted oldest-first, then stable ID. It consumes no RNG and has no bloodline preference.

Economy/storage is not treated as the cheap default for Civilization Depth. Existing experiments already found:
- shared-food-storage v0 caused broad indirect demographic/spatial feedback and was rejected;
- territorial scarcity is real but not a settlement-survival classifier;
- settlement decline/abandonment has heterogeneous mechanisms, and generic rescue/persistence behavior was explicitly rejected.

Ruling-line succession therefore reuses more shipped authority while creating a clearer new player story.

## Semantic guards

- `parental_union` remains a historical co-parent record, **not** spouse/marriage/household/exclusivity.
- `lineage` retains its existing maternal-inheritance meaning and is **not** renamed into a noble house/dynasty.
- ruling-line continuation is a political fact derived from explicit parent→child descent.
- dead humans must not be resurrected for genealogy; persistent authoritative parent/union records provide descendant evidence.
- no second ancestry database may be introduced.

## Intended minimal succession rule

Founding appointment remains current behavior.

Later succession intends to:
1. prefer eligible living polity descendants of the current ruling-line founder;
2. rank by nearest descendant generation, then existing older-age / lower-ID ordering;
3. fall back to the current oldest-eligible polity adult when no eligible descendant exists;
4. treat that outsider fallback as the start of a new ruling line;
5. preserve truthful vacancy when no eligible adult exists;
6. consume no succession RNG.

This is deliberately not a historical primogeniture/elective/agnatic law simulator.

## Ordered v0.8 slices

1. **Genealogical succession resolver + trajectory audit — NEXT**: pure descendant graph/ranking plus a temporary bounded audit to freeze a real seed45 canonical succession opportunity before behavior changes.
2. **Authoritative ruling-line succession**: minimal political identity/persistence, descendant-first policy, current fallback, explicit line-continuation/change facts and snapshot migration.
3. **Ruling-line readability**: compact ruler/founder/line-sequence/reign context in existing inspection.
4. **Dynastic World Stories**: recorded succession presentation distinguishes line continuation vs new line using existing Event Card / Rule lens / human-polity refs.
5. **Canonical Ruling Lines gate**: one headless + real Chromium path proves a real descendant succession and a truthful line-change fallback with prior releases green.
6. release-only `v0.8.0` handoff.

## Capability-1 stop rule

The first slice must measure actual deterministic genealogy/succession opportunities. If no credible bounded natural descendant succession can be frozen for the supported world, **do not** manufacture an heir by adding fertility, migration, population rescue, hidden setup humans or a test-only succession event. Reconcile #255 instead.

## Explicit v0.8 non-goals

No economy/trade/market/currency/storage, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, elections/configurable succession law UI, claimant civil wars/usurpation framework, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing dynasty survival.

## Current decision gate

1. require planning branch diff to contain only `docs/backlog/v0.8.md`, `docs/ROADMAP.md`, `docs/STATUS.md`;
2. open one planning-only PR and require normal CI green;
3. squash merge planning before creating any v0.8 behavior branch;
4. then open exactly one capability-1 issue/branch for the genealogy resolver + trajectory audit;
5. keep every other Civilization Depth candidate out of the implementation queue until capability 1 produces evidence.
