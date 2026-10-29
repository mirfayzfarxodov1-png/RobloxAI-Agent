import { buildWorldScene } from './agents/world/agent.js';
import { buildGameUi } from './agents/ui/agent.js';
const COMMON = `-- Quruvchi Free Builder · 3D world starter
-- API-free generated Luau. All gameplay changes are server-authoritative where practical.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ROOT_NAME = "QuruvchiFreeWorld"
local world = Workspace:FindFirstChild(ROOT_NAME)
if not world then
    world = Instance.new("Folder")
    world.Name = ROOT_NAME
    world.Parent = Workspace
end

local function part(name, size, position, color, material, parent)
    local target = parent or world
    local p = target:FindFirstChild(name)
    if not p or not p:IsA("Part") then p = Instance.new("Part"); p.Name = name end
    p.Size = size
    p.Position = position
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = target
    return p
end

Lighting.ClockTime = 14
Lighting.Brightness = 2
Lighting.EnvironmentDiffuseScale = 0.5
Lighting.EnvironmentSpecularScale = 0.5
part("MainIsland", Vector3.new(180, 4, 180), Vector3.new(0, -3, 0), Color3.fromRGB(62, 150, 94), Enum.Material.Grass)
local spawn = world:FindFirstChild("PlayerSpawn") or Instance.new("SpawnLocation")
spawn.Name = "PlayerSpawn"
spawn.Size = Vector3.new(12, 1, 12)
spawn.Position = Vector3.new(0, 0, 0)
spawn.Anchored = true
spawn.Neutral = true
spawn.Color = Color3.fromRGB(70, 170, 255)
spawn.Parent = world

for i = 1, 12 do
    local angle = math.pi * 2 * i / 12
    local x, z = math.cos(angle) * 65, math.sin(angle) * 65
    part("SceneryPillar" .. i, Vector3.new(5, 12 + (i % 4) * 3, 5), Vector3.new(x, 4, z), Color3.fromRGB(80 + (i % 3) * 35, 100, 210), Enum.Material.Neon)
end

local sign = part("WelcomeSign", Vector3.new(24, 8, 1), Vector3.new(0, 8, -18), Color3.fromRGB(22, 30, 52))
local surface = Instance.new("SurfaceGui")
surface.Face = Enum.NormalId.Front
surface.Parent = sign
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.Text = "QURUVCHI · YOUR GAME STARTS HERE"
label.TextColor3 = Color3.new(1, 1, 1)
label.TextScaled = true
label.Font = Enum.Font.GothamBold
label.Parent = surface
print("[Quruvchi] World starter created. Press Play and test.")
`;

