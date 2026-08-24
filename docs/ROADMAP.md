# WorldBoxSR release roadmap

WorldBoxSR is an open-ended simulation, but development must not be open-ended.

The project ships **coherent, visible, playable slices**. Simulation rigor is necessary, but it is not product progress by itself: a release must also be legible and compelling on screen.

## Delivery units

### Sprint

One narrow feature, experiment, implementation gate, or validation. A sprint should normally end in one issue/PR pair and leave behind authoritative code, visible product improvement, or durable negative evidence.

### Stage

A small group of sprints that produces one coherent capability. A stage ends when its explicit product gate passes.

### Version

A user-visible checkpoint that can be run, watched, tested, documented, and compared with the previous release.

For pre-1.0 releases:

- `0.x.0` = a new product stage/capability;
- `0.x.y` = hardening, fixes, small improvements within that capability.

## Release discipline

1. **Visible progress is a release requirement.** Green tests alone cannot complete a user-facing version.
2. **No unbounded research blocker.** Non-correctness research gets at most three consecutive rejected hypotheses in one version before deferral.
3. **Natural negative outcomes are not automatically bugs.** Extinction/collapse is acceptable when causally coherent and invariants remain valid.
4. **Supported scope beats universal scope.** A release may support declared presets/configurations instead of solving every seed/map.
5. **Every version has non-goals.** Later ideas do not become blockers just because they are interesting.
6. **Visual sprints require visual evidence.** Any visual/game-feel PR must record a before/after screenshot or equivalent demo evidence.
7. **Infrastructure is subordinate to the playable loop.** Add infrastructure only when it directly unblocks development, verification, or the public demo.

---

## v0.1.0 — A Living World

**Status: shipped baseline.**

v0.1 established the deterministic simulation foundation: terrain/resources, human lifecycle and ancestry, settlements/territory/history, save/load, typed grazers, tests/Simulation Lab, minimal Canvas client, god tools, Codespaces/Actions/Pages delivery infrastructure.

It is intentionally treated as a **developer-prototype baseline**, not the visual quality target.

---

## v0.2.0 — Playable World

**Current target.**

Goal: make the public demo look and feel unmistakably like a game before adding more deep simulation breadth.

### Hard priority rule

Until the v0.2 visible gate passes:

- no new non-correctness ecology research;
- no new abstract observability subsystem unless it directly improves the playable screen;
- no infrastructure work unless it blocks the demo loop;
- every feature sprint must create a visible before/after change or a directly felt interaction improvement.

### Intended scope

- replace debug rendering primitives with an original coherent pixel-art/tile/sprite presentation;
- visibly distinct terrain, coastlines, water depth, vegetation and biome detail;
- animated/interpolated humans and creatures rather than raw tile jumps;
- visible settlement growth through buildings/structures, names/flags and territory boundaries;
- compact god-power toolbar and immediate power feedback/effects;
- a default scenario/preset that opens into an interesting world instead of an empty-feeling debug sandbox;
- readable information hierarchy: game first, inspector/debugger second;
- retain deterministic authoritative simulation underneath the presentation layer.

### Technology policy

The client may adopt a mature 2D rendering/game library if it materially accelerates quality. The old "no third-party runtime dependencies" preference is not a product requirement. Rendering technology must serve the visible experience, not constrain it.

### Exit gates

**5-second gate:** without reading documentation, a new viewer can identify terrain, living units, settlement/civilization presence and god-game controls.

**30-second gate:** within 30 seconds of the default demo (or after using an obvious speed control), at least one legible world change/event occurs.

**Screenshot gate:** every visual sprint carries before/after evidence.

**Comparison gate:** v0.2 must be materially more game-like than the v0.1 Pages baseline; tests and metrics alone cannot satisfy this gate.

### Non-goals

- deep new ecology research;
- universal fauna initialization;
- full kingdoms/diplomacy/war;
- broad new simulation subsystems that are not visible in the current playable loop.

---

## v0.3.0 — Living Ecology

Goal: return to the existing grazer research and make ecology a coherent opt-in world capability **after** the world is visually playable.

Intended scope: supported natural-fauna presets/configurations, deterministic initialization for declared support, save/load continuity, visible ecology feedback, and no hidden survival controller.

---

## v0.4.0 — Civilizations

Goal: turn settlements and ancestry into readable historical polities: kingdom formation, rulers/succession, diplomacy, war/peace, conquest/rebellion, and causal territory history.

---

## v0.5.0 — God Game

Goal: deepen intervention as a play loop: more powers/disasters, stronger feedback, better tool UX and scenario creation.

---

## v0.6.0 — World Story Alpha

Goal: integrate the previous systems into a public-facing alpha compelling to watch without developer knowledge. Focus on onboarding, scenarios, performance, observability, history navigation, pacing and replayability.

---

## v1.0 direction

`v1.0` means a stable sandbox identity and compatibility contract: reproducible worlds, coherent causal history, documented save/version policy, a dependable watch/intervene loop, and enough integrated systems that ordinary users can create interesting histories without research scaffolding.

## Current decision

As of 2026-08-24, the public v0.1 Pages demo demonstrated that the project over-invested in invisible rigor relative to visible product quality. **v0.2 Playable World is now the only product-development priority.** The prior Living Ecology backlog is preserved and deferred to v0.3 rather than discarded.