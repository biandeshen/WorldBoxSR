# ADR-0001: Headless simulation is the product core

- Status: Accepted
- Date: 2026-08-23

## Decision

The simulation engine must execute without graphics, input devices, or a scene tree. A renderer is an adapter over simulation state.

## Why

This enables deterministic regression tests, long simulations, automated balance experiments, fuzzing, profiling, and future alternative clients.

## Consequence

Client convenience APIs cannot be imported into `engine/`. Visual effects may approximate events but may not mutate authoritative state directly.
