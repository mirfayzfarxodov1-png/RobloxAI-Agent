const rgb = (r,g,b) => ({Color3:[r,g,b]});
const enumValue = value => ({Enum:value});
const udim = (scale,offset) => ({UDim:[scale,offset]});
const u2 = (sx,ox,sy,oy) => ({UDim2:[sx,ox,sy,oy]});
const node = (className,name,properties={},children=[],attributes) => {
  const result={className,name,properties,children};
  if(attributes) result.attributes=attributes;
  return result;
};
function panel(name,heading,body) {
  return node('Frame',name,{AnchorPoint:{Vector2:[0.5,0.5]},Position:u2(0.5,0,0.5,0),Size:u2(0,330,0,250),BackgroundColor3:rgb(23,27,46),BorderSizePixel:0,Visible:false},[
    node('UICorner','Corner',{CornerRadius:udim(0,14)}),
    node('UIStroke','Outline',{Color:rgb(113,103,255),Thickness:1.5,Transparency:0.15}),
    node('TextLabel','Heading',{BackgroundTransparency:1,Position:u2(0,16,0,12),Size:u2(1,-60,0,34),Text:heading,TextColor3:rgb(246,245,255),Font:enumValue('Font.GothamBold'),TextSize:19,TextXAlignment:enumValue('TextXAlignment.Left')}),
    node('TextButton','Close',{Position:u2(1,-42,0,10),Size:u2(0,30,0,30),Text:'×',BackgroundColor3:rgb(67,70,126),TextColor3:rgb(255,255,255),Font:enumValue('Font.GothamBold'),TextSize:20},[
      node('UICorner','Corner',{CornerRadius:udim(0,8)})
    ]),
    node('TextLabel','Body',{BackgroundTransparency:1,Position:u2(0,16,0,54),Size:u2(1,-32,1,-66),Text:body,TextWrapped:true,TextYAlignment:enumValue('TextYAlignment.Top'),TextColor3:rgb(190,198,225),Font:enumValue('Font.Gotham'),TextSize:14})
  ]);
}
const controller=String.raw\`local gui=script.Parent
local root=gui:WaitForChild("Root")
local status=root:WaitForChild("Status")
local panels=gui:WaitForChild("Panels")
local map={Shop=panels:WaitForChild("ShopPanel"),Inventory=panels:WaitForChild("InventoryPanel"),Quests=panels:WaitForChild("QuestsPanel")}
for _,panel in pairs(map) do
  local close=panel:FindFirstChild("Close")
  if close then close.Activated:Connect(function() panel.Visible=false end) end
end
for _,button in ipairs(root:WaitForChild("Actions"):GetChildren()) do
  if button:IsA("TextButton") then
    button.Activated:Connect(function()
      local key=button:GetAttribute("PanelKey")
      if key and map[key] then
        for _,panel in pairs(map) do panel.Visible=false end
        map[key].Visible=true
        status.Text=key.." ochildi"
      elseif button.Name=="HelpButton" then
        status.Text="Maqsad: xaritani o‘rgan, buyumlar yig‘ va vazifalarni bajar."
      end
    end)
  end
end
\`;
export function buildGameUi(title,kind) {
  const buttons=[
    ['ShopButton','Do‘kon','Shop'],
    ['InventoryButton','Inventar','Inventory'],
    ['QuestsButton','Vazifalar','Quests'],
    ['HelpButton','Yordam',null]
  ];
  const actionChildren=[node('UIListLayout','Layout',{FillDirection:enumValue('FillDirection.Horizontal'),Padding:udim(0,8),HorizontalAlignment:enumValue('HorizontalAlignment.Center'),VerticalAlignment:enumValue('VerticalAlignment.Center'),SortOrder:enumValue('SortOrder.LayoutOrder')})];
  for(let i=0;i<buttons.length;i++){
    const [name,label,key]=buttons[i];
    actionChildren.push(node('TextButton',name,{Size:u2(0,78,0,38),BackgroundColor3:rgb(67,70,126),TextColor3:rgb(255,255,255),Text:label,Font:enumValue('Font.GothamSemibold'),TextSize:11,LayoutOrder:i+1,AutoButtonColor:true},[node('UICorner','Corner',{CornerRadius:udim(0,9)})],key?{PanelKey:key}:undefined));
  }
  const root=node('Frame','Root',{AnchorPoint:{Vector2:[0.5,0]},Position:u2(0.5,0,0,18),Size:u2(0,360,0,122),BackgroundColor3:rgb(17,20,36),BackgroundTransparency:0.08,BorderSizePixel:0},[
    node('UICorner','Corner',{CornerRadius:udim(0,16)}),
    node('UIStroke','Outline',{Color:rgb(113,103,255),Thickness:1.5,Transparency:0.2}),
    node('TextLabel','Title',{BackgroundTransparency:1,Position:u2(0,14,0,5),Size:u2(1,-28,0,24),Text:String(title||'Quruvchi MAX').slice(0,60),TextColor3:rgb(255,255,255),Font:enumValue('Font.GothamBold'),TextSize:16,TextXAlignment:enumValue('TextXAlignment.Left')}),
    node('TextLabel','Status',{BackgroundTransparency:1,Position:u2(0,14,0,31),Size:u2(1,-28,0,20),Text:'O‘yin tayyor · '+kind,TextColor3:rgb(176,186,220),Font:enumValue('Font.Gotham'),TextSize:12,TextXAlignment:enumValue('TextXAlignment.Left')}),
    node('Frame','Actions',{BackgroundTransparency:1,Position:u2(0,0,0,74),Size:u2(1,0,0,42)},actionChildren)
  ]);
  return node('ScreenGui','QuruvchiMAXUI',{ResetOnSpawn:false,IgnoreGuiInset:false,ZIndexBehavior:enumValue('ZIndexBehavior.Sibling'),DisplayOrder:20},[
    root,
    node('Folder','Panels',{},[
      panel('ShopPanel','DO‘KON','Bepul UI tayyor. Haqiqiy xaridlar uchun serverdagi valyuta va mahsulot tizimini ulash kerak.'),
      panel('InventoryPanel','INVENTAR','Bu panel UI namunasi. Yig‘iladigan item tizimi qo‘shilganda inventar shu yerda ko‘rinadi.'),
      panel('QuestsPanel','VAZIFALAR','Vazifalar paneli tayyor. Gameplay topshiriqlari qo‘shilganda vazifalar shu yerda ko‘rinadi.')
    ]),
    node('LocalScript','UIController',{Source:controller})
  ]);
}
