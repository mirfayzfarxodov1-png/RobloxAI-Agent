-- Quruvchi — Roblox Studio AI Plugin
-- Install from the website's /plugin.lua endpoint. This plugin works only in Edit mode.
if not game:GetService("RunService"):IsEdit() then return end

local SERVER = "__SERVER_URL__"
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local LogService = game:GetService("LogService")
local MarketplaceService = game:GetService("MarketplaceService")

local TOKEN_KEY = "quruvchi_token"
local RUN_CODE_KEY = "quruvchi_runcode"
local token = plugin:GetSetting(TOKEN_KEY)
local runCodeEnabled = plugin:GetSetting(RUN_CODE_KEY) == true
local alive = true
local polling = false
local backoff = 1
local logs = {}
local MAX_LOGS = 1000
local MAX_TREE_NODES = 400
local MAX_SOURCE = 100000
local widget, statusDot, statusText, codeBox, connectButton, runCodeButton, logFrame, logLayout
local logLabels = {}

local function log(message)
    local line = os.date("%H:%M:%S") .. "  " .. tostring(message)
    table.insert(logs, line)
    while #logs > MAX_LOGS do table.remove(logs, 1) end
    if logFrame and logLayout then
        local label = Instance.new("TextLabel")
        label.Name = "LogLine"
        label.BackgroundTransparency = 1
        label.Size = UDim2.new(1, -8, 0, 28)
        label.AutomaticSize = Enum.AutomaticSize.Y
        label.Font = Enum.Font.Code
        label.TextSize = 11
        label.TextColor3 = Color3.fromRGB(208, 207, 231)
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.TextYAlignment = Enum.TextYAlignment.Top
        label.TextWrapped = true
        label.Text = line
        label.LayoutOrder = #logs
        label.Parent = logFrame
        table.insert(logLabels, label)
        while #logLabels > 50 do
            local old = table.remove(logLabels, 1)
            if old then old:Destroy() end
        end
        task.defer(function()
            if logFrame then logFrame.CanvasPosition = Vector2.new(0, math.max(0, logLayout.AbsoluteContentSize.Y)) end
        end)
    end
end
local function setStatus(kind, text)
    if statusDot then
        statusDot.BackgroundColor3 = kind == "ok" and Color3.fromRGB(255,201,60)
            or kind == "error" and Color3.fromRGB(255,93,115)
            or kind == "busy" and Color3.fromRGB(139,124,255)
            or Color3.fromRGB(125,125,154)
    end
    if statusText then statusText.Text = text end
end
local function make(className, props, parent)
    local item = Instance.new(className)
    for key, value in pairs(props or {}) do item[key] = value end
    item.Parent = parent
    return item
end
local function getPlaceName()
    if game.PlaceId and game.PlaceId > 0 then
        local ok, info = pcall(function() return MarketplaceService:GetProductInfo(game.PlaceId) end)
        if ok and info and info.Name then return tostring(info.Name):sub(1,200) end
    end
    return game.Name
end
local function request(method, path, body, bearer)
    local headers = { ["Content-Type"] = "application/json", ["X-Place-Name"] = getPlaceName() }
    if bearer and bearer ~= "" then headers.Authorization = "Bearer " .. bearer end
    local options = { Url = SERVER .. path, Method = method, Headers = headers }
    if body ~= nil then options.Body = HttpService:JSONEncode(body) end
    local response = HttpService:RequestAsync(options)
    local data = {}
    if response.Body and response.Body ~= "" then
        local ok, parsed = pcall(function() return HttpService:JSONDecode(response.Body) end)
        if ok then data = parsed end
    end
    if not response.Success then
        error((data and data.error) or ("HTTP " .. tostring(response.StatusCode)), 2)
    end
    return data, response.StatusCode
end
local function findService(name)
    local ok, result = pcall(function() return game:GetService(name) end)
    if ok then return result end
    return game:FindFirstChild(name)
end
local function resolvePath(path)
    if typeof(path) ~= "string" or #path > 500 then error("Path noto‘g‘ri") end
    path = path:gsub("^/+", ""):gsub("/+$", "")
    if path == "" then error("Bo‘sh path") end
    local segments = string.split(path, "/")
    local current = findService(segments[1])
    if not current then error("Service yoki root topilmadi: " .. segments[1]) end
    for i = 2, #segments do
        current = current:FindFirstChild(segments[i])
        if not current then error("Path topilmadi: " .. path) end
    end
    return current
