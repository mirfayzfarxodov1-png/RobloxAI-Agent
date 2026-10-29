const CATALOG=[
 {name:'Studio Parts and Models',cost:'free',use:'Platforms, walls, props and blockout geometry',risk:'low',source:'Roblox Studio built-in instances'},
 {name:'Studio UI instances',cost:'free',use:'ScreenGui, frames, buttons, labels and layout constraints',risk:'low',source:'Roblox Studio built-in instances'},
 {name:'Terrain Editor',cost:'free',use:'Terrain, hills, water and large natural environments',risk:'low',source:'Roblox Studio Terrain Editor'},
 {name:'Creator Store / Toolbox',cost:'verify each item',use:'Optional meshes, audio, decals and community models',risk:'review required',source:'Roblox Creator Store / Studio Toolbox'}
];
export function scoutTools(requestedFeatures=[]) {
 const text=requestedFeatures.join(' ').toLowerCase();
 const recommendations=CATALOG.filter(t=>{
  if(/ui|interface|menu|hud|inventar|shop|do‘kon/.test(text))return /UI instances|Studio Parts/.test(t.name);
  if(/terrain|mountain|landscape|daraxt|o‘rmon/.test(text))return /Terrain|Studio Parts/.test(t.name);
  if(/model|mesh|pet|vehicle|car|qurol/.test(text))return /Studio Parts|Creator Store/.test(t.name);
  return true;
 });
 return {agent:'Tool Scout',policy:'Free-first. Never purchase or insert third-party assets without explicit approval.',recommendations,notes:[
  'Built-in Studio objects and UI are free and require no external API.',
  'Review Creator Store item price, creator, permissions, scripts and unexpected behavior before using it.',
  'This local scout cannot live-search all Toolbox inventory and never pretends it downloaded an asset.'
 ]};
}
