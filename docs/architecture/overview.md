# Architecture overview

## Boundary

```text
player input / renderer
        |
        v
   command adapter
        |
        v
+-------------------+
| deterministic     |
| simulation engine |
+-------------------+
        |
        +--> event stream --> history / UI / analytics
        |
        +--> snapshots -----> save/load / replay
```

`engine/` is authoritative. `client/` may read world state and submit commands, but it cannot become the source of simulation truth.

## Tick model

The prototype uses one simulated day per tick. Systems execute in a fixed order:

1. environment regeneration;
2. human needs/decisions/actions;
3. cleanup/death processing;
4. clock advancement;
5. periodic metrics/events.

Fixed ordering is part of determinism.

## State

A world snapshot contains:

- version;
- seed and RNG state;
- simulation clock;
- map dimensions and tile data;
- entity table and next entity id;
- rolling major-event history with stable event/command identity;
- configuration values.

## Future modules

- settlement aggregation;
- territory ownership;
- kingdom state machines;
- diplomacy and war;
- disasters / god powers as commands;
- causal history traversal / timeline UI;
- render adapters.

## History causality

Major events use stable world-scoped IDs and serialized causal references rather than array positions or object pointers. The bounded history window may evict a parent while newer events retain its ID. See [`adr-0001-causal-history-events.md`](adr-0001-causal-history-events.md).
