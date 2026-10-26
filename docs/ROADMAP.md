# Quruvchi roadmap

## Current implementation
- [x] Responsive static website and authenticated chat
- [x] Native Node.js HTTP server with SQLite persistence
- [x] Scrypt password hashing, hashed session/device tokens, Origin checks and rate limits
- [x] Claude Messages API tool-use loop with timeout, retry, cancellation and history repair
- [x] Authenticated Roblox Studio plugin bridge with one-time pairing
- [x] Tool handlers for hierarchy, scripts, properties, deletion, opt-in code execution and logs
- [x] Fake provider/plugin end-to-end test and GitHub Actions check
- [x] Docker and Render deployment templates

## Next steps
- [ ] Run a manual session with a real Anthropic key and a disposable Roblox Studio place
- [ ] Add Luau static analysis where a reliable, maintainable checker is available
- [ ] Add diff/approval UI for destructive or broad changes
- [ ] Add shared rate-limit and command state if horizontal scaling is ever required
- [ ] Add backup/restore drill for the persistent SQLite database
- [ ] Add browser accessibility and real mobile-device testing

The app must never claim a game was tested or published unless the action actually succeeded. Generated Luau still needs a real Studio Play-test.
