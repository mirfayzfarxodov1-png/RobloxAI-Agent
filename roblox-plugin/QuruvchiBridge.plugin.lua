-- Quruvchi Roblox Studio Plugin
-- Install: save this file as a local plugin in Roblox Studio.
-- Enable HTTP requests in Game Settings > Security before connecting.
local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")

local toolbar = plugin:CreateToolbar("Quruvchi AI")
local openButton = toolbar:CreateButton("Quruvchi", "Open Quruvchi AI bridge", "rbxassetid://4458901886")
local widgetInfo = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 390, 520, 320, 380)
local widget = plugin:CreateDockWidgetPluginGui("QuruvchiAIBridge", widgetInfo)
widget.Title = "Quruvchi AI — Studio bridge"

local baseUrl = plugin:GetSetting("QuruvchiBaseUrl") or "http://127.0.0.1:8787"
local token = plugin:GetSetting("QuruvchiToken") or ""
local running = false
local statusLabel, urlBox, codeBox, placeBox, connectButton, logBox

local function create(className, props, parent)
    local instance = Instance.new(className)
    for key, value in pairs(props or {}) do instance[key] = value end
    instance.Parent = parent
    return instance
end

local root = create("Frame", {Size=UDim2.fromScale(1,1), BackgroundColor3=Color3.fromRGB(18,20,29), BorderSizePixel=0}, widget)
create("UIPadding", {PaddingTop=UDim.new(0,14), PaddingBottom=UDim.new(0,14), PaddingLeft=UDim.new(0,14), PaddingRight=UDim.new(0,14)}, root)
create("UIListLayout", {Padding=UDim.new(0,9), SortOrder=Enum.SortOrder.LayoutOrder}, root)

create("TextLabel", {Size=UDim2.new(1,0,0,32), BackgroundTransparency=1, Text="Quruvchi AI", TextColor3=Color3.fromRGB(231,228,255), Font=Enum.Font.GothamBold, TextSize=21, TextXAlignment=Enum.TextXAlignment.Left, LayoutOrder=1}, root)
create("TextLabel", {Size=UDim2.new(1,0,0,34), BackgroundTransparency=1, Text="Sayt serverini kiriting, keyin bir martalik kod bilan ulang.", TextColor3=Color3.fromRGB(164,168,188), Font=Enum.Font.Gotham, TextSize=12, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, LayoutOrder=2}, root)
urlBox = create("TextBox", {Size=UDim2.new(1,0,0,34), BackgroundColor3=Color3.fromRGB(32,35,48), TextColor3=Color3.fromRGB(240,240,250), PlaceholderText="https://your-quruvchi-server.example", Text=baseUrl, ClearTextOnFocus=false, Font=Enum.Font.Code, TextSize=12, LayoutOrder=3}, root)
codeBox = create("TextBox", {Size=UDim2.new(1,0,0,34), BackgroundColor3=Color3.fromRGB(32,35,48), TextColor3=Color3.fromRGB(240,240,250), PlaceholderText="8 xonali ulash kodi", Text="", ClearTextOnFocus=false, Font=Enum.Font.Code, TextSize=15, LayoutOrder=4}, root)
placeBox = create("TextBox", {Size=UDim2.new(1,0,0,32), BackgroundColor3=Color3.fromRGB(32,35,48), TextColor3=Color3.fromRGB(240,240,250), PlaceholderText="Loyiha nomi (ixtiyoriy)", Text="", ClearTextOnFocus=false, Font=Enum.Font.Gotham, TextSize=12, LayoutOrder=5}, root)
connectButton = create("TextButton", {Size=UDim2.new(1,0,0,36), BackgroundColor3=Color3.fromRGB(110,91,224), TextColor3=Color3.new(1,1,1), Text="Ulash va ishga tushirish", Font=Enum.Font.GothamBold, TextSize=13, LayoutOrder=6}, root)
statusLabel = create("TextLabel", {Size=UDim2.new(1,0,0,30), BackgroundTransparency=1, Text="Holat: ulanmagan", TextColor3=Color3.fromRGB(255,196,130), Font=Enum.Font.Gotham, TextSize=12, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, LayoutOrder=7}, root)
logBox = create("TextLabel", {Size=UDim2.new(1,0,0,150), BackgroundColor3=Color3.fromRGB(25,27,38), TextColor3=Color3.fromRGB(205,208,223), Text="Log:\nHTTP ulanishi uchun Studio’da Allow HTTP Requests yoqilgan bo‘lishi kerak.", Font=Enum.Font.Code, TextSize=11, TextWrapped=true, TextYAlignment=Enum.TextYAlignment.Top, TextXAlignment=Enum.TextXAlignment.Left, LayoutOrder=8}, root)
create("UIPadding", {PaddingTop=UDim.new(0,9), PaddingLeft=UDim.new(0,9), PaddingRight=UDim.new(0,9)}, logBox)

