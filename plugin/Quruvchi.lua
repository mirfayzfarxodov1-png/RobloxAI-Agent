-- Quruvchi — Roblox Studio AI Plugin
-- Install from the website's /plugin.lua endpoint. This plugin works only in Edit mode.
if not game:GetService("RunService"):IsEdit() then return end

local SERVER = "http://localhost:3000"
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local LogService = game:GetService("LogService")
local MarketplaceService = game:GetService("MarketplaceService")
local Selection = game:GetService("Selection")

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
    local current = segments[1] == "game" and game or findService(segments[1])
    if not current then error("Service yoki root topilmadi: " .. segments[1]) end
    for i = 2, #segments do
        current = current:FindFirstChild(segments[i])
        if not current then error("Path topilmadi: " .. path) end
    end
    return current
end
local function instancePath(instance)
    local parts = {}
    local current = instance
    while current and current ~= game do
        table.insert(parts,1,current.Name)
        current = current.Parent
    end
    return #parts > 0 and table.concat(parts,"/") or "game"
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
local function safeName(value)
    if typeof(value) ~= "string" then error("Name matn bo‘lishi kerak") end
    value = value:match("^%s*(.-)%s*$")
    if #value < 1 or #value > 100 or value:find("/",1,true) or value:find("\\",1,true) then
        error("Name 1–100 belgi bo‘lsin va / yoki \\ bo‘lmasin")
    end
    return value