end
local function resolveParent(path)
    if not path or path == "" then return workspace end
    return resolvePath(path)
end
local function decodeValue(value)
    if typeof(value) ~= "table" then return value end
    local count, key = 0, nil
    for k in pairs(value) do count += 1; key = k end
    if count ~= 1 then return value end
    local v = value[key]
    if key == "Vector3" and typeof(v) == "table" and #v == 3 then return Vector3.new(v[1],v[2],v[3]) end
    if key == "Vector2" and typeof(v) == "table" and #v == 2 then return Vector2.new(v[1],v[2]) end
    if key == "Color3" and typeof(v) == "table" and #v == 3 then return Color3.fromRGB(math.clamp(v[1],0,255),math.clamp(v[2],0,255),math.clamp(v[3],0,255)) end
    if key == "UDim2" and typeof(v) == "table" and #v == 4 then return UDim2.new(v[1],v[2],v[3],v[4]) end
    if key == "UDim" and typeof(v) == "table" and #v == 2 then return UDim.new(v[1],v[2]) end
    if key == "CFrame" and typeof(v) == "table" and (#v == 3 or #v == 6) then
        local cf = CFrame.new(v[1],v[2],v[3])
        if #v == 6 then cf = cf * CFrame.Angles(math.rad(v[4]),math.rad(v[5]),math.rad(v[6])) end
        return cf
    end
    if key == "Enum" and typeof(v) == "string" then
        local enumName, itemName = v:match("^([%w_]+)%.([%w_]+)$")
        if enumName and Enum[enumName] and Enum[enumName][itemName] then return Enum[enumName][itemName] end
        error("Enum qiymati noto‘g‘ri: " .. v)
    end
    if key == "BrickColor" and typeof(v) == "string" then return BrickColor.new(v) end
    if key == "NumberRange" and typeof(v) == "table" and #v == 2 then return NumberRange.new(v[1],v[2]) end
    if key == "NumberSequence" and typeof(v) == "table" then
        local points = {}
        for _, p in ipairs(v) do table.insert(points, NumberSequenceKeypoint.new(p[1],p[2])) end
        return NumberSequence.new(points)
    end
    if key == "ColorSequence" and typeof(v) == "table" then
        local points = {}
        for _, p in ipairs(v) do table.insert(points, ColorSequenceKeypoint.new(p[1],Color3.fromRGB(math.clamp(p[2],0,255),math.clamp(p[3],0,255),math.clamp(p[4],0,255)))) end
        return ColorSequence.new(points)
    end
    if key == "Instance" and typeof(v) == "string" then return { __quruvchiInstancePath = v } end
    return value
end
local function protectedService(instance)
    if instance == game then return true end
    if instance.Parent == game then return true end
    if instance.Name == "StarterPlayerScripts" or instance.Name == "StarterCharacterScripts" then return true end
    return false
end
local function recordWaypoint(label, callback)
    local recording
    local ok = pcall(function()
        if ChangeHistoryService.TryBeginRecording then recording = ChangeHistoryService:TryBeginRecording("Quruvchi_" .. label) end
    end)
    local success, result = pcall(callback)
    pcall(function()
        if recording and ChangeHistoryService.FinishRecording then
            ChangeHistoryService:FinishRecording(recording, success and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel)
        else
            ChangeHistoryService:SetWaypoint("Quruvchi: " .. label)
        end
    end)
    if not success then error(result, 0) end
    return result
end
local function setSafeProperties(instance, properties, warnings, pendingRefs)
    for key, raw in pairs(properties or {}) do
        if key == "Parent" then
            table.insert(warnings, instance.Name .. ".Parent: Parent xossasi e’tiborsiz qoldirildi")
        else
            local ok, value = pcall(decodeValue, raw)
            if ok then
                if typeof(value) == "table" and value.__quruvchiInstancePath then
                    table.insert(pendingRefs, { instance=instance, key=key, path=value.__quruvchiInstancePath })
                else
                    local assigned, err = pcall(function() instance[key] = value end)
                    if not assigned then table.insert(warnings, instance.Name .. "." .. key .. ": " .. tostring(err)) end
                end
            else table.insert(warnings, instance.Name .. "." .. key .. ": " .. tostring(value)) end
        end
    end
end
local function buildTree(parent, nodeData, warnings, pendingRefs, count)
    if typeof(nodeData) ~= "table" or typeof(nodeData.name) ~= "string" or typeof(nodeData.className) ~= "string" then error("Tree node formati noto‘g‘ri") end
    count.n += 1
    if count.n > MAX_TREE_NODES then error("Tree 400 ta obyekt limitidan oshdi") end
    if #nodeData.name > 100 or nodeData.name == "" then error("Obyekt nomi noto‘g‘ri") end
    local instance = parent:FindFirstChild(nodeData.name)
    if instance and instance.ClassName ~= nodeData.className then
        error("Bir xil nomli obyekt boshqa class bilan mavjud: " .. nodeData.name .. ". Avval aniq o‘chirishni so‘rang.")
    end
    if not instance then
        local ok, created = pcall(function() return Instance.new(nodeData.className) end)
        if not ok then error("ClassName yaratilmadi: " .. tostring(nodeData.className)) end
        instance = created
        instance.Name = nodeData.name
    end
    setSafeProperties(instance, nodeData.properties, warnings, pendingRefs)
    for key, value in pairs(nodeData.attributes or {}) do
        if typeof(key) == "string" and #key <= 100 then
            local good, decoded = pcall(decodeValue, value)
            if good and typeof(decoded) ~= "table" and typeof(decoded) ~= "Instance" then
                pcall(function() instance:SetAttribute(key, decoded) end)
            else table.insert(warnings, instance.Name .. " attribute " .. key .. ": qiymat qo‘yilmadi") end
        end
    end
    for _, child in ipairs(nodeData.children or {}) do buildTree(instance, child, warnings, pendingRefs, count) end
    instance.Parent = parent
    return instance
end
local function getTree(input)
    local rootInstance = input.path and input.path ~= "" and resolvePath(input.path) or nil
    local depth = math.clamp(tonumber(input.depth) or 2,1,6)
    local count = 0
    local function serialize(instance, remaining)
        count += 1
        local out = { name=instance.Name, className=instance.ClassName, childCount=#instance:GetChildren() }
        if instance:IsA("LuaSourceContainer") then
            local ok, source = pcall(function() return instance.Source end)
            if ok and source then out.lines = #string.split(source,"\n") end
        end
        if remaining > 0 and count < MAX_TREE_NODES then
            out.children = {}
            for _, child in ipairs(instance:GetChildren()) do
                if count >= MAX_TREE_NODES then break end
                table.insert(out.children,serialize(child,remaining-1))
            end
        end
        return out
    end
    if rootInstance then return { tree=serialize(rootInstance,depth), count=count } end
    local roots = {}
    for _, name in ipairs({"Workspace","ReplicatedStorage","ServerScriptService","ServerStorage","StarterGui","StarterPlayer","Lighting"}) do
        local service = findService(name)
        if service then table.insert(roots,serialize(service,depth)) end
    end
    return { tree=roots, count=count }
end
local function createTree(input)
    return recordWaypoint("create_tree",function()
        local parentPath = input.parent or "Workspace"
        local parent = resolveParent(parentPath)
        local warnings, pendingRefs, count = {}, {}, {n=0}
        local created = buildTree(parent,input.tree,warnings,pendingRefs,count)
        for _, pending in ipairs(pendingRefs) do
            local ok, target = pcall(resolvePath,pending.path)
            if ok and target then
                local assigned, err = pcall(function() pending.instance[pending.key] = target end)
                if not assigned then table.insert(warnings,pending.instance.Name .. "." .. pending.key .. ": " .. tostring(err)) end
            else table.insert(warnings,pending.instance.Name .. "." .. pending.key .. ": Instance path topilmadi") end
        end
        return { created=count.n, path=parentPath .. "/" .. created.Name, warnings=warnings }
    end)
end
local function ensureParent(path)
    local segments = string.split(path,"/")
    if #segments < 2 then error("Script path servis va nomni o‘z ichiga olishi kerak") end
    local current = findService(segments[1])
    if not current then error("Service topilmadi: " .. segments[1]) end
    for i=2,#segments-1 do
        local nextItem = current:FindFirstChild(segments[i])
        if not nextItem then nextItem = Instance.new("Folder");nextItem.Name=segments[i];nextItem.Parent=current end
        current=nextItem
    end
    return current, segments[#segments]
end
local function createScript(input)
    if typeof(input.source) ~= "string" or #input.source > MAX_SOURCE then error("Script source bo‘sh yoki juda katta") end
    local allowed = {Script=true,LocalScript=true,ModuleScript=true}
    if not allowed[input.className] then error("Script turi ruxsat etilmagan") end
    return recordWaypoint("create_script",function()
        local parent,name = ensureParent(input.path)
        local instance = parent:FindFirstChild(name)
        if instance and instance.ClassName ~= input.className then instance:Destroy();instance=nil end
        if not instance then instance=Instance.new(input.className);instance.Name=name;instance.Parent=parent end
        local ok, err = pcall(function()
            ScriptEditorService:UpdateSourceAsync(instance,function() return input.source end)
        end)
        if not ok then
            local fallback, fallbackError = pcall(function() instance.Source=input.source end)
            if not fallback then error("Script source yozilmadi: " .. tostring(fallbackError or err)) end
        end
        return { path=input.path, className=input.className, lines=#string.split(input.source,"\n"), updated=true }
    end)
end
local function readScript(input)
    local instance=resolvePath(input.path)
    if not instance:IsA("LuaSourceContainer") then error("Bu obyekt script emas") end
    local source=instance.Source
    local lines=string.split(source,"\n")
    local first=math.max(1,tonumber(input.startLine) or 1)
    local last=math.min(#lines,tonumber(input.endLine) or #lines)
    local out={}
    for i=first,last do table.insert(out,string.format("%04d | %s",i,lines[i])) end
    local result=table.concat(out,"\n")
    if #result>20000 then result=result:sub(1,20000).."\n[chiqish qisqartirildi]" end
    return result
end
local function setProperties(input)
    return recordWaypoint("set_properties",function()
        local instance=resolvePath(input.path)
        local warnings,pendingRefs={},{}
        setSafeProperties(instance,input.properties,warnings,pendingRefs)
        for key,value in pairs(input.attributes or {}) do
            local ok,decoded=pcall(decodeValue,value)
            if ok and typeof(decoded)~="table" and typeof(decoded)~="Instance" then
                local setOk,err=pcall(function() instance:SetAttribute(key,decoded) end)
                if not setOk then table.insert(warnings,"Attribute "..key..": "..tostring(err)) end
            else table.insert(warnings,"Attribute "..key..": qiymat noto‘g‘ri") end
        end
        for _,pending in ipairs(pendingRefs) do
            local ok,target=pcall(resolvePath,pending.path)
            if ok and target then pcall(function() instance[pending.key]=target end) else table.insert(warnings,pending.key..": Instance topilmadi") end
        end
        return { path=input.path, warnings=warnings }
    end)
end
local function deleteInstance(input)
    return recordWaypoint("delete_instance",function()
        local instance=resolvePath(input.path)
        if protectedService(instance) then error("Service yoki himoyalangan obyektni o‘chirib bo‘lmaydi") end
        local path=input.path
        instance:Destroy()
        return { deleted=path }
    end)
end
local function runCode(input)
    if not runCodeEnabled then error("Foydalanuvchi run_code’ga ruxsat bermagan") end
    if typeof(input.code)~="string" or #input.code>20000 then error("Kod bo‘sh yoki juda katta") end
    if type(loadstring)~="function" then error("Bu Studio muhiti loadstring’ni qo‘llamaydi") end
    local captured={}
    local function joinArgs(...)
        local out = {}
        for i, value in ipairs({...}) do out[i] = tostring(value) end
        return table.concat(out, " ")
    end
    local env={game=game,workspace=workspace,Enum=Enum,Instance=Instance,Vector3=Vector3,Vector2=Vector2,CFrame=CFrame,Color3=Color3,BrickColor=BrickColor,UDim=UDim,UDim2=UDim2,math=math,string=string,table=table,task=task,pairs=pairs,ipairs=ipairs,typeof=typeof,pcall=pcall,select=select,tonumber=tonumber,tostring=tostring,type=type,assert=assert,error=error,warn=function(...) table.insert(captured,"WARN: "..joinArgs(...)) end,print=function(...) table.insert(captured,joinArgs(...)) end}
    local chunk,compileError=loadstring(input.code,"QuruvchiRunCode")
    if not chunk then error(compileError) end
    if setfenv then setfenv(chunk,env) end
    local ok,result=pcall(chunk)
    if result~=nil then table.insert(captured,tostring(result)) end
    if not ok then error(table.concat(captured,"\n").."\n"..tostring(result)) end
    return table.concat(captured,"\n"):sub(1,20000)
end
local function getLogs(input)
    local limit=math.clamp(tonumber(input.limit) or 200,1,500)
    local source={}
    local ok,history=pcall(function() return LogService:GetLogHistory() end)
    if ok then
        for _,entry in ipairs(history) do
            local typeName=tostring(entry.messageType or "")
            if not input.onlyErrors or typeName:find("Error") or typeName:find("Warning") then
                table.insert(source,string.format("[%s] %s",typeName,tostring(entry.message or "")))
            end
        end
    else source=table.clone(logs) end
    local start=math.max(1,#source-limit+1)
    local out={}
    for i=start,#source do table.insert(out,source[i]) end
    if input.clear then table.clear(logs);for _,label in ipairs(logLabels) do label:Destroy() end;table.clear(logLabels) end
    return table.concat(out,"\n"):sub(1,20000)
end
local handlers={get_tree=getTree,create_tree=createTree,create_script=createScript,read_script=readScript,set_properties=setProperties,delete_instance=deleteInstance,run_code=runCode,get_logs=getLogs}
local function execute(command)
    local handler=handlers[command.name]
    if not handler then error("Noma’lum tool: "..tostring(command.name)) end
    return handler(command.input or {})
end
local function postResult(id,ok,output)
    local lastError
    for attempt=1,3 do
        local success,err=pcall(function() request("POST","/api/plugin/result",{id=id,ok=ok,output=output},token) end)
        if success then return true end
        lastError=err;task.wait(attempt)
    end
    log("Natijani serverga yuborib bo‘lmadi: "..tostring(lastError))
    return false
end
local function clearToken()
    token=nil;plugin:SetSetting(TOKEN_KEY,nil)
    setStatus("idle","Ulanmagan")
    if connectButton then connectButton.Text="Ulanish" end
end
local function disconnect()
    if token then pcall(function() request("POST","/api/plugin/disconnect",{},token) end) end
    clearToken()
    log("Qurilma uzildi.")
end
local function pollLoop()
    if polling then return end
    polling=true
    while alive do
        if not token then task.wait(1)
        else
            local ok,result=pcall(function()
                return request("GET","/api/plugin/poll?wait=12",nil,token)
            end)
            if not ok then
                local message=tostring(result)
                if message:find("401") or message:find("yaroqsiz") or message:find("o‘chirildi") then
                    clearToken();log("Server qurilmani uzdi.");task.wait(1)
                else
                    setStatus("error","Server xatosi")
                    log("Poll xatosi: "..message)
                    task.wait(backoff);backoff=math.min(backoff*2,15)
                end
            else
                backoff=1
                if result.type=="command" then
                    setStatus("busy","Buyruq: "..tostring(result.name))
                    local success,output=pcall(execute,result)
                    postResult(result.id,success,success and HttpService:JSONEncode(output) or tostring(output))
                    log((success and "✓ " or "✗ ")..tostring(result.name).." · "..tostring(output):sub(1,180))
                    setStatus("ok","Ulangan · "..getPlaceName())
                else
                    setStatus("ok","Ulangan · "..getPlaceName())
                end
            end
        end
    end
    polling=false
end

local toolbar=plugin:CreateToolbar("Quruvchi AI")
local openButton=toolbar:CreateButton("Quruvchi","Quruvchi AI panelini ochish","")
local info=DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right,false,false,390,520,320,380)
widget=plugin:CreateDockWidgetPluginGui("QuruvchiAIBridge",info)
widget.Title="Quruvchi AI"

local root=make("Frame",{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(20,20,39),BorderSizePixel=0},widget)
make("UIPadding",{PaddingTop=UDim.new(0,13),PaddingBottom=UDim.new(0,12),PaddingLeft=UDim.new(0,12),PaddingRight=UDim.new(0,12)},root)
local mainLayout=make("UIListLayout",{Padding=UDim.new(0,8),SortOrder=Enum.SortOrder.LayoutOrder},root)
make("TextLabel",{Size=UDim2.new(1,0,0,32),BackgroundTransparency=1,Text="Quruvchi AI",TextColor3=Color3.fromRGB(238,235,255),Font=Enum.Font.GothamBold,TextSize=20,TextXAlignment=Enum.TextXAlignment.Left,LayoutOrder=1},root)
local statusRow=make("Frame",{Size=UDim2.new(1,0,0,26),BackgroundTransparency=1,LayoutOrder=2},root)
statusDot=make("Frame",{Size=UDim2.fromOffset(9,9),Position=UDim2.fromOffset(2,8),BackgroundColor3=Color3.fromRGB(125,125,154),BorderSizePixel=0},statusRow)
make("UICorner",{CornerRadius=UDim.new(1,0)},statusDot)
statusText=make("TextLabel",{Size=UDim2.new(1,-20,1,0),Position=UDim2.fromOffset(19,0),BackgroundTransparency=1,Text="Ulanmagan",TextColor3=Color3.fromRGB(190,187,222),Font=Enum.Font.Gotham,TextSize=12,TextXAlignment=Enum.TextXAlignment.Left},statusRow)
codeBox=make("TextBox",{Size=UDim2.new(1,0,0,34),BackgroundColor3=Color3.fromRGB(38,37,67),TextColor3=Color3.fromRGB(248,246,255),PlaceholderText="8 belgili kod (saytdan oling)",Text="",ClearTextOnFocus=false,Font=Enum.Font.Code,TextSize=15,LayoutOrder=3},root)
local buttons=make("Frame",{Size=UDim2.new(1,0,0,36),BackgroundTransparency=1,LayoutOrder=4},root)
connectButton=make("TextButton",{Size=UDim2.new(0.58,-4,1,0),BackgroundColor3=Color3.fromRGB(119,103,238),TextColor3=Color3.new(1,1,1),Text=token and "Uzish" or "Ulanish",Font=Enum.Font.GothamBold,TextSize=12},buttons)
local runToggle=make("TextButton",{Size=UDim2.new(0.42,-4,1,0),Position=UDim2.new(0.58,8,0,0),BackgroundColor3=runCodeEnabled and Color3.fromRGB(118,74,40) or Color3.fromRGB(43,43,69),TextColor3=Color3.fromRGB(245,239,255),Text="",Font=Enum.Font.Gotham,TextSize=11},buttons)
runCodeButton=runToggle
local function refreshRunButton() runCodeButton.Text="run_code: "..(runCodeEnabled and "YOQIQ" or "O‘CHIQ") end
refreshRunButton()
local logTitle=make("TextLabel",{Size=UDim2.new(1,0,0,20),BackgroundTransparency=1,Text="FAOLIYAT JURNALI",TextColor3=Color3.fromRGB(143,139,193),Font=Enum.Font.GothamBold,TextSize=10,TextXAlignment=Enum.TextXAlignment.Left,LayoutOrder=5},root)
logFrame=make("ScrollingFrame",{Size=UDim2.new(1,0,1,-190),BackgroundColor3=Color3.fromRGB(15,15,30),BorderSizePixel=0,CanvasSize=UDim2.new(0,0,0,0),AutomaticCanvasSize=Enum.AutomaticSize.Y,ScrollBarThickness=5,LayoutOrder=6},root)
logLayout=make("UIListLayout",{Padding=UDim.new(0,5),SortOrder=Enum.SortOrder.LayoutOrder},logFrame)
make("UIPadding",{PaddingTop=UDim.new(0,8),PaddingBottom=UDim.new(0,8),PaddingLeft=UDim.new(0,8),PaddingRight=UDim.new(0,8)},logFrame)
for _,line in ipairs(logs) do log(line) end

connectButton.Activated:Connect(function()
    if token then disconnect();connectButton.Text="Ulanish";return end
    local code=codeBox.Text:upper():gsub("[%s%-]","")
    if #code~=8 then setStatus("error","8 belgili kodni kiriting");return end
    local ok,result=pcall(function()
        return request("POST","/api/plugin/pair",{code=code,placeName=getPlaceName(),placeId=game.PlaceId})
    end)
    if not ok then setStatus("error","Ulanmadi");log("Ulanish xatosi: "..tostring(result));return end
    token=result.token;plugin:SetSetting(TOKEN_KEY,token);connectButton.Text="Uzish"
    setStatus("ok","Ulandi · "..getPlaceName());log("Studio muvaffaqiyatli ulandi.")
    task.spawn(pollLoop)
end)
runToggle.Activated:Connect(function()
    runCodeEnabled=not runCodeEnabled;plugin:SetSetting(RUN_CODE_KEY,runCodeEnabled);refreshRunButton()
    log("run_code ruxsati: "..(runCodeEnabled and "YOQIQ (xavfli)" or "O‘CHIQ"))
end)
openButton.Click:Connect(function() widget.Enabled=not widget.Enabled end)
widget:BindToClose(function() widget.Enabled=false end)
if token then task.spawn(pollLoop) end
