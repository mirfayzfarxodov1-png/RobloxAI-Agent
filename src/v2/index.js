import crypto from 'node:crypto';
import { db } from '../db.js';
import { createProjectPlan, renderProjectPlanMarkdown } from '../project-planner.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS project_memory (
    user_id INTEGER PRIMARY KEY,
    project_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

export const V2_CAPABILITIES = [
  { id:'architect', name:'AI Game Architect', tier:'P0', status:'ready', description:'G‘oyani featurelar, fazalar va qabul mezonlariga ajratadigan loyiha rejalashtiruvchisi.' },
  { id:'safe-apply', name:'Safe Apply & Rollback', tier:'P0', status:'integrated', description:'Studio o‘zgarishlari ChangeHistoryService waypoint/recording bilan belgilanadi; Undo/Redo Studio’da mavjud.' },
  { id:'world-builder', name:'Smart World Builder', tier:'P0', status:'integrated', description:'Plugin create_tree, set_properties va script vositalari bilan haqiqiy Studio obyektlarini yaratadi.' },
  { id:'self-heal', name:'Self-Healing AI', tier:'P0', status:'integrated', description:'Audit, log o‘qish va kodni qayta tahrirlash orqali xatolarni izlash; avtomatik tuzatishdan keyin tekshirish talab qilinadi.' },
  { id:'mega-project', name:'Mega-Project Mode', tier:'P1', status:'ready', description:'Katta loyihalarni kichik fazalar, tizimlar va aniq mezonlarga bo‘ladi.' },
  { id:'ui-master', name:'UI Master', tier:'P1', status:'integrated', description:'ScreenGui va UI skriptlarini Studio tree va script vositalari bilan yaratish mumkin.' },
  { id:'playtest', name:'Playtest AI', tier:'P1', status:'assisted', description:'Statik audit va log diagnostikasi mavjud; haqiqiy Roblox Play-testni foydalanuvchi Studio’da ishga tushirib tasdiqlashi kerak.' },
  { id:'research', name:'Web Research AI', tier:'P1', status:'integrated', description:'Mavjud web_research vositasi internet mavjud bo‘lganda manbalarni qidiradi.' },
  { id:'assets', name:'Asset & Animation Studio', tier:'P2', status:'assisted', description:'Part/Model, rig va animatsiya ulash uchun loyiha yaratish vositalari mavjud; haqiqiy asset ID uydirilmaydi.' },
  { id:'memory', name:'Memory & Command Center', tier:'P2', status:'ready', description:'Loyiha nomi, g‘oyasi, qarorlari va keyingi qadamlarini foydalanuvchi hisobiga saqlaydi.' },
];

function clean(value, max = 4000) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}
function list(value, maxItems = 20, maxLength = 180) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

