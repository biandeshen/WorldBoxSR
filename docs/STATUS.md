# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active release is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

All five World Stories implementation/product gates are now complete through deterministic + real-browser evidence:
- Causal Event Card — #209 / #211 — merged on `main`;
- Focused Story Trail — #212 / #213 — merged on `main`;
- Bookmarks / Watchlist — #214 / #215 — merged on `main`;
- Chronicle navigation/readability — #216 / #217 — merged on `main`; merged-main CI, Pages, Chromium and public `/play/` all passed;
- Canonical World Stories gate — #218 / #219 — implementation gate green with one coherent real-player browser path; ready for documentation-synchronized merge.

**No v0.5 feature work remains after #219.** Once #219 is merged and merged-main delivery checks pass, freeze implementation and perform only the release handoff: package version, release notes/docs, tag/release and final Pages/public verification. Do not start AI summary, replay, ecology or v0.6 work before `v0.5.0` is verifiably shipped.

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
- natural seed45 Chromium obtains an explicit 8-event polity trail, opens a trail event, clears focus and verifies authoritative world fingerprint is unchanged;
- merged-main CI, Pages, Chromium and public `/play/` verification passed.

## v0.5 Watchlist evidence

- Watchlist stores only stable retained-event or supported entity refs; it never writes world/history/snapshots or consumes RNG;
- list is capped at 6, Pin↔Unpin is exact/idempotent, and malformed/duplicate/unsupported persisted entries are sanitized;
- persistence is same-tab session-only through `sessionStorage`; there is no cloud/cross-device canonical memory;
- each render re-resolves stable refs through current authoritative history/entity lookup; removed entities and evicted events remain pinned but visibly unavailable;
- a first real reload test caught a genuine warmup race; runtime now waits for `scene.booting === false` before Watchlist re-resolution;
- final Chromium pins `event:163` + Eldergate Realm (`polity:1`), browses elsewhere, reopens the pinned event, same-tab reload restores both `2/6` refs, then Unpin/Clear stores `[]`;
- authoritative world fingerprint remains unchanged on both sides of reload;
- merged-main CI, Pages, Chromium and public `/play/` verification passed.

## v0.5 Chronicle navigation/readability evidence

- Chronicle exposes exactly four compact player lenses: `Highlights · Recent · Conflict · Rule`;
- `Highlights` delegates exactly to the existing representative `civilizationChronicle(..., { limit: 7 })` behavior; no priority/dedupe/slot retuning is hidden in this slice;
- `Recent` is newest-first readable retained World Story history; `Conflict` and `Rule` use explicit fixed event-type memberships only;
- every lens is capped at 7 and truthful empty states never backfill unrelated history;
- rows preserve `data-event-id` and the existing Event Card navigation path; lens state is presentation-only and is not persisted;
- pure/runtime tests prove exact memberships/default equivalence and snapshot/RNG neutrality;
- branch and merged-main Chromium gates traverse all lenses, open a non-default Event Card, restore exact Highlights, preserve Focused Story + Watchlist, and keep authoritative world state unchanged;
- PR #217 merged at `63e4c483a3dd489a54ec2fe07907cbb0f135c2d9`; merged `main` CI #667, Pages #38 including final public Play URL verification, and visual-qa #177 all passed.

## v0.5 Canonical World Stories gate evidence

- first gate draft intentionally asked natural static seed45 history for one Event Card with retained event cause + current map ref + >=2-event entity trail; Chromium proved that stronger-than-release conjunction does not exist naturally, so the gate was corrected rather than inventing causality;
- final gate uses ordinary shipped gameplay: real Lightning strikes Lindenvale Dominion ruler #23; authority records `god.lightning` #172 + `human.died` #173 and normal succession Event #178 for Human #29;
- paused post-succession world is the read-only baseline; all subsequent story/navigation operations must preserve its serialized fingerprint;
- Event #178 visibly states `Human #29 succeeds Human #23 after death`, with Lindenvale Dominion Subject and Event #173 / Human #29 Causes;
- browser follows Event #173, maps polity #3 to capital Lindenvale, Pins `event:178` + `polity:3`, then follows polity #3 through `[122,123,124,125,127,128,130,131]` and opens Event #123;
- same session round-trips Recent / Conflict / Rule and restores exact Highlights `[178,135,134,120,119,117,115]` while preserving the open Event Card, focus and Watchlist;
- no raw engine JSON is exposed; post-causality authoritative fingerprint + paused state remain unchanged throughout;
- canonical helper is hard-bounded at 75 seconds so a CDP/browser stall produces a finite failed gate with partial-stage diagnostics;
- CI #672 and visual-qa #182 are green on branch head `c980062baef19366e55d2027f931cd09bbb48a2c`; manual review of the three 1440×900 canonical screenshots confirms the Event Card, Focused Story, Watchlist and lens tabs are readable while the map remains the primary surface.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- Ecology research remains deferred until v0.6.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Focus/bookmark/navigation state stays presentation-only and outside world snapshots.
- Watchlist is explicit player memory, not canonical world importance.

## Current decision gate

1. require documentation-synchronized #219 normal CI + full Chromium success;
2. squash merge #219 and close #218;
3. verify merged `main` CI, Pages, Chromium and public `/play/` deployment;
4. freeze v0.5 implementation;
5. create exactly one release-only `v0.5.0` handoff branch/PR: package version + release/demo docs + README/ROADMAP/STATUS/release-gate closure only;
6. merge release handoff after CI + Chromium success and verify automated tag/Release `v0.5.0`, Pages and public `/play/`;
7. do not start v0.6 ecology until v0.5.0 is verifiably shipped.