const OBBY = `-- Quruvchi Free Builder · 30-stage Obby
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local STAGE_COUNT = 30
local world = Workspace:FindFirstChild(ROOT_NAME)
if not world then
    world = Instance.new("Folder")
    world.Name = ROOT_NAME
    world.Parent = Workspace
end

local function makePart(name, size, pos, color, material)
    local p = world:FindFirstChild(name)
    if not p or not p:IsA("Part") then p = Instance.new("Part"); p.Name = name end
    p.Size = size
    p.Position = pos
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = world
    return p
end

local spawn = world:FindFirstChild("StartSpawn") or Instance.new("SpawnLocation")
spawn.Name = "StartSpawn"
spawn.Size = Vector3.new(14, 1, 14)
spawn.Position = Vector3.new(0, 2, 0)
spawn.Anchored = true
spawn.Neutral = true
spawn.Color = Color3.fromRGB(80, 220, 140)
spawn.Parent = world
makePart("StartPlatform", Vector3.new(24, 2, 24), Vector3.new(0, 0, 0), Color3.fromRGB(60, 180, 110))

local checkpoints = {}
for i = 1, STAGE_COUNT do
    local row = math.floor((i - 1) / 6)
    local col = (i - 1) % 6
    local x = ((row % 2 == 0) and col or (5 - col)) * 18
    local z = (row + 1) * 20
    local y = 2 + math.floor((i - 1) / 8) * 2
    local platform = makePart("JumpPlatform" .. i, Vector3.new(9, 2, 9), Vector3.new(x, y, z), Color3.fromHSV(i / STAGE_COUNT, 0.8, 1))
    platform:SetAttribute("Stage", i)
    platform.Touched:Connect(function(hit)
        local character = hit:FindFirstAncestorOfClass("Model")
        local player = character and Players:GetPlayerFromCharacter(character)
        if player then
            local stats = player:FindFirstChild("leaderstats")
            local stageValue = stats and stats:FindFirstChild("Stage")
            if stageValue and i > stageValue.Value then stageValue.Value = i end
        end
    end)
    if i % 5 == 0 then
        local index = i
        local cp = makePart("Checkpoint" .. index, Vector3.new(10, 1, 10), Vector3.new(x, y + 2, z), Color3.fromRGB(80, 190, 255), Enum.Material.Neon)
        cp:SetAttribute("CheckpointIndex", index)
        checkpoints[index] = cp.Position + Vector3.new(0, 5, 0)
        cp.Touched:Connect(function(hit)
            local character = hit:FindFirstAncestorOfClass("Model")
            local player = character and Players:GetPlayerFromCharacter(character)
            if player then player:SetAttribute("QuruvchiCheckpoint", index) end
        end)
    end
end
local rows = math.ceil(STAGE_COUNT / 6)
local lastCol = (STAGE_COUNT - 1) % 6
local lastRow = rows - 1
local endCol = (lastRow % 2 == 0) and lastCol or (5 - lastCol)
local finish = makePart("FinishPlatform", Vector3.new(28, 2, 28), Vector3.new(endCol * 18, 3, rows * 20 + 18), Color3.fromRGB(255, 205, 70), Enum.Material.Neon)

local function formatTime(seconds)
    seconds = math.max(0, math.floor(seconds))
    return string.format("%02d:%02d", math.floor(seconds / 60), seconds % 60)
end

local function setupPlayer(player)
    local stats = player:FindFirstChild("leaderstats")
    if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
    local function stat(name, initial)
        local value = stats:FindFirstChild(name)
        if not value then value = Instance.new("IntValue"); value.Name = name; value.Value = initial; value.Parent = stats end
        return value
    end
    stat("Wins", 0)
    stat("Coins", 0)
    stat("Stage", 0)
    stat("Time", 0)
    local best = stat("BestTime", 0)
    if not player:GetAttribute("QuruvchiObbyStartedAt") then player:SetAttribute("QuruvchiObbyStartedAt", os.time()) end

    local playerGui = player:WaitForChild("PlayerGui", 10)
    if playerGui and not playerGui:FindFirstChild("QuruvchiObbyHUD") then
        local gui = Instance.new("ScreenGui")
        gui.Name = "QuruvchiObbyHUD"
        gui.ResetOnSpawn = false
        gui.IgnoreGuiInset = true
        gui.DisplayOrder = 10
        gui.Parent = playerGui
        local panel = Instance.new("Frame")
        panel.Name = "StatusPanel"
        panel.AnchorPoint = Vector2.new(0.5, 0)
        panel.Position = UDim2.new(0.5, 0, 0.025, 0)
        panel.Size = UDim2.new(0.78, 0, 0, 48)
        panel.BackgroundColor3 = Color3.fromRGB(18, 22, 38)
        panel.BackgroundTransparency = 0.12
        panel.BorderSizePixel = 0
        panel.Parent = gui
        local corner = Instance.new("UICorner"); corner.CornerRadius = UDim.new(0, 12); corner.Parent = panel
        local stroke = Instance.new("UIStroke"); stroke.Color = Color3.fromRGB(116, 108, 255); stroke.Transparency = 0.2; stroke.Thickness = 1.5; stroke.Parent = panel
        local text = Instance.new("TextLabel")
        text.Name = "StatusText"
        text.Size = UDim2.fromScale(1, 1)
        text.BackgroundTransparency = 1
        text.TextColor3 = Color3.fromRGB(255, 255, 255)
        text.TextScaled = true
        text.Font = Enum.Font.GothamBold
        text.Text = "OBBY 30 · VAQT 00:00 · COINS 0"
        text.Parent = panel
        local limit = Instance.new("UITextSizeConstraint"); limit.MinTextSize = 11; limit.MaxTextSize = 20; limit.Parent = text
        task.spawn(function()
            while player.Parent and gui.Parent do
                local elapsed = os.time() - (player:GetAttribute("QuruvchiObbyStartedAt") or os.time())
                stat("Time", elapsed)
                text.Text = "OBBY 30  ·  " .. formatTime(elapsed) .. "  ·  STAGE " .. stat("Stage", 0).Value .. "/" .. STAGE_COUNT .. "  ·  COINS " .. stat("Coins", 0).Value
                task.wait(1)
            end
        end)
    end

    player.CharacterAdded:Connect(function(character)
        task.wait(0.25)
        local index = player:GetAttribute("QuruvchiCheckpoint")
        local target = index and checkpoints[index]
        if target and character.Parent then character:PivotTo(CFrame.new(target)) end
    end)
end
Players.PlayerAdded:Connect(setupPlayer)
for _, player in ipairs(Players:GetPlayers()) do task.spawn(setupPlayer, player) end

local finishDebounce = {}
finish.Touched:Connect(function(hit)
    local character = hit:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if not player or finishDebounce[player.UserId] then return end
    finishDebounce[player.UserId] = true
    local stats = player:FindFirstChild("leaderstats")
    local wins = stats and stats:FindFirstChild("Wins")
    local coins = stats and stats:FindFirstChild("Coins")
    local timeValue = stats and stats:FindFirstChild("Time")
    local best = stats and stats:FindFirstChild("BestTime")
    if wins and coins and timeValue and best then
        wins.Value += 1
        coins.Value += 100
        if best.Value == 0 or timeValue.Value < best.Value then best.Value = timeValue.Value end
        player:SetAttribute("QuruvchiObbyStartedAt", os.time())
        player:SetAttribute("QuruvchiCheckpoint", nil)
        if stats:FindFirstChild("Stage") then stats.Stage.Value = 0 end
        print("[Quruvchi] " .. player.Name .. " finished the obby and earned 100 Coins.")
    end
    task.delay(3, function() finishDebounce[player.UserId] = nil end)
end)

print("[Quruvchi] 30-stage obby created with checkpoints, timer, rewards, leaderboard and responsive HUD. Press Play and test.")
`;

