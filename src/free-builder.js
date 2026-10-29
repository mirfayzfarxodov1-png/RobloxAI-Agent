const COMMON = `-- Quruvchi Free Builder · 3D world starter
-- API-free generated Luau. All gameplay changes are server-authoritative where practical.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local ROOT_NAME = "QuruvchiFreeWorld"
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder")
world.Name = ROOT_NAME
world.Parent = Workspace

local function part(name, size, position, color, material, parent)
    local p = Instance.new("Part")
    p.Name = name
    p.Size = size
    p.Position = position
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = parent or world
    return p
end

Lighting.ClockTime = 14
Lighting.Brightness = 2
Lighting.EnvironmentDiffuseScale = 0.5
Lighting.EnvironmentSpecularScale = 0.5
part("MainIsland", Vector3.new(180, 4, 180), Vector3.new(0, -3, 0), Color3.fromRGB(62, 150, 94), Enum.Material.Grass)
local spawn = Instance.new("SpawnLocation")
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

const OBBY = `-- Quruvchi Free Builder · Obby starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder")
world.Name = ROOT_NAME
world.Parent = Workspace

local function makePart(name, size, pos, color, material)
    local p = Instance.new("Part")
    p.Name = name
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

local spawn = Instance.new("SpawnLocation")
spawn.Name = "StartSpawn"
spawn.Size = Vector3.new(14, 1, 14)
spawn.Position = Vector3.new(0, 2, 0)
spawn.Anchored = true
spawn.Neutral = true
spawn.Color = Color3.fromRGB(80, 220, 140)
spawn.Parent = world
makePart("StartPlatform", Vector3.new(24, 2, 24), Vector3.new(0, 0, 0), Color3.fromRGB(60, 180, 110))

local checkpoints = {}
for i = 1, 24 do
    local x = i * 12
    local z = (i % 2 == 0) and 8 or -8
    local y = 2 + math.floor(i / 6) * 2
    makePart("JumpPlatform" .. i, Vector3.new(9, 2, 9), Vector3.new(x, y, z), Color3.fromHSV(i / 24, 0.8, 1))
    if i % 6 == 0 then
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
makePart("FinishPlatform", Vector3.new(22, 2, 22), Vector3.new(310, 2, 0), Color3.fromRGB(255, 205, 70), Enum.Material.Neon)

local function bindPlayer(player)
    player.CharacterAdded:Connect(function(character)
        task.wait(0.25)
        local index = player:GetAttribute("QuruvchiCheckpoint")
        local target = index and checkpoints[index]
        if target and character.Parent then character:PivotTo(CFrame.new(target)) end
    end)
end
Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do bindPlayer(player) end
print("[Quruvchi] 24-stage obby created. Press Play and test.")
`;

const SIMULATOR = `-- Quruvchi Free Builder · Collectible simulator starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder")
world.Name = ROOT_NAME
world.Parent = Workspace

local function part(name, size, pos, color, material, parent)
    local p = Instance.new("Part")
    p.Name = name
    p.Size = size
    p.Position = pos
    p.Anchored = true
    p.Color = color
    p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth
    p.BottomSurface = Enum.SurfaceType.Smooth
    p.Parent = parent or world
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
local folder = Instance.new("Folder")
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
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder")
world.Name = ROOT_NAME
world.Parent = Workspace

local function part(name, size, pos, color, material)
    local p = Instance.new("Part")
    p.Name = name
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
  const labeled = text.match(/(?:o['’ʻ]?yin(?:ning)?\s+nomi|loyiha\s+nomi|game\s+title|title|name)\s*[:=]?\s*["“]?([^"”\n,.]{2,100})/i);
  if (labeled) {
    const value = labeled[1].split(/\s+(?:yarat\w*|qur\w*|build|create|o['’ʻ]?yin|game|uchun|deb)\b/i)[0].trim();
    if (value.length >= 2) return value.slice(0, 100);
  }
  const leading = text.match(/^\s*(?:menga\s+)?([A-Z][A-Za-z0-9'’ -]{2,70}?)(?=\s+(?:o['’ʻ]?yin(?:i|ning)?|game|yarat\w*|qur\w*|build|create|deb)\b)/i);
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
-- PROFESSIONAL PASS 3: consistent stats and server-side completion tracking.
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
local upgradeWorld = workspace:FindFirstChild("QuruvchiFreeWorld")
local finish = upgradeWorld and upgradeWorld:FindFirstChild("FinishPlatform")
if finish and finish:IsA("BasePart") then
    local debounce = {}
    finish.Touched:Connect(function(hit)
        local character = hit:FindFirstAncestorOfClass("Model")
        local player = character and upgradePlayers:GetPlayerFromCharacter(character)
        if not player or debounce[player.UserId] then return end
        debounce[player.UserId] = true
        local wins = ensureLeaderstat(player, "Wins", 0)
        wins.Value += 1
        task.delay(3, function() debounce[player.UserId] = nil end)
    end)
end
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
  obby: ['24 bosqichli obby, spawn, rangli platformalar va checkpointlar', 'xavfsiz yiqilish hududi va qayta tug‘ilish', 'Wins leaderstat va finish maydonida g‘alabani hisoblash', 'progress atributlari va o‘yinchi ketishidagi tozalash jurnali'],
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
export function buildFreeProject(prompt, history = []) {
  const upgrade = isUpgradeRequest(prompt);
  const currentKind = classify(prompt);
  const historyKind = getHistoryKind(history);
  const kind = upgrade && currentKind === 'world' ? historyKind : currentKind;
  const priorUpgrades = (history || []).filter(message => message.role === 'user' && isUpgradeRequest(flattenMessage(message.content))).length;
  const level = upgrade ? Math.min(4, Math.max(2, priorUpgrades + 2)) : 1;
  const base = kind === 'obby' ? OBBY : kind === 'tycoon' ? TYCOON : kind === 'simulator' ? SIMULATOR : COMMON;
  const source = '-- Project title: ' + ((extractExplicitTitle(prompt) || titleFromHistory(history) || NAMES[kind]).replace(/[\r\n]+/g, ' ').slice(0, 100)) + '\n' + base + (level > 1 ? '\n\n' + levelFeatures(kind, level) : '');
  const featureList = SUMMARIES[kind].slice(0, level);
  const projectTitle = extractExplicitTitle(prompt) || titleFromHistory(history) || NAMES[kind];
  return {
    kind,
    level,
    name: projectTitle,
    path: 'ServerScriptService/QuruvchiFreeBuilder/FreeGame.server.lua',
    source,
    summary: featureList.join('; '),
    features: featureList
  };
}
