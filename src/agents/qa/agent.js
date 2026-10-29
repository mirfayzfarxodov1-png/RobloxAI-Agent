const flattenTree = root => {
  const nodes=[];
  const seen=new Set();
  const walk=(node,path='')=>{
    if(!node||typeof node!=='object')return;
    const name=String(node.name||'?');
    const current=path+'/'+name;
    const parentPath=path||'/';
    const key=parentPath+'/'+name;
    nodes.push({node,path:current,key});
    if(seen.has(key))nodes.push({duplicate:true,path:current,key});
    seen.add(key);
    for(const child of Array.isArray(node.children)?node.children:[])walk(child,current);
  };
  walk(root);
  return nodes;
};

export function auditGeneratedProject(project) {
  const errors=[],warnings=[];
  const scene=project?.sceneTree;
  const ui=project?.uiTree;
  const source=typeof project?.source==='string'?project.source:'';
  const nodes=flattenTree(scene);
  const actualNodes=nodes.filter(item=>item.node);
  if(!scene)errors.push('World Agent did not return a scene tree');
  if(scene?.className!=='Folder'||scene?.name!=='QuruvchiFreeWorld')errors.push('Expected Workspace/QuruvchiFreeWorld Folder root');
  if(source.length<1000)errors.push('Gameplay source is missing or unexpectedly short');
  if(!source.includes('QuruvchiFreeWorld'))errors.push('Gameplay source does not reference the generated world root');
  if(!source.includes('Players'))errors.push('Gameplay source is missing player lifecycle handling');
  if(actualNodes.length>390)errors.push('World tree exceeds the plugin 400-node limit');
  for(const item of nodes.filter(x=>x.duplicate))warnings.push('Duplicate sibling path: '+item.key);
  const hasName=pattern=>actualNodes.some(x=>pattern.test(String(x.node.name)));
  if(project?.kind==='obby'){
    for(const [label,pattern] of [['start spawn',/^StartSpawn$/],['finish platform',/^FinishPlatform$/],['jump platforms',/^JumpPlatform\d+$/]])if(!hasName(pattern))errors.push('Obby is missing '+label);
    if(!/Checkpoint/.test(source))errors.push('Obby gameplay source has no checkpoint logic');
  }
  if(project?.kind==='simulator'){
    if(!hasName(/^Collectibles$/)||!hasName(/^Collectible_\d+$/))errors.push('Simulator has no collectible scene objects');
    if(!/Collectible/.test(source))errors.push('Simulator gameplay source has no collectible logic');
  }
  if(project?.kind==='tycoon'){
    if(!hasName(/^Plot_\d+$/)||!hasName(/^ClaimPad_\d+$/))errors.push('Tycoon has no plot/claim-pad scene objects');
    if(!/ClaimPad|claim/i.test(source))errors.push('Tycoon gameplay source has no claim logic');
  }
  if(!ui||ui.className!=='ScreenGui'||ui.name!=='QuruvchiMAXUI')errors.push('UI Agent did not return QuruvchiMAXUI ScreenGui');
  const buttonNames=new Set();
  const scanUi=node=>{if(!node||typeof node!=='object')return;if(node.className==='TextButton')buttonNames.add(node.name);for(const child of node.children||[])scanUi(child);};
  scanUi(ui);
  for(const name of ['ShopButton','InventoryButton','QuestsButton','HelpButton'])if(!buttonNames.has(name))errors.push('UI is missing '+name);
  if(typeof project?.uiSource!=='string'||!project.uiSource.includes('Activated:Connect'))errors.push('UI controller has no button event bindings');
  if(project?.gameplayPlan&&!project.gameplayPlan.ok)errors.push('Gameplay Agent contract checks failed: '+project.gameplayPlan.missing.join(', '));
  return {
    ok:errors.length===0,
    errors,
    warnings,
    nodeCount:actualNodes.length,
    scriptLength:source.length,
    uiButtonCount:buttonNames.size,
    gameplayChecks:project?.gameplayPlan?.checks||[],
    agents:['World Agent','UI Agent','Gameplay Agent','Tool Scout','QA Agent']
  };
}
