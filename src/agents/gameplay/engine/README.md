# Quruvchi MAX Gameplay Engine v2

This additive engine layer wraps the original Gameplay Agent V2 without replacing its implementation.

## Modules

- `analyzer.js`: static Luau source and multi-file project analysis.
- `blueprint.js`: deterministic gameplay architecture, module, folder, remote-contract and persistence planning.
- `validator.js`: source, blueprint, security-policy and project validation.
- `index.js`: public compatibility facade that preserves legacy Gameplay Agent result fields and adds a unified engine report.

## Public API

The facade exports request inspection, gameplay planning, blueprint generation, source/project analysis, artifact/blueprint validation, report formatting, catalogs and engine metadata.

## Verification boundary

The engine analyzes source and plans Roblox architecture; it does not execute Luau or mutate Roblox Studio. Static validation is not a Studio Play-test. Studio execution, multiplayer behavior and DataStore behavior still require manual verification in Roblox Studio.
