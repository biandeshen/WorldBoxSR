# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active release candidate is **v0.5.0 — World Stories**. Release gate: #208. Release-only handoff: #220. Finite backlog: `docs/backlog/v0.5.md`.

All five World Stories implementation/product gates are complete and merged to `main`:
- Causal Event Card — #209 / #211;
- Focused Story Trail — #212 / #213;
- Bookmarks / Watchlist — #214 / #215;
- Chronicle navigation/readability — #216 / #217;
- Canonical World Stories gate — #218 / #219.

PR #219 merged at `b79d4de283bfcf968cd524c68bb08926dda2d463`. The post-implementation `main` verification is complete: CI #675 passed, full Chromium visual-qa #185 passed, and Pages #39 passed build, deploy and the final public `/play/` URL check.

**v0.5 feature implementation is frozen.** Branch `release/v0.5.0` / issue #220 may change only release packaging and release/status documentation. It must not add product, simulation, renderer or interaction behavior. Tag/Release `v0.5.0` is **not yet claimed shipped** until the release PR merges and release automation + final public delivery are verified.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories is a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs are normal under bounded history and remain visible rather than guessed. Focus, Watchlist and Chronicle-lens selection stay outside world/snapshot authority.

## v0.5 Causal Event Card evidence

- selected retained events project into readable cards with headline/detail/provenance plus ordered Subject and Causes;
- retained event refs can open another Event Card;
- current human/creature/settlement/warband refs can navigate to their current map tile; polity refs use the current capital when available;
- command refs and expired entity/event refs remain explicitly unavailable with truthful reasons;
- real Chromium uses real Lightning pointer input to produce ruler death → normal causal succession, then follows the retained death-event cause and a current map-capable reference while authoritative world fingerprint remains unchanged;
- the slice did not change Chronicle representative-event selection policy.

## v0.5 Focused Story Trail evidence

- exact retained-history predicates support explicit polity, warband and one-hop event focus alongside existing human/creature/settlement focus;
- `historyForReference` dispatches only supported stable refs and never infers current-state membership;
- event focus is deliberately one hop: selected event + direct retained children only;
- `story_trail` is pure presentation projection, chronological oldest→newest, fixed limit 8, and preserves unavailable stable focus identity;
- Event Card exposes `Follow this event` and supported `Follow story` actions; trail rows reopen Event Cards; Clear/reset remove only presentation focus;
- natural seed45 Chromium obtains an explicit 8-event polity trail, opens a trail event, clears focus and verifies authoritative world fingerprint is unchanged.

## v0.5 Watchlist evidence

- Watchlist stores only stable retained-event or supported entity refs; it never writes world/history/snapshots or consumes RNG;
- list is capped at 6, Pin↔Unpin is exact/idempotent, and malformed/duplicate/unsupported persisted entries are sanitized;
- persistence is same-tab session-only through `sessionStorage`; there is no cloud/cross-device canonical memory;
- each render re-resolves stable refs through current authoritative history/entity lookup; removed entities and evicted events remain pinned but visibly unavailable;
- a first real reload test caught a genuine warmup race; runtime now waits for `scene.booting === false` before Watchlist re-resolution;
- final Chromium pins `event:163` + Eldergate Realm (`polity:1`), browses elsewhere, reopens the pinned event, same-tab reload restores both `2/6` refs, then Unpin/Clear stores `[]`;
- authoritative world fingerprint remains unchanged on both sides of reload.

## v0.5 Chronicle navigation/readability evidence

- Chronicle exposes exactly four compact player lenses: `Highlights · Recent · Conflict · Rule`;
- `Highlights` delegates exactly to the existing representative `civilizationChronicle(..., { limit: 7 })` behavior;
- `Recent` is newest-first readable retained World Story history; `Conflict` and `Rule` use explicit fixed event-type memberships only;
- every lens is capped at 7 and truthful empty states never backfill unrelated history;
- rows preserve `data-event-id` and the existing Event Card navigation path; lens state is presentation-only and is not persisted;
- pure/runtime tests prove exact memberships/default equivalence and snapshot/RNG neutrality;
- merged-main Chromium traverses all lenses, opens a non-default Event Card, restores exact Highlights, preserves Focused Story + Watchlist, and keeps authoritative world state unchanged.

## v0.5 Canonical World Stories gate evidence

- the first gate draft intentionally asked static natural seed45 history for one Event Card with retained event cause + current map ref + >=2-event entity trail; Chromium proved that stronger-than-release conjunction does not exist naturally, so the gate was corrected rather than inventing causality;
- final gate uses ordinary shipped gameplay: real Lightning strikes Lindenvale Dominion ruler #23; authority records `god.lightning` #172 + `human.died` #173 and normal succession Event #178 for Human #29;
- paused post-succession world is the read-only baseline; all subsequent story/navigation operations preserve its serialized fingerprint;
- Event #178 visibly states `Human #29 succeeds Human #23 after death`, with Lindenvale Dominion Subject and Event #173 / Human #29 Causes;
- browser follows Event #173, maps polity #3 to capital Lindenvale, Pins `event:178` + `polity:3`, then follows polity #3 through `[122,123,124,125,127,128,130,131]` and opens Event #123;
- same session round-trips Recent / Conflict / Rule and restores exact Highlights `[178,135,134,120,119,117,115]` while preserving the open Event Card, focus and Watchlist;
- no raw engine JSON is exposed; post-causality authoritative fingerprint + paused state remain unchanged throughout;
- canonical helper is hard-bounded at 75 seconds so a CDP/browser stall produces a finite failed gate with partial-stage diagnostics;
- manual review of the fixed 1440×900 canonical screenshots confirms the Event Card, Focused Story, Watchlist and lens tabs are readable while the map remains the primary surface.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Focus/bookmark/navigation state stays presentation-only and outside world snapshots.
- Watchlist is explicit player memory, not canonical world importance.
- Living Ecology is v0.6 work and cannot start inside the v0.5 release handoff.

## Current decision gate

1. keep `release/v0.5.0` release-only: package `0.5.0`, release/demo docs, README/ROADMAP/STATUS/backlog only;
2. require release PR normal CI + full Chromium success on its final head;
3. merge the release PR to `main` without feature code;
4. verify release-merge `main` CI, full Chromium, Pages build/deploy/final public `/play/` check;
5. verify release workflow creates tag `v0.5.0` and GitHub Release from `docs/releases/v0.5.0.md` at the intended release commit;
6. only after those checks, close #208 and #220 and mark v0.5.0 shipped in final status closure;
7. do not start v0.6 Living Ecology until v0.5.0 is verifiably shipped.