end
local function getSelection()
    local out = {}
    for _, instance in ipairs(Selection:Get()) do
        table.insert(out,{path=instancePath(instance),name=instance.Name,className=instance.ClassName})
        if #out >= 100 then break end
    end
    return {count=#out,items=out}
end
local function searchInstances(input)
    local root = input.path and input.path ~= "" and resolvePath(input.path) or workspace
    local nameNeedle = string.lower(tostring(input.nameContains or "")):sub(1,100)
    local classNeedle = tostring(input.className or ""):sub(1,80)
    local limit = math.clamp(tonumber(input.maxResults) or 40,1,100)
    local found, scanned = {},0
    for _, instance in ipairs(root:GetDescendants()) do
        scanned += 1
        if scanned > 5000 then break end
        local nameMatch = nameNeedle == "" or string.find(string.lower(instance.Name),nameNeedle,1,true) ~= nil
        local classMatch = classNeedle == "" or instance.ClassName == classNeedle
        if nameMatch and classMatch then
            table.insert(found,{path=instancePath(instance),name=instance.Name,className=instance.ClassName})
            if #found >= limit then break end
        end
    end
    return {root=instancePath(root),scanned=scanned,results=found,truncated=scanned>5000 or #found>=limit}
end
local function inspectInstance(input)
    local instance = resolvePath(input.path)
    local properties = {}
    for _, key in ipairs({"Name","ClassName","Archivable","Parent","Position","Size","Anchored","CanCollide","Transparency","Material","Color","Visible","Enabled","Text","Value","LayoutOrder"}) do
        local ok, value = pcall(function() return instance[key] end)
        if ok then properties[key] = key == "Parent" and (value and instancePath(value) or nil) or tostring(value) end
    end
    local attributes, attributeCount = {},0
    for key, value in pairs(instance:GetAttributes()) do
        attributeCount += 1
        if attributeCount > 40 then break end
        attributes[key] = tostring(value)
    end
    local children = {}
    for _, child in ipairs(instance:GetChildren()) do
        table.insert(children,{name=child.Name,className=child.ClassName})
        if #children >= 60 then break end
    end
    return {path=instancePath(instance),properties=properties,attributes=attributes,children=children}
end
local function renameInstance(input)
    return recordWaypoint("rename_instance",function()
        local instance = resolvePath(input.path)
        if protectedService(instance) then error("Service nomini o‘zgartirib bo‘lmaydi") end
        local name = safeName(input.name)
        local old = instance.Name
        instance.Name = name
        return {path=instancePath(instance),oldName=old,newName=name}
    end)
end
local function duplicateInstance(input)
    return recordWaypoint("duplicate_instance",function()
        local source = resolvePath(input.path)
        if protectedService(source) then error("Service yoki himoyalangan obyektni nusxalab bo‘lmaydi") end
        local clone = source:Clone()
        if not clone then error("Obyekt Archivable emas; nusxa olinmadi") end
        if input.name and input.name ~= "" then clone.Name = safeName(input.name) end
        local parent = input.parent and input.parent ~= "" and resolvePath(input.parent) or source.Parent
        if not parent then error("Yangi parent topilmadi") end
        clone.Parent = parent
        return {path=instancePath(clone),className=clone.ClassName,name=clone.Name}
    end)
end
local function selectInstances(input)
    local items = {}
    for _, path in ipairs(input.paths or {}) do
        if #items >= 100 then break end
        table.insert(items,resolvePath(path))
    end
    Selection:Set(items)
    return {selected=#items,items=(function()
        local out={}
        for _, instance in ipairs(items) do table.insert(out,{path=instancePath(instance),className=instance.ClassName}) end
        return out
    end)()}
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

local function auditProject(input)
    local maxNodes = math.clamp(tonumber(input.maxNodes) or 8000, 100, 10000)
    local root = input.path and input.path ~= "" and resolvePath(input.path) or game
    local descendants = root:GetDescendants()
    local counts = {instances=0,parts=0,unanchoredParts=0,scripts=0,emptyScripts=0,longScripts=0,disabledScripts=0,remotes=0,guiObjects=0,lights=0,particleEmitters=0,trailsAndBeams=0,sounds=0}
    local findings, seenParents = {}, {}
    local scanned, truncated = 0, false
    local function finding(level, code, path, message)
        if #findings < 80 then table.insert(findings, {level=level,code=code,path=path,message=message}) end
    end
    for _, instance in ipairs(descendants) do
        if scanned >= maxNodes then truncated = true; break end
        scanned += 1
        counts.instances += 1
        local path = instancePath(instance)
        if instance:IsA("BasePart") then
            counts.parts += 1
            if instance:IsDescendantOf(workspace) and not instance.Anchored then counts.unanchoredParts += 1 end
        end
        if instance:IsA("LuaSourceContainer") then
            counts.scripts += 1
            local ok, source = pcall(function() return instance.Source end)
            if ok and typeof(source) == "string" then
                if source:match("^%s*$") then
                    counts.emptyScripts += 1
                    finding("warning","empty_script",path,"Script kodi bo‘sh.")
                else
                    local lines = #string.split(source,"\n")
                    if lines > 350 then
                        counts.longScripts += 1
                        finding("info","large_script",path,"Script "..lines.." qator; modullarga ajratishni ko‘rib chiq.")
                    end
                end
            else
                finding("info","source_unavailable",path,"Script manbasini o‘qib bo‘lmadi; ruxsat yoki Studio holatini tekshir.")
            end
            if instance:IsA("Script") or instance:IsA("LocalScript") then
                local disabledOk, disabled = pcall(function() return instance.Disabled end)
                if disabledOk and disabled then
                    counts.disabledScripts += 1
                    finding("info","disabled_script",path,"Script o‘chiq (Disabled=true); bu ataylab qilinganini tekshir.")
                end
            end
        end
        if instance:IsA("RemoteEvent") or instance:IsA("RemoteFunction") or instance:IsA("UnreliableRemoteEvent") then counts.remotes += 1 end
        if instance:IsA("GuiObject") then counts.guiObjects += 1 end
        if instance:IsA("Light") then counts.lights += 1 end
        if instance:IsA("ParticleEmitter") then counts.particleEmitters += 1 end
        if instance:IsA("Trail") or instance:IsA("Beam") then counts.trailsAndBeams += 1 end
        if instance:IsA("Sound") then counts.sounds += 1 end
        local parent = instance.Parent
        if parent and not seenParents[parent] then
            seenParents[parent] = true
            local names = {}
            for _, sibling in ipairs(parent:GetChildren()) do names[sibling.Name] = (names[sibling.Name] or 0) + 1 end
            for name, amount in pairs(names) do
                if amount > 1 then
                    finding("warning","duplicate_sibling_name",instancePath(parent),"Bir parent ichida '"..name.."' nomli "..amount.." ta obyekt bor; path orqali tanlash noaniq bo‘lishi mumkin.")
                    break
                end
            end
        end
    end
    if counts.parts > 1500 then finding("warning","many_parts",instancePath(root),"Hududda "..counts.parts.." ta BasePart bor; lag uchun profil va streaming/instancingni tekshir.") end
    if counts.particleEmitters > 100 then finding("warning","many_particle_emitters",instancePath(root),counts.particleEmitters.." ta ParticleEmitter topildi; uzoq masofada effektlarni o‘chirib turish yoki emission rate’ni kamaytirishni ko‘rib chiq.") end
    if counts.lights > 120 then finding("warning","many_lights",instancePath(root),counts.lights.." ta Light topildi; soya va range sozlamalarini optimallashtir.") end
    if counts.sounds > 150 then finding("info","many_sounds",instancePath(root),counts.sounds.." ta Sound topildi; bir vaqtda chalinadigan ovozlar va cleanup’ni tekshir.") end
    if counts.unanchoredParts > 150 then finding("warning","many_unanchored_parts",instancePath(root),counts.unanchoredParts.." ta unanchored part topildi; fizik yukni tekshir.") end
    if truncated then finding("warning","audit_truncated",instancePath(root),"Audit "..maxNodes.." obyekt bilan cheklangan; to‘liqroq tekshiruv uchun kichikroq path tanla.") end
    return {scope=instancePath(root),scanned=scanned,truncated=truncated,counts=counts,findings=findings}
end

local function previewTree(input)
    local parentPath = input.parent or "Workspace"
    local parent = resolveParent(parentPath)
    if typeof(input.tree) ~= "table" then error("tree obyekt bo‘lishi kerak") end
    local summary = {create=0,update=0,conflict=0,nodes=0,items={}}
    local function walk(container,node,path,depth)
        if depth > 30 then error("Tree chuqurligi 30 dan oshdi") end
        if typeof(node) ~= "table" or typeof(node.name) ~= "string" or typeof(node.className) ~= "string" then error("Tree node formati noto‘g‘ri") end
        if node.name == "" or #node.name > 100 then error("Obyekt nomi noto‘g‘ri: "..tostring(node.name)) end
        summary.nodes += 1
        if summary.nodes > MAX_TREE_NODES then error("Preview 400 ta obyekt limitidan oshdi") end
        local existing = container:FindFirstChild(node.name)
        local action = "create"
        if existing then
            if existing.ClassName == node.className then action = "update" else action = "conflict" end
        end
        summary[action] += 1
        if #summary.items < 120 then
            table.insert(summary.items,{path=path.."/"..node.name,className=node.className,action=action})
        end
        if action == "conflict" then return end
        local nextContainer = existing
        if not nextContainer then
            local ok, created = pcall(function() return Instance.new(node.className) end)
            if not ok then
                summary.conflict += 1
                summary.create -= 1
                if #summary.items < 120 then table.insert(summary.items,{path=path.."/"..node.name,className=node.className,action="invalid_class"}) end
                return
            end
            nextContainer = created
            created:Destroy()
        end
        for _,child in ipairs(node.children or {}) do walk(nextContainer,child,path.."/"..node.name,depth+1) end
    end
    walk(parent,input.tree,parentPath,1)
    return {parent=parentPath,nodes=summary.nodes,create=summary.create,update=summary.update,conflict=summary.conflict,items=summary.items,mutated=false,note="Faqat oldindan ko‘rish; Studio o‘zgartirilmadi."}
end

local function createGuiTemplate(input)
    local parentPath = input.parent or "StarterGui"
    local parent = resolveParent(parentPath)
    local starterGui = findService("StarterGui")
    if not starterGui or (parent ~= starterGui and not parent:IsDescendantOf(starterGui)) then
        error("GUI faqat StarterGui yoki uning ichidagi obyektga yaratilishi mumkin")
    end
    local guiName = tostring(input.name or "QuruvchiInterface")
    if guiName == "" or #guiName > 80 then error("GUI nomi noto‘g‘ri") end
    local titleText = tostring(input.title or "YANGI INTERFEYS"):sub(1,100)
    local buttonNames = typeof(input.buttons) == "table" and input.buttons or {"Asosiy amal","Sozlamalar"}
    if #buttonNames > 8 then error("Ko‘pi bilan 8 ta action tugmasi mumkin") end
    for _,label in ipairs(buttonNames) do
        if typeof(label) ~= "string" or #label < 1 or #label > 40 then error("Tugma nomi 1–40 belgi bo‘lishi kerak") end
    end
    return recordWaypoint("create_gui_template",function()
        local old = parent:FindFirstChild(guiName)
        if old then
            error(guiName.." nomli obyekt allaqachon mavjud. Uni o‘chirmaslik uchun boshqa nom tanlang yoki avval snapshot oling.")
        end
        local gui=Instance.new("ScreenGui");gui.Name=guiName;gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling
        local frame=Instance.new("Frame");frame.Name="Main";frame.AnchorPoint=Vector2.new(0.5,0.5);frame.Position=UDim2.fromScale(0.5,0.5);frame.Size=UDim2.new(0.82,0,0.72,0);frame.BackgroundColor3=Color3.fromRGB(17,20,38);frame.BorderSizePixel=0;frame.Parent=gui
        local size=Instance.new("UISizeConstraint");size.MinSize=Vector2.new(280,240);size.MaxSize=Vector2.new(760,620);size.Parent=frame
        local aspect=Instance.new("UIAspectRatioConstraint");aspect.AspectRatio=1.18;aspect.DominantAxis=Enum.DominantAxis.Width;aspect.Parent=frame
        local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,16);corner.Parent=frame
        local stroke=Instance.new("UIStroke");stroke.Color=Color3.fromRGB(106,91,220);stroke.Thickness=1.5;stroke.Transparency=0.15;stroke.Parent=frame
        local header=Instance.new("Frame");header.Name="Header";header.Size=UDim2.new(1,0,0,58);header.BackgroundColor3=Color3.fromRGB(35,31,70);header.BorderSizePixel=0;header.Parent=frame
        local headerCorner=Instance.new("UICorner");headerCorner.CornerRadius=UDim.new(0,16);headerCorner.Parent=header
        local title=Instance.new("TextLabel");title.Name="Title";title.BackgroundTransparency=1;title.Position=UDim2.fromOffset(20,0);title.Size=UDim2.new(1,-80,1,0);title.Font=Enum.Font.GothamBold;title.TextSize=18;title.TextColor3=Color3.fromRGB(246,244,255);title.TextXAlignment=Enum.TextXAlignment.Left;title.Text=titleText;title.Parent=header
        local close=Instance.new("TextButton");close.Name="Close";close.AnchorPoint=Vector2.new(1,0.5);close.Position=UDim2.new(1,-14,0.5,0);close.Size=UDim2.fromOffset(34,34);close.BackgroundColor3=Color3.fromRGB(79,62,120);close.Text="×";close.TextSize=24;close.Font=Enum.Font.GothamBold;close.TextColor3=Color3.new(1,1,1);close.Parent=header
        local closeCorner=Instance.new("UICorner");closeCorner.CornerRadius=UDim.new(0,10);closeCorner.Parent=close
        local body=Instance.new("Frame");body.Name="Content";body.BackgroundTransparency=1;body.Position=UDim2.new(0,18,0,72);body.Size=UDim2.new(1,-36,1,-88);body.Parent=frame
        local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,10);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=body
        local status=Instance.new("TextLabel");status.Name="Status";status.BackgroundTransparency=1;status.Size=UDim2.new(1,0,0,30);status.Font=Enum.Font.Gotham;status.TextSize=13;status.TextColor3=Color3.fromRGB(180,190,226);status.TextXAlignment=Enum.TextXAlignment.Left;status.Text="Tizim tayyor";status.LayoutOrder=1;status.Parent=body
        local event=Instance.new("BindableEvent");event.Name="ActionRequested";event.Parent=gui
        for index,label in ipairs(buttonNames) do
            local button=Instance.new("TextButton");button.Name="Action"..index;button.Size=UDim2.new(1,0,0,42);button.BackgroundColor3=Color3.fromRGB(86,75,190);button.TextColor3=Color3.new(1,1,1);button.Font=Enum.Font.GothamSemibold;button.TextSize=14;button.Text=label;button.LayoutOrder=index+1;button.Parent=body
            local bc=Instance.new("UICorner");bc.CornerRadius=UDim.new(0,10);bc.Parent=button
            local action=Instance.new("StringValue");action.Name="ActionKey";action.Value=label;action.Parent=button
        end
        local localScript=Instance.new("LocalScript");localScript.Name="UIController"
        localScript.Source=[[
local gui = script.Parent
local main = gui:WaitForChild("Main")
local header = main:WaitForChild("Header")
header:WaitForChild("Close").Activated:Connect(function()
    gui.Enabled = false
end)
local content = main:WaitForChild("Content")
local status = content:WaitForChild("Status")
local event = gui:WaitForChild("ActionRequested")
for _, button in ipairs(content:GetChildren()) do
    if button:IsA("TextButton") and button.Name:match("^Action%d+$") then
        button.Activated:Connect(function()
            local key = button:FindFirstChild("ActionKey")
            status.Text = "Tanlandi: " .. (key and key.Value or button.Text)
            event:Fire(key and key.Value or button.Text)
        end)
    end
end
]]
        localScript.Parent=gui
        gui.Parent=parent
        return {created=true,path=parentPath.."/"..guiName,buttons=#buttonNames,actionEvent=parentPath.."/"..guiName.."/ActionRequested",note="Close va action tugmalari ulangan; ActionRequested BindableEvent'ni boshqa LocalScript tinglashi mumkin. O‘yin logikasiga avtomatik bog‘lanmagan."}
    end)
