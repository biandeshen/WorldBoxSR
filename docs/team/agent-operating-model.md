# AI team operating model

The "team" is a set of roles and review responsibilities, not six agents making unrelated architectural decisions.

## Lead / Architect

Owns the roadmap, module contracts, issue decomposition, integration order, and final review. Keeps the active work-in-progress small.

## Specialist lanes

| Lane | Owns | Must not own |
| --- | --- | --- |
| Simulation | needs, action choice, population, society | renderer/UI |
| World | terrain, biomes, resources, ecology | civilization policy |
| Client | rendering, camera, input, UI | authoritative world state |
| Test/Research | invariants, fuzzing, benchmarks, experiments | silent product changes |
| Content | data packs, powers, species, tuning | new engine abstractions without review |

## Work protocol

1. Lead creates a narrow task with acceptance criteria.
2. One lane owns implementation.
3. Another lane reviews tests/architecture when risk is non-trivial.
4. CI and deterministic regression run.
5. Lead merges or sends back with a concrete failure mode.

## AI advantage we deliberately exploit

- run many seeded worlds instead of manually watching one;
- compare distributions, not anecdotes;
- generate adversarial state combinations;
- trace causality from event logs;
- keep architecture decisions as executable project memory.
