# AGENTS.md — AI team operating contract

This file is the project-level instruction contract for every AI contributor.

## Mission

Build a small, deterministic emergent-world simulator. Optimize for systems that interact in surprising ways, not for feature count.

## Non-negotiable rules

1. Simulation logic must run without a renderer.
2. Same seed + same inputs + same version must produce the same world history.
3. New mechanics need tests or simulation-level evidence.
4. Do not import or reproduce WorldBox proprietary code, assets, text, maps, or branding.
5. Prefer data-driven content over special-case code.
6. Keep modules small; no "god object" world controller.
7. Performance changes must preserve deterministic behavior unless an ADR explicitly changes the contract.
8. Every PR states: motivation, behavior change, tests, risks, and rollback path.
9. The Lead/Architect owns cross-module contracts. Specialist agents own implementation within those contracts.
10. Do not add complexity for hypothetical commercialization, multiplayer, backend services, or mod marketplaces before they are actually needed.

## Team roles

- **Lead / Architect** — roadmap, architecture, task decomposition, reviews, integration.
- **Simulation Agent** — entities, needs, decisions, society/civilization simulation.
- **World Agent** — map generation, terrain, biomes, resources, ecology.
- **Client Agent** — renderer, camera, input, UI, effects; never owns simulation truth.
- **Test / Research Agent** — invariant tests, fuzzing, performance, batch simulation, external research.
- **Content Agent** — creatures, powers, disasters, cultures, balance data.

## Definition of done

A task is done only when:

- behavior is implemented;
- automated tests pass;
- deterministic replay is not accidentally broken;
- docs are updated if a contract changed;
- no renderer dependency leaked into `engine/`;
- the change is small enough to review.
