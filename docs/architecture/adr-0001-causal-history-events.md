# ADR-0001: Stable causal references for world history

Status: Accepted  
Date: 2026-08-23

## Context

WorldBoxSR keeps a bounded history of major events for debugging, replay explanation, analytics, and eventually a player-facing timeline. As settlements, kingdoms, wars, disasters, and god powers arrive, a flat list of messages is not enough: the engine must be able to answer questions such as “what caused this?” without retaining JavaScript object pointers or an unbounded event graph.

The simulation is deterministic and snapshots are authoritative. Any history identity scheme therefore has to survive save/load and must not depend on renderer state, array positions, timestamps, or process-local object identity.

## Decision

### 1. Every retained major event has a stable world-scoped integer ID

`world.nextEventId` allocates monotonically increasing event IDs. IDs are never reused, even when old events leave the bounded `world.history` retention window.

The minimum event envelope is:

```js
{
  id: 123,
  day: 4567,
  type: 'settlement.founded',
  // optional subject / causes / domain-specific payload
}
```

`history[index]` is never an identity. It is only a position in the current retention window.

### 2. Subjects identify what an event is about

When useful, an event may have one serialized `subject` reference:

```js
{ kind: 'world' }
{ kind: 'entity', entityKind: 'human', id: 17 }
{ kind: 'entity', entityKind: 'settlement', id: 3 }
```

Subjects do not imply causation.

### 3. Causes are explicit serialized references

An event may carry a small ordered `causes` array. Supported reference kinds are:

```js
{ kind: 'command', id: 9, commandType: 'spawn_human' }
{ kind: 'entity', entityKind: 'human', id: 17 }
{ kind: 'event', id: 122 }
```

No cause contains a live object pointer. Domain-specific scalar fields such as `cause: 'starvation'` may coexist with causal references; `causes` is reserved for identity links.

Event references may only point backward to an event that already existed when the new event is appended. This prevents causal cycles by construction.

### 4. Accepted commands receive stable IDs at the authoritative boundary

`world.nextCommandId` allocates a command ID only after a command has passed validation. Rejected commands do not consume IDs. Command IDs are persisted in snapshots so god actions and future simulation commands remain reproducible across save/load.

A command does not need a second unbounded command log. Major command effects can include a command reference in the resulting event. If richer command auditing is needed later, it can be added without changing the reference shape.

### 5. Causal parents are allowed to expire from the retention window

`world.history` remains bounded by `maxEventHistory`. When an old parent event is evicted, a newer event may legitimately retain `{ kind: 'event', id: oldId }` as an unresolved reference.

Consumers must treat this as “known parent ID, details no longer retained,” not as corruption. This keeps long simulations cheap while preserving stable identity.

### 6. Record major causal transitions, not every simulation operation

The history layer is not an event-sourcing database. Food consumption, every movement step, and every tick are intentionally not recorded. Events should represent changes that are useful for world history, debugging, or explanation: births/deaths when retained, settlement founding, kingdom changes, wars, disasters, god commands, and similar transitions.

## Determinism and serialization

- `nextEventId` and `nextCommandId` are snapshot state.
- Event and command IDs are integers allocated only by deterministic authoritative code paths.
- Cause order is deterministic and semantically meaningful when multiple causes exist.
- References contain only JSON-safe primitives.
- Adding a causal reference must not consume the simulation RNG.
- The snapshot schema version is bumped when the counters become authoritative state.

## Consequences

Positive:

- history UI can traverse “why did this happen?” relationships;
- regression reports can cite stable event IDs;
- save/load preserves causal identity;
- bounded retention stays cheap;
- future kingdoms/wars/disasters do not require an event-graph rewrite.

Tradeoffs:

- a retained event can point to an event whose details were evicted;
- not every event will have a cause, especially during incremental migration;
- command IDs add a small amount of world state.

## Rejected alternatives

**Array index as event ID** — breaks whenever bounded history evicts the front of the array.

**Wall-clock timestamps / UUIDs** — unnecessary, larger, and hostile to deterministic replay.

**JavaScript object references** — cannot survive serialization and couple history to runtime object identity.

**Unbounded event graph/database now** — over-designed for the current personal open-source project and would make long headless simulations more expensive before we have evidence it is needed.
