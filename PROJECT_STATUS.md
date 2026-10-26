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
- The code has not been run against a real Roblox Studio session or real Anthropic API key in this editing session.
- The GitHub Actions end-to-end test passed on commit 6980fbcbd25978d250ecb421095a8df00f886680 (Node.js 22.13.0; 1 test, 0 failures).
- The project is not deployed to a public host by these commits.
- AI-generated code can contain errors; actual Play-testing is manual.
