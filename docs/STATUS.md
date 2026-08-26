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

Capability 3 — **Ruling-line readability** — #261/#262 is delivered on main as `998d179b0122457f2a5950c0dfe857f305fd4281`; merged-main CI #848, Pages #63/public `/play/`, full visual-qa #341 green.

Capability 4 — **Dynastic World Stories** — #263/#264 has completed its branch machine + manual gate. Current task: documentation-synchronized final head CI + full Visual QA → squash merge → merged-main delivery. Capability 5 remains locked until then.

## v0.8 player promise

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

## Semantic guards

- `parental_union` remains historical co-parent identity, not marriage/household/spouse/exclusivity.
- existing `lineage` remains the maternal lineage primitive, not a noble house/dynasty.
- ruling-line continuation is derived from explicit parent→child descent.
- no second ancestry database.
- no succession RNG.
- no eligible descendant means current oldest-eligible-adult fallback, not a manufactured heir.
- presentation never invents legitimacy, claims, elections, primogeniture, usurpation or political motive.

## Delivered authoritative foundation

### Capability 1 — genealogy seam

`engine/core/succession_genealogy.js` provides pure, mutation-free, RNG-free genealogy queries from current human parent IDs plus persistent parental-union child records.

Frozen baseline audit hook:
- seed45 · 24×24 · population 30;
- first true selection divergence at day `9150` / Y25.4166667;
- Eldergate Realm #1;
- previous ruler / shadow founder #23;
- baseline oldest-adult successor #28;
- only eligible descendant Human #31, direct child, distance 1;
- all earlier post-founding successions had no eligible descendant, so baseline/proposed ruler selection matched before this point.

### Capability 2 — authoritative ruling-line succession

- founding remains existing oldest-eligible-adult appointment;
- later succession first ranks eligible descendants of current `rulingLineFounderId` by nearest generation → older age → lower stable ID;
- no eligible descendant preserves the exact old open-selection fallback and starts a new line;
- vacancy preserves the current line for a later descendant fill;
- polity owns only `rulingLineFounderId`, `rulingLineSequence`, `rulingLineSinceDay`, `rulingLineReignCount`;
- ruler events keep old ruler/reason/cause facts and add explicit succession-path/ruling-line facts;
- snapshot v16 migrates v15-and-earlier polity state deterministically without fabricated historical events/dates;
- canonical day 9150 seed45 successor is Human #31, direct child distance 1, continuing founder #23 / line #13 instead of baseline #28.

Published v0.7 tag evidence remains immutable (`7f07ed67` / `67543ff4`). Because v0.8 intentionally changes Y40 political history, current-main Scenario baselines are `b411c106` / `0f28ca42`; the Recipe/share/Replay/Fork contracts themselves remain exact.

## Capability 3 — delivered ruling-line readability

- pure `rulingLinePresentation(world, polity)` reads only current polity state plus retained recorded ruler-transition facts;
- current ruler and polity settlement Inspector surfaces expose the same line sequence, reign count and founder Human #ID;
- retained transition copy distinguishes founding, descendant continuation and open selection;
- unavailable founder keeps its stable ID and is not inferred/replaced;
- exact-Y40 Chromium inspected Eldergate Realm ruler Human #12 and settlement Eldergate through ordinary Alt-click;
- both showed `ruling line 56 · reign 1 · founder Human #12` and `new ruling line · open selection`;
- serialized authoritative world remained byte-identical.

## Capability 4 — Dynastic World Stories evidence

### Presentation ownership

- `dynasticRulerStoryForEvent()` is pure and reads only already-recorded ruler-event facts;
- descendant succession copy uses recorded line sequence, founder Human #ID and descendant distance;
- open selection copy uses recorded new line founder/sequence;
- legacy/pre-v0.8 ruler events fall back to existing presentation rather than inventing dynasty facts;
- Event Card keeps the existing authoritative Subject/Causes resolver and event/map navigation;
- Rule lens membership/order/limit are unchanged; only readable ruler-event copy changes.

### Real browser gate

Final implementation head before docs sync: `bcf20715026dc8e780da216bc332b6de14387ffb`.
- CI #856 green;
- full visual-qa #349 green;
- start exact seed45 Y40; use real `Time=1 year` plus product Pause for a bounded natural search;
- a valid descendant opportunity appears after 4 years at day `15840` / Y44 without fertility/migration tuning or injected heirs;
- real Lightning strikes Eldergate Realm ruler Human #23 while direct child Human #31 survives as the eligible descendant;
- normal simulation records death Event #229 then descendant succession Event #235;
- Event #235 reads: `Eldergate Realm's ruling bloodline continues` and `Human #31 continues ruling line 67 as a child of founder Human #23 after the previous ruler died.`;
- the same Rule top7 `[235,227,226,225,224,221,220]` retains open-selection Event #227;
- Event #227 reads: `Lindenvale Dominion begins a new ruling line` and `Human #11 begins ruling line 28 as founder Human #11 after the previous ruler was no longer a polity member.`;
- ordinary Event Card navigation opens retained Event #229;
- from the post-causality pause onward Rule/Event Card/navigation leave `JSON.stringify(world)` byte-identical;
- manual fixed 1440×900 review confirms both cards remain compact and the map stays the primary surface.

## Ordered v0.8 state

1. Genealogical succession resolver + trajectory audit — **DONE + merged-main delivered**.
2. Authoritative ruling-line succession — **DONE + merged-main delivered**.
3. Ruling-line readability — **DONE + merged-main delivered**.
4. Dynastic World Stories — **branch gate complete; final docs head → merge/delivery**.
5. Canonical Ruling Lines gate — **NEXT only after #264 merged-main CI + Pages/public `/play/` + full Visual QA are green**.
6. release-only `v0.8.0` handoff — locked.

## Explicit v0.8 non-goals

No economy/trade/storage/currency, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil-war framework, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing ruling-line survival.

## Current decision gate

1. require documentation-synchronized #264 final head CI + full Visual QA green;
2. confirm changed-file audit contains only presentation/tests/QA/docs and no authority changes;
3. mark #264 ready and squash merge;
4. verify merged-main CI + Pages/public `/play/` + full Visual QA;
5. only then open Capability 5 canonical Ruling Lines gate;
6. release-only `v0.8.0` work remains locked until Capability 5 merges and merged-main delivery is green.
