export function buildWorldScene({ kind, title, counts }) {
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
    children.push({className:'Folder',name:'Collectibles',children:[]});
    for(let i=1;i<=counts.collectibles;i++){const a=2*Math.PI*i/counts.collectibles,r=28+(i%3)*8,x=Math.round(Math.cos(a)*r),z=Math.round(Math.sin(a)*r);children.push(part('Collectible'+i,[3,3,3],[x,3+(i%4),z],[Math.round(80+150*(i%2)),Math.round(110+100*(i%3)),255],'Material.Neon','Part',{CollectibleId:i,Reward:1}));}
    for(let i=1;i<=12;i++){const a=2*Math.PI*i/12;add('IslandPillar'+i,[5,14+(i%3)*3,5],[Math.round(Math.cos(a)*82),5,Math.round(Math.sin(a)*82)],[85,110+(i%3)*30,220],'Material.Neon');}
    add('SpawnSign',[24,7,1],[0,7,-24],[22,30,52]);
  } else if(kind==='tycoon'){
    add('TycoonGround',[Math.max(180,counts.plots*55),3,120],[0,-1,0],[50,65,83],'Material.Concrete');
    for(let i=1;i<=counts.plots;i++){const x=(i-(counts.plots+1)/2)*55;children.push({className:'Model',name:'Plot'+i,children:[
      part('BaseFloor',[42,1,42],[x,1,0],[70,100,140],'Material.Metal'),
      part('ClaimPad',[8,1,8],[x,2,14],[80,220,140],'Material.Neon','Part',{Action:'Claim'}),
      part('UpgradePad',[8,1,8],[x+12,2,-12],[160,100,255],'Material.Neon','Part',{Action:'Upgrade'}),
      part('Dropper',[6,8,6],[x-12,5,-12],[255,190,65],'Material.Metal'),
      part('Conveyor',[22,1,5],[x,2,-12],[80,190,255],'Material.Metal')
    ]});}
  } else {
    add('MainIsland',[200,5,200],[0,-3,0],[62,150,94],'Material.Grass');
    add('PlayerSpawn',[14,1,14],[0,0,0],[70,170,255],'Material.Neon','SpawnLocation');
    for(let i=1;i<=16;i++){const a=2*Math.PI*i/16;add('SceneryPillar'+i,[5,12+(i%4)*3,5],[Math.round(Math.cos(a)*75),4,Math.round(Math.sin(a)*75)],[80+(i%3)*35,100,210],'Material.Neon');}
    add('WelcomeSign',[28,9,1],[0,8,-24],[22,30,52]);
  }
  return {className:'Folder',name:'QuruvchiFreeWorld',attributes:{QuruvchiGenerated:true,GameKind:kind,ProjectTitle:title},children};
}
