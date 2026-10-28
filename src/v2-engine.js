const TECHNOLOGIES = [
  {id:'studio-bridge',name:'Smart Studio Bridge',status:'integrated',description:'Mavjud Quruvchi Studio plugin ko‘prigi, tree audit va amaldagi Studio vositalaridan foydalanadi.'},
  {id:'luau-intelligence',name:'Luau Intelligence Engine',status:'local',description:'Luau matnida keng tarqalgan xatolar, xavfli looplar va tekshirish kerak bo‘lgan joylarni API kalitisiz topadi.'},
  {id:'procedural-world',name:'Procedural World Generator',status:'local',description:'Seed asosida takrorlanuvchi, koordinatalari aniq xarita blueprintini tuzadi; Studio obyektlarini avtomatik yaratish plugin ulanishiga bog‘liq.'},
  {id:'parametric-models',name:'Parametric Model Studio',status:'assisted',description:'Model o‘lchamlari, qismlar ro‘yxati va material yo‘riqnomasini tuzadi; bu to‘liq mesh generatori emas.'},
  {id:'adaptive-performance',name:'Adaptive Performance Engine',status:'local',description:'Kod bo‘yicha ehtimoliy performance muammolari va Roblox optimallashtirish tavsiyalarini beradi.'},
  {id:'parallel-luau',name:'Parallel Luau Compute',status:'assisted',description:'Actor/Parallel Luau ishlatish mumkin bo‘lgan joylarni aniqlashga yordam beradi; mavjud skriptni ko‘r-ko‘rona parallelga o‘tkazmaydi.'},
  {id:'architecture-graph',name:'Game Architecture Graph',status:'local',description:'Berilgan skript/fayl yo‘llaridan oddiy modul bog‘liqlik xaritasini chiqaradi.'},
  {id:'autonomous-qa',name:'Autonomous QA & Playtest',status:'assisted',description:'Kod audit va test checklistini tuzadi; haqiqiy Roblox Play-testni Studio’da foydalanuvchi tasdiqlashi kerak.'},
  {id:'transactional-build',name:'Transactional Build & Rollback',status:'assisted',description:'O‘zgarishdan oldingi checkpoint va rollback checklistini beradi; Git/Studio undo o‘rniga o‘tmaydi.'},
  {id:'context-planner',name:'Context-Aware Build Planner',status:'integrated',description:'V2 loyiha rejasini, saqlangan xotirani va mavjud loyiha cheklovlarini birga ishlatadi.'}
];

