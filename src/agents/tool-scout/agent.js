const CATALOG=Object.freeze([
 {id:'parts',name:'Studio Parts and Models',cost:'free',use:['obby','tycoon','simulator','world','props','platforms'],risk:'low',source:'Roblox Studio built-in instances'},
 {id:'ui',name:'Studio UI instances',cost:'free',use:['ui','interface','menu','hud','inventar','shop','do‘kon','quest'],risk:'low',source:'Roblox Studio built-in instances'},
 {id:'terrain',name:'Terrain Editor',cost:'free',use:['terrain','mountain','landscape','daraxt','o‘rmon','island','orol'],risk:'low',source:'Roblox Studio Terrain Editor'},
 {id:'creator-store',name:'Creator Store / Toolbox',cost:'verify each item',use:['mesh','pet','vehicle','car','weapon','audio','decal','model'],risk:'review required',source:'Roblox Creator Store / Studio Toolbox'}
]);

const normalize=value=>String(value??'').normalize('NFKC').toLowerCase();
export function scoutTools(requestedFeatures=[]) {
 const text=normalize(Array.isArray(requestedFeatures)?requestedFeatures.join(' '):requestedFeatures);
 const ranked=CATALOG.map(item=>{
   const matched=item.use.filter(term=>text.includes(normalize(term)));
   const score=matched.length;
   return {...item,score,matchedFeatures:matched};
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 const relevant=ranked.filter(item=>item.score>0);
 const recommendations=(relevant.length?relevant:ranked.filter(item=>item.id==='parts'||item.id==='ui')).map(({score,matchedFeatures,...item})=>({...item,matchedFeatures}));
 return {
  agent:'Tool Scout',
  policy:'Free-first. Never purchase or insert third-party assets without explicit approval.',
  requestedFeatures:Array.isArray(requestedFeatures)?requestedFeatures.map(x=>String(x).slice(0,160)).slice(0,40):[String(requestedFeatures).slice(0,500)],
  recommendations,
  checks:[
   {id:'cost',label:'Cost checked before use',required:true},
   {id:'creator',label:'Creator and asset source reviewed',required:true},
   {id:'scripts',label:'Embedded scripts reviewed before insertion',required:true},
   {id:'permissions',label:'Permissions and dependencies reviewed',required:true}
  ],
  notes:[
   'Built-in Studio objects, ScreenGui controls and Terrain Editor are free and need no external API.',
   'Creator Store price and permissions vary by asset; verify them inside Studio before insertion.',
   'This local scout does not live-search the full Toolbox inventory and never claims an asset was downloaded.'
  ]
 };
}
