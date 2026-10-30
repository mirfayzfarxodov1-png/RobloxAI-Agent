# Quruvchi Specialist Engine Layer

This layer adds adapters around the existing specialist agents without rewriting their source files.

## Layout

- `world/engine/`: world request analysis, world blueprint generation, validation and public API.
- `ui/engine/`: UI intent analysis, multi-screen blueprint generation, validation and public API.
- `gameplay/engine/`: existing Gameplay Engine.
- `tool-scout/engine/`: tool discovery analysis, recommendation plan and safety validation.
- `qa/engine/`: project normalization, QA coverage blueprint and report validation.
- `engine-hub/`: optional cross-agent orchestration adapter.

## Safety boundary

The engine layer only analyzes and packages artifacts. It does not execute Luau, automatically install third-party tools, mutate Roblox Studio, or claim Play-test success. Studio changes remain the responsibility of the authenticated plugin workflow and require review.

## Compatibility

Original `agent.js` modules remain the source of truth. Engine modules import their public exports and normalize their outputs. Existing callers can continue importing the specialist agents directly.
