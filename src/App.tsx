import { useState } from 'react';
import JSZip from 'jszip';
import { Bot, Boxes, CheckCircle2, Download, Gamepad2, Github, ShieldCheck, Sparkles, Wrench, FileCode2, PackageCheck } from 'lucide-react';

const configLua = `-- ModuleScript: ReplicatedStorage/RobloxAI/Config
local Config = {}
Config.StartingCoins = 100
Config.EggCost = 25
Config.MaxRequestsPerSecond = 3
Config.Pets = {
    { Name = "Meadow Bunny", Weight = 60, Multiplier = 1.2 },
    { Name = "Clover Cat", Weight = 30, Multiplier = 1.5 },
    { Name = "Golden Deer", Weight = 10, Multiplier = 2.0 },
}
return Config
`;

const serverLua = `-- Script: ServerScriptService/RobloxAI_Main
-- Server owns coins, egg rolls, inventory and persistence.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local root = ReplicatedStorage:WaitForChild("RobloxAI")
local Config = require(root:WaitForChild("Config"))
local remotes = root:FindFirstChild("Remotes") or Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = root

local function getRemote(name)
    local remote = remotes:FindFirstChild(name) or Instance.new("RemoteFunction")
    remote.Name = name
    remote.Parent = remotes
    return remote
end

local getState = getRemote("GetState")
local openEgg = getRemote("OpenEgg")
local store = DataStoreService:GetDataStore("RobloxAI_StarterMeadow_v1")
local profiles, buckets = {}, {}

local function newProfile()
    return { Coins = Config.StartingCoins, Pets = {} }
end

local function allowed(player)
    local now = os.clock()
    local bucket = buckets[player] or { started = now, count = 0 }
    if now - bucket.started >= 1 then bucket = { started = now, count = 0 } end
    bucket.count += 1
    buckets[player] = bucket
    return bucket.count <= Config.MaxRequestsPerSecond
end

local function getPublicState(player)
    local profile = profiles[player]
    if not profile then return nil end
    return { Coins = profile.Coins, Pets = profile.Pets }
end

getState.OnServerInvoke = function(player)
    if not allowed(player) then return { ok = false, error = "Too many requests" } end
    return { ok = true, state = getPublicState(player) }
end

openEgg.OnServerInvoke = function(player)
    if not allowed(player) then return { ok = false, error = "Too many requests" } end
    local profile = profiles[player]
    if not profile then return { ok = false, error = "Profile is loading" } end
    if profile.Coins < Config.EggCost then return { ok = false, error = "Not enough coins" } end

    local totalWeight = 0
    for _, pet in ipairs(Config.Pets) do totalWeight += math.max(0, pet.Weight) end
    if totalWeight <= 0 then return { ok = false, error = "Invalid egg configuration" } end

    local roll, running, chosen = math.random() * totalWeight, 0, Config.Pets[1]
    for _, pet in ipairs(Config.Pets) do
        running += math.max(0, pet.Weight)
        if roll <= running then chosen = pet; break end
    end
    profile.Coins -= Config.EggCost
    table.insert(profile.Pets, { Name = chosen.Name, Multiplier = chosen.Multiplier })
    return { ok = true, pet = chosen.Name, state = getPublicState(player) }
end

Players.PlayerAdded:Connect(function(player)
    local ok, data = pcall(function() return store:GetAsync("u_" .. player.UserId) end)
    profiles[player] = (ok and type(data) == "table" and type(data.Coins) == "number" and type(data.Pets) == "table") and data or newProfile()
end)

local function save(player)
    local profile = profiles[player]
    if not profile then return end
    local ok, err = pcall(function() store:SetAsync("u_" .. player.UserId, profile) end)
    if not ok then warn("[RobloxAI] DataStore save failed:", err) end
end

Players.PlayerRemoving:Connect(function(player)
    save(player)
    profiles[player], buckets[player] = nil, nil
end)

game:BindToClose(function()
    for _, player in ipairs(Players:GetPlayers()) do save(player) end
end)
`;