local function log(message)
    logBox.Text = "Log:\n" .. tostring(message)
end
local function request(method, path, body, authToken)
    local headers = {["Content-Type"]="application/json"}
    if authToken and authToken ~= "" then headers.Authorization = "Bearer " .. authToken end
    local response = HttpService:RequestAsync({
        Url = baseUrl:gsub("/+$","") .. path,
        Method = method,
        Headers = headers,
        Body = body and HttpService:JSONEncode(body) or nil
    })
    local data = {}
    if response.Body and response.Body ~= "" then
        local ok, decoded = pcall(function() return HttpService:JSONDecode(response.Body) end)
        if ok then data = decoded end
    end
    if not response.Success then error((data.error or ("HTTP " .. tostring(response.StatusCode))), 2) end
    return data
end

local function resolvePath(path)
    local current = game
    if not path or path == "" then return workspace end
    for part in string.gmatch(path, "[^%.]+") do
        if part == "game" then
            current = game
        elseif current == game and game:GetService(part) then
            current = game:GetService(part)
        else
            current = current:FindFirstChild(part)
            if not current then error("Parent topilmadi: " .. path) end
        end
    end
    return current
end

local function applyAction(action)
    if typeof(action) ~= "table" or typeof(action.type) ~= "string" then error("Action formati noto‘g‘ri") end
    local parent = resolvePath(action.parent or "Workspace")
    if action.type == "create_folder" then
        local folder = Instance.new("Folder")
        folder.Name = action.name
        folder.Parent = parent
        return "Folder yaratildi: " .. action.name
    elseif action.type == "create_part" then
        local part = Instance.new("Part")
        part.Name = action.name
        part.Anchored = true
        part.Size = Vector3.new(4,1,4)
        part.Position = Vector3.new(0,5,0)
        local props = action.properties or {}
        for key, value in pairs(props) do
            if key == "Anchored" and typeof(value) == "boolean" then part.Anchored = value
            elseif key == "CanCollide" and typeof(value) == "boolean" then part.CanCollide = value
            elseif key == "Transparency" and typeof(value) == "number" then part.Transparency = math.clamp(value,0,1)
            elseif key == "Material" and typeof(value) == "string" and Enum.Material[value] then part.Material = Enum.Material[value]
            elseif key == "Size" and typeof(value) == "table" and #value == 3 then part.Size = Vector3.new(value[1],value[2],value[3])
            elseif key == "Position" and typeof(value) == "table" and #value == 3 then part.Position = Vector3.new(value[1],value[2],value[3])
            elseif key == "Color" and typeof(value) == "table" and #value == 3 then part.Color = Color3.new(math.clamp(value[1],0,1),math.clamp(value[2],0,1),math.clamp(value[3],0,1))
            end
        end
        part.Parent = parent
        return "Part yaratildi: " .. action.name
    elseif action.type == "create_script" then
        local allowed = {Script=true, LocalScript=true, ModuleScript=true}
        local scriptType = allowed[action.scriptType] and action.scriptType or "Script"
        local obj = Instance.new(scriptType)
        obj.Name = action.name
        obj.Source = tostring(action.source or "-- Quruvchi AI: script source bo‘sh.")
        obj.Parent = parent
        return scriptType .. " yaratildi: " .. action.name
    elseif action.type == "set_property" then
        local target = parent:FindFirstChild(action.name)
        if not target then error("Property uchun obyekt topilmadi: " .. action.name) end
        local props = action.properties or {}
        for key, value in pairs(props) do
            if key == "Name" and typeof(value) == "string" then target.Name = value
            elseif key == "Anchored" and target:IsA("BasePart") and typeof(value) == "boolean" then target.Anchored = value
            elseif key == "CanCollide" and target:IsA("BasePart") and typeof(value) == "boolean" then target.CanCollide = value
            elseif key == "Transparency" and target:IsA("BasePart") and typeof(value) == "number" then target.Transparency = math.clamp(value,0,1)
            elseif key == "Position" and target:IsA("BasePart") and typeof(value) == "table" and #value == 3 then target.Position = Vector3.new(value[1],value[2],value[3])
            end
        end
        return "Property yangilandi: " .. action.name
    end
    error("Qo‘llab-quvvatlanmaydigan action: " .. action.type)
