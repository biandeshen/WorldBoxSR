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

Capability 1 — **Genealogical succession resolver + trajectory audit** — #257/#258 is delivered on main as `88ab84b626b30a1635e23c702b5dba30824d3bb7`; merged-main CI #827, Pages #61/public `/play/`, full visual-qa #320 green.

Capability 2 — **Authoritative ruling-line succession** — #259/#260 is delivered on main as `80c55a742efbb5c94f4ade855a60605f4bcbd958`; merged-main CI #838, Pages #62/public `/play/`, full visual-qa #331 green.

Capability 3 — **Ruling-line readability** — #261/#262 has completed its branch machine + manual gate. Current task: final docs head CI + full Visual QA → squash merge → merged-main delivery. Capability 4 remains locked until then.

## v0.8 player promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

## Semantic guards

- `parental_union` remains historical co-parent identity, not marriage/household/spouse/exclusivity.
- existing `lineage` remains the maternal lineage primitive, not a noble house/dynasty.
- ruling-line continuation is derived from explicit parent→child descent.
- no second ancestry database.
- no succession RNG.
- no eligible descendant means current oldest-eligible-adult fallback, not a manufactured heir.

## Capability 1 — delivered genealogy seam

`engine/core/succession_genealogy.js` provides pure, mutation-free, RNG-free genealogy queries from current human parent IDs plus persistent parental-union child records.

Frozen baseline audit hook:
- seed45 · 24×24 · population 30;
- first true selection divergence at day `9150` / Y25.4166667;
- Eldergate Realm #1;
- previous ruler / shadow founder #23;
- baseline oldest-adult successor #28;
- only eligible descendant Human #31, direct child, distance 1;
- all earlier post-founding successions had no eligible descendant, so baseline/proposed ruler selection matched before this point.

## Capability 2 — delivered authoritative ruling-line succession

- founding remains existing oldest-eligible-adult appointment;
- later succession first ranks eligible descendants of current `rulingLineFounderId` by nearest generation → older age → lower stable ID;
- no eligible descendant preserves the exact old open-selection fallback and starts a new line;
- vacancy preserves the current line for a later descendant fill;
- polity owns only `rulingLineFounderId`, `rulingLineSequence`, `rulingLineSinceDay`, `rulingLineReignCount`;
- ruler events keep old ruler/reason/cause facts and add explicit succession-path/ruling-line facts;
- snapshot v16 migrates v15-and-earlier polity state deterministically without fabricated historical events/dates;
- canonical day 9150 seed45 successor is Human #31, direct child distance 1, continuing founder #23 / line #13 instead of baseline #28.

Published v0.7 tag evidence remains immutable (`7f07ed67` / `67543ff4`). Because v0.8 intentionally changes Y40 political history, current-main Scenario baselines are now `b411c106` / `0f28ca42`; the Recipe/share/Replay/Fork contracts themselves remain exact.

## Capability 3 — ruling-line readability evidence

### Presentation ownership
- pure `rulingLinePresentation(world, polity)` reads current polity state plus retained recorded ruler-transition facts only;
- stable line copy exposes line sequence, reign count and founder `Human #ID`;
- unavailable founder keeps its stable ID and is marked unavailable rather than replaced/inferred;
- transition copy distinguishes recorded `founding`, `descendant` and `open_selection` paths;
- descendant wording derives only from recorded `descendantDistance` (`child`, `grandchild`, `N generations`).

### Product surface
- only the existing Phaser right-side Inspector is enhanced;
- current ruler human receives the compact line/transition context;
- polity settlement receives the same line identity under its existing current-ruler row;
- non-ruler humans, HUD, Chronicle, map input and Legacy renderer are unchanged;
- enhancer is presentation-only and never writes world/snapshot/history/RNG.

### Real Chromium gate
Final implementation head before docs sync: `9e666ee9b2dda9a746d6ca8a3f73da9fb0a9c545`.
- CI #845 green;
- full visual-qa #338 green;
- exact seed45 Y40 world is paused through the real product control;
- ordinary Alt-click inspected current ruler Human #12 of Eldergate Realm and settlement Eldergate;
- both Inspector surfaces rendered `ruling line 56 · reign 1 · founder Human #12`;
- both rendered the retained transition `new ruling line · open selection`;
- serialized authoritative world fingerprint stayed byte-identical through both inspections;
- manual 1440×900 review confirms the added text remains compact and the map stays the primary visual surface.

## Ordered v0.8 state

1. Genealogical succession resolver + trajectory audit — **DONE + merged-main delivered**.
2. Authoritative ruling-line succession — **DONE + merged-main delivered**.
3. Ruling-line readability — **branch gate complete; final docs head → merge/delivery**.
4. Dynastic World Stories — **NEXT only after #262 merged-main CI + Pages/public `/play/` + full Visual QA are green**.
5. Canonical Ruling Lines gate — locked.
6. release-only `v0.8.0` handoff — locked.

## Explicit v0.8 non-goals

No economy/trade/storage/currency, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil-war framework, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing ruling-line survival.

## Current decision gate

1. require documentation-synchronized #262 final head CI + full Visual QA green;
2. confirm changed-file audit contains only presentation/readability/tests/QA/docs and no authority changes;
3. mark #262 ready and squash merge;
4. verify merged-main CI + Pages/public `/play/` + full Visual QA;
5. only then open Capability 4 for Dynastic World Stories presentation.
