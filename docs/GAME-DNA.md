# Game DNA Engine

## API
- `GET /api/game-dna`: returns the signed-in user's saved manifest or `project: null`.
- `POST /api/game-dna`: validates the idea, builds a deterministic manifest, and saves an incrementing version for the signed-in user. Existing auth and per-user rate limiting apply.

## Workflow
1. Create/save the manifest in V2 → Game DNA.
2. Send the manifest into the existing chat with the build button.
3. When Studio is connected, the agent inspects the project and writes complete Luau scripts via `create_script`; missing parent folders are created by the plugin.
4. Review tool acknowledgements, read back scripts, inspect audit/logs.
5. Run Play-test manually. The manifest alone is not evidence of Studio changes or runtime correctness.

## Boundaries
The planner is deterministic and does not generate arbitrary Luau source. General-purpose generation needs an external provider; no-key mode is limited to current templates. Current storage keeps only the latest manifest per user, not full revision history.