export function buildV2Plan(input = {}) {
  const idea = clean(input.idea || input.pitch, 2500);
  if (idea.length < 8) {
    const error = new Error('O‘yin g‘oyasini kamida 8 ta belgi bilan yozing.');
    error.status = 400;
    throw error;
  }
  const title = clean(input.title, 100) || idea.split(/[.!?\n]/)[0].slice(0, 90) || 'Yangi Roblox loyihasi';
  const detected = [
    ['steal|tycoon|base|plot|o‘g‘ir|ugir', ['Base/plot tizimi','Server tekshiradigan o‘g‘irlash va egalik qoidalari','Upgrade va iqtisodiyot']],
    ['obby|parkour|checkpoint', ['Checkpoint va spawn tizimi','To‘siqlar va reset oqimi','Vaqt/rekord UI']],
    ['simulator|pet|egg|hatch', ['Progression va mukofotlar','Inventory va rarity','Server tekshiradigan hatch/economy']],
    ['rpg|quest|boss|combat', ['Combat va server damage validation','Quest/progression','NPC va boss holatlari']],
    ['shop|inventory|item|trade', ['Inventory va item holati','Server-side shop validation','UI feedback va edge case testlari']],
  ];
  const lower = idea.toLocaleLowerCase();
  const features = [];
  for (const [pattern, items] of detected) if (new RegExp(pattern, 'i').test(lower)) features.push(...items);
  features.push('Mobil va kompyuter UI moslashuvi','Server/client chegaralari va RemoteEvent validatsiyasi','Log/audit va Play-test checklist');
  const uniqueFeatures = [...new Set(features)].slice(0, 20);
  const phases = [
    {name:'01 — Audit va arxitektura',goal:'Mavjud Studio daraxti va ishlayotgan funksiyalarni tekshirib, minimal o‘zgarish rejasini tuzish.',systems:['Project audit','Folder arxitekturasi'],acceptanceCriteria:['Mavjud obyektlar qayta-qayta yaratilmaydi','Tizimlar va bog‘liqliklar ro‘yxati mavjud']},
    {name:'02 — Playable core',goal:'O‘yinchiga asosiy gameplay loopni sinash imkonini beradigan vertikal bo‘lak yaratish.',systems:['Spawn','Core gameplay','Server validation'],acceptanceCriteria:['Asosiy harakat serverda tekshiriladi','Muvaffaqiyat va xato holatlari ko‘rinadi']},
    {name:'03 — World Builder',goal:'Xarita zonalari, bazalar, interaktiv obyektlar va dekorni optimallashtirib yaratish.',systems:['Workspace','Models','Terrain/Parts'],acceptanceCriteria:['Takroriy obyektlar nazorat qilinadi','Katta xarita bo‘laklarga ajratiladi']},
    {name:'04 — UI va feedback',goal:'Gameplayga ulangan, mobilga mos UI, loading/empty/error holatlarini yaratish.',systems:['ScreenGui','Controllers','Notifications'],acceptanceCriteria:['Tugmalar real handlerlarga ulangan','Mobil layout tekshiriladi']},
    {name:'05 — Progression va data',goal:'Kerak bo‘lsa inventory, economy, quest va persistence tizimlarini ulash.',systems:['DataService','Economy','Progression'],acceptanceCriteria:['Muhim qiymatlar serverda hisoblanadi','Saqlash xatolari default ma’lumotni bosib ketmaydi']},
    {name:'06 — Asset va animatsiya',goal:'Mavjud yoki tasdiqlangan assetlardan foydalanib, NPC/rig/animatsiya va effektlarni ulash.',systems:['NPC','Animation','VFX'],acceptanceCriteria:['Asset ID uydirilmaydi','Keraksiz effektlar tozalanadi']},
    {name:'07 — QA va tuzatish',goal:'Statik audit, loglar, remote validatsiya va test ssenariylarini tekshirish.',systems:['Audit','Output logs','Play-test'],acceptanceCriteria:['Yangi audit ogohlantirishlari ko‘rib chiqiladi','Haqiqiy Play-test holati aniq qayd etiladi']},
    {name:'08 — Performance va handoff',goal:'Keraksiz obyektlar, looplar va event connectionlarni kamaytirib, yakuniy hisobot berish.',systems:['Streaming','Cleanup','Project memory'],acceptanceCriteria:['Qolgan ishlar va test qadamlari hujjatlashtiriladi','Rollback yo‘li ma’lum']},
  ];
  const plan = createProjectPlan({
    title, genre: clean(input.genre, 100) || 'G‘oyadan aniqlanadi', pitch: idea,
    complexity: ['small','medium','large','very-large'].includes(input.complexity) ? input.complexity : (idea.length > 500 ? 'very-large' : 'large'),
    platforms: list(input.platforms, 5, 40).length ? list(input.platforms, 5, 40) : ['PC','Mobile','Tablet'],
    multiplayer: ['single-player','small-multiplayer','large-multiplayer','unknown'].includes(input.multiplayer) ? input.multiplayer : 'unknown',
    dataPersistence: input.dataPersistence === true,
    coreLoop: list(input.coreLoop, 8, 180).length ? list(input.coreLoop, 8, 180) : ['O‘yinchi harakat qiladi','Server holatni tekshiradi','Mukofot va UI feedback yangilanadi','Keyingi maqsad ochiladi'],
    features: uniqueFeatures, constraints: ['Mavjud Studio loyihasini sababsiz buzmaslik','Yangi branch yaratmaslik — faqat main talab qilingan repository ishida','Bajarilmagan testni muvaffaqiyatli deb ko‘rsatmaslik'], phases,
  });
  return { id:crypto.randomUUID(), createdAt:new Date().toISOString(), plan, markdown:renderProjectPlanMarkdown(plan), qaChecklist:[
    'Mavjud Studio tree va tegishli skriptlar tekshirildi',
    'Har bir yangi obyekt va script kutilgan path’da',
    'Remote argumentlari serverda validatsiya qilinadi',
    'UI tugmalari real funksiyalarga ulangan',
    'Output loglarida yangi xato yo‘q yoki ular izohlangan',
    'Studio Play-test qo‘lda bajarildi va natija qayd etildi',
    'Mobil ekran va past quvvatli qurilmada performance ko‘rib chiqildi',
    'O‘zgarishdan oldingi holatni tiklash yo‘li tekshirildi',
  ]};
}

export function getProjectMemory(userId) {
  const row = db.prepare('SELECT project_json, updated_at FROM project_memory WHERE user_id=?').get(userId);
  if (!row) return { memory:null };
  try { return { memory:JSON.parse(row.project_json), updatedAt:new Date(row.updated_at).toISOString() }; }
  catch { return { memory:null, warning:'Saqlangan loyiha xotirasi o‘qilmadi.' }; }
}

export function saveProjectMemory(userId, input = {}) {
  const project = {
    title:clean(input.title, 100) || 'Quruvchi loyihasi',
    idea:clean(input.idea, 2500),
    decisions:list(input.decisions, 30, 240),
    completed:list(input.completed, 30, 240),
    nextSteps:list(input.nextSteps, 30, 240),
    notes:clean(input.notes, 5000),
    updatedAt:new Date().toISOString(),
  };
  if (project.idea.length < 8 && !project.notes && !project.completed.length && !project.nextSteps.length) {
    const error = new Error('Saqlash uchun loyiha g‘oyasi, izoh yoki bajarilgan/keyingi vazifalardan birini kiriting.');
    error.status = 400;
    throw error;
  }
  db.prepare('INSERT INTO project_memory(user_id,project_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET project_json=excluded.project_json, updated_at=excluded.updated_at')
    .run(userId, JSON.stringify(project), Date.now());
  return { ok:true, memory:project };
}
