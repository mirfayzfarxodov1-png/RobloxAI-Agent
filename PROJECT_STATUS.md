# Project status

Implemented in source:
- Static responsive website with safe text rendering (no AI output inserted as HTML).
- Native Node.js 22.13+ HTTP server; no runtime npm dependencies.
- SQLite persistence for users, sessions, devices, conversations, messages, and usage.
- scrypt password hashing, hashed random session/device tokens, one-time pairing codes, Origin checks, and request rate limits.
- Anthropic Messages API tool-use loop with bounded retries, timeout, stop support, daily and per-task tool limits, and history repair.
- Roblox Studio plugin handlers for get_tree, create_tree, create_script, read_script, set_properties, delete_instance, run_code, and get_logs.
- Fake Claude API and fake plugin test helpers; end-to-end test for auth, pairing, tool results, cancellation, and revocation.
- Docker and Render deployment templates.

Not claimed as verified:
- The code has not been run against a real Roblox Studio session in this editing session.
- The GitHub Actions end-to-end test passed on commit 6980fbcbd25978d250ecb421095a8df00f886680 (Node.js 22.13.0; 1 test, 0 failures).
- The project is not deployed to a public host by these commits.
- AI-generated code can contain errors; actual Play-testing is manual.

## Multi-Agent and verification workflow

Implemented on main:
- Four independent specialist analyses (architecture, Roblox security, QA, and code review) run in parallel for complex tasks when an AI provider is configured.
- Specialist results are passed to the lead agent as untrusted review context; the lead remains responsible for decisions and actual Studio changes.
- Provider token usage from successful specialist responses is included in usage accounting; failed specialist calls degrade gracefully.
- The system prompt now requires evidence-driven inspect → minimal fix → re-check loops, safer preview/snapshot use, static/performance audits, and explicit separation of automated checks from manual Roblox Play tests.

Verification boundary:
- Multi-Agent analysis is not available in the API-free template mode.
- Static audits and Output logs do not replace Roblox Studio Play or multiplayer tests.
- The new orchestrator has unit tests; repository-wide checks must be confirmed by CI after the main commit.

## Research-grounded planning and title preservation

- Project plans now preserve the user's exact game title and provide a detailed 10-phase default roadmap for large projects.
- Data persistence is explicitly classified as a planning decision; the plan does not claim DataStore has passed Roblox Studio runtime tests.
- Plans can include sanitized HTTPS research sources, summaries, official-domain labels, and a visible quality checklist.
- Research instructions require searching before building, carrying source URLs into the plan, and continuing into Studio implementation when the user asked to build.
- Search parsing pairs snippets with their result containers where available to reduce mismatched source summaries.

Verification boundary:
- Research search results are references, not proof that all content on linked pages was fully read or that code/runtime behavior was tested.
- Roblox Studio Play, DataStore API Services, and multiplayer behavior still require real Studio testing.

## Organized V2 and SUPER modules

- Added dedicated `public/v2/` and `public/super/` browser bundles and isolated style refinements.
- Added `src/v2/` for project planning/memory and local toolkit engine.
- Added `src/super/` for architecture/build specifications, QA, model specs, and a deterministic build-package orchestrator.
- Server and tests use the organized module paths; legacy root entry points remain compatibility re-exports.
- The SUPER package explicitly labels Studio application as requiring plugin confirmation and Play-test as not run until a real Studio test is performed.
