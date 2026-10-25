# RobloxAI Agent

Windows desktop MVP for generating Roblox Luau starter projects.

## Current status
- Electron + React + TypeScript desktop shell
- Local starter-project export into a folder you choose
- Starter Meadow scope: one zone, coins, egg opening, pets, basic UI, and DataStore starter
- Windows CI workflow for tests and build

## Requirements
- Windows 10/11 64-bit
- Node.js 20+ and npm
- Roblox Studio for importing/testing the exported Luau scripts

## Run
```powershell
npm install
npm run dev
```

## Build
```powershell
npm test
npm run build
npm run package:win
```

The current version exports starter scripts locally. It does not yet control Roblox Studio, run play-tests, use an AI model, or publish a game. Those are roadmap items. No extra zones, stealing mechanics, or Robux features are included in this starter.

See docs/ROADMAP.md and docs/SECURITY.md.
