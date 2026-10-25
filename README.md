# RobloxAI Agent Website

Browser-based React + Vite website for generating a Roblox Luau starter project ZIP.

## Run locally (Windows)
1. Install Node.js 20 LTS or newer.
2. Download this repository ZIP from GitHub and extract it.
3. Open the extracted folder in Terminal / PowerShell.
4. Run:
   ```powershell
   npm install
   npm run dev
   ```
5. Open the URL printed by Vite, normally http://localhost:5173.

## Build
```powershell
npm test
npm run build
npm run preview
``

The site runs in a browser and downloads a ZIP containing Config.lua, Main.server.lua, Client.client.lua and import instructions. Current version is a starter generator only. It does not yet use an AI model, control Roblox Studio, run Studio play-tests, repair Studio errors automatically, or publish a game. Never put a private AI API key in browser code; a future AI integration must use a backend.
