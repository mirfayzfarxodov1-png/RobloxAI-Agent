# Quruvchi — Roblox Studio AI Builder

Quruvchi is a full-stack, Uzbek-first web app for planning Roblox games, generating Luau guidance, and sending supported creation tasks to a Roblox Studio plugin.

## Features

- React + Vite responsive website.
- Express backend with registration/login, bcrypt password hashing, signed HTTP-only session cookie, request limits, and SQLite persistence.
- Anthropic API integration on the server; the provider key is never read by browser code.
- Chat history and server-sent events for live status/messages.
- One-time expiring Studio pairing codes, hashed Studio tokens, plugin heartbeat, task queue, and result reporting.
- Studio plugin supports a limited set of actions: create Part, Folder, Script/LocalScript/ModuleScript, and set an allowlist of properties.
- Health endpoint at `/healthz`.

## Requirements

- Node.js 20 LTS or newer.
- An AI provider API key with access to the configured Anthropic model for live AI answers. Provider usage can cost money and may have rate limits.
- Roblox Studio to use the plugin bridge.

## Run locally on Windows

1. Install Node.js 20 LTS or newer.
2. Download/clone this repository and open PowerShell in its folder.
3. Install packages:

   ```powershell
   npm install
   ```

4. Copy the environment template and edit it:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

5. Set a unique `JWT_SECRET` (at least 32 characters) and put your AI provider key in `ANTHROPIC_API_KEY`. Do not paste the key into frontend code or commit it to GitHub.
6. Start the website and backend:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:5173`. The API runs at `http://localhost:8787`; `/healthz` reports whether an AI key is configured.

The first visit should show the login/register dialog. Create an account with a login of 3–32 letters/numbers/underscore/dot/dash and a password of at least 8 characters.

## Connect Roblox Studio

1. Start the backend and website locally or deploy the backend to HTTPS.
2. In Roblox Studio, enable HTTP requests in Game Settings > Security.
3. Install `roblox-plugin/QuruvchiBridge.plugin.lua` as a local Studio plugin.
4. In the website, choose **Studio ulash** and generate a one-time code.
5. In the plugin, enter the same server base URL (local development: `http://127.0.0.1:8787`), code, and optional place name. Click **Ulash va ishga tushirish**.
6. Ask the AI to create a specific supported object/script. The plugin polls the server task queue and reports the result.

The plugin executes only the supported action types and property allowlist in its source. Review AI-generated scripts and use a test place before applying changes to an important project. The bridge is not a substitute for Roblox Studio's own testing or security review.

## Build and run production

```powershell
npm test
npm run build
$env:NODE_ENV="production"
$env:COOKIE_SECURE="true"
npm start
```

For production, deploy over HTTPS, set a unique `JWT_SECRET`, set `COOKIE_SECURE=true`, keep the SQLite database on persistent storage, configure backups, and do not expose the SQLite file publicly. The default database file lives under `data/`.

## Important limitations

- AI quality, usage cost, availability, and rate limits depend on the configured provider and account.
- Without `ANTHROPIC_API_KEY`, the server returns a setup message instead of pretending to generate an AI answer.
- The Studio bridge supports a limited action contract, not arbitrary full-game generation. Unsupported actions are rejected. A task is not considered successful until the plugin reports a result.
- These source changes do not deploy the project to a public website. The local URL is `http://localhost:5173`; a public URL requires hosting and environment configuration.
- AI-generated code may contain defects. Review and test changes in a separate Roblox place.

## Project layout

- `src/` — website UI.
- `server/index.mjs` — API, auth, AI integration, chat history, Studio bridge.
- `roblox-plugin/QuruvchiBridge.plugin.lua` — Studio plugin.
- `.env.example` — configuration template without secrets.
