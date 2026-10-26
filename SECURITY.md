# Security notes

## Secrets and sessions

- Keep ANTHROPIC_API_KEY in the server environment only. Never put it in public/app.js, HTML, the plugin source, or Git.
- Passwords use Node.js scrypt with a per-password random salt. Session tokens are random and only their SHA-256 hashes are stored.
- Session cookies are HttpOnly and SameSite=Lax. Set COOKIE_SECURE=true only behind HTTPS.
- Browser POST/DELETE requests require JSON content type and an Origin matching PUBLIC_URL. Plugin routes use a separate bearer token.
- Pairing codes are single-use, stored hashed, and expire after ten minutes. Device tokens are stored hashed and can be revoked.
- Login, registration, pairing, and chat have in-memory rate limits. Use one server instance or add a shared rate-limit store before horizontal scaling.
- The database directory must be on private persistent storage and must never be served as static content.

## Studio permissions

- The plugin only runs in Edit mode and never presses Play.
- Tool handlers validate paths and cap tree size, source length, tool output, and command timeouts.
- Protected services cannot be deleted through delete_instance.
- run_code is off by default and can execute code in the Studio plugin environment after the user explicitly enables it. Only enable it for code and places you trust.
- AI output is untrusted. Review generated scripts and use a test place before applying important changes.
- Enable Roblox HTTP requests only for projects you control.

## Deployment

- Use HTTPS, set PUBLIC_URL to the exact public origin, set COOKIE_SECURE=true, and provide a private persistent DATA_DIR.
- Set INVITE_CODE if registration should be restricted.
- The included in-memory command queue and rate limits are intended for a single server process. Do not horizontally scale without moving them to a shared service.
- Back up the SQLite database and test restoration before production use.
