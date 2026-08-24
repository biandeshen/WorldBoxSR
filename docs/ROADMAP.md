# WorldBoxSR release roadmap

WorldBoxSR is an open-ended simulation, but development must not be open-ended.

The project ships **coherent watchable slices**, not “the complete world simulation.” Every version has an explicit boundary, explicit non-goals, and a finite research budget.

## Delivery units

### Sprint

One narrow feature, experiment, implementation gate, or validation. A sprint should normally end in one issue/PR pair and leave behind either authoritative code or durable negative evidence.

### Stage

A small group of sprints that produces one coherent capability. A stage ends when its exit criteria are met; interesting follow-ups do not keep it open indefinitely.

### Version

A user-visible checkpoint that can be run, watched, tested, documented, and compared with the previous release.

For pre-1.0 releases:

- `0.x.0` = a new product stage/capability;
- `0.x.y` = hardening, fixes, small improvements within that capability;
- optional `alpha/beta/rc` tags may be used during release hardening.

## Release discipline

1. **No unbounded research blocker.** A research topic that is not required for correctness, determinism, data integrity, or the stated release experience gets at most **three consecutive rejected hypotheses in one version**. After that, preserve the evidence and defer the topic.
2. **Natural negative outcomes are not automatically bugs.** Extinction, collapse, or an unusual history is acceptable when it is causally coherent and invariants remain valid.
3. **Supported scope beats universal scope.** A release may support a declared map size, preset, species set, or activation mode instead of solving every configuration before shipping.
4. **Every version has non-goals.** A later idea does not become a blocker simply because it is interesting.
5. **Release gates are product gates, not research perfection gates.** A release is ready when the promised user experience is coherent, deterministic, tested, documented, and reproducible.

---

## v0.1.0 — A Living World

**Status: release-hardening stage.**

Goal: ship the first complete watchable vertical slice.

### Must exist

- deterministic seeded world and fixed tick loop;
- terrain/resources and renewable food/vegetation;
- human hunger, movement, eating, aging, reproduction, death and ancestry;
- settlements, abandonment, territory and causal history;
- deterministic save/load continuation;
- headless CLI, Simulation Lab, regressions and performance baseline;
- typed grazer ecology available through explicit spawning/research configuration;
- lightweight client with pan/zoom, world rendering, inspectors and timeline/history;
- minimal god tools already implemented: spawn, erase and lightning.

### Release exit

- full test suite and smoke are green on the release commit;
- deterministic save/load and long-run regression gates remain green;
- a documented demo path can create a seeded world, run it for a long horizon, inspect history, intervene, and reproduce the same run;
- no open P0 correctness/data-integrity blocker;
- README/status/release notes describe the actual supported behavior;
- package/release version becomes `0.1.0`.

### Explicit non-goals

These **do not block v0.1**:

- universal natural-fauna initialization across all map sizes/seeds;
- default-on fauna;
- predators or a second animal species;
- kingdoms, diplomacy, war, conquest or rebellion;
- meteor/plague;
- final art/UX polish.

Current compact-fauna research is therefore closed as a v0.1 blocker after Sprint030. Its evidence moves forward to v0.2.

---

## v0.2.0 — Living Ecology

Goal: make ecology a coherent **opt-in world capability** rather than a research-only subsystem.

### Intended scope

- explicit natural-fauna activation semantics (preset/config, not necessarily default);
- a documented support matrix for map sizes/presets rather than a universal initializer requirement;
- one validated natural grazer initialization path for supported configurations;
- save/load and deterministic continuation with activated ecology;
- ecology metrics/inspection that make births, deaths, resource pressure and extinction understandable;
- preserve coherent natural extinction instead of adding a hidden survival controller.

### Non-goals

- guaranteeing animal survival in every seed;
- solving every compact-map topology;
- predators/multi-species food webs unless a separate gate justifies them;
- civilization systems.

---

## v0.3.0 — Civilizations

Goal: turn settlements and ancestry into historical polities without inventing labels that lack causal structure.

### Intended scope

- kingdom/polity formation;
- ruler selection/succession;
- diplomacy relations;
- war/peace;
- conquest and rebellion;
- readable territory/ownership visualization and historical causality for political change.

---

## v0.4.0 — God Game

Goal: make intervention itself a coherent play loop.

### Intended scope

- meteor and plague;
- stronger power feedback/history integration;
- god-tool UX and inspection polish;
- scenario/preset improvements for quickly creating interesting worlds.

---

## v0.5.0 — World Story Alpha

Goal: integrate the previous systems into a public-facing alpha that is compelling to watch without developer knowledge.

Focus on onboarding, scenario presets, performance, observability, history navigation, balance between systems, packaging and documentation. New systemic breadth is secondary to making the existing world legible and replayable.

---

## v1.0 direction

`v1.0` is not “feature complete.” It means the sandbox has a stable identity and compatibility contract: reproducible worlds, coherent causal history, documented save/version policy, a dependable watch/intervene loop, and enough integrated systems that ordinary users can create interesting histories without relying on research scaffolding.

## Current decision

As of 2026-08-24, the project is **not in an endless ecology phase**. It is in **v0.1 release hardening**. The next management objective is to close the finite v0.1 release checklist and tag a real version before beginning v0.2 ecology work.