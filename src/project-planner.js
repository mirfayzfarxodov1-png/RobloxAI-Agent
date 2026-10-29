const MAX_FEATURES = 20;
const MAX_PHASES = 10;
const MAX_CONSTRAINTS = 20;
const MAX_SOURCES = 8;
const OFFICIAL_HOSTS = ['roblox.com', 'create.roblox.com', 'devforum.roblox.com', 'corp.roblox.com', 'about.roblox.com', 'blog.roblox.com'];

function cleanText(value, maxLength, fallback = '') {
  return String(value ?? fallback).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}
function cleanList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const text = cleanText(item, maxLength);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}
function isOfficialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && OFFICIAL_HOSTS.some(host => url.hostname.toLowerCase() === host || url.hostname.toLowerCase().endsWith('.' + host));
  } catch { return false; }
}
function cleanSources(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const sources = [];
  for (const item of value) {
    let url;
    try {
      url = new URL(String(item?.url || ''));
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      url.hash = '';
    } catch { continue; }
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    sources.push({
      title: cleanText(item?.title, 180, url.hostname) || url.hostname,
      url: url.href,
      domain: url.hostname.replace(/^www\./, '').slice(0, 120),
      official: isOfficialUrl(url.href),
      summary: cleanText(item?.summary || item?.snippet, 420),
    });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}
function detectGameType(text) {
  if (/\b(steal|o['’ʻ]?g['’ʻ]?irlash|o['’ʻ]?g['’ʻ]?irlab|relic|artifact|legacy|collect)\b/i.test(text)) return 'collection';
  if (/\b(tycoon|factory|business|zavod|biznes)\b/i.test(text)) return 'tycoon';
  if (/\b(simulator|simulyator|clicker|grind|rebirth)\b/i.test(text)) return 'simulator';
  if (/\b(rpg|quest|adventure|sarguzasht|role.?play)\b/i.test(text)) return 'adventure';
  return 'general';
}
function defaultLoop(type) {
  const loops = {
    collection: ['Dunyoni o‘rganish va xavfsiz hududlarni ochish', 'Topilma yoki resurslarni yig‘ish va ularning qiymatini aniqlash', 'Mukofotlarni bazada saqlash va himoya tizimini yaxshilash', 'Yangi hududlar va qiyinroq topshiriqlarni ochish', 'Progressni saqlab, keyingi sessiyada davom ettirish'],
    tycoon: ['Boshlang‘ich resurs bilan ishlab chiqarishni boshlash', 'Daromadni yig‘ish va ishlab chiqarishni yangilash', 'Yangi bo‘lim yoki hududni ochish', 'Server hisoblagan natijalarni saqlash', 'Keyingi upgrade maqsadiga erishish'],
    simulator: ['Asosiy harakat orqali resurs yig‘ish', 'Resurslarni upgrade va yangi imkoniyatlarga sarflash', 'Yangi hudud yoki qiyinchilikni ochish', 'Natijalarni saqlash va samaradorlikni oshirish'],
    adventure: ['Hududni o‘rganish va topshiriq olish', 'To‘siq yoki raqibni yengish uchun mexanikadan foydalanish', 'Mukofot va progress olish', 'Yangi hudud va topshiriqlarni ochish', 'Progressni saqlash va hikoyani davom ettirish'],
    general: ['Spawn va qisqa onboarding', 'O‘yinning asosiy vazifasini bajarish', 'Aniq mukofot va feedback olish', 'Yangi imkoniyat yoki bosqichni ochish', 'Progressni saqlash va qayta o‘ynash uchun sabab yaratish'],
  };
  return loops[type];
}
function defaultFeatures(type) {
  const features = {
    collection: ['Server-tekshiruvli topilmalar va rarity jadvali', 'Inventar va qiymat ko‘rsatadigan UI', 'Baza yoki xavfsiz saqlash hududi', 'Hudud ochish va progression', 'Saqlanadigan player profile', 'Mobilga mos boshqaruv', 'Server-side anti-exploit validatsiyasi', 'Output log va audit tekshiruvlari'],
    tycoon: ['Server-side income generator', 'Purchase/upgrade validator', 'Tycoon plot ownership', 'Progression va unlock tree', 'Saqlanadigan player profile', 'Responsive upgrade UI', 'Server-side anti-exploit validatsiyasi', 'Performance va save-failure handling'],
    simulator: ['Server-tekshiruvli resurs hisoblagichi', 'Upgrade va progression daraxti', 'Hudud/unlock tizimi', 'Saqlanadigan player profile', 'Responsive HUD', 'Cooldown va rate-limit tekshiruvi', 'Mobil boshqaruv', 'Test va audit holatlari'],
    adventure: ['Quest/state manager', 'Hudud va spawn boshqaruvi', 'Mukofotlarni serverda tekshirish', 'Inventar yoki progress profili', 'Quest UI va feedback', 'Save/load xatolarini boshqarish', 'Mobilga mos boshqaruv', 'Play-test checklist'],
    general: ['Aniq game-state manager', 'Asosiy gameplay mexanikasi', 'Server-authoritative mukofot va progression', 'Responsive HUD va feedback', 'Saqlanadigan player profile', 'Mobil va desktop input', 'Xatolarni boshqarish va audit', 'Play-test acceptance checklist'],
  };
  return features[type];
}
const DEFAULT_PHASES = [
  { name: '1. Talablar va Studio audit', goal: 'G‘oya, mavjud DataModel, scripts, remotes va dependency’larni tekshirish; nom va asosiy loopni saqlash.', systems: ['Requirement map', 'Studio tree audit'], acceptanceCriteria: ['Foydalanuvchi bergan loyiha nomi aynan saqlanadi', 'Mavjud tizimlar va conflict’lar ro‘yxatga olinadi'] },
  { name: '2. Core architecture', goal: 'Modulli folder tuzilmasi, shared config, server/client chegaralari va remotesni yaratish.', systems: ['Config', 'Remote validation', 'Module initialization'], acceptanceCriteria: ['Har bir module aniq mas’uliyatga ega', 'Remote argumentlari serverda tekshiriladi'] },
  { name: '3. Playable vertical slice', goal: 'O‘yinchi spawn, asosiy action, server-side state va ko‘rinadigan feedback bilan birinchi o‘ynaladigan loopni qurish.', systems: ['Game state', 'Core gameplay', 'Client feedback'], acceptanceCriteria: ['Asosiy loopni boshidan oxirigacha bajarish mumkin', 'Noto‘g‘ri client input state’ni buzmaydi'] },
  { name: '4. World and content', goal: 'Hududlar, spawn nuqtalari, obyektlar va original vizual mavzuni optimallashtirilgan batchlarda yaratish.', systems: ['World zones', 'Spawn and interaction', 'Performance budget'], acceptanceCriteria: ['O‘yinchi kerakli hududga yetib bora oladi', 'Katta obyektlar to‘plami performance auditdan o‘tadi'] },
  { name: '5. Progression and economy', goal: 'Resurs, inventar, upgrade, unlock va mukofotlar orasidagi server-authoritative qoidalarni ulash.', systems: ['Inventory/economy', 'Progression', 'Server validation'], acceptanceCriteria: ['Mukofot va narx clientdan qabul qilinmaydi', 'Chekka qiymatlar tekshiriladi'] },
  { name: '6. Data persistence', goal: 'Profil schema, DataStore load/save, UpdateAsync, retry/backoff, migration va xavfsiz save-failure handlingni ulash.', systems: ['Profile schema', 'DataStore', 'Migration and retries'], acceptanceCriteria: ['Load xatosida default data eski profil ustiga yozilmaydi', 'PlayerRemoving va BindToClose saqlash yo‘li bor', 'API Services talab qilinadigan sozlama hujjatlashtiriladi'] },
  { name: '7. UI, input and accessibility', goal: 'Gameplayga ulangan HUD, menyular, loading/error/success holatlari va desktop/mobile inputni yakunlash.', systems: ['HUD', 'Responsive layout', 'Input mapping'], acceptanceCriteria: ['Har tugma haqiqiy actionga ulangan', 'Kichik ekranlarda UI ishlaydi', 'Loading va xato holatlari ko‘rsatiladi'] },
  { name: '8. Security and resilience', goal: 'Remote validation, permission checks, rate limits, duplicate requests, cleanup va xato holatlarini tekshirish.', systems: ['Security audit', 'Rate limits', 'Cleanup'], acceptanceCriteria: ['Client mukofot yoki save qiymatini o‘zi belgilay olmaydi', 'Event connections va temporary instances tozalanadi'] },
  { name: '9. Automated QA and fixes', goal: 'Scriptlarni qayta o‘qish, static/performance audit, Output loglari va test matritsasini bajarish; topilgan xatolarni tuzatish.', systems: ['Static audit', 'Output logs', 'Regression checklist'], acceptanceCriteria: ['Yangi audit findinglari ko‘rib chiqiladi', 'Har bir fix qayta tekshiriladi', 'Play-test bajarilmagan bo‘lsa ochiq ko‘rsatiladi'] },
  { name: '10. Play-test and release readiness', goal: 'Roblox Studio Play/multiplayer test, save/load, respawn, disconnect/rejoin va final checklist.', systems: ['Play-test', 'Multiplayer test', 'Release checklist'], acceptanceCriteria: ['Asosiy loop real Play-testda tekshiriladi', 'Save/load real Studio sozlamasida tekshiriladi', 'Hal bo‘lmagan risklar ro‘yxati beriladi'] },
];

export function createProjectPlan(input = {}) {
  const title = cleanText(input.title, 100, 'Yangi Roblox loyihasi') || 'Yangi Roblox loyihasi';
  const genre = cleanText(input.genre, 100, 'Aniqlashtirilmagan janr') || 'Aniqlashtirilmagan janr';
  const pitch = cleanText(input.pitch, 2500, 'Foydalanuvchi g‘oyasidan kelib chiqib gameplay loop aniqlanadi.') || 'Foydalanuvchi g‘oyasidan kelib chiqib gameplay loop aniqlanadi.';
  const complexity = ['small', 'medium', 'large', 'very-large'].includes(input.complexity) ? input.complexity : 'large';
  const platforms = cleanList(input.platforms, 5, 40);
  const contextText = [title, genre, pitch, ...(Array.isArray(input.coreLoop) ? input.coreLoop : []), ...(Array.isArray(input.features) ? input.features : [])].join(' ');
  const gameType = detectGameType(contextText);
  const largePlan = complexity === 'large' || complexity === 'very-large';
  const minimumLoopItems = largePlan ? 4 : complexity === 'medium' ? 3 : 1;
  const loopLimit = largePlan ? 8 : complexity === 'medium' ? 5 : 3;
  const coreLoop = cleanList(input.coreLoop, 8, 180);
  const defaultLoopItems = defaultLoop(gameType);
  const normalizedLoop = coreLoop.length >= minimumLoopItems
    ? coreLoop
    : [...coreLoop, ...defaultLoopItems.filter(item => !coreLoop.some(existing => existing.toLocaleLowerCase() === item.toLocaleLowerCase()))].slice(0, loopLimit);
  const features = cleanList(input.features, MAX_FEATURES, 180);
  const defaultFeatureItems = defaultFeatures(gameType);
  const minimumFeatures = largePlan ? 6 : complexity === 'medium' ? 4 : 1;
  const featureLimit = largePlan ? MAX_FEATURES : complexity === 'medium' ? 10 : 6;
  const normalizedFeatures = features.length >= minimumFeatures
    ? features
    : [...features, ...defaultFeatureItems.filter(item => !features.some(existing => existing.toLocaleLowerCase() === item.toLocaleLowerCase()))].slice(0, featureLimit);
  const constraints = cleanList(input.constraints, MAX_CONSTRAINTS, 180);
  const phasesInput = Array.isArray(input.phases) ? input.phases.slice(0, MAX_PHASES) : [];
  // Large projects must not degrade into a short, vague roadmap when the model
  // returns only a few phases. Use the complete tested template as the fallback.
  const useDefaultRoadmap = (complexity === 'large' || complexity === 'very-large') && phasesInput.length < 8;
  const selectedPhases = useDefaultRoadmap || phasesInput.length === 0 ? DEFAULT_PHASES : phasesInput;
  const phases = selectedPhases.map((phase, index) => ({
    order: index + 1,
    name: cleanText(phase?.name, 80, 'Phase ' + (index + 1)) || 'Phase ' + (index + 1),
    goal: cleanText(phase?.goal, 500, 'Talablarni tekshirish va testlash.') || 'Talablarni tekshirish va testlash.',
    systems: cleanList(phase?.systems, 10, 100),
    acceptanceCriteria: cleanList(phase?.acceptanceCriteria, 8, 180),
  }));
  const inferredPersistence = complexity === 'large' || complexity === 'very-large' ||
    /\b(save|saving|data|profile|inventory|inventar|currency|coins|money|progress|upgrade|rebirth|tycoon|simulator|steal|legacy|collect|pet|quest|level|unlock)\b/i.test(contextText);
  const dataPersistence = typeof input.dataPersistence === 'boolean' ? input.dataPersistence : inferredPersistence;
  const sources = cleanSources(input.sources);
  const researchSummary = cleanText(input.researchSummary, 2500);
  const researchDate = cleanText(input.researchDate, 60, sources.length ? new Date().toISOString() : '');
  const qualityChecks = [
    { id: 'identity', label: 'Loyiha nomi va g‘oya saqlandi', passed: Boolean(title && pitch) },
    { id: 'gameplay-loop', label: 'Gameplay loop aniq', passed: normalizedLoop.length >= 3 },
    { id: 'features', label: 'Funksiyalar ro‘yxati bor', passed: normalizedFeatures.length >= 5 },
    { id: 'phases', label: 'Bosqichlar acceptance criteria bilan belgilangan', passed: phases.length >= ((complexity === 'large' || complexity === 'very-large') ? 8 : 3) && phases.every(phase => phase.goal && phase.systems.length > 0 && phase.acceptanceCriteria.length > 0) },
    { id: 'persistence', label: 'Ma’lumot saqlash qarori belgilangan', passed: typeof dataPersistence === 'boolean' },
    { id: 'research', label: 'Internet manbalari biriktirilgan', passed: sources.length > 0 },
  ];
  return {
    schemaVersion: 2, title, genre, pitch, complexity, platforms,
    multiplayer: ['single-player', 'small-multiplayer', 'large-multiplayer', 'unknown'].includes(input.multiplayer) ? input.multiplayer : 'unknown',
    dataPersistence,
    dataPersistenceStatus: dataPersistence ? 'planned' : 'not-required',
    monetization: cleanText(input.monetization, 300, 'Foydalanuvchi tasdiqlamaguncha monetizatsiya qo‘shilmaydi.'),
    coreLoop: normalizedLoop, features: normalizedFeatures, constraints,
    phases, gameType, researchSummary, researchDate, sources, qualityChecks,
    guardrails: [
      'Foydalanuvchi bergan loyiha nomini aynan saqla; faqat nomni o‘zgartirishni so‘rasa qayta nomla.',
      'Internet qidiruvi va plan mavjudligi kodning yoki Studio runtime’ning tekshirilganini anglatmaydi.',
      'Avval mavjud Studio loyihasini tekshir; mavjud ishni sababsiz buzma.',
      'Bitta ulkan skript o‘rniga kichik, aniq vazifali modullar yarat.',
      'Har fazadan keyin tool natijalarini va testlarni tekshir.',
      'Server muhim gameplay, iqtisodiyot va saqlash qoidalarini tekshirsin.',
      'Bajarilmagan yoki Studio’da tekshirilmagan funksiyani tayyor deb ko‘rsatma.',
    ],
  };
}

export function renderProjectPlanMarkdown(plan) {
  const lines = [
    '# ' + plan.title, '',
    '- **Janr:** ' + plan.genre,
    '- **Murakkablik:** ' + plan.complexity,
    '- **Multiplayer:** ' + plan.multiplayer,
    '- **Loyiha nomi:** foydalanuvchi bergan nom saqlanadi',
    '- **Ma’lumot saqlash:** ' + (plan.dataPersistence ? 'ha — reja bo‘yicha DataStore/Profile saqlash tizimi kerak' : 'yo‘q — hozirgi talablar uchun majburiy emas'),
    '- **Saqlashni real tekshirish:** ' + (plan.dataPersistence ? 'Studio Play-test va API Services sozlamasi talab qilinadi; rejaning o‘zi test dalili emas' : 'saqlash tizimi talab qilinmaydi'),
    '- **Internet tadqiqoti:** ' + (plan.sources.length ? 'manbalar biriktirilgan (' + plan.sources.length + ')' : 'qidiruv manbalari biriktirilmagan — tekshirilmagan faktlar qo‘shilmasin'),
    '', '## G‘oya', plan.pitch, '',
    ...(plan.researchSummary ? ['## Internet tadqiqoti xulosasi', plan.researchSummary, ''] : []),
    ...(plan.sources.length ? ['## Manbalar', ...plan.sources.map((source, index) => (index + 1) + '. [' + source.title + '](' + source.url + ') — ' + source.domain + (source.official ? ' (rasmiy domen)' : ' (mustaqil manba)') + (source.summary ? ': ' + source.summary : '')), ''] : []),
    '## Asosiy gameplay loop',
    ...plan.coreLoop.map((item, i) => (i + 1) + '. ' + item),
    '', '## Funksiyalar',
    ...plan.features.map(item => '- ' + item),
    '', '## Bosqichlar',
    ...plan.phases.flatMap(phase => [
      '### ' + phase.order + '. ' + phase.name, phase.goal,
      ...(phase.systems.length ? ['Tizimlar: ' + phase.systems.join(', ')] : []),
      ...(phase.acceptanceCriteria.length ? ['Qabul mezonlari:', ...phase.acceptanceCriteria.map(item => '- ' + item)] : []), '',
    ]),
    '## Reja sifati',
    ...plan.qualityChecks.map(check => '- [' + (check.passed ? 'x' : ' ') + '] ' + check.label),
    '',
    '## Cheklovlar va xavfsizlik',
    ...(plan.constraints.length ? plan.constraints.map(item => '- ' + item) : ['- Maxsus cheklov ko‘rsatilmagan.']),
    ...plan.guardrails.map(item => '- ' + item), '',
    '## Keyingi qadam',
    'Mavjud Roblox Studio daraxtini tekshir, birinchi playable vertical slice uchun aniq obyekt va skriptlar ro‘yxatini tuz, so‘ng bosqichma-bosqich amalga oshir. Reja tayyorligi, kod yozilgani va Studio Play-testdan o‘tganini alohida status sifatida ko‘rsat.',
  ];
  return lines.join('\n').slice(0, 24000);
}
