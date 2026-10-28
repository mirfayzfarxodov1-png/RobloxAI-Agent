const COMMON = `-- Quruvchi Free Builder · server-side starter
-- Generated locally by Quruvchi. No external AI API is required.
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
    local angle = (math.pi * 2) * i / 12
    local x, z = math.cos(angle) * 65, math.sin(angle) * 65
    part("SceneryPillar" .. i, Vector3.new(5, 12 + (i % 4) * 3, 5), Vector3.new(x, 4, z), Color3.fromRGB(80 + (i % 3) * 35, 100, 210), Enum.Material.Neon)
end

local sign = part("WelcomeSign", Vector3.new(24, 8, 1), Vector3.new(0, 8, -18), Color3.fromRGB(22, 30, 52), Enum.Material.SmoothPlastic)
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

print("[Quruvchi Free Builder] World created. Press Play to test.")
`;

const OBBY = `-- Quruvchi Free Builder · Obby starter · server-side
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder"); world.Name = ROOT_NAME; world.Parent = Workspace

local function makePart(name, size, pos, color, material)
    local p = Instance.new("Part")
    p.Name = name; p.Size = size; p.Position = pos; p.Anchored = true
    p.Color = color; p.Material = material or Enum.Material.SmoothPlastic
    p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth; p.Parent = world
    return p
end
local spawn = Instance.new("SpawnLocation")
spawn.Name = "StartSpawn"; spawn.Size = Vector3.new(14, 1, 14); spawn.Position = Vector3.new(0, 2, 0)
spawn.Anchored = true; spawn.Neutral = true; spawn.Color = Color3.fromRGB(80, 220, 140); spawn.Parent = world
makePart("StartPlatform", Vector3.new(24, 2, 24), Vector3.new(0, 0, 0), Color3.fromRGB(60, 180, 110))
local checkpointPositions = {}
for i = 1, 24 do
    local x = i * 12
    local z = (i % 2 == 0) and 8 or -8
    local y = 2 + math.floor(i / 6) * 2
    local color = Color3.fromHSV(i / 24, 0.8, 1)
    makePart("JumpPlatform" .. i, Vector3.new(9, 2, 9), Vector3.new(x, y, z), color)
    if i % 6 == 0 then
        local cp = makePart("Checkpoint" .. i, Vector3.new(10, 1, 10), Vector3.new(x, y + 2, z), Color3.fromRGB(80, 190, 255), Enum.Material.Neon)
        cp:SetAttribute("CheckpointIndex", i)
        table.insert(checkpointPositions, cp.Position + Vector3.new(0, 4, 0))
    end
end
makePart("FinishPlatform", Vector3.new(22, 2, 22), Vector3.new(310, 2, 0), Color3.fromRGB(255, 205, 70), Enum.Material.Neon)
local checkpoints = {}
for _, p in ipairs(world:GetChildren()) do
    if p:IsA("BasePart") and p:GetAttribute("CheckpointIndex") then
        checkpoints[p:GetAttribute("CheckpointIndex")] = p.Position + Vector3.new(0, 5, 0)
        p.Touched:Connect(function(hit)
            local character = hit:FindFirstAncestorOfClass("Model")
            local player = character and Players:GetPlayerFromCharacter(character)
            if player then player:SetAttribute("QuruvchiCheckpoint", p:GetAttribute("CheckpointIndex")) end
        end)
    end
end
local function bindPlayer(player)
    player.CharacterAdded:Connect(function(character)
        task.wait(0.25)
        local index = player:GetAttribute("QuruvchiCheckpoint")
        local target = index and checkpoints[index]
        if target then character:PivotTo(CFrame.new(target)) end
    end)
end
Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do bindPlayer(player) end
print("[Quruvchi Free Builder] 24-stage obby generated. Press Play to test.")
`;

const SIMULATOR = `-- Quruvchi Free Builder · collectible simulator starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local old = Workspace:FindFirstChild(ROOT_NAME)
if old then old:Destroy() end
local world = Instance.new("Folder"); world.Name = ROOT_NAME; world.Parent = Workspace
local function part(name, size, pos, color, material)
    local p = Instance.new("Part"); p.Name=name; p.Size=size; p.Position=pos; p.Anchored=true
    p.Color=color; p.Material=material or Enum.Material.SmoothPlastic; p.Parent=world; return p
end
part("MainIsland", Vector3.new(180, 4, 180), Vector3.new(0, -3, 0), Color3.fromRGB(62, 150, 94), Enum.Material.Grass)
local spawn=Instance.new("SpawnLocation"); spawn.Name="PlayerSpawn"; spawn.Size=Vector3.new(12,1,12); spawn.Position=Vector3.new(0,0,0); spawn.Anchored=true; spawn.Neutral=true; spawn.Parent=world
local folder=Instance.new("Folder"); folder.Name="Collectibles"; folder.Parent=world
local function setupPlayer(player)
    local stats=Instance.new("Folder"); stats.Name="leaderstats"; stats.Parent=player
    local coins=Instance.new("IntValue"); coins.Name="Coins"; coins.Value=0; coins.Parent=stats
end
Players.PlayerAdded:Connect(setupPlayer)
for _, player in ipairs(Players:GetPlayers()) do setupPlayer(player) end
for i=1,30 do
    local angle=i*2.399
    local pos=Vector3.new(math.cos(angle)*(12+(i%5)*9), 3, math.sin(angle)*(12+(i%5)*9))
    local coin=part("Collectible_"..i, Vector3.new(2.5,2.5,2.5), pos, Color3.fromRGB(255,210,65), Enum.Material.Neon)
    coin.Shape=Enum.PartType.Ball; coin.CanCollide=false
    local taken=false
    coin.Touched:Connect(function(hit)
        if taken then return end
        local character=hit:FindFirstAncestorOfClass("Model")
        local player=character and Players:GetPlayerFromCharacter(character)
        local stats=player and player:FindFirstChild("leaderstats")
        local coins=stats and stats:FindFirstChild("Coins")
        if not coins then return end
        taken=true; coins.Value += 1; coin.Transparency=1; coin.CanTouch=false
        task.delay(8,function() if coin.Parent then coin.Transparency=0; coin.CanTouch=true; taken=false end end)
    end)
end
print("[Quruvchi Free Builder] Collectible simulator ready. Coins are server-authoritative; press Play.")
`;

