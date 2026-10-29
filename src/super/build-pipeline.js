import { buildV3Architecture, buildV3BuildSpec, buildV3ModelSpec, buildV3QAMatrix } from './engine.js';
import { runV2Toolkit } from '../v2/engine.js';

const clean=(value,max=2400)=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max);

/**
 * Creates one deterministic SUPER build package from the user's game idea.
 * This plans and audits locally; Studio mutations only happen after plugin confirmation.
 */
export function buildSuperBuildPlan(input={}) {
  const title=clean(input.title,100);
  const idea=clean(input.idea,3500);
  const architecture=buildV3Architecture({title,idea,complexity:input.complexity,platforms:input.platforms});
  const buildSpec=buildV3BuildSpec({title:architecture.plan.title,idea,existingContext:input.existingContext});
  const qa=buildV3QAMatrix({title:architecture.plan.title});
  const model=buildV3ModelSpec({name:clean(input.modelName,100)||architecture.plan.title,style:input.modelStyle,scale:input.modelScale});
  const localChecks=[
    {id:'architecture',label:'Architecture generated',status:architecture.plan.phases.length>=6?'ready':'needs-review'},
    {id:'paths',label:'Folder paths assigned',status:architecture.plan.folderTree.every(item=>item.path&&item.purpose)?'ready':'needs-review'},
    {id:'security',label:'Security gates included',status:architecture.plan.securityGates.length>=3?'ready':'needs-review'},
    {id:'qa',label:'QA matrix created',status:qa.tests.length>=6?'ready':'needs-review'},
    {id:'studio',label:'Roblox Studio apply',status:'requires-plugin-confirmation'},
    {id:'playtest',label:'Roblox Play test',status:'not-run'}
  ];
  const toolkit=runV2Toolkit({action:'qa-plan',title:architecture.plan.title});
  return {
    version:'3.0.0',
    title:architecture.plan.title,
    generatedAt:new Date().toISOString(),
    architecture,
    buildSpec,
    model,
    qa,
    localChecks,
    toolkit,
    status:'plan-ready',
    caveat:'Bu paket lokal reja va statik tekshiruvlarni yaratadi. Studio obyektlari plugin tasdig‘isiz yaratilgan hisoblanmaydi; Play-test avtomatik PASS bo‘lmaydi.'
  };
}
