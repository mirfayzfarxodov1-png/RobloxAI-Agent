export function buildGameplayPlan(project) {
  return {agent:'Gameplay Agent',scriptPath:project.path,systems:[
    'server-authoritative player stats',
    ...(project.kind==='obby'?['checkpoint and stage progress','finish rewards and timer']:[]),
    ...(project.kind==='simulator'?['collectible rewards','currency progression']:[]),
    ...(project.kind==='tycoon'?['plot claim and upgrade hooks','production loop']:[]),
    ...(project.features||[])
  ]};
}
