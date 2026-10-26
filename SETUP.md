# Quruvchi setup checklist

## Local Windows

1. Install Node.js 22.13 or newer.
2. Copy .env.example to .env.
3. Set ANTHROPIC_API_KEY in .env. Never commit the real key.
4. Keep PUBLIC_URL=http://localhost:3000 and COOKIE_SECURE=false for local HTTP.
5. Run npm start and open http://localhost:3000.
6. Register, choose Studio ulash, then create the one-time code.
7. Download /plugin.lua, install it as a local Studio plugin, enable HTTP requests in Studio settings, enter the code, and connect.

No npm install is required. The runtime uses only built-in Node.js modules.

## Production

Set NODE_ENV=production, PORT to the host port, PUBLIC_URL to the exact HTTPS origin, COOKIE_SECURE=true, DATA_DIR to persistent storage, and ANTHROPIC_API_KEY to the provider secret. Set INVITE_CODE if you need registration restrictions. Confirm the provider model is available to your account.

After deploy, check /healthz, register a test account, connect a disposable Studio place, run a simple create_tree request, and revoke the device. Do not treat a successful HTTP health check as proof that Claude or Studio tools are working.

## Troubleshooting

- Startup says ANTHROPIC_API_KEY is required: set the key in server environment or .env.
- Browser POST gets Origin error: open the exact PUBLIC_URL and ensure it matches the page origin, including localhost vs 127.0.0.1.
- Studio pairing fails: create a fresh code; it expires after ten minutes and is single-use.
- Studio says HTTP request failed: verify the server is still running, enable HTTP Requests in Studio settings, and re-download `/plugin.lua` after changing `PUBLIC_URL`. For local installs, the download uses `127.0.0.1` when `PUBLIC_URL` is `localhost` to avoid loopback name-resolution issues. The browser can still use `http://localhost:3000`.
- AI tool times out: check Studio connection, server logs, provider access, and the command timeout.
- DataStore calls fail in Studio: enable Studio Access to API Services in Game Settings → Security and test carefully.
