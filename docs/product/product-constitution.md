# WorldBoxSR product constitution

- Status: normative product invariant
- Date: 2026-08-24
- Change issue: #153

This document defines the long-lived product rules that should remain true even when the feature roadmap, rendering stack, balance, scenarios, or release sequence changes.

The master blueprint answers **what WorldBoxSR should become**. The roadmap answers **what we build next**. This constitution answers **what future work is not allowed to break**.

## 1. Player promise

A WorldBoxSR player should be able to:

1. open a world and understand that it is alive before reading documentation or debug metrics;
2. observe autonomous change without micromanaging every entity;
3. intervene through explicit god powers and immediately understand what action was attempted;
4. see truthful outcomes: success, rejection, no effect, partial effect, failure, or unknown where applicable;
5. inspect important people, creatures, settlements, civilizations, places, and events through human-readable views;
6. understand major recorded consequences and, when evidence exists, trace why they happened;
7. pause, accelerate, revisit, compare, and eventually branch/replay worlds without pretending the original history never existed;
8. save and return to a world without silently replacing its identity or history;
9. create unfair, unstable, doomed, strange, or experimental worlds on purpose;
10. use the game without needing to understand the implementation machinery underneath it.

## 2. Non-negotiable product invariants

### 2.1 Direct observation before configuration

The player should see the world living before being asked to understand rules, configuration, diagnostics, or advanced overlays. Debugging tools may be powerful, but they are secondary product surfaces.

### 2.2 One authoritative world truth

The deterministic simulation state is the authoritative world truth.

Renderer state, UI state, animation interpolation, caches, screenshots, analytics, generated text, and AI output are projections or proposals. They do not become canonical world facts unless an explicit authoritative command or future equivalent world-operation path commits the change.

There must never be a second hidden simulation inside the presentation layer.

### 2.3 Deterministic core, explicit randomness

Given the same compatible build, initial world/scenario, seed, and accepted player inputs, the authoritative simulation should continue reproducibly.

Randomness is allowed and desirable, but its source must be explicit and compatible with the deterministic contract rather than silently introduced by rendering, UI, networking, or AI systems.

### 2.4 Causal honesty

Recorded facts are facts. Derived explanations are derived explanations. Unknown remains unknown.

History, chronicle, inspection, and future AI narration must never present an invented cause as authoritative history. When WorldBoxSR can explain why something happened, the explanation should trace to recorded world state/events rather than produce plausible fiction and call it fact.

### 2.5 Capability honesty

A feature that does not exist must not masquerade as complete.

Unavailable abilities may be hidden or clearly marked unavailable. An attempted operation may be rejected or have no effect. UI feedback should make these states understandable instead of showing fake success, decorative animation with no authoritative consequence, or placeholder behavior presented as finished gameplay.

### 2.6 A living world is proven by interaction, not ticking

A running clock, moving counter, healthy process, or passing test does not by itself prove the world feels alive.

A player-facing living-world slice must demonstrate at least one visible causal interaction among entities, settlements, civilizations, environment, resources, or player intervention whose result can vary or fail according to world state.

### 2.7 Failure worlds have value

Death, extinction, settlement abandonment, civilizational collapse, failed interventions, unlucky worlds, and unstable scenarios are legitimate outcomes when they are causally coherent.

Do not add hidden survival controllers merely to keep a preferred population or civilization alive. Product defaults may be tuned for legibility and fun, but the sandbox is allowed to fail.

### 2.8 Time is a sandbox tool

Pause and speed control are core. Checkpoints, comparison, rewind, branching, worldlines, and replay are later capabilities when justified by architecture and product value.

If the player changes or branches the past in a future version, the system should preserve the fact that the prior history existed rather than silently rewriting it away.

### 2.9 Player intervention is input, not a determinism violation

A god power is an explicit new input into the world. Its presentation may begin immediately, but its authoritative consequences must be committed through the simulation command/operation boundary.

A future power system should be able to represent at least successful, rejected, and no-effect outcomes where those distinctions are meaningful.

### 2.10 Presentation may dramatize, but must not lie

Particles, camera shake, sound, tweening, sprite interpolation, lighting, LOD, procedural decoration, and cinematic emphasis may make events more legible and satisfying.

