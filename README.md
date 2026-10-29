# Quruvchi — Roblox Studio AI Builder

Quruvchi is an Uzbek-first web application with a local template-based game builder and Roblox Studio plugin. It generates supported Luau starter projects without an external AI provider or API key.

## Requirements

- Node.js **22.13.0 or newer** (uses native node:sqlite).
- Roblox Studio. No external AI API key or provider account is required.
- Roblox Studio.

The application intentionally has **no external npm runtime dependencies and no external AI-provider integration**. Its local template builder supports obby/parkour, collectible simulators, tycoons, and a decorative 3D world. It can extend those templates through bounded improvement stages, but it is not a general-purpose LLM and cannot reliably implement every arbitrary game idea. It uses Node.js built-ins, including node:http, node:crypto, and node:sqlite.

## Local setup on Windows

1. Install Node.js 22.13+.
2. Clone or download this repository and open PowerShell in the project folder.
3. Start the server with **npm start**. The website works without any external AI configuration.
4. Open **http://localhost:3000**. If you only want to see the website, that is enough.
5. Optional: copy `.env.example` to `.env` to configure the local server address and registration options. No external AI provider is used.
6. Start `npm start`. Create an account, then use **Studio ulash** to generate a one-time pairing code.

No npm install is required because the project has no external dependencies. SQLite database files are created under data/.

## Referral links and shared server

After signing in, open **Taklif havolasi** in the sidebar and copy your personal link. The link uses this server's `PUBLIC_URL`, and a successful signup through it is counted under the referring account. Existing databases are migrated automatically and existing accounts receive a referral code.

For another computer to reach the same server, `PUBLIC_URL` must be a reachable address, not `localhost` or `127.0.0.1`. On one Wi-Fi/LAN, set it to the host computer's LAN IPv4 address (for example, `http://192.168.1.20:3000`), allow TCP port 3000 in Windows Firewall, and restart the server. For people on different networks, deploy to a public HTTPS host. The referral link opens the server owner's website; it does not make a private localhost server public by itself.

## Connect Roblox Studio

1. Open Roblox Studio in Edit mode.
2. In Game Settings → Security, enable HTTP requests. Only do this for a project you control.
3. In Quruvchi, click **Studio ulash → Ulash kodini olish**.
4. Download the plugin from the same modal. It is also available at /plugin.lua; the server embeds PUBLIC_URL into the download.
5. Install the downloaded Quruvchi.lua as a local Studio plugin, restart Studio if needed, then open the **Quruvchi AI** toolbar panel.
6. Enter the eight-character code and click **Ulanish**.
7. Ask Quruvchi to inspect or change the project. Review the plugin log and test changes in a separate place before using them in an important game.

The plugin uses long-polling with bearer-token authentication. Pairing codes expire after ten minutes and can only be used once. You can revoke a device from the website.

## Local step-by-step game building

Quruvchi supports starter templates for obby/parkour, collectible simulators, tycoons, and a decorative 3D world. In the same conversation, follow-up requests such as “endi yaxshila” advance the current template through bounded professional passes: fall recovery, progress/leaderstats, and lifecycle telemetry. The full updated Luau script is returned for copying and written to `ServerScriptService/QuruvchiFreeBuilder/FreeGame.server.lua` when Studio is connected. Always use Studio Play mode and Output to verify the generated game; the template generator does not replace a general-purpose reasoning model or automatic runtime testing.

## Large-project planning

The app includes deterministic project-planning utilities for multi-system Roblox projects. These create a Markdown plan with gameplay loop, features, phases, acceptance criteria, and safety guardrails without mutating Studio. This is a planning aid, not a guarantee that every listed system is implemented or tested in Roblox Studio.

## Tests

Run **npm test**.

The end-to-end test starts a temporary server and simulates a Studio plugin. It checks authentication, Origin/CSRF checks, pairing-code single-use behavior, local-template script delivery, and device revocation.

## Production deployment

Use HTTPS and persistent storage. Set these environment variables in your host's secret/environment settings:

- NODE_ENV=production
- PORT to the port provided by the host
- PUBLIC_URL=https://your-real-hostname (exact origin, no trailing path)
- COOKIE_SECURE=true
- DATA_DIR=/data (or another persistent directory)
- Optionally INVITE_CODE to restrict registration

Use the included Dockerfile or render.yaml as a deployment starting point. A public site is **not deployed by committing these files**; hosting must still be configured and started.

## Architecture

- public/ — static HTML, CSS, and browser JavaScript. No framework and no inline scripts.
- src/server.js — native HTTP server, routes, CSRF/Origin checks, static delivery, and plugin download.
- src/auth.js — native scrypt password hashing, random sessions, hashed session tokens, and HTTP-only cookies.
- src/db.js — native SQLite schema, conversations, messages, and usage.
- src/agent.js — local template generation, Studio delivery, cancellation, and daily limits.
- src/hub.js — SSE events, device status, long-poll command queue, timeouts, and result matching.
- src/tools.js — tool schemas.
- src/prompt.js — Roblox-specific system prompt.
- plugin/Quruvchi.lua — Studio plugin and supported tool handlers.
- test/ — API-free server and Studio plugin end-to-end tests.

## Studio project audit

