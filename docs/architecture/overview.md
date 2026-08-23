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
- rolling major-event history;
- configuration values.

## Future modules

- settlement aggregation;
- territory ownership;
- kingdom state machines;
- diplomacy and war;
- disasters / god powers as commands;
- event causality graph;
- render adapters.
