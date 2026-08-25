# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active product stage is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

Four ordered World Stories implementation slices are complete through branch-level deterministic + real-browser evidence:
- Causal Event Card — #209 / #211 — merged on `main`;
- Focused Story Trail — #212 / #213 — merged on `main`;
- Bookmarks / Watchlist — #214 / #215 — merged on `main`;
- Chronicle navigation/readability — #216 / #217 — implementation and real Chromium gate complete; ready for documentation-synchronized merge.

After #217 merges and merged-main delivery checks pass, the only remaining v0.5 implementation work is **one canonical World Stories product gate** that proves the release promise in one coherent first-time-player browser path. Do not start AI summary, replay, ecology or release-only version work before that gate closes.

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
- each render re-resolves the stable refs through current authoritative history/entity lookup; removed entities and evicted events remain pinned but visibly unavailable;
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
- real Chromium seed45 records Highlights `[163,135,134,120,119,117,115]`, traverses Recent `[163,162,159,158,157,156,155]`, Conflict `[134,120,119,117,115,114,111]`, Rule `[163,162,159,158,157,156,155]`, opens Event #163 from a non-default lens, then restores the exact original Highlights IDs;
- the same browser session establishes `event:163` as Focused Story + Watchlist state before switching lenses and proves both states remain unchanged;
- serialized authoritative world fingerprint and paused state remain unchanged throughout;
- branch head `eb56a1741ac94ed3b0b462f2512f2163c107c2f2` passed normal CI and the full real Chromium visual gate; fixed 1440×900 evidence remains compact and map-primary.

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

1. require documentation-synchronized #217 CI + full Chromium success;
2. squash merge #217 and close #216;
3. verify merged `main` CI, Pages, Chromium and public `/play/` deployment;
4. open exactly one finite **canonical World Stories gate** issue/branch;
5. prove in one fresh seed45 browser session that a first-time player can choose a meaningful recorded event, understand recorded participants/causes, navigate to a related world object, preserve it and recover/follow a coherent bounded story without raw engine JSON;
6. only after that gate merges, perform the release-only `v0.5.0` package/docs/tag/Pages handoff;
7. do not start v0.6 ecology until v0.5.0 is verifiably shipped.
