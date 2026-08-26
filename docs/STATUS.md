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

Capability 2 — **Authoritative ruling-line succession** — #259/#260 has completed its implementation/browser gate. Current task: documentation-synchronized final-head CI + full Visual QA → squash merge → merged-main delivery. Capability 3 remains locked until then.

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

## Capability 2 — authoritative ruling-line succession evidence

### Rule
- founding remains existing oldest-eligible-adult appointment;
- later succession first ranks eligible descendants of current `rulingLineFounderId` by nearest generation → older age → lower stable ID;
- no eligible descendant preserves the exact old open-selection fallback;
- open fallback starts a new line;
- vacancy preserves the current line for a later descendant fill;
- no new RNG.

### Minimal polity authority
Only four new current political fields:
- `rulingLineFounderId`;
- `rulingLineSequence`;
- `rulingLineSinceDay`;
- `rulingLineReignCount`.

No House/Dynasty/Claim object and no duplicated genealogy.

### Explicit history
Ruler events preserve existing `reason`, ruler IDs and recorded death/previous-ruler causes. They additionally record the succession path, ruling-line founder transition, line sequence/reign count, line-change boolean and descendant distance where applicable. Vacancy retains line identity without claiming the line disappeared.

### Snapshot v16
- current schema is v16;
- v15 and earlier polity snapshots migrate deterministically;
- legacy anchor = current ruler, otherwise last ruler, otherwise null;
- anchored legacy polity starts line #1 / reign count 1 with `rulingLineSinceDay = null` because the historical start is unknown;
- migration fabricates no event/date;
- v16 round-trip and save/load continuation are exact.

### Canonical authority
Permanent tests prove the real implementation at the Capability-1 hook:
- immediately before day 9150, Eldergate Realm ruler/founder is #23 and line sequence is #13;
- at day 9150, authoritative successor becomes **Human #31**, not baseline #28;
- event records descendant succession, distance 1, unchanged founder #23 / line #13;
- duplicate and save/load continuation match exactly.

Normal CI remained green through authority and QA-maintenance heads; final implementation head `75e0a11929f9f4d1bc2dad7b530e339b9a63b5c6` passed CI #835 + full visual-qa #328.

## Prior-release regression identity

The published v0.7 release remains immutable: canonical source `7f07ed67`, fork `67543ff4` at the v0.7 tag/release.

v0.8 intentionally changes political history before the Y40 Sandbox Scenario base, so current-main deterministic Scenario baselines are now:
- source `b411c106`;
- fork `0f28ca42`.

The full Recipe/share/fresh-open/Replay/Fork exactness journey remains unchanged and is still required. Portable and Replay/Fork Chromium gates repeatedly reproduce the current-main values.

The final Visual work also removed QA-only brittleness from the canonical Scenario helper: browser-level CDP explicitly creates/attaches a page target, failed profile cleanup cannot mask the original error, and Fork/Run assertions use the shipped `FORK · EDITING · PAUSED` / `FORK · 3` / `#scenario-setup-run` contract.

## Ordered v0.8 state

1. Genealogical succession resolver + trajectory audit — **DONE + merged-main delivered**.
2. Authoritative ruling-line succession — **implementation/browser gate complete; final docs head → merge/delivery**.
3. Ruling-line readability — **NEXT only after #260 merged-main CI + Pages/public `/play/` + full Visual QA are green**.
4. Dynastic World Stories — locked.
5. Canonical Ruling Lines gate — locked.
6. release-only `v0.8.0` handoff — locked.

## Explicit v0.8 non-goals

No economy/trade/storage/currency, professions/classes, marriage/household/marriage diplomacy, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil-war framework, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts, fertility/migration rescue or controller guaranteeing ruling-line survival.

## Current decision gate

1. require documentation-synchronized #260 final head CI + full Visual QA green;
2. confirm no client/UI/story behavior entered Capability 2;
3. mark #260 ready and squash merge;
4. verify merged-main CI + Pages/public `/play/` + full Visual QA;
5. only then open Capability 3 for compact ruling-line readability.