end

local function snapshotInstance(input)
    local path = input.path
    if typeof(path) ~= "string" or path == "" then error("Snapshot uchun path talab qilinadi") end
    local target = resolvePath(path)
    if target == game or protectedService(target) or target:IsDescendantOf(findService("ServerStorage") or game) then
        error("Service root yoki backup papkasini snapshot qilish mumkin emas; aniq obyektni tanlang")
    end
    local name = tostring(input.name or (target.Name.."_backup_"..os.date("%Y%m%d_%H%M%S")))
    if not name:match("^[%w_%-]+$") or #name > 80 then error("Snapshot nomida faqat harf, son, _ va - ishlatiladi") end
    local storage=findService("ServerStorage")
    if not storage then error("ServerStorage topilmadi") end
    local folder=storage:FindFirstChild("QuruvchiSnapshots")
    if not folder then folder=Instance.new("Folder");folder.Name="QuruvchiSnapshots";folder.Parent=storage end
    if folder:FindFirstChild(name) then error("Bu nomli snapshot mavjud: "..name) end
    local ok,clone=pcall(function() return target:Clone() end)
    if not ok or not clone then error("Obyektni Clone qilib bo‘lmadi. Archivable va class’ni tekshiring.") end
    clone.Name=name
    clone:SetAttribute("__QuruvchiOriginalName",target.Name)
    clone:SetAttribute("__QuruvchiOriginalParent",instancePath(target.Parent))
    clone:SetAttribute("__QuruvchiSnapshotPath",path)
    clone:SetAttribute("__QuruvchiSnapshotTime",os.time())
    clone.Parent=folder
    local backups=folder:GetChildren()
    if #backups>10 then
        table.sort(backups,function(a,b) return (a:GetAttribute("__QuruvchiSnapshotTime") or 0) < (b:GetAttribute("__QuruvchiSnapshotTime") or 0) end)
        while #backups>10 do local old=table.remove(backups,1);if old then old:Destroy() end end
    end
    return {created=true,name=name,path=path,storedAt="ServerStorage/QuruvchiSnapshots/"..name,backupsKept=math.min(#folder:GetChildren(),10),note="Snapshot joriy place ichida saqlanadi; o‘yinni Publish/Save qilsangiz backup ham saqlanadi."}
end

local function restoreSnapshot(input)
    if input.confirm ~= true then error("Tiklash eski obyektni almashtiradi. Faqat foydalanuvchi aniq tasdiqlagach confirm=true yuboring.") end
    local name=tostring(input.name or "")
    if not name:match("^[%w_%-]+$") or #name>80 then error("Snapshot nomi noto‘g‘ri") end
    local folder=(findService("ServerStorage") or game):FindFirstChild("QuruvchiSnapshots")
    local backup=folder and folder:FindFirstChild(name)
    if not backup then error("Snapshot topilmadi: "..name) end
    local parentPath=backup:GetAttribute("__QuruvchiOriginalParent")
    local originalName=backup:GetAttribute("__QuruvchiOriginalName")
    if typeof(parentPath)~="string" or typeof(originalName)~="string" then error("Snapshot metadata yo‘q; xavfsiz tiklash mumkin emas") end
    local parent=resolvePath(parentPath)
    -- parent path was captured from the original object; replace only the named child, never the service itself.
    return recordWaypoint("restore_snapshot",function()
        local ok,restored=pcall(function() return backup:Clone() end)
        if not ok or not restored then error("Snapshot nusxasi olinmadi") end
        restored.Name=originalName
        restored:SetAttribute("__QuruvchiOriginalName",nil)
        restored:SetAttribute("__QuruvchiOriginalParent",nil)
        restored:SetAttribute("__QuruvchiSnapshotPath",nil)
        restored:SetAttribute("__QuruvchiSnapshotTime",nil)
        local current=parent:FindFirstChild(originalName)
        if current then current:Destroy() end
        restored.Parent=parent
        return {restored=true,name=originalName,path=parentPath.."/"..originalName,replacedExisting=current~=nil,warning="Restore joriy obyektni almashtiradi. Roblox Studio Undo bilan qaytarish mumkin."}
    end)
end


local function performanceAudit(input)
    local report = auditProject(input)
    report.mode = "performance"
    report.performance = {
        parts=report.counts.parts,
        unanchoredParts=report.counts.unanchoredParts,
        lights=report.counts.lights,
        particleEmitters=report.counts.particleEmitters,
        trailsAndBeams=report.counts.trailsAndBeams,
        sounds=report.counts.sounds
    }
    report.note = "Statik taxminiy audit; FPS/profiler yoki Play-test natijasi emas."
    return report
end

local function checkAssetIds(input)
    local ids = input.ids
    if typeof(ids) ~= "table" or #ids < 1 or #ids > 20 then error("1–20 ta asset ID yuboring") end
    local results = {}
    for _, rawId in ipairs(ids) do
        local id = tonumber(rawId)
        if not id or id <= 0 or id % 1 ~= 0 or id > 9007199254740991 then
            table.insert(results,{id=tostring(rawId),validFormat=false,exists=false,error="Asset ID musbat butun son bo‘lishi kerak"})
        else
            local ok, info = pcall(function() return MarketplaceService:GetProductInfo(id, Enum.InfoType.Asset) end)
            if ok and typeof(info) == "table" then
                table.insert(results,{id=id,validFormat=true,exists=true,name=tostring(info.Name or ""),assetTypeId=info.AssetTypeId,creator=info.Creator and tostring(info.Creator.Name or "") or "",creatorId=info.Creator and info.Creator.Id or nil,price=info.PriceInRobux,availability="API info qaytdi; tajriba ichida foydalanish ruxsati va moderation holati alohida tekshirilishi kerak"})
            else
                table.insert(results,{id=id,validFormat=true,exists=false,error=tostring(info):sub(1,240),availability="Topilmadi yoki API/ruxsat cheklovi bo‘lishi mumkin"})
            end
            task.wait(0.1)
        end
    end
    return {checked=#results,results=results,note="Asset mavjudligi tekshiruvi permission yoki tajribada foydalanish huquqini kafolatlamaydi."}
end

local handlers={preview_tree=previewTree,create_gui_template=createGuiTemplate,snapshot_instance=snapshotInstance,restore_snapshot=restoreSnapshot,performance_audit=performanceAudit,check_asset_ids=checkAssetIds,get_tree=getTree,create_tree=createTree,create_script=createScript,read_script=readScript,set_properties=setProperties,delete_instance=deleteInstance,run_code=runCode,get_logs=getLogs,get_selection=getSelection,search_instances=searchInstances,inspect_instance=inspectInstance,rename_instance=renameInstance,duplicate_instance=duplicateInstance,select_instances=selectInstances,audit_project=auditProject}
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
local info=DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right,true,false,430,650,340,460)
widget=plugin:CreateDockWidgetPluginGui("QuruvchiAIBridge",info)
widget.Title="Quruvchi LUA · AI Builder"

local root=make("Frame",{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(13,14,29),BorderSizePixel=0},widget)
make("UIGradient",{Color=ColorSequence.new({ColorSequenceKeypoint.new(0,Color3.fromRGB(23,22,48)),ColorSequenceKeypoint.new(1,Color3.fromRGB(12,14,27))}),Rotation=90},root)
make("UIPadding",{PaddingTop=UDim.new(0,13),PaddingBottom=UDim.new(0,12),PaddingLeft=UDim.new(0,12),PaddingRight=UDim.new(0,12)},root)
local mainLayout=make("UIListLayout",{Padding=UDim.new(0,8),SortOrder=Enum.SortOrder.LayoutOrder},root)
make("TextLabel",{Size=UDim2.new(1,0,0,32),BackgroundTransparency=1,Text="QURUVCHI LUA",TextColor3=Color3.fromRGB(244,241,255),Font=Enum.Font.GothamBold,TextSize=21,TextXAlignment=Enum.TextXAlignment.Left,LayoutOrder=1},root)
make("TextLabel",{Size=UDim2.new(1,0,0,18),BackgroundTransparency=1,Text="AI GAME BUILDER  /  STUDIO BRIDGE",TextColor3=Color3.fromRGB(151,139,225),Font=Enum.Font.GothamMedium,TextSize=9,TextXAlignment=Enum.TextXAlignment.Left,LayoutOrder=2},root)
local statusRow=make("Frame",{Size=UDim2.new(1,0,0,26),BackgroundTransparency=1,LayoutOrder=3},root)
statusDot=make("Frame",{Size=UDim2.fromOffset(9,9),Position=UDim2.fromOffset(2,8),BackgroundColor3=Color3.fromRGB(125,125,154),BorderSizePixel=0},statusRow)
make("UICorner",{CornerRadius=UDim.new(1,0)},statusDot)
make("UIStroke",{Color=Color3.fromRGB(66,60,115),Transparency=0.45,Thickness=1},statusRow)
statusText=make("TextLabel",{Size=UDim2.new(1,-20,1,0),Position=UDim2.fromOffset(19,0),BackgroundTransparency=1,Text="Ulanmagan",TextColor3=Color3.fromRGB(190,187,222),Font=Enum.Font.Gotham,TextSize=12,TextXAlignment=Enum.TextXAlignment.Left},statusRow)
codeBox=make("TextBox",{Size=UDim2.new(1,0,0,34),BackgroundColor3=Color3.fromRGB(38,37,67),TextColor3=Color3.fromRGB(248,246,255),PlaceholderText="8 belgili kod (saytdan oling)",Text="",ClearTextOnFocus=false,Font=Enum.Font.Code,TextSize=15,LayoutOrder=4},root)
make("UICorner",{CornerRadius=UDim.new(0,9)},codeBox)
make("UIStroke",{Color=Color3.fromRGB(71,65,124),Transparency=0.3,Thickness=1},codeBox)
local buttons=make("Frame",{Size=UDim2.new(1,0,0,36),BackgroundTransparency=1,LayoutOrder=5},root)
connectButton=make("TextButton",{Size=UDim2.new(0.58,-4,1,0),BackgroundColor3=Color3.fromRGB(119,103,238),TextColor3=Color3.new(1,1,1),Text=token and "Uzish" or "Ulanish",Font=Enum.Font.GothamBold,TextSize=12,AutoButtonColor=true},buttons)
make("UICorner",{CornerRadius=UDim.new(0,9)},connectButton)
make("UIStroke",{Color=Color3.fromRGB(167,151,255),Transparency=0.65,Thickness=1},connectButton)
local runToggle=make("TextButton",{Size=UDim2.new(0.42,-4,1,0),Position=UDim2.new(0.58,8,0,0),BackgroundColor3=runCodeEnabled and Color3.fromRGB(118,74,40) or Color3.fromRGB(43,43,69),TextColor3=Color3.fromRGB(245,239,255),Text="",Font=Enum.Font.Gotham,TextSize=11,AutoButtonColor=true},buttons)
make("UICorner",{CornerRadius=UDim.new(0,9)},runToggle)
runCodeButton=runToggle
local function refreshRunButton() runCodeButton.Text="run_code: "..(runCodeEnabled and "YOQIQ" or "O‘CHIQ") end
refreshRunButton()
local quickTools=make("Frame",{Size=UDim2.new(1,0,0,38),BackgroundTransparency=1,LayoutOrder=6},root)
local function quickButton(text,x,w,callback)
    local b=make("TextButton",{Size=UDim2.new(w,-4,1,0),Position=UDim2.new(x,0,0,0),BackgroundColor3=Color3.fromRGB(29,42,69),TextColor3=Color3.fromRGB(218,226,255),Text=text,Font=Enum.Font.GothamMedium,TextSize=10,AutoButtonColor=true},quickTools)
    make("UICorner",{CornerRadius=UDim.new(0,8)},b)
    make("UIStroke",{Color=Color3.fromRGB(63,81,123),Transparency=0.35,Thickness=1},b)
    b.Activated:Connect(callback)
    return b
end
logFrame=make("ScrollingFrame",{Size=UDim2.new(1,0,1,-330),BackgroundColor3=Color3.fromRGB(10,16,29),BorderSizePixel=0,CanvasSize=UDim2.new(0,0,0,0),AutomaticCanvasSize=Enum.AutomaticSize.Y,ScrollBarThickness=4,ScrollBarImageColor3=Color3.fromRGB(126,148,255),LayoutOrder=10},root)
make("UICorner",{CornerRadius=UDim.new(0,10)},logFrame)
make("UIStroke",{Color=Color3.fromRGB(43,59,88),Transparency=0.25,Thickness=1},logFrame)
logLayout=make("UIListLayout",{Padding=UDim.new(0,5),SortOrder=Enum.SortOrder.LayoutOrder},logFrame)
make("UIPadding",{PaddingTop=UDim.new(0,8),PaddingBottom=UDim.new(0,8),PaddingLeft=UDim.new(0,8),PaddingRight=UDim.new(0,8)},logFrame)
quickButton("Explorer",0,0.25,function()
    local ok,result=pcall(function() return getTree({depth=1}) end)
    if not ok then log("Explorer xatosi: "..tostring(result));return end
    local lines={}
    local function visit(item,prefix)
        if #lines>=28 or typeof(item)~="table" then return end
        table.insert(lines,prefix..tostring(item.name or "?").." ["..tostring(item.className or "Service").."] · "..tostring(item.childCount or 0).." child")
        for _,child in ipairs(item.children or {}) do visit(child,prefix.."  ") end
    end
    if typeof(result.tree)=="table" then
        for _,item in ipairs(result.tree) do visit(item,"") end
    else visit(result.tree,"") end
    log("EXPLORER · "..tostring(result.count or #lines).." obyekt tekshirildi")
    for _,line in ipairs(lines) do log(line) end
end)
quickButton("Xatolar",0.25,0.25,function()
    local ok,result=pcall(function() return getLogs({limit=40,onlyErrors=true}) end)
    if not ok then log("Log o‘qish xatosi: "..tostring(result));return end
    if result=="" then log("Xato yoki warning topilmadi.") else
        log("STUDIO XATOLARI / WARNINGS")
        for line in string.gmatch(result,"[^\n]+") do log(line) end
    end
end)
quickButton("Loyiha",0.5,0.25,function()
    local roots={"Workspace","ReplicatedStorage","ServerScriptService","ServerStorage","StarterGui","StarterPlayer"}
    log("LOYIHA · "..getPlaceName().." · PlaceId "..tostring(game.PlaceId))
    for _,name in ipairs(roots) do
        local service=findService(name)
        if service then log(name.." · "..tostring(#service:GetChildren()).." ta bevosita obyekt") end
    end
end)
quickButton("Tozalash",0.75,0.25,function()
    for _,label in ipairs(logLabels) do if label and label.Parent then label:Destroy() end end
    table.clear(logLabels)
    log("Jurnal tozalandi.")
end)
local quickTools2=make("Frame",{Size=UDim2.new(1,0,0,36),BackgroundTransparency=1,LayoutOrder=7},root)
local function quickButton2(text,x,w,callback)
    local b=make("TextButton",{Size=UDim2.new(w,-4,1,0),Position=UDim2.new(x,0,0,0),BackgroundColor3=Color3.fromRGB(22,34,55),TextColor3=Color3.fromRGB(192,215,255),Text=text,Font=Enum.Font.GothamMedium,TextSize=10,AutoButtonColor=true},quickTools2)
    make("UICorner",{CornerRadius=UDim.new(0,8)},b)
    make("UIStroke",{Color=Color3.fromRGB(48,71,108),Transparency=0.35,Thickness=1},b)
    b.Activated:Connect(callback)
    return b
end
quickButton2("Tanlov",0,0.25,function()
    local result=getSelection()
    log("TANLANGAN OBYEKTLAR · "..tostring(result.count))
    for _,item in ipairs(result.items) do log(item.path.." ["..item.className.."]") end
    if result.count==0 then log("Studio’da obyekt tanlanmagan.") end
end)
quickButton2("Skriptlar",0.25,0.25,function()
    local result=searchInstances({path="game",className="Script",maxResults=35})
    local locals=searchInstances({path="game",className="LocalScript",maxResults=35})
    local modules=searchInstances({path="game",className="ModuleScript",maxResults=35})
    log("SKRIPTLAR · Script "..#result.results.." · LocalScript "..#locals.results.." · ModuleScript "..#modules.results)
    for _,item in ipairs(result.results) do log(item.path) end
    for _,item in ipairs(locals.results) do log(item.path) end
    for _,item in ipairs(modules.results) do log(item.path) end
end)
quickButton2("Statistika",0.5,0.25,function()
    local all=game:GetDescendants()
    local parts,scripts,uis=0,0,0
    for _,item in ipairs(all) do
        if item:IsA("BasePart") then parts+=1 end
        if item:IsA("LuaSourceContainer") then scripts+=1 end
        if item:IsA("GuiObject") then uis+=1 end
    end
    log("LOYIHA STATISTIKASI · "..#all.." descendants · "..parts.." parts · "..scripts.." scripts · "..uis.." UI")
end)
quickButton2("Yordam",0.75,0.25,function()
    log("QURUVCHI LUA · Explorer / Xatolar / Loyiha / Tozalash / Tanlov / Skriptlar / Statistika")
    log("AI: internet tadqiqoti, obyekt qidiruvi, inspect, rename, duplicate, select va skript boshqaruvi")
    log("Katta o‘zgarishdan oldin nusxa oling va Play-test qiling.")
end)
local quickTools3=make("Frame",{Size=UDim2.new(1,0,0,34),BackgroundTransparency=1,LayoutOrder=8},root)
local auditButton=make("TextButton",{Size=UDim2.new(1,0,1,0),BackgroundColor3=Color3.fromRGB(73,54,118),TextColor3=Color3.fromRGB(245,239,255),Text="AI AUDIT · Loyihani tekshirish",Font=Enum.Font.GothamBold,TextSize=11,AutoButtonColor=true},quickTools3)
make("UICorner",{CornerRadius=UDim.new(0,8)},auditButton)
make("UIStroke",{Color=Color3.fromRGB(142,120,220),Transparency=0.35,Thickness=1},auditButton)
auditButton.Activated:Connect(function()
    setStatus("busy","Loyiha auditi...")
    local ok, result = pcall(function() return auditProject({maxNodes=8000}) end)
    if not ok then
        log("AUDIT XATOSI · "..tostring(result))
        setStatus(token and "ok" or "idle",token and "Ulangan · "..getPlaceName() or "Ulanmagan")
        return
    end
    local c=result.counts
    log("AI AUDIT · "..result.scope.." · "..result.scanned.." obyekt")
    log("Hisob: "..c.instances.." instance · "..c.parts.." part · "..c.scripts.." script · "..c.remotes.." remote · "..c.guiObjects.." GUI")
    log("Ogohlantirishlar: "..#result.findings..(result.truncated and " · audit qisqartirildi" or ""))
    for i, item in ipairs(result.findings) do
        if i > 18 then log("... yana "..tostring(#result.findings-18).." ta audit natijasi");break end
        log("["..string.upper(item.level).."] "..item.code.." · "..item.path.." · "..item.message)
    end
    setStatus(token and "ok" or "idle",token and "Ulangan · "..getPlaceName() or "Ulanmagan")
end)
local logTitle=make("TextLabel",{Size=UDim2.new(1,0,0,20),BackgroundTransparency=1,Text="FAOLIYAT JURNALI  ·  LOGS",TextColor3=Color3.fromRGB(166,184,255),Font=Enum.Font.GothamBold,TextSize=10,TextXAlignment=Enum.TextXAlignment.Left,LayoutOrder=9},root)
logFrame.LayoutOrder=10
logFrame.Size=UDim2.new(1,0,1,-375)
for _,line in ipairs(logs) do log(line) end

connectButton.Activated:Connect(function()
    if token then disconnect();connectButton.Text="Ulanish";return end
    local code=codeBox.Text:upper():gsub("[%s%-]","")
    if #code~=8 then setStatus("error","8 belgili kodni kiriting");return end
    local ok,result=pcall(function()
        return request("POST","/api/plugin/pair",{code=code,placeName=getPlaceName(),placeId=game.PlaceId})
    end)
    if not ok then
        setStatus("error","Ulanmadi")
        log("Ulanish xatosi: "..tostring(result).." · Server: "..SERVER.." · Server ishlayotganini va Studio’da HTTP Requests yoqilganini tekshiring.")
        return
    end
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
