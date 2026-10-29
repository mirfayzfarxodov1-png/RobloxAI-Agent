export function auditGeneratedProject(project) {
  const errors=[],warnings=[],nodes=[];
  const walk=(node,path='')=>{if(!node||typeof node!=='object')return;const current=path+'/'+String(node.name||'?');nodes.push({node,path:current});for(const child of node.children||[])walk(child,current);};
  if(!project||!project.sceneTree)errors.push('World Agent did not return a scene tree');
  if(!project?.source||project.source.length<1000)errors.push('Gameplay source is missing or unexpectedly short');
  if(project?.sceneTree?.name!=='QuruvchiFreeWorld')errors.push('Expected Workspace/QuruvchiFreeWorld root');
  walk(project?.sceneTree);
  const names=new Set();
  for(const {node,path} of nodes){const key=path.slice(0,path.lastIndexOf('/'))+'/'+node.name;if(names.has(key))warnings.push('Duplicate sibling path: '+key);names.add(key);}
  if(nodes.length>390)errors.push('World tree exceeds the plugin 400-node limit');
  if(project?.kind==='obby'&&!nodes.some(x=>x.node.name==='FinishPlatform'))errors.push('Obby has no finish platform');
  if(project?.kind==='simulator'&&!nodes.some(x=>String(x.node.name).startsWith('Collectible')))errors.push('Simulator has no collectibles');
  if(project?.kind==='tycoon'&&!nodes.some(x=>String(x.node.name).startsWith('Plot')))errors.push('Tycoon has no plots');
  if(!project?.uiTree||project.uiTree.className!=='ScreenGui')warnings.push('UI Agent did not return a ScreenGui');
  return {ok:errors.length===0,errors,warnings,nodeCount:nodes.length,agents:['World Agent','UI Agent','Gameplay Agent','QA Agent']};
}
