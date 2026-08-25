# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active product stage is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

The first implementation slice **Causal Event Card — #209 / #211** is complete pending merge. The only next implementation slice after merged-main verification is **Focused story trail**.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories remains a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / stable IDs are authoritative; unresolved refs are normal under bounded history and remain visible rather than guessed.

## v0.5 Causal Event Card evidence

- retained-reference resolution now covers current polity and warband refs already emitted by authoritative history;
- one selected retained event projects into a readable card with headline/detail/provenance plus ordered Subject and Causes;
- retained event refs can open another Event Card;
- current human/creature/settlement/warband refs can navigate to their current map tile; polity refs use the current capital when available;
- command refs and expired entity/event refs remain explicitly unavailable with truthful reasons;
- navigation is presentation-only; deterministic tests require exact snapshot/RNG neutrality;
- real Chromium on seed45 uses real Lightning pointer input to kill a ruler with a deterministic successor, lets normal simulation record succession with the ruler-death event as an explicit cause, then opens the visible succession Event Card;
- Chromium follows the retained death-event cause and a current map-capable reference with real mouse input and verifies the serialized authoritative world fingerprint is unchanged by story navigation;
- manual screenshot review confirms the succession card, unavailable dead-ruler subject, retained death/Lightning causal chain and map-reference navigation are player-readable;
- the first slice no longer changes Chronicle representative-event selection policy; broader Chronicle strategy remains deferred to its own later slice.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- Ecology research remains deferred until v0.6.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Bookmarks/focus/navigation state stay presentation-only and outside world snapshots.

## Current decision gate

1. require the documentation-synchronized #211 head to remain CI + Chromium green;
2. squash merge #211 and close #209;
3. verify merged `main` CI, Pages and Chromium;
4. open a finite **Focused story trail** issue/branch and implement only explicit-reference story focus;
5. do not start bookmarks, AI summary, replay or broader Chronicle redesign before the focused-trail slice closes.
