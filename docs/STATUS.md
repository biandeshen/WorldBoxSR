# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green.

**v0.7.0 — Scenario Builder & Sharing is shipped and closed.**
- implementation freeze `1043a63375fee4ccaa72141da7f1e026a550b989`;
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606` → exact release commit;
- release workflow #11, CI #817, Pages #58/public `/play/`, visual-qa #312 green;
- docs closeout `f14b6194a76a57ba77ff4867d95d0ff44b4c6d6e`; CI #819, Pages #59/public `/play/`, visual #313 green;
- #240/#252 closed.

**v0.8.0 — Ruling Lines & Succession is the active implementation stage.** Release gate #255. Finite backlog: `docs/backlog/v0.8.md`.

Planning #256 merged as `cd97a4b739b3a1858e0ca86684c60c037b4de73f`; merged-main CI #821, Pages #60/public `/play/`, full visual-qa #314 green.

Capability 1 — **Genealogical succession resolver + trajectory audit** — #257/#258 is at branch closeout. It intentionally changes **no ruler behavior**.

## v0.8 player promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

## Semantic guards

- `parental_union` remains historical co-parent identity, not marriage/household/spouse/exclusivity.
- existing `lineage` remains the maternal lineage primitive, not a noble house/dynasty.
- ruling-line continuation is derived from explicit parent→child descent.
- no second ancestry database.
- no succession RNG.
- no eligible descendant means current oldest-eligible-adult fallback, not a manufactured heir.

## Capability 1 permanent genealogy seam

`engine/core/succession_genealogy.js` now provides pure, mutation-free, RNG-free genealogy queries:
- explicit parent→child adjacency from persistent parental-union `partnerIds → childIds` plus current human `parentIds`;
- duplicate evidence deduplication;
- cycle-safe shortest descendant generation distance;
- retained ancestry through dead/removed intermediate parents;
- descendant ranking over an already-eligible human set: nearest generation → older age → lower stable ID.

Permanent tests prove:
- child/grandchild distance;
- dead intermediate ancestry via persistent union records;
- paternal descent across maternal-lineage mismatch;
- co-parent identity does not imply spouse/descendant semantics;
- duplicate parent/union evidence is harmless;
- deterministic ranking;
- exact snapshot + RNG neutrality.

CI #822/#823 passed the permanent contracts.

## Frozen seed45 succession trajectory

A temporary probe ran **current unmodified v0.7 succession** with seed45 · 24×24 · population 30 and a shadow ruling-line audit. It searched for the first transition where descendant-first policy would actually choose a different ruler from the baseline oldest-adult rule.

The requested 200-year horizon naturally stopped at **Y25.4166667 / day 9150**.

Before the first true divergence:
- first appointment count: `1`;
- successions through the divergence event: `13`;
- vacancies: `0`;
- no-descendant fallback line changes: `12`;
- compatible descendant continuations: `0`.

First no-descendant fallback:
- Y21.75 / day 7830;
- polity #1 **Eldergate Realm**;
- previous ruler / shadow line founder **#28**;
- baseline successor **#9**;
- succession event **#23**;
- 5 eligible adults;
- zero eligible descendants.

First true selection divergence:
- **Y25.4166667 / day 9150**;
- polity #1 **Eldergate Realm**;
- previous ruler / shadow ruling-line founder **#23**;
- baseline oldest-adult successor **#28**;
- succession event **#41**;
- 6 eligible adults;
- exactly one eligible descendant: **Human #31**;
- #31 is a **direct child** (`distance=1`), age **24.0167 years**, settlement #1;
- proposed descendant-first successor therefore **#31**, not baseline #28.

Because all earlier successions had no eligible descendant, the proposed policy and baseline select the same ruler before this transition. No fertility/migration/rescue/hidden heir is needed; the v0.8 stop rule does not trigger.

The temporary trajectory probe was deleted after freezing this evidence. Permanent CI keeps only the resolver/tests.

## Ordered v0.8 state

1. Genealogical succession resolver + trajectory audit — **branch evidence complete; final CI + full Visual QA → merge/delivery**.
2. Authoritative ruling-line succession — **NEXT only after #258 merged-main CI + Pages/public `/play/` + full Visual QA are green**.
3. Ruling-line readability — locked.
4. Dynastic World Stories — locked.
5. Canonical Ruling Lines gate — locked.
6. release-only `v0.8.0` handoff — locked.

## Capability 2 intended first canonical behavior change

The frozen audit says the first baseline/proposed selection divergence occurs at Y25.4167 in Eldergate Realm: current baseline selects #28 while descendant-first ranking selects direct child #31. Capability 2 must use this evidence as its first deterministic regression hook, while still proving no earlier successor selection changes unexpectedly.

## Explicit v0.8 non-goals

No economy/trade/storage/currency, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil-war framework, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing ruling-line survival.

## Current decision gate

1. require #258 final branch head CI + full Visual QA green;
2. confirm diff contains only genealogy helper/tests + backlog/STATUS, with no `rulers.js`/snapshot/presentation behavior changes;
3. mark ready and squash merge #258;
4. verify merged-main CI + Pages/public `/play/` + full Visual QA;
5. only then open one capability-2 issue/branch for authoritative ruling-line succession.