const TYCOON = `-- Quruvchi Free Builder · basic tycoon starter
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ROOT_NAME = "QuruvchiFreeWorld"
local old=Workspace:FindFirstChild(ROOT_NAME); if old then old:Destroy() end
local world=Instance.new("Folder"); world.Name=ROOT_NAME; world.Parent=Workspace
local function part(name,size,pos,color,material)
    local p=Instance.new("Part"); p.Name=name; p.Size=size; p.Position=pos; p.Anchored=true
    p.Color=color; p.Material=material or Enum.Material.SmoothPlastic; p.Parent=world; return p
end
local plots={}
for i=1,4 do
    local x=(i-1)*55-82
    local plot=part("Plot_"..i,Vector3.new(44,2,44),Vector3.new(x,0,0),Color3.fromRGB(68,105,145))
    plot:SetAttribute("OwnerUserId",0); plots[i]=plot
    local pad=part("ClaimPad_"..i,Vector3.new(8,1,8),Vector3.new(x,2,0),Color3.fromRGB(80,220,130),Enum.Material.Neon)
    local claimed=false
    pad.Touched:Connect(function(hit)
        if claimed then return end
        local char=hit:FindFirstAncestorOfClass("Model")
        local player=char and Players:GetPlayerFromCharacter(char)
        if not player then return end
        claimed=true; plot:SetAttribute("OwnerUserId",player.UserId); pad.Color=Color3.fromRGB(100,110,130)
        pad.Name="ClaimedBy_"..player.UserId
        local stats=player:FindFirstChild("leaderstats")
        if not stats then stats=Instance.new("Folder"); stats.Name="leaderstats"; stats.Parent=player end
        local cash=stats:FindFirstChild("Cash") or Instance.new("IntValue")
        cash.Name="Cash"; cash.Parent=stats; cash.Value=100
        local sign=part("OwnerSign_"..i,Vector3.new(12,5,1),Vector3.new(x,5,-16),Color3.fromRGB(25,35,55))
        sign:SetAttribute("OwnerUserId",player.UserId)
        print(player.Name.." claimed plot "..i..". Starter tycoon plot is ready.")
    end)
end
Players.PlayerAdded:Connect(function(player)
    local stats=Instance.new("Folder"); stats.Name="leaderstats"; stats.Parent=player
    local cash=Instance.new("IntValue"); cash.Name="Cash"; cash.Value=0; cash.Parent=stats
end)
print("[Quruvchi Free Builder] Four claimable plots created. Press Play to test.")
`;

function classify(prompt) {
  const s = String(prompt || '').toLowerCase();
  if (/obby|parkur|checkpoint|sakra|sakrash/.test(s)) return 'obby';
  if (/tycoon|plot|biznes|zavod|base|uy qur|uycha/.test(s)) return 'tycoon';
  if (/simulator|tanga|coin|collect|yig['’]?|tuxum|egg|pet|rarity|steal/.test(s)) return 'simulator';
  return 'world';
}
export function buildFreeProject(prompt) {
  const kind = classify(prompt);
  const source = kind === 'obby' ? OBBY : kind === 'tycoon' ? TYCOON : kind === 'simulator' ? SIMULATOR : COMMON;
  const names = {obby:'Obby',tycoon:'Tycoon',simulator:'Collectible Simulator',world:'3D World Starter'};
  return {
    kind, name:names[kind], path:'ServerScriptService/QuruvchiFreeBuilder/FreeGame.server.lua',
    source,
    summary: kind === 'obby'
      ? '24 bosqichli obby, spawn, rangli platformalar va checkpointlar'
      : kind === 'tycoon'
        ? '4 ta plot, claim pad va boshlang‘ich Cash leaderstats'
        : kind === 'simulator'
          ? 'Procedural orol, 30 ta collectible va serverda hisoblanadigan Coins'
          : '3D orol, spawn, dekorativ neon ustunlar va welcome sign'
  };
}