function clean(value, max=12000) {
  return String(value ?? '').replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g,'').slice(0,max);
}
function analyzeLuau(input={}) {
  const source=clean(input.source);
  if(!source.trim()) return {title:'Luau audit',summary:'Tahlil uchun Luau kodini kiriting.',findings:[],checkedLines:0};
  const lines=source.split(/\\r?\\n/), findings=[];
  const add=(level,line,message)=>findings.push({level,line,message});
  lines.forEach((line,index)=>{
    const n=index+1;
    if(/\\bwhile\\s+true\\s+do\\b/.test(line) && !/task\\.wait|\\bwait\\s*\\(/.test(lines.slice(index,index+8).join(' '))) add('warning',n,'Cheksiz loop ichida task.wait() yoki event-yield borligini tekshiring; aks holda server/client qotishi mumkin.');
    if(/\\bwait\\s*\\(/.test(line)) add('info',n,'wait() o‘rniga ko‘pincha task.wait() afzal.');
    if(/OnServerEvent\\s*:\\s*Connect/.test(line) && !/math\\.clamp|typeof|IsA|FindFirstChild|\\bassert\\b/.test(lines.slice(index,index+14).join(' '))) add('warning',n,'RemoteEvent server handlerida argument turi, masofa, ownership va cooldown validatsiyasini tekshiring.');
    if(/DataStoreService|GetDataStore/.test(line) && !/pcall/.test(lines.slice(index,Math.min(lines.length,index+12)).join(' '))) add('warning',n,'DataStore chaqiruvini pcall bilan o‘rash va xatoni boshqarishni tekshiring.');
    if(/BodyVelocity|BodyPosition|BodyGyro/.test(line)) add('info',n,'Legacy BodyMover ishlatilgan bo‘lishi mumkin; yangi tizimlarda constraints/LinearVelocity mosligini tekshiring.');
    if(/require\\s*\\(\\s*\\d+\\s*\\)/.test(line)) add('warning',n,'Raqamli asset/module require xavfsizligi va manbasini tekshiring.');
  });
  const opens=(source.match(/\\b(function|then|do|repeat)\\b/g)||[]).length;
  const closes=(source.match(/\\b(end|until)\\b/g)||[]).length;
  if(opens>closes+2) add('warning',1,'Blok ochilish/yopilish sonida nomutanosiblik bo‘lishi mumkin; Luau parser bilan tasdiqlang.');
  return {title:'Luau statik audit',summary:findings.length?String(findings.length)+' ta tekshiruv topildi. Bu lint yordamchisi, Roblox Luau parserining o‘rnini bosmaydi.':'Oddiy pattern tekshiruvlarida ogohlantirish topilmadi. Bu kod xatosizligini kafolatlamaydi.',findings,checkedLines:lines.length};
}
function worldBlueprint(input={}) {
  const seedText=clean(input.seed||'quruvchi-v2',120);
  let seed=2166136261; for(const ch of seedText) seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const style=clean(input.style||'fantasy',50);
  const zones=Array.from({length:12},(_,i)=>({name:['Spawn Hub','Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7','Zone 8','Zone 9','Zone 10','Final Zone'][i],position:{x:(i%4)*320-480,y:0,z:Math.floor(i/4)*320-320},size:{x:220,y:12,z:220},difficulty:i===0?'safe':i<4?'easy':i<8?'medium':'hard',decorationCount:Math.floor(rand()*8)+4,theme:style,seed:seedText}));
  return {title:'Procedural World Blueprint',seed:seedText,style,zones,notes:['Seed bir xil bo‘lsa, layout ham bir xil bo‘ladi.','Blueprint koordinatalari va tavsiyalardan iborat; u hali Studio ichida yaratilmadi.','Katta xaritada StreamingEnabled va takroriy assetlarni reuse qilishni tekshiring.']};
}
function performanceAudit(input={}) {
  const source=clean(input.source), findings=[];
  const checks=[
    [/\\bwhile\\s+true\\s+do\\b/,'Cheksiz looplar: task.wait yoki event-driven model borligini tekshiring.'],
    [/\\.Touched:Connect/,'Ko‘p .Touched connectionlar fizik event yukini oshirishi mumkin; connectionlarni boshqaring.'],
    [/GetDescendants\\s*\\(/,'GetDescendants()ni tez-tez loop ichida chaqirmang; natijani kerak bo‘lsa cache qiling.'],
    [/task\\.spawn|spawn\\s*\\(/,'Ko‘p parallel task ochilishi nazorat qilinsin; lifecycle/cleanup qo‘shing.'],
    [/RunService\\.Heartbeat/,'Heartbeat callbackini yengil saqlang va keraksiz har frame ishini kamaytiring.'],
    [/Instance\\.new\\s*\\(/,'Takroriy Instance yaratish joylarini pooling/reuse bilan solishtiring.']
  ];
  for(const [pattern,message] of checks) if(pattern.test(source)) findings.push({level:'review',message});
  return {title:'Performance audit',summary:findings.length?'Ko‘rib chiqish kerak bo‘lgan '+findings.length+' pattern topildi.':'Kiritilgan kodda ma’lum patternlar topilmadi; bu performance kafolati emas.',findings,recommendations:['StreamingEnabled va map zonalashini tekshiring.','Keraksiz event connectionlarni Destroy/Disconnect qiling.','Profiler va MicroProfiler natijasiga qarab optimallashtiring.','Past quvvatli qurilmada Studio Play-test qiling.']};
}
function qaPlan(input={}) {
  const title=clean(input.title||'Roblox o‘yini',100);
  return {title:title+' — QA rejasi',tests:[
    'Yangi sessiya: spawn, asosiy gameplay loop va qayta spawn tekshiriladi.',
    'Ikki o‘yinchi: ownership, trade/steal/economy bo‘lsa server-side tekshiruvlar.',
    'Noto‘g‘ri RemoteEvent argumentlari va spam/cooldown tekshiriladi.',
    'Mobil va kompyuter UI: tugmalar, safe area, ekran o‘lchamlari.',
    'Server/client Output loglari: xatolar va cheksiz warninglar.',
    'DataStore ishlatilsa: API xatosi, yangi profil va saqlash qayta urinishlari.',
    'Ko‘p obyektli xaritada FPS, streaming va memory.',
    'Studio Play-test natijasini qo‘lda qayd etish; test bajarilmagan bo‘lsa “pass” demaslik.'
  ],status:'checklist-only'};
}
function architectureGraph(input={}) {
  const paths=String(clean(input.paths,10000)).split(/\\r?\\n|,/).map(x=>x.trim()).filter(Boolean).slice(0,100);
  const modules=paths.map(path=>({path:path.replace(/\\\\/g,'/'),kind:/\\.lua$/i.test(path)?'Luau':/\\.js$/i.test(path)?'JavaScript':'file',area:/server|service/i.test(path)?'server':/client|controller|ui/i.test(path)?'client':'shared/unknown'}));
  return {title:'Project module map',modules,notes:['Bu yo‘llar asosidagi dastlabki xarita; import/require bog‘liqliklari to‘liq parse qilinmagan.','Modullar orasidagi aniq bog‘liqlikni tekshirish uchun haqiqiy require/import satrlarini ham audit qilish kerak.']};
}
function runV2Toolkit(input={}) {
  switch(clean(input.action,40)) {
    case 'luau-audit': return analyzeLuau(input);
    case 'world-blueprint': return worldBlueprint(input);
    case 'performance-audit': return performanceAudit(input);
    case 'qa-plan': return qaPlan(input);
    case 'architecture-graph': return architectureGraph(input);
    case 'rollback-checklist': return {title:'Safe build & rollback',steps:['Mavjud Studio tree va skriptlarni o‘zgarishdan oldin saqlang/export qiling.','Faqat bitta kichik fazani qo‘llang va tree/log audit bajaring.','Studio ChangeHistoryService waypoint/Undo imkoniyatini tekshiring.','O‘zgarishdan keyin Play-test qiling; xato bo‘lsa oldingi checkpointga qayting.','Git bilan ishlayotgan bo‘lsangiz diffni ko‘rib, ma’lum ishlaydigan commitni saqlang.'],status:'guidance-only'};
    case 'parallel-luau': return {title:'Parallel Luau review',items:['CPU-heavy, mustaqil hisoblash ishlarinigina ko‘rib chiqing.','Actor ownership va message passingni aniq belgilang.','DataModel mutatsiyasini parallel phase’da qilmaslik qoidalarini Roblox hujjatidan tekshiring.','Oddiy gameplay logicni faqat “tezroq” degan taxmin bilan parallelga o‘tkazmang.'],status:'guidance-only'};
    case 'parametric-model': return {title:'Parametric model spec',parts:[{name:'Primary body',size:{x:12,y:8,z:12},material:'SmoothPlastic'},{name:'Trim',size:{x:13,y:1,z:13},material:'Metal'},{name:'Accent',size:{x:4,y:2,z:4},material:'Neon'}],notes:['O‘lchamlar studiyadagi stud birliklarida boshlang‘ich taklif.','Bu spec, haqiqiy mesh yoki Studio instance emas.']};
    default: { const error=new Error('Noma’lum Quruvchi V2 engine amali.'); error.status=400; throw error; }
  }
}
export { TECHNOLOGIES as V2_TECHNOLOGIES, runV2Toolkit };
