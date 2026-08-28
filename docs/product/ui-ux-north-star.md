# WorldBoxSR UI/UX north star

- Status: owning product-interface direction for v1.x
- Date: 2026-08-28
- Parent product baseline: `docs/product/master-blueprint.md`
- Current implementation stage: v1.1 `Settlement Life & Food Reserves` / #328

## Purpose

WorldBoxSR must feel like a coherent game product, not a collection of simulation controls and developer panels. This document owns the long-lived **interface architecture, information hierarchy, interaction direction and frontend participation rules** for v1.x.

It does **not** make concept art authoritative and it does **not** grant permission to invent mechanics that the engine does not own. The authoritative simulation remains `engine/**`; presentation may summarize and project only real state/events.

## Product interface promise

> **The world remains the hero. A player can see what is happening, act on it, inspect it, and understand its history without the interface covering the sandbox or fabricating explanations.**

The target experience has four qualities:

1. **Playable** — important actions are easy to discover and fast to use.
2. **Readable** — world change is visible on the map before it becomes a table.
3. **Controllable** — time, tools, focus, layers and inspection are predictable.
4. **Tellable** — the Chronicle turns authoritative events into navigable world stories.

## Non-negotiable principles

1. **World-first canvas.** The map owns the majority of the screen. Persistent UI stays on edges and can collapse when appropriate.
2. **Information is layered.** Global facts, tools, selected-object facts, recent history and deep overviews are separate surfaces.
3. **One authority, many projections.** HUD/Inspector/Chronicle/map overlays consume shared presentation projections from authoritative state; they do not create a second model.
4. **Map before spreadsheet.** Prefer borders, state markers, buildings, reserve fill, movement and event cues before dense management tables.
5. **Context before menus.** Selecting an entity/place should reveal its relevant facts without forcing navigation to a separate screen.
6. **Progressive disclosure.** Runtime surfaces stay compact; deep comparison/history lives in dedicated overview pages.
7. **Touch is first-class.** Desktop and 430x820-class touch remain supported product surfaces; compact layouts may change composition but not authority semantics.
8. **Concept art is directional.** Generated concepts may suggest composition, hierarchy and mood, but labels such as trade, tax, production, building levels or other not-yet-authoritative systems are placeholders only.

## Runtime interface architecture

### 1. Top HUD — global state and time

Always-visible, compact facts:

- seed / world identity;
- day/time/world age where supported;
- pause/play/speed controls;
- high-value global counts such as people, settlements, civilizations and relevant ecology counts;
- settings/recovery affordance.

Rules:

- no scrolling dashboard in the top bar;
- global counters are read-only projections;
- lower-value metrics move to World Overview or Inspector.

### 2. Left tool dock — actions on the world

Primary groups:

- Inspect / focus;
- God Powers such as Rain, Meteor and Heal;
- spawn tools such as Human and supported fauna;
- world-shaping tools when/if terrain authority is explicitly introduced.

Rules:

- one clear selected-tool state;
- tooltip/label clarity beats icon-only ambiguity;
- categories may collapse as the power set grows;
- no unavailable future mechanic appears as an actionable control.

### 3. Right Inspector — contextual truth

One shell with object-specific templates.

Supported families grow incrementally:

- tile/terrain;
- Human;
- animal;
- settlement;
- civilization/polity.

The Inspector should answer: **what is this, what state is it in, what changed recently, and where can I read more?**

For settlement v1.1 specifically, the shared reserve presentation must expose only authoritative facts such as stored/capacity/state; it must not imply prices, trade, jobs or taxation.

### 4. Bottom Chronicle tray — recent world memory

A compact runtime story surface:

- recent meaningful events;
- event type/lens;
- focus/map jump;
- watchlist relevance;
- expand-to-Stories affordance.

It should normally show a small number of high-value items and remain collapsible. Full history exploration belongs in the Stories/Chronicle page.

### 5. Navigation / mini-map area

Use when it improves orientation at larger worlds:

- mini-map/current viewport;
- zoom;
- supported overlays/layers;
- focus/watchlist navigation.

A mini-map is a navigation aid, not a second simulation canvas.

## Primary product navigation

The long-term v1.x information architecture is:

1. **World** — runtime sandbox and global overview.
2. **Settlements** — settlement comparison, map focus and material/lifecycle state.
3. **Civilizations** — polity identity, territory, rulers, relations and major pressures when authoritative.
4. **Stories** — Chronicle, timeline, causal drill-down and watchlist history.
5. **Scenarios** — presets, creation/import/share/replay/fork surfaces.
6. **Encyclopedia** — rules, icons, entities and mechanics that actually exist.
7. **Settings** — controls, visual/audio/accessibility/recovery preferences.

Not every item must become a full page immediately. The structure is a stable navigation target, not a requirement to build empty screens.

## Dedicated product surfaces

### World Creation / Scenario Builder

Long-term composition:

- seed and randomize;
- world size;
- supported generation/environment controls;
- supported starting population/civilization/ecology controls;
- scenario presets;
- world preview;
- save preset/import/export/replay/fork as supported.

Do not expose a slider before its value has authoritative meaning.

### Settlements overview

Prioritize comparison and focus rather than city-builder micromanagement:

- name / state;
- population;
- territory;
- v1.1 food reserve state;
- ruler/polity when applicable;
- recent meaningful pressure/recovery;
- watch/focus.

### Civilizations overview

Use a medium-density overview rather than a 4X accounting dashboard:

- identity/flag/color;
- ruler;
- population/settlements/territory;
- real diplomatic state;
- major strengths/pressures only when derived from authority;
- recent major stories.

### Stories / Chronicle

This is a differentiating surface, not a debug log.

Target capabilities:

