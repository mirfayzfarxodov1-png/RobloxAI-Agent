# Studio Integration Boundary

This folder contains the integration-only adapter between Quruvchi's existing specialist outputs and the existing Roblox Studio plugin protocol.

## Responsibilities

- Convert the already-generated World/UI/Gameplay outputs into the plugin's established command payloads.
- Validate payload shape, source size, and server script path before anything is sent to Studio.
- Dispatch commands sequentially through the authenticated `src/hub.js` queue.
- Preserve progress and result callbacks for the existing web chat.
- Use only the plugin commands already implemented in `plugin/Quruvchi.lua`: `create_tree`, `create_script`, `audit_project`, and `get_logs`.

## Deliberate non-goals

- No edits to `src/agents/**` specialist implementations (Gameplay, World, UI, QA, Tool Scout).
- No edits to `plugin/Quruvchi.lua`.
- No UI redesign or agent prompt/logic rewrite.
- No new branch, dependency, token format, or plugin endpoint.

The adapter is intentionally a narrow boundary. The orchestrator imports it, while all specialist agents and the Studio plugin retain their existing contracts and source files.