const SIMULATOR = `-- Quruvchi Free Builder · Collectible simulator starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local world = Workspace:FindFirstChild(ROOT_NAME)
if not world then
    world = Instance.new("Folder")
    world.Name = ROOT_NAME
    world.Parent = Workspace
end

local function part(name, size, pos, color, material, parent)
    local target = parent or world
    local p = target:FindFirstChild(name)
    if not p or not p:IsA("Part") then p = Instance.new("Part"); p.Name = name end
    p.Size = size
    p.Position = pos
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = target
    return p
end

part("MainIsland", Vector3.new(180, 4, 180), Vector3.new(0, -3, 0), Color3.fromRGB(62, 150, 94), Enum.Material.Grass)
local spawn = Instance.new("SpawnLocation")
spawn.Name = "PlayerSpawn"
spawn.Size = Vector3.new(12, 1, 12)
spawn.Position = Vector3.new(0, 0, 0)
spawn.Anchored = true
spawn.Neutral = true
spawn.Parent = world
local folder = world:FindFirstChild("Collectibles") or Instance.new("Folder")
folder.Name = "Collectibles"
folder.Parent = world

local function setupPlayer(player)
    local stats = player:FindFirstChild("leaderstats")
    if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
    local coins = stats:FindFirstChild("Coins")
    if not coins then coins = Instance.new("IntValue"); coins.Name = "Coins"; coins.Value = 0; coins.Parent = stats end
end
Players.PlayerAdded:Connect(setupPlayer)
for _, player in ipairs(Players:GetPlayers()) do setupPlayer(player) end

local function createCoin(index, position, value)
    local coin = part("Collectible_" .. index, Vector3.new(2.5, 2.5, 2.5), position, Color3.fromRGB(255, 210, 65), Enum.Material.Neon, folder)
    coin.Shape = Enum.PartType.Ball
    coin.CanCollide = false
    coin:SetAttribute("Reward", value)
    local taken = false
    coin.Touched:Connect(function(hit)
        if taken then return end
        local character = hit:FindFirstAncestorOfClass("Model")
        local player = character and Players:GetPlayerFromCharacter(character)
        local stats = player and player:FindFirstChild("leaderstats")
        local coins = stats and stats:FindFirstChild("Coins")
        if not coins then return end
        taken = true
        coins.Value += value
        coin.Transparency = 1
        coin.CanTouch = false
        task.delay(8, function()
            if coin.Parent then coin.Transparency = 0; coin.CanTouch = true; taken = false end
        end)
    end)
end
for i = 1, 30 do
    local angle = i * 2.399
    local radius = 12 + (i % 5) * 9
    createCoin(i, Vector3.new(math.cos(angle) * radius, 3, math.sin(angle) * radius), 1)
end
print("[Quruvchi] Collectible simulator created. Coins are updated on the server.")
`;