They may not invent authoritative entities, deaths, births, territory changes, combat results, resources, history, or causality that the simulation did not produce.

### 2.11 AI is subordinate to world truth

AI may help generate prototype art, summarize history, propose scenarios, draft descriptions, or assist development.

AI does not receive implicit authority to invent canonical world state. Any future AI-driven character or creator tool must route proposed world changes through the same authoritative operation rules as non-AI inputs.

### 2.12 Player agency beats hidden correction

The player may deliberately create bad conditions and observe consequences. Balance systems should be world mechanics the player can understand, not invisible corrections whose sole purpose is to force a desired outcome.

### 2.13 Product progress requires a visible, truthful result

Engineering work, documents, CI, benchmarks, metrics, research, and infrastructure are supporting evidence. They are valuable, but they are not sufficient player-facing progress by themselves.

For a player-facing sprint, product progress is demonstrated when either:

- a real player action creates a new visible and truthful result; or
- the autonomous world creates a new visible and truthful result that the player can perceive and understand.

This rule is especially binding during v0.2 Playable World.

### 2.14 Semantics drive visuals, not the reverse

World/topology/state semantics determine what presentation is allowed to depict. Art direction, tile choices, generated assets, decoration, and animation should be derived from or registered against the world rather than silently redefining passability, ownership, identity, causality, or simulation state.

For v0.2 this means a lightweight sequence:

```text
authoritative world semantics
→ presentation adapter
→ visual/style rules and assets
→ rendered projection
→ player inspection/interaction
→ authoritative command when the player acts
```

A pretty screenshot is not a replacement for coherent world semantics; coherent semantics are not an excuse for an unreadable screenshot.

## 3. Three planning coordinates

WorldBoxSR deliberately separates three things that are easy to confuse:

1. **Long-range north star** — the complete product identity and capability horizon in the master blueprint.
2. **Version ladder** — the ordered player capabilities in `docs/ROADMAP.md`.
3. **Current release denominator** — only the promises and exit gates of the version currently being built.

A future idea may belong to the north star without becoming a blocker for the current release. A current implementation detail may exist without becoming a permanent product invariant.

## 4. Evidence and completion levels

Always distinguish these states:

- **product direction decided** — we know what experience we want;
- **design/contract decided** — the behavior and boundaries are specified enough to implement;
- **implementation exists** — code/assets exist;
- **automated verification passes** — tests/build/performance gates pass;
- **player gate passes** — a real playable path demonstrates the promised experience;
- **release shipped** — the version is intentionally published as a checkpoint.

Evidence from a lower level does not automatically promote a higher one. Green tests do not prove a good game; a beautiful mockup does not prove authoritative simulation behavior.

## 5. v0.2 application

Until Playable World passes its release gates:

- visual/game-feel work must produce before/after evidence;
- each feature sprint should change something a player can see or feel unless it fixes correctness required by the demo;
- the public Pages build is the main player-truth surface;
- debug UI must remain subordinate to the game surface;
- mature rendering/build/asset tools are preferred over low-level infrastructure when they shorten time to credible visible quality;
- new hidden simulation depth is deferred unless it unlocks visible behavior, intervention consequences, or story legibility.

## 6. Intentionally not adopted as current WorldBoxSR requirements

WorldBoxSR is a focused personal god-game project. It does **not** need a heavyweight product-governance or universal-world-platform architecture to honor the invariants above.

Do not introduce, merely for theoretical completeness:

- a generalized universal Entity/Law ontology across every possible genre;
- a compiler/registry/artifact system for world packages before scenarios/modding require one;
- approval matrices or file-level implementation authorization bureaucracy;
- multiple runtimes, orchestration layers, or protocol systems without a concrete product need;
- exhaustive specification assets for every future page/capability before the current playable loop needs them.

The constitution exists to prevent product drift, not to create a new process product.

## 7. Change rule

A constitutional rule should change only when new product evidence shows that the rule itself is wrong or prevents a better WorldBoxSR identity.

Changes require an explicit issue/PR explaining the old rule, the evidence for changing it, and the expected player consequence. Ordinary feature work should amend the roadmap or blueprint instead of casually weakening these invariants.
