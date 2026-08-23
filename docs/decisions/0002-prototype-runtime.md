# ADR-0002: Zero-dependency Node.js prototype runtime

- Status: Accepted for Phase 0
- Date: 2026-08-23

## Decision

Start the simulation kernel in modern JavaScript on Node.js 22 with zero runtime dependencies.

## Why

- same code can run headless and later in a browser/WebGL client;
- extremely low setup cost for AI agents and CI;
- built-in test runner is enough for Phase 0;
- avoids prematurely coupling world rules to a game engine.

## Revisit trigger

Re-evaluate runtime only when profiling shows a real simulation-scale bottleneck or a chosen client requires a stronger integration path. A rewrite is not justified by preference alone.