end

local function executeTask(task)
    local before = {}
    for _, action in ipairs(task.actions or {}) do
        local ok, result = pcall(applyAction, action)
        table.insert(before, (ok and "✓ " or "✗ ") .. tostring(result))
        if not ok then
            pcall(function() request("POST", "/api/studio/result", {taskId=task.id,ok=false,summary="Vazifa xato bilan tugadi",details=table.concat(before,"\n")}, token) end)
            return
        end
    end
    local selected = Selection:Get()
    pcall(function()
        ChangeHistoryService:SetWaypoint("Quruvchi AI — oldin")
        ChangeHistoryService:SetWaypoint("Quruvchi AI — keyin")
    end)
    request("POST", "/api/studio/result", {taskId=task.id,ok=true,summary=task.summary or "Studio o‘zgarishlari bajarildi",details=table.concat(before,"\n")}, token)
end

local function pollLoop()
    while running do
        local ok, result = pcall(function()
            request("POST", "/api/studio/heartbeat", {placeName=placeBox.Text ~= "" and placeBox.Text or game.Name}, token)
            return request("GET", "/api/studio/poll", nil, token)
        end)
        if ok then
            if result.task then
                local taskOk, taskErr = pcall(executeTask, result.task)
                if not taskOk then log("Vazifa xatosi: " .. tostring(taskErr)) end
            end
        else
            statusLabel.Text = "Holat: ulanish uzildi"
            statusLabel.TextColor3 = Color3.fromRGB(255,130,140)
            log("Server bilan aloqa xatosi: " .. tostring(result))
        end
        task.wait(ok and (result.pollAfterMs or 2000)/1000 or 5)
    end
end

connectButton.Activated:Connect(function()
    baseUrl = urlBox.Text:gsub("/+$","")
    plugin:SetSetting("QuruvchiBaseUrl", baseUrl)
    local code = codeBox.Text:gsub("%D","")
    if #code ~= 8 then statusLabel.Text = "Holat: 8 xonali kodni kiriting"; return end
    local ok, result = pcall(function()
        return request("POST", "/api/studio/pair", {code=code,placeName=placeBox.Text ~= "" and placeBox.Text or game.Name})
    end)
    if not ok then statusLabel.Text = "Holat: ulanmadi"; log(result); return end
    token = result.token
    plugin:SetSetting("QuruvchiToken", token)
    running = true
    statusLabel.Text = "Holat: ulandi — " .. (placeBox.Text ~= "" and placeBox.Text or game.Name)
    statusLabel.TextColor3 = Color3.fromRGB(113,224,180)
    connectButton.Text = "Ulandi — polling faol"
    connectButton.Active = false
    log("Ulanish muvaffaqiyatli. AI vazifalari navbatini kutmoqda.")
    task.spawn(pollLoop)
end)

openButton.Click:Connect(function() widget.Enabled = not widget.Enabled end)