- timeline and event feed;
- lenses/filters;
- map focus;
- actor/place context;
- causal chain when recorded;
- watchlist/favorites;
- later replay/bookmark expansion where architecture permits.

## Desktop composition target

For the certified 1440x900-class surface:

- central world canvas remains dominant;
- top HUD stays shallow;
- left dock is narrow and tool-first;
- Inspector opens on the right without permanently shrinking the world more than necessary;
- Chronicle uses a bottom tray rather than a large permanent dashboard;
- full-page World/Settlements/Civilizations/Stories views are deliberate mode changes, not overlapping popups.

## Touch / narrow-screen composition target

For the certified 430x820-class surface:

- top HUD collapses to critical counts/time;
- God Powers/tools use a reachable drawer/dock;
- selection details use a draggable/bottom-sheet Inspector;
- primary product navigation moves to a compact bottom or menu surface;
- map interactions preserve existing short-tap, long-hold and pinch semantics;
- Chronicle/history expands as a sheet/page rather than permanently consuming the viewport.

## Frontend architecture expectations

Frontend participates in product design now, not after simulation work is finished.

### Shared component layer

Prefer reusable primitives such as:

- panel/sheet;
- button/icon button;
- tabs;
- stat row/badge;
- progress/state meter;
- tag/chip;
- card/list row;
- tooltip;
- section header;
- empty/error/recovery states.

Do not force a framework rewrite merely to obtain components. Reuse the existing Phaser + HTML/CSS architecture and extract components/helpers incrementally where it reduces inconsistency.

### Shared presentation projections

When the same fact appears in map rendering and HTML UI, create one pure projection/helper when practical so they cannot disagree.

Examples:

- settlement reserve ratio/state;
- polity identity/color/label;
- ecology pressure/readability state;
- selection summary facts.

### UI state boundaries

Frontend-local state may own things like:

- selected tab;
- collapsed/open panels;
- active lens/filter;
- current focus/watch target;
- visual preferences.

It may not silently own authoritative simulation facts.

## v1.x delivery priorities

### P0 — establish the product shell incrementally

- compact top HUD hierarchy;
- coherent God Power/tool dock;
- unified Inspector shell;
- Chronicle tray hierarchy;
- product-quality World Creation/Scenario composition.

These are not a separate visual-rewrite release. They should be improved opportunistically through bounded player-visible feature slices and dedicated UX slices only when evidence shows the shell itself is the bottleneck.

### P1 — v1.1 integration

Capability 1/#328 should make the first concrete north-star step:

- map-visible Granary/reserve cue;
- Settlement Inspector `Food reserve X / Y` plus concise state;
- shared pure reserve presentation projection;
- no economy dashboard or invented management controls.

Capability 2 may add truthful scarcity/recovery Chronicle readability after Capability 1 is complete.

### P2 — later v1.x expansion

Candidate product surfaces, gated by real underlying capability:

- stronger Settlements overview;
- Civilizations overview;
- Watchlist navigation;
- Encyclopedia baseline;
- richer Story/Chronicle timeline;
- world layers and mini-map as scale/readability needs justify them.

## Provisional v1.x product north star

Only v1.1 is currently frozen for implementation. Later entries are directional hypotheses and must pass a fresh evidence gate before becoming a backlog.

| Direction | Player-facing outcome |
| --- | --- |
| v1.1 Settlement Life & Food Reserves | settlements visibly buffer local scarcity and recover through the same ecology |
| World shaping / biome agency | player changes the physical world and existing life/civilizations visibly react |
| Migration / settlement dynamics | population and settlement geography move, grow, abandon and re-form coherently |
| Civilization identity | civilizations become meaningfully distinguishable through small causal identity systems |
| Production / exchange | material differences create bounded specialization/exchange only after a truthful local-resource base exists |
| Politics / conflict consequences | diplomacy and war create clearer long-lived territorial/social consequences |
| Deep history | cross-system causal events become a readable long-duration world history |
| Creator / Scenario 2.0 | deeper authoring, reproducible experiments, sharing and replay composition |
| V1 final scale/polish | performance, long-run stability, touch/desktop coherence and UI consistency converge before a new major architecture stage |

The exact version numbering/order after v1.1 is intentionally not frozen here.

## Review lenses

Every meaningful player-facing UI change should be reviewed from three angles:

### Product designer

- Is the action/findability hierarchy obvious?
- Is the screen showing the right information at the right depth?
- Are we adding a panel because the player needs it or because the data exists?

### Player

- What can I do now?
- What just happened?
- What is the thing I clicked?
- Did my action visibly matter?
- Can I follow an interesting story without reading documentation?

### Frontend/interaction engineer

- Is this state local UI state or authoritative world state?
- Can repeated visual facts share one projection/component?
- Does desktop composition degrade cleanly to touch?
- Is the interaction testable in real Chromium without hidden mutation?

## Visual-language direction

Use the generated concept studies as mood/composition references only. The useful recurring ideas are:

- dark, restrained edge chrome with warm/high-contrast emphasis;
- strong map-first composition;
- clear civilization color identity;
- compact icon + text tools;
- card-based Chronicle storytelling;
- contextual settlement/civilization Inspectors;
- a touch Inspector bottom sheet rather than a desktop panel squeezed onto mobile.

Before visual implementation freezes, convert these into original, legally reusable project design tokens and assets. Do not copy third-party game UI/artwork.

## Stop rules

- No empty future-navigation pages solely to make the product look larger.
- No full UI rewrite while a smaller bounded refactor can support the next visible capability.
- No dashboard metric without a player question it answers.
- No presentation-only label that implies nonexistent mechanics.
- No desktop improvement that silently breaks the certified touch path.
- No visual polish slice is complete without real browser evidence when it changes a supported product surface.
