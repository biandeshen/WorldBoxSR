# WorldBoxSR release roadmap

WorldBoxSR is an open-ended sandbox, but development must not be open-ended. The project ships **coherent, visible, playable slices** and freezes public contracts at release boundaries.

Product-interface north star: `docs/product/ui-ux-north-star.md`.

## Permanent release discipline

1. Visible progress is required; green tests alone do not complete a player-facing version.
2. The public Pages demo is the product truth surface.
3. Supported scope beats universal/unbounded scope.
4. Natural negative outcomes are valid when causal/invariant truth holds.
5. Infrastructure is subordinate to the playable loop.
6. Implementation freezes before release packaging; published tags never move.
7. Ordinary feature slices use focused tests/browser smoke; full historical proof belongs at capability/release boundaries.
8. Public support claims require real evidence; uncertified surfaces stay explicitly uncertified.
9. UI/UX evolves with player-visible capability: the world remains primary, shared presentation projections must stay truthful, and concept art never authorizes nonexistent mechanics.

---

## v0.1.0 — A Living World
**Status: shipped.** Deterministic terrain/resources, humans/ancestry, settlements/history, save/load, grazers and developer simulation tooling.

## v0.2.0 — Playable World
**Status: shipped.** Phaser/Vite world view, camera/input, inspection, powers, public Pages and real Chromium QA.

## v0.3.0 — Civilizations Rise
**Status: shipped.** Polities, rulers/succession, relations/war/peace, warbands, conquest/transfer/dissolution/rebellion.

## v0.4.0 — God Power Sandbox
**Status: shipped.** Six-power dock, authoritative Meteor destruction + Rain recovery and truthful Chronicle outcomes.

## v0.5.0 — World Stories
**Status: shipped.** Causal Event Cards, Focused Story Trail, Watchlist, Chronicle lenses and canonical browser story path.

## v0.6.0 — Living Ecology
**Status: shipped.** Grazer/Wolf ecology, predation, readability and canonical pressure→recovery→predation evidence.

## v0.7.0 — Scenario Builder & Sharing
**Status: shipped.** Scenario Recipe v1, Setup, portable share/import, Replay/Fork and canonical exact Scenario journey.

## v0.8.0 — Ruling Lines & Succession
**Status: shipped.** Deterministic descendant-first ruling-line succession, exact fallback, Inspector readability and Dynastic World Stories.

## v0.9.0 — World Feel & Public Alpha Polish
**Status: shipped.** World-first viewport, stronger visual hierarchy/motion/civilization readability, local ordinary-world persistence, mobile touch and recovery/accessibility.

## v1.0.0 — Stable Sandbox Identity
**Status: shipped and immutable.**

Primary promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

Immutable identity:
- implementation freeze `efecf1e91ac88177ce82917c1312577927e26af6`;
- release commit `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- annotated tag object `75e89c559e91cb0128fb35a79bd32c6fa84f02cf` → exact release commit;
- release workflow #14, CI #948, Pages #96/public `/play/`, full visual #436 green.

v1.0 freezes:
- snapshot support baseline v10–v16, local-save envelope v1 and Scenario Recipe v1;
- certified Chrome/Chromium-class 1440×900 desktop + 430×820 touch Phaser surfaces and Legacy ordinary-world fallback;
- cross-system causal Story + exact ordinary Save/Restore + canonical Scenario composition.

---

## v1.1 — Settlement Life & Food Reserves
**Status: implementation ready.** Direction gate #326. Capability 1: #328. Finite backlog: `docs/backlog/v1.1.md`.

Primary fantasy:

> **A settlement turns the food around it into visible reserves; residents can survive short local shortages from those reserves, and the player can watch scarcity or recovery emerge from the same ecology and God interventions.**

Post-1.0 evidence scoring selected this direction over conflict-depth, terrain shaping and culture/technology/religion breadth.

### Capability order

1. **Settlement Food Reserves + visible Granary** — one conserved food reserve, deterministic capacity, bounded surplus harvest from owned tiles, hungry local resident draw, map Granary + Inspector. This is the first implementation slice and must visibly change the public demo immediately.
2. **Scarcity & recovery readability/history** — meaningful low/depleted/recovered transitions, truthful Chronicle/Event Card/Inspector presentation, no economic inference.
3. **Canonical Settlement Life gate** — deterministic local food→reserve→shortage/drawdown→environmental recovery→reserve recovery journey, save/load exactness and all v0.4–v1.0 regressions.

### Existing leverage

- authoritative tile `food` / `foodCapacity` + deterministic regrowth;
- Human hunger/starvation/direct food consumption;
- Settlement membership + deterministic owned territory;
- Rain/Meteor environmental effects;
- settlement rendering, Inspector and World Stories surfaces.

### UI/UX integration

v1.1 is also the first bounded implementation step toward the v1.x UI/UX north star:

- map-visible Granary/reserve cue;
- Settlement Inspector `Food reserve X / Y` + concise state;
- one pure reserve presentation projection shared by map and Inspector;
- no economy dashboard, management controls or labels for mechanics that do not exist.

### Explicit non-goals

No currency, prices, markets, trade routes, professions/classes, taxes/wages/ownership, crafting/production chains, tech tree, religion/culture, merchant AI or general multi-resource economy framework.

### Versioning guard

The authoritative reserve in #328 advances the current engine snapshot schema to v17. v1.0’s historical v10–v16 support floor remains mandatory and v17 joins the compatibility matrix.

---

## V1.x north star after v1.1 — provisional, not frozen

The project now keeps a long-range direction so development does not become “finish one version, then improvise.” **Only v1.1 is currently an implementation commitment.** Every later direction must still pass a fresh evidence gate before it receives a version number, backlog or parallel implementation work.

| Direction | Player-facing outcome |
| --- | --- |
| World shaping / biome agency | the player changes the physical world and existing life/civilizations visibly react |
| Migration / settlement dynamics | population and settlement geography move, grow, abandon and re-form coherently |
| Civilization identity | civilizations become meaningfully distinguishable through small causal identity systems |
| Production / exchange | material differences create bounded specialization/exchange only after a truthful local-resource base exists |
| Politics / conflict consequences | diplomacy and war create clearer long-lived territorial/social consequences |
| Deep history | ecology, settlement, civilization and conflict events become a readable long-duration causal history |
| Creator / Scenario 2.0 | deeper authoring, reproducible experiments, sharing and replay composition |
| V1 final scale/polish | performance, long-run stability, desktop/touch coherence and UI consistency converge before a new major architecture stage |

The exact order and numbering after v1.1 are deliberately **not frozen**. Player evidence, technical leverage and marginal visible value decide the next gate.

---

## Current decision

1. v1.0.0 remains immutable; never move or rewrite its tag/release contract;
2. v1.x now has an explicit product-interface north star in `docs/product/ui-ux-north-star.md` plus the provisional post-v1.1 direction above;
3. #328 remains the single open implementation lane: Settlement Food Reserves + visible Granary;
4. the first v1.1 implementation PR must produce a player-visible public-demo difference and should establish the shared reserve projection/Inspector pattern rather than start a separate UI rewrite;
5. do not open Capability 2/3 or unrelated V1.x breadth in parallel;
6. frontend/interaction work participates inside bounded capability slices; presentation may never become a second simulation authority.
