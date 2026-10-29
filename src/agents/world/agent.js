const bounded = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
};

export function buildWorldScene(input = {}) {
  const kind = ['obby','simulator','tycoon','world'].includes(input.kind) ? input.kind : 'world';
  const title = String(input.title || 'Quruvchi MAX').replace(/[\u0000-\u001F]/g, ' ').trim().slice(0,100);
  const rawCounts = input.counts && typeof input.counts === 'object' ? input.counts : {};
  const prompt = String(input.prompt || input.idea || '').slice(0,12000).toLowerCase();
  const themeRules = [
    {id:'space',words:['space','kosmos','galaktika','sayyora','astronavt','alien','sci-fi','sci fi'],floor:[27,31,55],accent:[90,120,255],material:'Material.Metal'},
    {id:'cyber',words:['cyber','neon','futur','synthwave','robot','tech','texnolog'],floor:[25,29,48],accent:[85,235,255],material:'Material.Neon'},
    {id:'medieval',words:['medieval','castle','qal’a','qal\'a','shoh','kingdom','fantasy','dragon','zindan'],floor:[93,81,65],accent:[226,174,91],material:'Material.Slate'},
    {id:'ocean',words:['ocean','sea','dengiz','suvosti','underwater','pirate','orol','island','marjon'],floor:[36,100,122],accent:[75,220,210],material:'Material.Glass'},
    {id:'forest',words:['forest','o‘rmon','orman','jungle','daraxt','tabiat','wildlife','yovvoyi'],floor:[45,105,65],accent:[135,220,105],material:'Material.Grass'},
    {id:'desert',words:['desert','sahro','cho‘l','qum','egypt','misr','pyramid'],floor:[169,126,68],accent:[255,202,95],material:'Material.Sand'},
    {id:'snow',words:['snow','qor','ice','muz','winter','arctic','qish'],floor:[130,165,190],accent:[180,235,255],material:'Material.Ice'},
    {id:'horror',words:['horror','zombie','qo‘rqinch','qorqinch','haunted','apocalypse','survival'],floor:[55,48,59],accent:[194,80,105],material:'Material.Slate'}
  ];
  const theme = themeRules.find(rule=>rule.words.some(word=>prompt.includes(word))) || {id:'adventure',floor:[62,150,94],accent:[110,170,255],material:'Material.Grass'};
  const wants = pattern => pattern.test(prompt);
  const counts = {
    stages: bounded(rawCounts.stages, 30, 5, 100),
    collectibles: bounded(rawCounts.collectibles, 30, 5, 150),
    plots: bounded(rawCounts.plots, 4, 2, 12)
  };
  const children = [];
  const part = (name,size,position,color,material='Material.SmoothPlastic',className='Part',attributes) => {
    const node={className,name,properties:{Size:{Vector3:size},Position:{Vector3:position},Anchored:true,Color:{Color3:color},Material:{Enum:material},TopSurface:{Enum:'SurfaceType.Smooth'},BottomSurface:{Enum:'SurfaceType.Smooth'}}};
    if(className==='SpawnLocation') Object.assign(node.properties,{Neutral:true,Duration:0});
    if(attributes) node.attributes=attributes;
    return node;
  };
  const add=(...args)=>children.push(part(...args));
  const colorAt=i=>{const h=i/Math.max(1,counts.stages);return [Math.round(127+127*Math.sin(h*Math.PI*2)),Math.round(127+127*Math.sin(h*Math.PI*2+2.1)),Math.round(127+127*Math.sin(h*Math.PI*2+4.2))].map(v=>Math.max(20,Math.min(255,v)));};
  if(kind==='obby'){
    add('StartSpawn',[14,1,14],[0,2,0],[80,220,140],'Material.Neon','SpawnLocation');
    add('StartPlatform',[30,2,30],[0,0,0],[60,180,110],'Material.Grass');
    for(let i=1;i<=counts.stages;i++){
      const row=Math.floor((i-1)/6),col=(i-1)%6,x=(row%2===0?col:5-col)*18,z=(row+1)*20,y=2+Math.floor((i-1)/8)*2;
      children.push(part('JumpPlatform'+i,[11,2,11],[x,y,z],colorAt(i),'Material.Neon','Part',{Stage:i}));
      if(i%5===0) children.push(part('Checkpoint'+i,[13,1,13],[x,y+2,z],[80,190,255],'Material.Neon','Part',{CheckpointIndex:i}));
      if(i%3===0) add('StageMarker'+i,[2,5,2],[x,y+4,z],[245,245,255],'Material.Metal');
    }
    const rows=Math.ceil(counts.stages/6),last=(counts.stages-1)%6,lastRow=rows-1,endCol=lastRow%2===0?last:5-last,endX=endCol*18,endZ=rows*20+18;
    add('FinishPlatform',[28,2,28],[endX,3,endZ],[255,205,70],'Material.Neon');
    add('WelcomeSign',[26,9,1],[0,8,-20],[22,30,52]);
    add('SideRailLeft',[2,2,endZ+24],[-18,1,endZ/2],[36,48,74],'Material.Metal');
    add('SideRailRight',[2,2,endZ+24],[108,1,endZ/2],[36,48,74],'Material.Metal');
  } else if(kind==='simulator'){
    add('MainIsland',[200,5,200],[0,-3,0],[62,150,94],'Material.Grass');
    add('PlayerSpawn',[14,1,14],[0,0,0],[70,170,255],'Material.Neon','SpawnLocation');
    const collectibles={className:'Folder',name:'Collectibles',children:[]};
    for(let i=1;i<=counts.collectibles;i++){const a=i*2.399,r=12+(i%5)*9;collectibles.children.push(part('Collectible_'+i,[2.5,2.5,2.5],[Math.cos(a)*r,3,Math.sin(a)*r],[255,210,65],'Material.Neon','Part',{CollectibleId:i,Reward:1}));}
    children.push(collectibles);
    for(let i=1;i<=12;i++){const a=2*Math.PI*i/12;add('IslandPillar'+i,[5,14+(i%3)*3,5],[Math.round(Math.cos(a)*82),5,Math.round(Math.sin(a)*82)],[85,110+(i%3)*30,220],'Material.Neon');}
    add('SpawnSign',[24,7,1],[0,7,-24],[22,30,52]);
  } else if(kind==='tycoon'){
    add('TycoonGround',[Math.max(180,counts.plots*55),3,120],[0,-1,0],[50,65,83],'Material.Concrete');
    for(let i=1;i<=counts.plots;i++){const x=(i-1)*55-((counts.plots-1)*55)/2;children.push(part('Plot_'+i,[44,2,44],[x,0,0],[68,105,145],'Material.Metal'));children.push(part('ClaimPad_'+i,[8,1,8],[x,2,0],[80,220,130],'Material.Neon','Part',{Action:'Claim',Plot:i}));children.push(part('UpgradePad_'+i,[8,1,8],[x+12,2,-12],[160,100,255],'Material.Neon','Part',{Action:'Upgrade',Plot:i}));children.push(part('Dropper_'+i,[6,8,6],[x-12,5,-12],[255,190,65],'Material.Metal'));children.push(part('Conveyor_'+i,[22,1,5],[x,2,-12],[80,190,255],'Material.Metal'));}
  } else {
    add('MainIsland',[240,5,240],[0,-3,0],theme.floor,theme.material);
    add('PlayerSpawn',[14,1,14],[0,0,0],theme.accent,'Material.Neon','SpawnLocation');
    const zones={className:'Folder',name:'WorldZones',children:[]};
    const zoneNames=theme.id==='space'?['LaunchBay','MoonSurface','AlienOutpost','ResearchLab']:theme.id==='medieval'?['CastleCourtyard','VillageSquare','DungeonGate','RoyalGarden']:theme.id==='ocean'?['Harbor','CoralReef','Shipwreck','TidalCave']:theme.id==='forest'?['ForestCamp','AncientGrove','RiverCrossing','Ruins']:theme.id==='desert'?['Oasis','DuneField','TempleRuins','Market']:theme.id==='snow'?['BaseCamp','FrozenLake','IceCave','Summit']:theme.id==='horror'?['Safehouse','AbandonedTown','DarkWoods','Bunker']:['CentralPlaza','ExplorerCamp','AncientRuins','SkyGarden'];
    zoneNames.forEach((name,i)=>{
      const angle=2*Math.PI*i/zoneNames.length,radius=74,x=Math.round(Math.cos(angle)*radius),z=Math.round(Math.sin(angle)*radius);
      const zone={className:'Model',name,attributes:{WorldZone:true,Theme:theme.id},children:[]};
      zone.children.push(part(name+'_Ground',[48,2,48],[x,-0.5,z],theme.floor,theme.material));
      zone.children.push(part(name+'_Landmark',[8,18+(i%2)*8,8],[x,8,z],theme.accent,'Material.Neon'));
      zone.children.push(part(name+'_Beacon',[2,12,2],[x,18,z],theme.accent,'Material.Neon'));
      zones.children.push(zone);
    });
    children.push(zones);
    const props={className:'Folder',name:'WorldProps',children:[]};
    for(let i=1;i<=24;i++){
      const a=i*2.399,r=24+(i%4)*18,x=Math.round(Math.cos(a)*r),z=Math.round(Math.sin(a)*r);
      const treeLike=theme.id==='forest'||theme.id==='adventure';
      const name=treeLike?'TreeProp_'+i:theme.id==='space'?'BeaconProp_'+i:theme.id==='ocean'?'CoralProp_'+i:theme.id==='snow'?'IceCrystal_'+i:'SceneryProp_'+i;
      props.children.push(part(name,treeLike?[3,8+(i%3)*2,3]:[2+(i%3),4+(i%5)*2,2+(i%3)],[x,2,z],i%2?theme.accent:theme.floor,theme.id==='ocean'?'Material.Glass':theme.material));
    }
    if(wants(/road|yo‘l|yol|street|shahar|city|race|poyga|track|yo‘lak|path/)){
      const roads={className:'Folder',name:'WorldRoutes',children:[]};
      for(let i=1;i<=6;i++)roads.children.push(part('RouteSegment_'+i,[14,1,32],[0,0,i*28-98],[70,75,92],'Material.Concrete'));
      children.push(roads);
    }
    if(wants(/portal|teleport|warp|dimension|o‘lcham|olcham/)){
      const portals={className:'Folder',name:'WorldPortals',children:[]};
      for(let i=1;i<=3;i++){
        portals.children.push(part('PortalFrame_'+i,[12,18,2],[(i-2)*42,9,-72],theme.accent,'Material.Neon'));
        portals.children.push(part('PortalPad_'+i,[16,1,16],[(i-2)*42,0,-72],theme.floor,'Material.Metal'));
      }
      children.push(portals);
    }
    if(wants(/house|uy|building|bino|city|shahar|village|qishloq|base|baza|castle|qal/)){
      const buildings={className:'Folder',name:'WorldBuildings',children:[]};
      for(let i=1;i<=6;i++){
        const x=(i-1)*22-55;
        buildings.children.push(part('Building_'+i,[14,12+(i%3)*4,14],[x,6,-94],theme.floor,'Material.Concrete'));
        buildings.children.push(part('BuildingRoof_'+i,[16,2,16],[x,14+(i%3)*4,-94],theme.accent,theme.material));
      }
      children.push(buildings);
    }
    if(wants(/npc|villager|merchant|shop|do‘kon|dokon|quest|mission|vazifa|pet|animal|hayvon/)){
      const points={className:'Folder',name:'InteractionPoints',children:[]};
      for(let i=1;i<=4;i++){
        points.children.push(part('InteractionPoint_'+i,[5,7,5],[(i-2.5)*20,3,46],theme.accent,'Material.Neon'));
        points.children.push(part('InteractionMarker_'+i,[7,1,7],[(i-2.5)*20,0,46],theme.floor,'Material.Metal'));
      }
      children.push(points);
    }
    children.push(props);
    add('WelcomeSign',[28,9,1],[0,8,-24],[22,30,52]);
  }
  return {className:'Folder',name:'QuruvchiFreeWorld',attributes:{QuruvchiGenerated:true,GameKind:kind,ProjectTitle:title,WorldTheme:theme.id,FeaturePrompt:prompt.slice(0,500)},children};
}