const clientLua = `-- LocalScript: StarterPlayer/StarterPlayerScripts/RobloxAI_Client
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local root = ReplicatedStorage:WaitForChild("RobloxAI")
local remotes = root:WaitForChild("Remotes")
local getState = remotes:WaitForChild("GetState")
local openEgg = remotes:WaitForChild("OpenEgg")

local gui = Instance.new("ScreenGui")
gui.Name = "RobloxAIStarterUI"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local panel = Instance.new("Frame")
panel.Size = UDim2.fromOffset(300, 150)
panel.Position = UDim2.new(0, 18, 0, 18)
panel.BackgroundColor3 = Color3.fromRGB(26, 36, 52)
panel.Parent = gui
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 12)

local coins = Instance.new("TextLabel")
coins.Size = UDim2.new(1, -20, 0, 40)
coins.Position = UDim2.fromOffset(10, 8)
coins.BackgroundTransparency = 1
coins.TextColor3 = Color3.new(1, 1, 1)
coins.TextScaled = true
coins.Font = Enum.Font.GothamBold
coins.Text = "Coins: ..."
coins.Parent = panel

local egg = Instance.new("TextButton")
egg.Size = UDim2.new(1, -20, 0, 46)
egg.Position = UDim2.fromOffset(10, 58)
egg.BackgroundColor3 = Color3.fromRGB(83, 180, 130)
egg.TextColor3 = Color3.new(1, 1, 1)
egg.TextScaled = true
egg.Font = Enum.Font.GothamBold
egg.Text = "Open Meadow Egg (25)"
egg.Parent = panel
Instance.new("UICorner", egg).CornerRadius = UDim.new(0, 8)

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 26)
status.Position = UDim2.fromOffset(10, 112)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(210, 220, 235)
status.TextScaled = true
status.Text = "Starter Meadow"
status.Parent = panel

local function refresh()
    local ok, result = pcall(function() return getState:InvokeServer() end)
    if ok and result and result.ok and result.state then
        coins.Text = "Coins: " .. tostring(result.state.Coins)
    else
        status.Text = "Could not load player state"
    end
end

egg.Activated:Connect(function()
    egg.Active = false
    local ok, result = pcall(function() return openEgg:InvokeServer() end)
    if ok and result and result.ok then
        status.Text = "You got: " .. tostring(result.pet)
        if result.state then coins.Text = "Coins: " .. tostring(result.state.Coins) end
    else
        status.Text = ok and result and result.error or "Request failed"
    end
    egg.Active = true
end)

refresh()
`;

const instructions = `# RobloxAI Agent — Starter Meadow

## Import into Roblox Studio
1. Open Roblox Studio and your test place.
2. In ReplicatedStorage, create a Folder named RobloxAI.
3. Inside RobloxAI, create a ModuleScript named Config and paste Config.lua.
4. In ServerScriptService, create a Script named RobloxAI_Main and paste Main.server.lua.
5. In StarterPlayer > StarterPlayerScripts, create a LocalScript named RobloxAI_Client and paste Client.client.lua.
6. Publish a private test place and enable Studio API access if you want to test DataStore.
7. Use Studio's Test tab with multiple players and inspect the Output window.

## Scope
This starter contains one Starter Meadow zone, coins, egg opening, pet entries, a basic UI, and a DataStore starter. It intentionally does not include extra zones, stealing mechanics, or Robux purchases.

## Important
This is a starter template, not a complete or verified game. Review the scripts, test them in a private place, and fix any Studio Output errors before publishing. DataStore errors are logged with a warning.
`;