const TYCOON = `-- Quruvchi Free Builder · claimable tycoon starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local world = Workspace:FindFirstChild(ROOT_NAME)
if not world then
    world = Instance.new("Folder")
    world.Name = ROOT_NAME
    world.Parent = Workspace
end

local function part(name, size, pos, color, material)
    local p = world:FindFirstChild(name)
    if not p or not p:IsA("Part") then p = Instance.new("Part"); p.Name = name end
    p.Size = size
    p.Position = pos
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = world
    return p
end

local plots = {}
local owners = {}
local function setupPlayer(player)
    local stats = player:FindFirstChild("leaderstats")
    if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
    local cash = stats:FindFirstChild("Cash")
    if not cash then cash = Instance.new("IntValue"); cash.Name = "Cash"; cash.Value = 100; cash.Parent = stats end
end
Players.PlayerAdded:Connect(setupPlayer)
for _, player in ipairs(Players:GetPlayers()) do setupPlayer(player) end

for i = 1, 4 do
    local x = (i - 1) * 55 - 82
    local plot = part("Plot_" .. i, Vector3.new(44, 2, 44), Vector3.new(x, 0, 0), Color3.fromRGB(68, 105, 145))
    plot:SetAttribute("OwnerUserId", 0)
    plots[i] = plot
    local pad = part("ClaimPad_" .. i, Vector3.new(8, 1, 8), Vector3.new(x, 2, 0), Color3.fromRGB(80, 220, 130), Enum.Material.Neon)
    pad.Touched:Connect(function(hit)
        if owners[i] then return end
        local character = hit:FindFirstAncestorOfClass("Model")
        local player = character and Players:GetPlayerFromCharacter(character)
        if not player or owners[player.UserId] then return end
        setupPlayer(player)
        owners[i] = player.UserId
        owners[player.UserId] = i
        plot:SetAttribute("OwnerUserId", player.UserId)
        pad.Color = Color3.fromRGB(100, 110, 130)
        pad.Name = "ClaimedBy_" .. player.UserId
        local sign = part("OwnerSign_" .. i, Vector3.new(12, 5, 1), Vector3.new(x, 5, -16), Color3.fromRGB(25, 35, 55))
        sign:SetAttribute("OwnerUserId", player.UserId)
        print(player.Name .. " claimed tycoon plot " .. i)
    end)
end
Players.PlayerRemoving:Connect(function(player)
    local index = owners[player.UserId]
    if index then
        owners[index] = nil
        owners[player.UserId] = nil
        plots[index]:SetAttribute("OwnerUserId", 0)
    end
end)
print("[Quruvchi] Four claimable tycoon plots created.")
`;

