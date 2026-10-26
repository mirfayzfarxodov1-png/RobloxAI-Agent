# Quruvchi — Roblox Studio AI web interface

Quruvchi is a responsive, browser-based control panel concept for an AI assistant that helps build Roblox Studio projects. The UI includes a chat workspace, project suggestions, Studio pairing modal, usage indicator, settings, help, and login/register screens.

## Run locally (Windows)

1. Install Node.js 20 LTS or newer.
2. Download or clone this repository.
3. Open PowerShell in the project folder.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite, usually http://localhost:5173.

## Validate and build

```powershell
npm test
npm run build
npm run preview
```

## Current status

- The **website interface** is implemented in React + Vite and is responsive for desktop and mobile.
- The frontend is prepared to call backend routes such as `/api/login`, `/api/register`, `/api/me`, `/api/stream`, `/api/chat`, `/api/pair`, and `/api/stop`.
- If the backend is not deployed, the website shows that the backend is unavailable; it does not pretend that an AI request was completed.
- The AI agent server, persistent database, Anthropic API integration, and Roblox Studio plugin are **not implemented by this frontend change**. The Studio pairing UI is currently a front-end shell until those services are connected.
- Do not put a private AI API key in browser code. AI provider keys must stay on a server.

## Deployment

This is a Vite app. Build with `npm run build` and deploy the generated `dist/` directory to a static host. For a fully working chat and Studio bridge, deploy the matching backend and configure the host/proxy so the website's `/api/*` requests reach it. A static host alone cannot run the AI agent or Studio bridge.