The plugin now includes an **AI AUDIT · Loyihani tekshirish** action and an `audit_project` tool. It reports bounded static diagnostics such as instance/part/script/GUI/remote counts, empty or unusually long scripts, disabled scripts, duplicate sibling names, and potentially expensive part counts. Findings are hints, not automatic fixes; duplicate names and disabled scripts can be intentional. Audit does not run Play mode or prove runtime correctness.


- AI-generated code can be wrong. Quruvchi does not promise zero defects.
- The plugin cannot press Play or claim a runtime test passed. You must test in Studio and send “logs” if something fails.
- External asset IDs are not guessed. Roblox APIs, permissions, DataStore availability, and Studio settings can affect results.
- run_code is intentionally disabled until you explicitly enable it in the plugin. Only enable it for code and projects you trust.
- The local template builder is deterministic and limited to supported templates; it is not a general-purpose AI model.

## Safer build workflow and GUI scaffolding

- `preview_tree` validates an upcoming tree and reports create/update/class-conflict counts without changing Studio.
- `snapshot_instance` clones one selected subtree into `ServerStorage/QuruvchiSnapshots` (up to 10 snapshots). Save/publish the place to persist the backup. This is an in-place Roblox backup, not an external project file.
- `restore_snapshot` requires explicit confirmation and replaces the current subtree with the saved copy. Use only when you deliberately want to restore that named snapshot.
- `create_gui_template` creates a responsive ScreenGui scaffold with a close action, status label, and action buttons. The buttons raise a local BindableEvent; connect each action to real game logic and validated server remotes before treating it as a complete feature.
- These helpers improve safety but do not replace source control, a separate place copy, code review, or Studio Play tests.

- `performance_audit` reports static counts for parts, unanchored parts, lights, particle emitters, beams/trails, sounds, and scripts; it cannot measure FPS.
- `check_asset_ids` checks up to 20 Roblox asset IDs with MarketplaceService metadata. A failed lookup may be a permissions/API restriction, and successful metadata does not guarantee the asset is allowed in a particular experience.


## Quruvchi V3 Workbench

V3 adds a deterministic, API-keyless architecture planner; a connected-Studio build spec; multi-pass heuristic Luau/performance/security audit; QA test matrix; and parametric model spec. Open Quruvchi V2 → V3 AI Studio in the signed-in app. The V3 endpoint is authenticated and rate-limited.

The architecture planner is deterministic, not a generative model. Build Spec is copied into the existing chat so the connected agent can inspect the Studio tree and use supported plugin tools. Audit is heuristic/static, not a full Luau parser. QA matrices remain not-run until tests happen in Studio. Model specs do not create mesh files by themselves.

Run npm test on Node.js 22.13+ to verify V3 tests with the existing suite.


## Game DNA Engine

Open **Quruvchi V2 → Game DNA**. The authenticated `/api/game-dna` endpoint saves a versioned per-user SQLite manifest containing exact Roblox paths, folder structure, Script/LocalScript/ModuleScript responsibilities, dependencies, phases and safety gates. The **Luau kodlarni yozdirib Studio’da yaratish** button sends the manifest into the existing agent chat. The local planner is deterministic. Game DNA can prepare a structured plan, but actual automatic implementation is limited to the local templates; the plugin's `create_script` handler creates missing parent folders automatically.

The local planner is deterministic and does not itself generate general-purpose Luau source. Without a configured provider, code generation remains limited to existing starter templates. A manifest is a plan, not proof that Studio objects exist. The agent must report actual tool acknowledgements, and Play-test remains not-run until tested in Studio.


## Quruvchi MAX local agent architecture

The API-free MAX builder is split into isolated specialist modules so changes can be tested and improved independently:

- `src/agents/world/agent.js`: generates a wide, editable Workspace scene tree with a zig-zag obby route, checkpoints, scenery, simulator collectibles, or tycoon plots.
- `src/agents/ui/agent.js`: generates `StarterGui/QuruvchiMAXUI` and a separate `UIController.client.lua` that opens/closes Shop, Inventory, and Quest panels.
- `src/agents/gameplay/agent.js`: describes the gameplay systems for the selected template.
- `src/agents/tool-scout/agent.js`: free-first catalog of built-in Studio tools and guidance for reviewing Creator Store assets.
- `src/agents/qa/agent.js`: validates the local scene tree and checks required objects before Studio commands are sent.
- `src/agent.js`: orchestrates World, UI, Gameplay, Studio audit, and Output-log commands.

Generated gameplay scripts reuse the existing `Workspace/QuruvchiFreeWorld` and matching named parts rather than deleting the generated scene before Play. The build pipeline creates the World, UI, UI controller, and gameplay script separately, then asks the plugin to audit the project and inspect Output errors.

Tool Scout deliberately does not claim it can live-search the full Roblox Toolbox through a local-only engine. Built-in Studio parts, UI instances, and Terrain Editor are free. Community assets should be checked in Studio's Creator Store/Toolbox for price, creator, permissions, and scripts before insertion. No third-party model is silently purchased or inserted.

The local generator is deterministic rather than a general-purpose language model: it can reliably build and improve its supported templates, but arbitrary game ideas still require new template systems and a Play-test in Roblox Studio.
