import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const isDev = !app.isPackaged;
function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 620,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  if (isDev && process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

const starterFiles: Record<string, string> = {
  'RobloxAI/Config.lua': [
    '-- Put this ModuleScript in ReplicatedStorage/RobloxAI named Config.',
    'local Config = {}',
    'Config.StartingCoins = 100',
    'Config.EggCost = 25',
    'Config.MaxRequestsPerSecond = 3',
    'Config.Pets = {',
    '    { Name = "Meadow Bunny", Weight = 60, Multiplier = 1.2 },',
    '    { Name = "Clover Cat", Weight = 30, Multiplier = 1.5 },',
    '    { Name = "Golden Deer", Weight = 10, Multiplier = 2.0 },',
    '}',
    'return Config'
  ].join('\n'),
  'RobloxAI/Main.server.lua': [
    '-- Place in ServerScriptService. Requires ReplicatedStorage/RobloxAI/Config.',
    '-- Server owns coins, egg rolls, pet inventory, and persistence.',
    'local Players = game:GetService("Players")',
    'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
    'local DataStoreService = game:GetService("DataStoreService")',
    'local root = ReplicatedStorage:WaitForChild("RobloxAI")',
    'local Config = require(root:WaitForChild("Config"))',
    'local remotes = root:FindFirstChild("Remotes") or Instance.new("Folder")',
    'remotes.Name = "Remotes"; remotes.Parent = root',
    'local function getRemote(name)',
    '    local r = remotes:FindFirstChild(name) or Instance.new("RemoteFunction")',
    '    r.Name = name; r.Parent = remotes; return r',
    'end',
    'local getState, openEgg = getRemote("GetState"), getRemote("OpenEgg")',
    'local store = DataStoreService:GetDataStore("RobloxAI_StarterMeadow_v1")',
    'local profiles, buckets = {}, {}',
    'local function newProfile() return { Coins = Config.StartingCoins, Pets = {} } end',
    'local function allowed(player)',
    '    local now = os.clock(); local b = buckets[player] or { start = now, count = 0 }',
    '    if now - b.start >= 1 then b = { start = now, count = 0 } end',
    '    b.count += 1; buckets[player] = b; return b.count <= Config.MaxRequestsPerSecond',
    'end',
    'local function state(player)',
    '    local p = profiles[player]; if not p then return nil end',
    '    return { Coins = p.Coins, Pets = p.Pets }',
    'end',
    'getState.OnServerInvoke = function(player)',
    '    if not allowed(player) then return { ok = false, error = "Too many requests" } end',
    '    return { ok = true, state = state(player) }',
    'end',
    'openEgg.OnServerInvoke = function(player)',
    '    if not allowed(player) then return { ok = false, error = "Too many requests" } end',
    '    local p = profiles[player]; if not p then return { ok = false, error = "Profile is loading" } end',
    '    if p.Coins < Config.EggCost then return { ok = false, error = "Not enough coins" } end',
    '    local total = 0; for _, pet in ipairs(Config.Pets) do total += math.max(0, pet.Weight) end',
    '    if total <= 0 then return { ok = false, error = "Invalid egg configuration" } end',
    '    local roll, cumulative, chosen = math.random() * total, 0, Config.Pets[1]',
    '    for _, pet in ipairs(Config.Pets) do cumulative += math.max(0, pet.Weight); if roll <= cumulative then chosen = pet; break end end',
    '    p.Coins -= Config.EggCost',
    '    table.insert(p.Pets, { Name = chosen.Name, Multiplier = chosen.Multiplier })',
    '    return { ok = true, pet = chosen.Name, state = state(player) }',
    'end',
    'Players.PlayerAdded:Connect(function(player)',
    '    local ok, data = pcall(function() return store:GetAsync("u_" .. player.UserId) end)',
    '    profiles[player] = (ok and type(data) == "table" and type(data.Coins) == "number" and type(data.Pets) == "table") and data or newProfile()',
    'end)',
    'local function save(player)',
    '    local p = profiles[player]; if not p then return end',
    '    local ok, err = pcall(function() store:SetAsync("u_" .. player.UserId, p) end)',
    '    if not ok then warn("[RobloxAI] DataStore save failed:", err) end',
    'end',
    'Players.PlayerRemoving:Connect(function(player) save(player); profiles[player], buckets[player] = nil, nil end)',
    'game:BindToClose(function() for _, player in ipairs(Players:GetPlayers()) do save(player) end end)'
  ].join('\n'),
  'RobloxAI/Client.client.lua': [
    '-- Place this LocalScript in StarterPlayer/StarterPlayerScripts.',
    'local Players = game:GetService("Players")',
    'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
    'local player = Players.LocalPlayer',
    'local root = ReplicatedStorage:WaitForChild("RobloxAI")',
    'local remotes = root:WaitForChild("Remotes")',
    'local getState, openEgg = remotes:WaitForChild("GetState"), remotes:WaitForChild("OpenEgg")',
    'local gui = Instance.new("ScreenGui"); gui.Name = "RobloxAIStarterUI"; gui.ResetOnSpawn = false',
    'gui.Parent = player:WaitForChild("PlayerGui")',
    'local panel = Instance.new("Frame"); panel.Size = UDim2.fromOffset(300, 150)',
    'panel.Position = UDim2.new(0, 18, 0, 18); panel.BackgroundColor3 = Color3.fromRGB(26, 36, 52); panel.Parent = gui',
    'Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 12)',
    'local coins = Instance.new("TextLabel"); coins.Size = UDim2.new(1, -20, 0, 40); coins.Position = UDim2.fromOffset(10, 8)',
    'coins.BackgroundTransparency = 1; coins.TextColor3 = Color3.new(1,1,1); coins.TextScaled = true',
    'coins.Font = Enum.Font.GothamBold; coins.Text = "Coins: ..."; coins.Parent = panel',
    'local egg = Instance.new("TextButton"); egg.Size = UDim2.new(1, -20, 0, 46); egg.Position = UDim2.fromOffset(10, 58)',
    'egg.BackgroundColor3 = Color3.fromRGB(83, 180, 130); egg.TextColor3 = Color3.new(1,1,1); egg.TextScaled = true',
    'egg.Font = Enum.Font.GothamBold; egg.Text = "Open Meadow Egg (25)"; egg.Parent = panel',
    'Instance.new("UICorner", egg).CornerRadius = UDim.new(0, 8)',
    'local status = Instance.new("TextLabel"); status.Size = UDim2.new(1, -20, 0, 26); status.Position = UDim2.fromOffset(10, 112)',
    'status.BackgroundTransparency = 1; status.TextColor3 = Color3.fromRGB(210,220,235); status.TextScaled = true',
    'status.Text = "Starter Meadow"; status.Parent = panel',
    'local function refresh()',
    '    local ok, result = pcall(function() return getState:InvokeServer() end)',
    '    if ok and result and result.ok and result.state then coins.Text = "Coins: " .. tostring(result.state.Coins)',
    '    else status.Text = "Could not load player state" end',
    'end',
    'egg.Activated:Connect(function()',
    '    egg.Active = false',
    '    local ok, result = pcall(function() return openEgg:InvokeServer() end)',
    '    if ok and result and result.ok then status.Text = "You got: " .. tostring(result.pet); if result.state then coins.Text = "Coins: " .. tostring(result.state.Coins) end',
    '    else status.Text = ok and result and result.error or "Request failed" end',
    '    egg.Active = true',
    'end)',
    'refresh()'
  ].join('\n'),
  'IMPORT-INSTRUCTIONS.md': [
    '# Import into Roblox Studio',
    '',
    '1. Create a folder named RobloxAI in ReplicatedStorage.',
    '2. Create a ModuleScript named Config inside it and paste RobloxAI/Config.lua.',
    '3. Create a Script in ServerScriptService and paste RobloxAI/Main.server.lua.',
    '4. Create a LocalScript in StarterPlayer > StarterPlayerScripts and paste RobloxAI/Client.client.lua.',
    '5. For DataStore testing, publish a private test place and enable Studio API access for that test place.',
    '6. Test with two players in Studio and inspect the Output window.',
    '',
    'This is a starter template, not a finished game. Review and test before publishing.'
  ].join('\n')
};

ipcMain.handle('project:generate', async (_event, rawName: unknown) => {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name || name.length > 50 || /[<>:"/\\|?*]/.test(name) || name === '.' || name === '..') {
    return { ok: false, error: 'Invalid project name. Use up to 50 characters without path symbols.' };
  }
  const choice = await dialog.showOpenDialog({ title: 'Choose parent folder', properties: ['openDirectory', 'createDirectory'] });
  if (choice.canceled || !choice.filePaths[0]) return { ok: false, error: 'Cancelled: no folder selected.' };
  const target = path.join(choice.filePaths[0], name);
  try { await access(target); return { ok: false, error: 'That project folder already exists. No files were changed.' }; }
  catch { /* target does not exist */ }
  await mkdir(target, { recursive: false });
  for (const [relative, content] of Object.entries(starterFiles)) {
    const output = path.join(target, relative);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, content + '\n', { encoding: 'utf8', flag: 'wx' });
  }
  return { ok: true, path: target, files: Object.keys(starterFiles).length };
});

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
