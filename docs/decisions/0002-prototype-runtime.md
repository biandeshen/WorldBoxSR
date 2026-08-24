# ADR-0002: Zero-dependency Node.js prototype runtime

- Status: **Accepted for the authoritative simulation kernel; presentation dependency policy superseded by ADR-0003**
- Date: 2026-08-23
- Updated: 2026-08-24

## Decision

Start the simulation kernel in modern JavaScript on Node.js 22 with zero runtime dependencies.

## Why

- same authoritative code can run headless and in a browser client;
- extremely low setup cost for AI agents and CI;
- built-in test runner is enough for core simulation validation;
- avoids coupling world rules to a game engine.

## Revisit trigger

Re-evaluate only when profiling shows a real simulation-scale bottleneck or a chosen client requires a stronger integration path. A simulation rewrite is not justified by preference alone.

## 2026-08-24 clarification

The public v0.1 demo proved that the **presentation layer** does require a stronger integration path. ADR-0003 therefore adopts Phaser/Vite for browser presentation while deliberately preserving this ADR's framework-independent JS simulation-kernel decision.

The phrase "zero runtime dependencies" should no longer be interpreted as a product requirement for the client.