function extractExplicitTitle(prompt) {
  const text = String(prompt || '').trim();
  if (!text) return '';
  const quoted = text.match(/[“"]([^”"]{2,100})[”"]/);
  if (quoted) return quoted[1].trim();
  const labeled = text.match(/(?:o['’‘ʻ]?yin(?:ning)?\s+nomi|loyiha\s+nomi|game\s+title|title|name)\s*[:=]?\s*["“]?([^"”\n,.]{2,100})/i);
  if (labeled) {
    const value = labeled[1].split(/\s+(?:yarat\w*|qur\w*|build|create|o['’‘ʻ]?yin|game|uchun|deb)\b/i)[0].trim();
    if (value.length >= 2) return value.slice(0, 100);
  }
  const leading = text.match(/^\s*(?:menga\s+)?([A-Z][A-Za-z0-9'’ -]{2,70}?)(?=\s+(?:o['’‘ʻ]?yin(?:i|ning)?|game|yarat\w*|qur\w*|build|create|deb)\b)/i);
  return leading?.[1]?.trim().replace(/[.,:;]+$/, '').slice(0, 100) || '';
}
function titleFromHistory(history = []) {
  for (const message of history) {
    if (message?.role !== 'user') continue;
    const title = extractExplicitTitle(flattenMessage(message.content));
    if (title) return title;
  }
  return '';
}

function classify(prompt) {
  const s = String(prompt || '').toLowerCase();
  if (/obby|parkur|checkpoint|sakra|sakrash|to['’]?siq/.test(s)) return 'obby';
  if (/tycoon|plot|biznes|zavod|base|uy qur|uycha/.test(s)) return 'tycoon';
  if (/simulator|tanga|coin|collect|yig['’]?|tuxum|egg|pet|rarity|steal/.test(s)) return 'simulator';
  return 'world';
}
function flattenMessage(message) {
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.map(block => block?.text || '').join('\n');
  if (message && typeof message === 'object') return String(message.text || '');
  return '';
}
function isUpgradeRequest(prompt) {
  return /yaxshila|yaxshilab|professional|profi|upgrade|takomillashtir|davom et|keyingi bosqich|qo['’]?sh(?:ib|ish|)|yana|kengaytir|bugni tuzat|xato(?:larni)? tuzat/i.test(String(prompt || ''));
}
function levelFeatures(kind, level) {
  const pieces = [];
  if (level >= 2) {
    pieces.push(`
-- PROFESSIONAL PASS 2: safe fall recovery and consistent world boundaries.
local upgradeWorld = Workspace:FindFirstChild("QuruvchiFreeWorld")
if upgradeWorld then
    local oldSafety = upgradeWorld:FindFirstChild("QuruvchiSafety")
    if oldSafety then oldSafety:Destroy() end
    local safety = Instance.new("Folder")
    safety.Name = "QuruvchiSafety"
    safety.Parent = upgradeWorld
    local killPlane = Instance.new("Part")
    killPlane.Name = "FallResetPlane"
    killPlane.Size = Vector3.new(1200, 2, 1200)
    killPlane.Position = Vector3.new(0, -45, 0)
    killPlane.Anchored = true
    killPlane.Transparency = 1
    killPlane.CanCollide = false
    killPlane.CanTouch = true
    killPlane.Parent = safety
    killPlane.Touched:Connect(function(hit)
        local character = hit:FindFirstAncestorOfClass("Model")
        local humanoid = character and character:FindFirstChildOfClass("Humanoid")
        if humanoid and humanoid.Health > 0 then humanoid.Health = 0 end
    end)
end
`);
  }
  if (level >= 3) {
    pieces.push(`
-- PROFESSIONAL PASS 3: ensure server-side progress stats for starter types without them.
local upgradePlayers = game:GetService("Players")
local function ensureLeaderstat(player, name, initialValue)
    local stats = player:FindFirstChild("leaderstats")
    if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
    local value = stats:FindFirstChild(name)
    if not value then value = Instance.new("IntValue"); value.Name = name; value.Value = initialValue; value.Parent = stats end
    return value
end
local function prepareProgress(player)
    ensureLeaderstat(player, "Wins", 0)
    if not player:GetAttribute("QuruvchiProgressReady") then
        player:SetAttribute("QuruvchiProgressReady", true)
        player:SetAttribute("QuruvchiSessionStartedAt", os.time())
    end
end
upgradePlayers.PlayerAdded:Connect(prepareProgress)
for _, player in ipairs(upgradePlayers:GetPlayers()) do prepareProgress(player) end
`);
  }
  if (level >= 4) {
    pieces.push(`
-- PROFESSIONAL PASS 4: lightweight server-side telemetry and lifecycle cleanup.
local upgradePlayers = game:GetService("Players")
local function reportProgress(player, reason)
    player:SetAttribute("QuruvchiLastProgress", reason)
    player:SetAttribute("QuruvchiLastProgressAt", os.time())
end
upgradePlayers.PlayerAdded:Connect(function(player)
    reportProgress(player, "joined")
    player.CharacterAdded:Connect(function()
        reportProgress(player, "character_spawned")
    end)
end)
for _, player in ipairs(upgradePlayers:GetPlayers()) do
    if not player:GetAttribute("QuruvchiLastProgress") then reportProgress(player, "session_active") end
end
upgradePlayers.PlayerRemoving:Connect(function(player)
    print("[Quruvchi telemetry]", player.UserId, player:GetAttribute("QuruvchiLastProgress") or "no_progress")
end)
`);
  }
  return pieces.join('\n');
}
const NAMES = { obby: 'Obby', tycoon: 'Tycoon', simulator: 'Collectible Simulator', world: '3D World Starter' };
const SUMMARIES = {
  obby: ['30 bosqichli obby, spawn va rangli platformalar', 'har 5 bosqichda checkpoint va qayta tug‘ilish', 'timer, Coins/Wins/Stage/BestTime leaderboard va 100 Coins mukofoti', 'mobil ekranga mos HUD va progress atributlari'],
  tycoon: ['4 ta plot, bir o‘yinchiga bitta claim va Cash leaderstats', 'xavfsiz yiqilish hududi va qayta tug‘ilish', 'Wins leaderstat va server progress kuzatuvi', 'progress atributlari va lifecycle jurnali'],
  simulator: ['orol, 30 ta collectible, Coins leaderstats va vaqtli respawn', 'xavfsiz yiqilish hududi va qayta tug‘ilish', 'Wins leaderstat va server progress kuzatuvi', 'progress atributlari va lifecycle jurnali'],
  world: ['3D orol, spawn, dekorativ neon ustunlar va welcome sign', 'xavfsiz yiqilish hududi va qayta tug‘ilish', 'Wins leaderstat va server progress kuzatuvi', 'progress atributlari va lifecycle jurnali']
};
function getHistoryKind(history) {
  const userTexts = (history || []).filter(message => message.role === 'user')
    .map(message => flattenMessage(message.content))
    .filter(Boolean);
  for (const text of userTexts) {
    const kind = classify(text);
    if (kind !== 'world') return kind;
  }
  return 'world';
}
function boundedCount(prompt, patterns, fallback, min, max) {
  const text = String(prompt || '').toLowerCase();
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Math.max(min, Math.min(max, Number(match[1])));
  }
  return fallback;
}
function maxFeaturePacks(prompt) {
  const text = String(prompt || '').toLowerCase();
  const packs = [];
  if (/do['’‘]?kon|shop|magazin|sotib ol|upgrade shop/.test(text)) {
    packs.push(String.raw`
-- QURUVCHI MAX FEATURE: in-world upgrade shop (server authoritative).
do
    local shop = Instance.new("Part")
    shop.Name = "MaxUpgradeShop"
    shop.Size = Vector3.new(12, 8, 8)
    shop.Position = Vector3.new(0, 4, 24)
    shop.Anchored = true
    shop.Color = Color3.fromRGB(125, 90, 255)
    shop.Material = Enum.Material.Neon
    shop.Parent = world
    local prompt = Instance.new("ProximityPrompt")
    prompt.Name = "BuySpeedUpgrade"
    prompt.ActionText = "Tezlikni oshirish · 25 Coins"
    prompt.ObjectText = "Quruvchi MAX Shop"
    prompt.HoldDuration = 0.3
    prompt.MaxActivationDistance = 12
    prompt.Parent = shop
    prompt.Triggered:Connect(function(player)
        local stats = player:FindFirstChild("leaderstats")
        if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
        local currency = stats:FindFirstChild("Coins") or stats:FindFirstChild("Cash")
        if not currency then currency = Instance.new("IntValue"); currency.Name = "Coins"; currency.Value = 100; currency.Parent = stats end
        if currency.Value < 25 then return end
        local level = player:GetAttribute("QuruvchiSpeedLevel") or 0
        if level >= 5 then return end
        currency.Value -= 25
        level += 1
        player:SetAttribute("QuruvchiSpeedLevel", level)
        local character = player.Character
        local humanoid = character and character:FindFirstChildOfClass("Humanoid")
        if humanoid then humanoid.WalkSpeed = math.min(16 + level * 3, 31) end
    end)
end
`);
  }
  if (/saqla|saqlash|save|data.?store|progress.*saq/.test(text)) {
    packs.push(String.raw`
-- QURUVCHI MAX FEATURE: optional Roblox DataStore persistence.
-- Publish the experience and enable Studio Access to API Services to test saving in Studio.
do
    local DataStoreService = game:GetService("DataStoreService")
    local Players = game:GetService("Players")
    local store = DataStoreService:GetDataStore("QuruvchiMAX_PlayerData_v1")
    local function loadPlayer(player)
        local ok, data = pcall(function() return store:GetAsync("u_" .. player.UserId) end)
        if not ok or type(data) ~= "table" then return end
        local stats = player:FindFirstChild("leaderstats")
        if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
        if not stats:FindFirstChild("Coins") and not stats:FindFirstChild("Cash") then local coins = Instance.new("IntValue"); coins.Name = "Coins"; coins.Value = 0; coins.Parent = stats end
        for _, name in ipairs({"Coins", "Cash", "Wins", "Stage"}) do
            local value = stats:FindFirstChild(name)
            if value and type(data[name]) == "number" then value.Value = math.max(0, math.floor(data[name])) end
        end
    end
    local function savePlayer(player)
        local stats = player:FindFirstChild("leaderstats")
        if not stats then return end
        local data = {}
        for _, name in ipairs({"Coins", "Cash", "Wins", "Stage"}) do
            local value = stats:FindFirstChild(name)
            if value and value:IsA("IntValue") then data[name] = value.Value end
        end
        local ok, err = pcall(function() store:UpdateAsync("u_" .. player.UserId, function() return data end) end)
        if not ok then warn("[Quruvchi MAX] DataStore save failed:", err) end
    end
    Players.PlayerAdded:Connect(function(player) task.delay(1, function() if player.Parent then loadPlayer(player) end end) end)
    Players.PlayerRemoving:Connect(savePlayer)
    game:BindToClose(function() for _, player in ipairs(Players:GetPlayers()) do savePlayer(player) end end)
end
`);
  }
  if (/quest|vazifa|topshiriq|missiya|mission/.test(text)) {
    packs.push(String.raw`
-- QURUVCHI MAX FEATURE: repeatable timed mission board.
do
    local mission = Instance.new("Part")
    mission.Name = "MaxMissionBoard"
    mission.Size = Vector3.new(10, 8, 2)
    mission.Position = Vector3.new(0, 4, -26)
    mission.Anchored = true
    mission.Color = Color3.fromRGB(255, 190, 65)
    mission.Material = Enum.Material.Neon
    mission.Parent = world
    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Vazifani olish"
    prompt.ObjectText = "Quruvchi MAX Mission"
    prompt.HoldDuration = 0.25
    prompt.Parent = mission
    local cooldown = {}
    prompt.Triggered:Connect(function(player)
        local now = os.time()
        if cooldown[player.UserId] and now - cooldown[player.UserId] < 60 then return end
        local stats = player:FindFirstChild("leaderstats")
        if not stats then stats = Instance.new("Folder"); stats.Name = "leaderstats"; stats.Parent = player end
        local currency = stats:FindFirstChild("Coins") or stats:FindFirstChild("Cash")
        if not currency then currency = Instance.new("IntValue"); currency.Name = "Coins"; currency.Value = 0; currency.Parent = stats end
        cooldown[player.UserId] = now
        currency.Value += 10
        player:SetAttribute("QuruvchiLastMission", "completed")
        player:SetAttribute("QuruvchiLastMissionAt", now)
    end)
    Players.PlayerRemoving:Connect(function(player) cooldown[player.UserId] = nil end)
end
`);
  }
  return packs;
}

function studioPart(name, size, position, color, material = 'Material.SmoothPlastic', className = 'Part') {
  return { className, name, properties: {
    Size: { Vector3: size }, Position: { Vector3: position }, Anchored: true,
    Color: { Color3: color }, Material: { Enum: material }, TopSurface: { Enum: 'SurfaceType.Smooth' },
    BottomSurface: { Enum: 'SurfaceType.Smooth' }
  } };
}
function buildStudioScene(kind, title, counts) {
  const children = [];
  const add = (name, size, pos, color, material) => children.push(studioPart(name, size, pos, color, material));
  if (kind === 'obby') {
    children.push(studioPart('StartSpawn', [14,1,14], [0,2,0], [80,220,140], 'Material.Neon', 'SpawnLocation'));
    add('StartPlatform',[24,2,24],[0,0,0],[60,180,110],'Material.Grass');
    for (let i=1;i<=counts.stages;i++) {
      const x=i*12, z=i%2===0?8:-8, y=2+Math.floor(i/6)*2;
      const hue=(i/counts.stages);
      const color=[Math.round(127+127*Math.sin(hue*Math.PI*2)),Math.round(127+127*Math.sin(hue*Math.PI*2+2.1)),Math.round(127+127*Math.sin(hue*Math.PI*2+4.2))].map(v=>Math.max(20,Math.min(255,v)));
      const platform=studioPart('JumpPlatform'+i,[9,2,9],[x,y,z],color,'Material.Neon');
      platform.attributes={Stage:i}; children.push(platform);
      if(i%5===0) children.push(studioPart('Checkpoint'+i,[10,1,10],[x,y+2,z],[80,190,255],'Material.Neon'));
    }
    add('FinishPlatform',[22,2,22],[counts.stages*12+22,2,0],[255,205,70],'Material.Neon');
    add('WelcomeSign',[22,8,1],[0,7,-20],[22,30,52],'Material.SmoothPlastic');
  } else if (kind === 'simulator') {
    add('MainIsland',[180,4,180],[0,-3,0],[62,150,94],'Material.Grass');
    children.push(studioPart('PlayerSpawn',[12,1,12],[0,0,0],[70,170,255],'Material.Neon','SpawnLocation'));
    children.push({className:'Folder',name:'Collectibles',children:[]});
    for(let i=1;i<=counts.collectibles;i++){
      const angle=2*Math.PI*i/counts.collectibles, x=Math.round(Math.cos(angle)*58), z=Math.round(Math.sin(angle)*58);
      const gem=studioPart('Collectible'+i,[3,3,3],[x,3,z],[Math.round(80+150*(i%2)),Math.round(110+100*(i%3)),255],'Material.Neon');
      gem.attributes={CollectibleId:i,Reward:1}; children.push(gem);
    }
  } else if (kind === 'tycoon') {
    add('TycoonGround',[Math.max(150,counts.plots*55),2,90],[0,-1,0],[50,65,83],'Material.Concrete');
    for(let i=1;i<=counts.plots;i++){
      const x=(i-(counts.plots+1)/2)*55;
      const base={className:'Model',name:'Plot'+i,children:[
        studioPart('BaseFloor',[42,1,42],[x,1,0],[70,100,140],'Material.Metal'),
        studioPart('ClaimPad',[8,1,8],[x,2,14],[80,220,140],'Material.Neon'),
        studioPart('UpgradePad',[8,1,8],[x+12,2,-12],[160,100,255],'Material.Neon'),
        studioPart('Dropper',[6,8,6],[x-12,5,-12],[255,190,65],'Material.Metal')
      ]};
      children.push(base);
    }
  } else {
    add('MainIsland',[180,4,180],[0,-3,0],[62,150,94],'Material.Grass');
    children.push(studioPart('PlayerSpawn',[12,1,12],[0,0,0],[70,170,255],'Material.Neon','SpawnLocation'));
    for(let i=1;i<=12;i++){
      const angle=2*Math.PI*i/12;
      add('SceneryPillar'+i,[5,12+(i%4)*3,5],[Math.round(Math.cos(angle)*65),4,Math.round(Math.sin(angle)*65)],[80+(i%3)*35,100,210],'Material.Neon');
    }
    add('WelcomeSign',[24,8,1],[0,8,-18],[22,30,52],'Material.SmoothPlastic');
  }
  return { className:'Folder', name:'QuruvchiFreeWorld', attributes:{QuruvchiGenerated:true,GameKind:kind,ProjectTitle:title}, children };
}

export function buildFreeProject(prompt, history = []) {
  const upgrade = isUpgradeRequest(prompt);
  const currentKind = classify(prompt);
  const historyKind = getHistoryKind(history);
  const kind = upgrade && currentKind === 'world' ? historyKind : currentKind;
  const priorUpgrades = (history || []).filter(message => message.role === 'user' && isUpgradeRequest(flattenMessage(message.content))).length;
  const level = upgrade ? Math.min(4, Math.max(2, priorUpgrades + 2)) : 1;
  const base = kind === 'obby' ? OBBY : kind === 'tycoon' ? TYCOON : kind === 'simulator' ? SIMULATOR : COMMON;
  const stageCount = boundedCount(prompt, [/(\d{1,3})\s*(?:ta\s*)?(?:bosqich|stage|level)/i], 30, 5, 100);
  const collectibleCount = boundedCount(prompt, [/(\d{1,3})\s*(?:ta\s*)?(?:tanga|coin|collectible|tuxum|egg|pet)/i], 30, 5, 150);
  const plotCount = boundedCount(prompt, [/(\d{1,2})\s*(?:ta\s*)?(?:plot|baza|base|uy)/i], 4, 2, 12);
  let customizedBase = base;
  if (kind === 'obby') customizedBase = customizedBase.replace('local STAGE_COUNT = 30', 'local STAGE_COUNT = ' + stageCount);
  if (kind === 'simulator') customizedBase = customizedBase.replace('for i = 1, 30 do', 'for i = 1, ' + collectibleCount + ' do');
  if (kind === 'tycoon') customizedBase = customizedBase.replace('for i = 1, 4 do', 'for i = 1, ' + plotCount + ' do').replace('(i - 1) * 55 - 82', '(i - 1) * 55 - (((' + plotCount + ' - 1) * 55) / 2)');
  const title = (extractExplicitTitle(prompt) || titleFromHistory(history) || NAMES[kind]).replace(/[\r\n]+/g, ' ').slice(0, 100);
  const packs = maxFeaturePacks(prompt);
  const source = '-- Project title: ' + title + '\n-- Generator: Quruvchi MAX (local deterministic engine)\n' + customizedBase + (level > 1 ? '\n\n' + levelFeatures(kind, level) : '') + (packs.length ? '\n\n' + packs.join('\n\n') : '');
  const featureList = SUMMARIES[kind].slice(0, level);
  const projectTitle = extractExplicitTitle(prompt) || titleFromHistory(history) || NAMES[kind];
  const counts = { stages: stageCount, collectibles: collectibleCount, plots: plotCount };
  const sceneTree = buildWorldScene({ kind, title:projectTitle, counts });
  const uiTree = buildGameUi(projectTitle, kind);
  return {
    kind,
    level,
    counts,
    sceneTree,
    uiTree,
    name: projectTitle,
    path: 'ServerScriptService/QuruvchiAgents/GameplayAgent/FreeGame.server.lua',
    source,
    summary: [...featureList, ...packs.map(pack => pack.includes('MaxUpgradeShop') ? 'do‘kon va tezlik yaxshilash' : pack.includes('QuruvchiMAX_PlayerData_v1') ? 'DataStore saqlash' : pack.includes('MaxMissionBoard') ? 'vazifalar paneli' : 'qo‘shimcha tizim')].join('; '),
    features: [...featureList, ...packs.map(pack => pack.includes('MaxUpgradeShop') ? 'do‘kon va tezlik yaxshilash' : pack.includes('QuruvchiMAX_PlayerData_v1') ? 'DataStore saqlash' : pack.includes('MaxMissionBoard') ? 'vazifalar paneli' : 'qo‘shimcha tizim')]
  };
}