export default function App() {
  const [projectName, setProjectName] = useState('Starter Meadow');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  async function generate() {
    const cleanName = projectName.trim();
    if (!cleanName || cleanName.length > 50 || /[<>:"/\\|?*]/.test(cleanName) || cleanName === '.' || cleanName === '..') {
      setMessage('Loyiha nomi 1–50 belgi bo‘lsin. \\ / : * ? " < > | belgilaridan foydalanma.');
      setDownloaded(false);
      return;
    }
    setBusy(true);
    setMessage('');
    setDownloaded(false);
    try {
      const zip = new JSZip();
      const folder = zip.folder(cleanName)!;
      folder.file('RobloxAI/Config.lua', configLua);
      folder.file('RobloxAI/Main.server.lua', serverLua);
      folder.file('RobloxAI/Client.client.lua', clientLua);
      folder.file('IMPORT-INSTRUCTIONS.md', instructions);
      folder.file('README.md', `# ${cleanName}\n\nGenerated by RobloxAI Agent website.\n\nRead IMPORT-INSTRUCTIONS.md before importing into Roblox Studio.\n`);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = cleanName.replace(/[^a-zA-Z0-9_-]+/g, '-') + '.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setMessage('ZIP fayl tayyor: 3 ta Luau skripti va import yo‘riqnomasi yuklab olindi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ZIP yaratishda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Bot size={23}/></div><div><strong>RobloxAI</strong><span>GAME BUILDER</span></div></div>
      <div className="nav-label">ISH MAYDONI</div>
      <div className="nav-item active"><Boxes size={17}/> Loyiha generatori</div>
      <div className="nav-item muted"><Wrench size={17}/> Studio bridge <small>KEYIN</small></div>
      <div className="nav-item muted"><ShieldCheck size={17}/> Test va tuzatish <small>KEYIN</small></div>
      <div className="sidebar-bottom"><i/> Brauzerda ishlaydi <span>v0.2.0</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><span>Ish maydoni /</span> Loyiha generatori</div><a href="https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent" target="_blank" rel="noreferrer"><Github size={16}/> GitHub repo</a></header>
      <div className="hero">
        <div className="eyebrow"><Sparkles size={14}/> ROBLOX ISHLAB CHIQISH AGENTI</div>
        <h1>G‘oyadan<br/><em>o‘yin poydevorigacha.</em></h1>
        <p>Roblox loyihasi uchun Luau skriptlari, oddiy o‘yin interfeysi va Studio’ga import qilish yo‘riqnomasini ZIP qilib yuklab ol. Hozircha bu starter generator — AI va Studio avtomatizatsiyasi keyingi bosqichlarda qo‘shiladi.</p>
        <div className="hero-tags"><span><CheckCircle2 size={14}/> ZIP yuklab olish</span><span><CheckCircle2 size={14}/> Server tekshiruvlari</span><span><CheckCircle2 size={14}/> Mavjud faylni bosmaydi</span></div>
      </div>
      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-heading"><div className="panel-icon"><Gamepad2 size={18}/></div><div><h2>Roblox loyihasini yaratish</h2><p>Nomini tanla va starter fayllarni ol</p></div><span className="step">01 / 03</span></div>
          <label htmlFor="project-name">LOYIHA NOMI</label>
          <input id="project-name" value={projectName} onChange={e => setProjectName(e.target.value)} maxLength={50} placeholder="Mening Roblox o‘yinim"/>
          <div className="scope-card"><div className="scope-top"><span>STARTER SHABLON</span><span className="scope-badge">MVP</span></div><h3>Starter Meadow</h3><p>Pet yig‘ish va asosiy o‘yin sikli uchun kichik poydevor.</p><div className="feature-list"><span><CheckCircle2 size={15}/> Coin va tuxum ochish</span><span><CheckCircle2 size={15}/> Pet ma’lumotlari</span><span><CheckCircle2 size={15}/> Oddiy o‘yin UI</span><span><CheckCircle2 size={15}/> DataStore namunasi</span></div></div>
          <button className="primary" onClick={generate} disabled={busy || !projectName.trim()}>{busy ? 'ZIP tayyorlanmoqda...' : <><Download size={17}/> ZIP faylni yaratish</>}</button>
          {message && <div className={downloaded ? 'result success' : 'result error'}>{downloaded ? <PackageCheck size={17}/> : <ShieldCheck size={17}/>}<div>{message}</div></div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div className="panel-icon purple"><Sparkles size={18}/></div><div><h2>Agent bosqichlari</h2><p>Ushbu versiyada nimalar bor</p></div></div>
          <div className="pipeline">
            <div className="pipeline-row"><div className="pipeline-number done"><CheckCircle2 size={16}/></div><div><strong>Starter fayllarni yaratish</strong><p>Brauzer ichida ZIP tayyorlash</p></div><span className="pill ready">TAYYOR</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><Bot size={16}/></div><div><strong>AI reja va kod generatori</strong><p>AI provayderini xavfsiz ulash</p></div><span className="pill planned">KEYIN</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><Wrench size={16}/></div><div><strong>Roblox Studio bridge</strong><p>Skriptlarni uzatish va loglarni olish</p></div><span className="pill planned">KEYIN</span></div>
            <div className="pipeline-row"><div className="pipeline-number"><ShieldCheck size={16}/></div><div><strong>Avtomatik test va tuzatish</strong><p>Xatoni topish va xavfsiz qayta urinish</p></div><span className="pill planned">KEYIN</span></div>
          </div>
          <div className="notice"><ShieldCheck size={18}/><div><strong>Xavfsizlik birinchi o‘rinda</strong><p>Sayt faqat ZIP faylni brauzer orqali yuklaydi. Hozircha Roblox Studio’ni o‘zi boshqarmaydi va o‘yinni test qilmaydi.</p></div></div>
        </section>
      </div>
      <div className="files-strip"><div><FileCode2 size={17}/><span><strong>Config.lua</strong><small>O‘yin sozlamalari</small></span></div><div><FileCode2 size={17}/><span><strong>Main.server.lua</strong><small>Server logikasi</small></span></div><div><FileCode2 size={17}/><span><strong>Client.client.lua</strong><small>O‘yin interfeysi</small></span></div></div>
      <footer>RobloxAI Agent <span>Roblox loyihalarini bosqichma-bosqich yaratish uchun</span></footer>
    </section>
  </main>;
}