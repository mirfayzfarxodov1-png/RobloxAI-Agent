import { runV2Toolkit } from '../v2/engine.js';
const clean=(v,n=4000)=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,n);
const uniq=(xs,n=30)=>[...new Set(xs.map(x=>clean(x,180)).filter(Boolean))].slice(0,n);
const RULES=[
 {re:/\b(steal|o'g'ir|o‘g‘ir|ugir|tycoon|base|plot)\b/i,features:['Ownership va plot claiming','Server tekshiradigan stealing qoidalari','Upgrade va economy loop'],services:['PlotService','StealService','EconomyService']},
 {re:/\b(obby|parkour|checkpoint|to'siq|to‘siq)\b/i,features:['Checkpoint progression','Obstacle reset flow','Timer va rekord UI'],services:['CheckpointService','CourseController']},
 {re:/\b(egg|hatch|pet|simulator|tuxum|hayvon)\b/i,features:['Inventory va rarity','Server tasdiqlaydigan hatch mukofotlari','Collection UI'],services:['InventoryService','HatchService','PetService']},
 {re:/\b(rpg|quest|boss|combat|jang|missiya)\b/i,features:['Quest progression','Server-side combat validation','NPC/boss state machine'],services:['QuestService','CombatService','NPCService']},
 {re:/\b(shop|trade|inventory|do'kon|savdo)\b/i,features:['Inventory state','Server-side shop validation','Trade anti-duplication'],services:['InventoryService','ShopService','TradeService']},
 {re:/\b(race|racing|poyga|car|mashina)\b/i,features:['Race session lifecycle','Checkpoint/finish validation','Vehicle and mobile controls'],services:['RaceService','VehicleService']},
 {re:/\b(horror|qo'rq|qo‘rq|escape|qoch)\b/i,features:['Objective progression','Enemy state machine','Atmosphere settings'],services:['ObjectiveService','EnemyService']},
 {re:/\b(round|match|team|arena|jamoa|raund)\b/i,features:['Round state machine','Team assignment','Scoreboard and round rewards'],services:['RoundService','TeamService']}
];
const SECURITY=[
 {id:'server-authority',title:'Server authoritative gameplay',reason:'Pul, damage, ownership, inventory va mukofotlarni client qiymatiga ishonib qabul qilmang.'},
 {id:'remote-validation',title:'Remote validation',reason:'Argument turi, numeric bounds, masofa, ownership va cooldown tekshirilsin.'},
 {id:'data-safety',title:'DataStore safety',reason:'pcall, schema version, retry/backoff va ma’lumotni xavfsiz yangilash.'},
 {id:'lifecycle',title:'Lifecycle cleanup',reason:'Task, event connection va temporary instance uchun tozalash yo‘li bo‘lsin.'},
 {id:'asset-trust',title:'Asset/require review',reason:'Noma’lum asset ID yoki raqamli require avtomatik qo‘shilmasin.'}
];
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
export function buildV3Architecture(input={}){
 const idea=clean(input.idea||input.pitch,3500);if(idea.length<8)fail('O‘yin g‘oyasini kamida 8 ta belgi bilan yozing.');
 const title=clean(input.title,100)||idea.split(/[.!?\n]/)[0].slice(0,90)||'Yangi Roblox o‘yini';
 const matched=RULES.filter(r=>r.re.test(idea));
 const features=uniq([...matched.flatMap(r=>r.features),'PC/mobile/tablet responsive UI','Server/client boundary va remote validation','Loading, empty, success va error feedback','Log diagnostics va rollback checkpoint'],24);
 const services=uniq(['GameConfig','PlayerDataService','RoundStateService',...matched.flatMap(r=>r.services),'AuditService'],30);
 const phases=[
 {order:1,name:'Audit va checkpoint',actions:['Mavjud Studio tree va skriptlarni tekshir','Path/dependency ro‘yxatini tuz','Oldingi holatni saqla'],gate:'Mavjud obyektni ko‘rmasdan overwrite qilma.'},
 {order:2,name:'Playable core loop',actions:['Eng kichik to‘liq gameplay loopni qur','Holatni o‘zgartiruvchi so‘rovlarni serverda tekshir','Success/error feedback qo‘sh'],gate:'Bir to‘liq loopni sinash mumkin.'},
 {order:3,name:'World Builder va model',actions:['Named zone va reusable partlar yarat','Placement deterministic va instance soni cheklangan bo‘lsin','Takroriy build dublikat yaratmasin'],gate:'Yangi obyektlar tartibli va rerun takrorlamaydi.'},
 {order:4,name:'UI va boshqaruv',actions:['Har bir tugmani haqiqiy handlerga ulash','Loading/empty/error holatlari','Touch target, safe area va keyboard tekshiruvi'],gate:'Ishlamaydigan dekorativ tugma qolmasin.'},
 {order:5,name:'Progression va data',actions:['Faqat so‘ralgan tizimlarni qo‘sh','Saved data schema version va retry','Mukofot/currency serverda hisoblansin'],gate:'DataStore xatosi gameplayni yiqitmasin.'},
 {order:6,name:'QA va self-heal',actions:['Statik audit va Studio Outputni tekshir','Muammolarni kichik o‘zgarishlarda tuzat','Har tuzatishdan keyin auditni qaytar'],gate:'Topilgan xato tuzatilgan yoki izohlangan.'},
 {order:7,name:'Performance va handoff',actions:['Keraksiz loop va connectionlarni kamaytir','Past quvvatli/mobile sozlamada tekshir','O‘zgargan fayllar va qolgan testlarni yoz'],gate:'Studio Play-test bajarilmasa pass deyilmaydi.'}
 ];
 const tree=[
 {path:'ReplicatedStorage/Shared',purpose:'Constants va shared non-secret modules'},
 {path:'ReplicatedStorage/Remotes',purpose:'Hujjatlangan payloadli remotes'},
 {path:'ServerScriptService/Services',purpose:'Server-authoritative gameplay/data'},
 {path:'ServerScriptService/Bootstrap.server.lua',purpose:'Bitta server startup entrypoint'},
 {path:'StarterPlayer/StarterPlayerScripts/Controllers',purpose:'Client input va UI controllers'},
 {path:'StarterGui/MainUI',purpose:'Responsive UI va feedback states'},
 {path:'Workspace/Map',purpose:'Chunked world va interactive objects'},
 {path:'ServerStorage/Templates',purpose:'Server-only templates'}
 ];
 const plan={title,idea,complexity:['small','medium','large','very-large'].includes(input.complexity)?input.complexity:(idea.length>1000||matched.length>=4?'very-large':matched.length>=2?'large':'medium'),platforms:uniq(Array.isArray(input.platforms)?input.platforms:['PC','Mobile','Tablet'],5),features,services,folderTree:tree,phases,securityGates:SECURITY,performanceRules:['Og‘ir tree scan va DataStore har frame callback ichida bo‘lmasin.','Katta map zonalarga ajratilsin; StreamingEnabled ehtiyoji baholansin.','Temporary instances va event connectionlar tozalansin.','FPS faqat real Studio/device profiling orqali tasdiqlansin.'],acceptance:['Mavjud funksiyalar saqlanadi.','Gameplay state serverda validatsiya qilinadi.','Har bir kodning destination path va execution contexti aniq.','Rerun dublikat obyektlar yaratmaydi.','Static audit va Play-test statusi alohida ko‘rsatiladi.','Rollback yo‘li hujjatlashtiriladi.'],caveats:['Arxitektor deterministik va API-keyless; bu tashqi generativ model emas.','Studio obyektlari plugin buyrug‘i tasdiqlangandagina yaratilgan hisoblanadi.','Haqiqiy Play-test Roblox Studio natijasisiz tasdiqlanmaydi.']};
 const markdown=['# '+title,'','## G‘oya',idea,'','## Services',...services.map(x=>'- '+x),'','## Features',...features.map(x=>'- '+x),'','## Folder tree',...tree.map(x=>'- '+x.path+' — '+x.purpose),'','## Build phases',...phases.map(p=>p.order+'. **'+p.name+'**\n   - '+p.actions.join('\n   - ')+'\n   - Gate: '+p.gate),'','## Security',...SECURITY.map(s=>'- **'+s.title+'** — '+s.reason),'','## Acceptance',...plan.acceptance.map(x=>'- [ ] '+x),'','## Limitations',...plan.caveats.map(x=>'- '+x)].join('\n');
 return {version:'3.0.0',generatedAt:new Date().toISOString(),plan,markdown};
}
export function buildV3BuildSpec(input={}){
 const a=buildV3Architecture(input),existing=clean(input.existingContext,1800);
 const prompt=['QURUVCHI V3 — CONTROLLED IMPLEMENTATION REQUEST','Project: '+a.plan.title,'STRICT RULES:','1. First inspect the connected Studio tree and relevant scripts. Never assume a blank place.','2. List exact destination paths before modifying anything.','3. Build one phase at a time, preserve working features, avoid duplicate instances on rerun.','4. Currency, damage, ownership, inventory, rewards and persistence stay server-authoritative.','5. Validate remote input types, ownership, distance, cooldown and numeric bounds.','6. Never invent asset IDs or claim an object was created unless Studio confirms it.','7. Inspect logs and run available static checks after each phase.','8. Report actual changes, unrun tests and rollback path. Never fake Play-test success.','',a.markdown,existing?'\n## Existing Studio context\n'+existing:'','Begin with phase 1 audit. If Studio bridge is disconnected, produce code and paths for review; do not claim deployment.'].filter(Boolean).join('\n');
 return {version:'3.0.0',title:a.plan.title,architecture:a.plan,prompt};
}
export function runV3Audit(input={}){
 const source=clean(input.source,18000);if(!source)fail('Audit uchun Luau kodini kiriting.');
 const luau=runV2Toolkit({action:'luau-audit',source}),perf=runV2Toolkit({action:'performance-audit',source}),lines=source.split(/\r?\n/),security=[];
 lines.forEach((line,i)=>{const n=i+1;
  if(/OnServerEvent\s*:\s*Connect/.test(line)&&!/typeof|math\.clamp|IsA|FindFirstChild|GetPlayerFromCharacter/.test(lines.slice(i,i+16).join(' ')))security.push({level:'high',line:n,message:'Remote handlerda input type, range, ownership va cooldown validatsiyasini tekshiring.'});
  if(/HttpService:GetAsync|HttpService:PostAsync|loadstring\s*\(/.test(line))security.push({level:'high',line:n,message:'Tashqi HTTP yoki dynamic code: allowlist, secret handling va source trustni tekshiring.'});
  if(/require\s*\(\s*\d+\s*\)/.test(line))security.push({level:'review',line:n,message:'Raqamli require manbasi va asset ruxsatini tekshiring.'});
 });
 const rank={high:0,warning:1,review:2,info:3},findings=[...luau.findings,...perf.findings,...security].sort((a,b)=>(rank[a.level]??4)-(rank[b.level]??4));
 return {version:'3.0.0',title:'Quruvchi V3 multi-pass audit',summary:findings.length+' ta tekshirish nuqtasi. Bu statik pattern audit, to‘liq Luau parseri yoki Play-test emas.',checkedLines:lines.length,findings,passes:{luauPatternAudit:luau.findings.length,performancePatternAudit:perf.findings.length,securityReview:security.length},nextSteps:['High/warning bandlarni ko‘rib chiqing.','Tuzatilgan kodni qayta audit qiling.','Studio Output va haqiqiy Play-testni alohida tekshiring.']};
}
export function buildV3QAMatrix(input={}){
 return {version:'3.0.0',title:(clean(input.title,100)||'Roblox o‘yini')+' — QA matrix',status:'not-run',note:'Bu test reja. Bajarilmaguncha pass deb hisoblanmaydi.',tests:[
 {area:'Core loop',priority:'P0',scenario:'Yangi sessiyada asosiy maqsadni bajaring',expected:'Loop yakunlanadi va keyingi holat to‘g‘ri ochiladi',mode:'Studio Play-test'},
 {area:'Networking',priority:'P0',scenario:'RemoteEventga noto‘g‘ri turdagi yoki katta qiymat yuboring',expected:'Server rad etadi; state buzilmaydi',mode:'Server/client test'},
 {area:'Ownership',priority:'P0',scenario:'Boshqa o‘yinchi obyektini boshqarishga urining',expected:'Ownership tekshiruvi rad etadi',mode:'Multiplayer test'},
 {area:'UI',priority:'P1',scenario:'PC, kichik telefon va tablet ekranini tekshiring',expected:'Tugmalar ko‘rinadi va bosiladi',mode:'Manual UI test'},
 {area:'Data',priority:'P1',scenario:'DataStore xatosini simulyatsiya qiling',expected:'Server yiqilmaydi va holat tushuntiriladi',mode:'Test environment'},
 {area:'Lifecycle',priority:'P1',scenario:'Player leave, respawn va round restart',expected:'Eski task/connection qolmaydi',mode:'Studio Play-test'},
 {area:'Performance',priority:'P1',scenario:'Ko‘p obyektli xaritada profiler/memoryni kuzating',expected:'Qimmat ishlar aniqlanadi',mode:'MicroProfiler'},
 {area:'Recovery',priority:'P1',scenario:'Bitta bosqichdan keyin rollback yo‘lini sinang',expected:'Oldingi ishlaydigan holat tiklanadi',mode:'Checkpoint/Undo'}]};
}
export function buildV3ModelSpec(input={}){
 const name=clean(input.name,100)||'Quruvchi Model',style=clean(input.style,50)||'stylized',scale=Math.max(.25,Math.min(20,Number(input.scale)||4));
 return {version:'3.0.0',title:name,style,scale,parts:[{name:'Core',size:{x:scale,y:scale,z:scale},material:'SmoothPlastic',role:'Main silhouette'},{name:'Trim',size:{x:scale*1.08,y:Math.max(.2,scale*.12),z:scale*1.08},material:'Metal',role:'Edge detail'},{name:'Accent',size:{x:scale*.28,y:scale*.28,z:scale*.28},material:'Neon',role:'Focal detail'}],assemblyRules:['Har bir part uchun Name, Size, CFrame/position va material belgilang.','Modelni bitta parent ostida guruhlang; PrimaryPart kerakligini tekshiring.','Anchored/collision/query sozlamalarini vazifaga moslang.','Stable key/tag orqali rerun dublikatlarini oldini oling.','Bu model spec; mesh yoki Studio instance o‘zi yaratilgani emas.']};
}
export function runV3Action(input={}){
 switch(clean(input.action,40)){case'architect':return buildV3Architecture(input);case'build-spec':return buildV3BuildSpec(input);case'audit':return runV3Audit(input);case'qa':return buildV3QAMatrix(input);case'model-spec':return buildV3ModelSpec(input);default:fail('Noma’lum Quruvchi V3 amali.');}
}
