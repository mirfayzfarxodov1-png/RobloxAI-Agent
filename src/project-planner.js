const MAX_FEATURES = 20;
const MAX_PHASES = 10;
const MAX_CONSTRAINTS = 20;

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

const DEFAULT_PHASES = [
  { name: 'Foundation', goal: 'Mavjud loyihani tekshirish, folder arxitekturasi, konfiguratsiya va server/client chegaralarini belgilash.' },
  { name: 'Playable core', goal: 'O‘yinchiga darhol o‘ynash mumkin bo‘lgan asosiy gameplay loopini yaratish.' },
  { name: 'Progression and data', goal: 'Kerak bo‘lsa inventar, iqtisodiyot, progression va xavfsiz saqlash tizimlarini ulash.' },
  { name: 'UI and content', goal: 'Gameplay bilan bog‘langan UI, xarita, NPC, audio va vizual feedbackni qo‘shish.' },
  { name: 'Integration and QA', goal: 'Tizimlararo moslik, server validatsiyasi, xatolar va test natijalarini tekshirish.' },
];

export function createProjectPlan(input = {}) {
  const title = cleanText(input.title, 100, 'Yangi Roblox loyihasi') || 'Yangi Roblox loyihasi';
  const genre = cleanText(input.genre, 100, 'Aniqlashtirilmagan janr') || 'Aniqlashtirilmagan janr';
  const pitch = cleanText(input.pitch, 2500, 'Foydalanuvchi g‘oyasidan kelib chiqib gameplay loop aniqlanadi.') || 'Foydalanuvchi g‘oyasidan kelib chiqib gameplay loop aniqlanadi.';
  const complexity = ['small', 'medium', 'large', 'very-large'].includes(input.complexity) ? input.complexity : 'large';
  const platforms = cleanList(input.platforms, 5, 40);
  const coreLoop = cleanList(input.coreLoop, 8, 180);
  const features = cleanList(input.features, MAX_FEATURES, 180);
  const constraints = cleanList(input.constraints, MAX_CONSTRAINTS, 180);
  const phasesInput = Array.isArray(input.phases) ? input.phases.slice(0, MAX_PHASES) : [];
  const phases = (phasesInput.length ? phasesInput : DEFAULT_PHASES).map((phase, index) => ({
    order: index + 1,
    name: cleanText(phase?.name, 80, 'Phase ' + (index + 1)) || 'Phase ' + (index + 1),
    goal: cleanText(phase?.goal, 500, 'Talablarni tekshirish va testlash.') || 'Talablarni tekshirish va testlash.',
    systems: cleanList(phase?.systems, 10, 100),
    acceptanceCriteria: cleanList(phase?.acceptanceCriteria, 8, 180),
  }));
  return {
    schemaVersion: 1, title, genre, pitch, complexity, platforms,
    multiplayer: ['single-player', 'small-multiplayer', 'large-multiplayer', 'unknown'].includes(input.multiplayer) ? input.multiplayer : 'unknown',
    dataPersistence: input.dataPersistence === true,
    monetization: cleanText(input.monetization, 300, 'Foydalanuvchi tasdiqlamaguncha monetizatsiya qo‘shilmaydi.'),
    coreLoop, features, constraints, phases,
    guardrails: [
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
    '- **Ma’lumot saqlash:** ' + (plan.dataPersistence ? 'kerak' : 'hali tasdiqlanmagan'), '',
    '## G‘oya', plan.pitch, '',
    '## Asosiy gameplay loop',
    ...(plan.coreLoop.length ? plan.coreLoop.map((item, i) => (i + 1) + '. ' + item) : ['- Gameplay loop foydalanuvchi talabidan aniqlashtiriladi.']),
    '', '## Funksiyalar',
    ...(plan.features.length ? plan.features.map(item => '- ' + item) : ['- Talablar tahlilidan keyin aniqlanadi.']),
    '', '## Bosqichlar',
    ...plan.phases.flatMap(phase => [
      '### ' + phase.order + '. ' + phase.name, phase.goal,
      ...(phase.systems.length ? ['Tizimlar: ' + phase.systems.join(', ')] : []),
      ...(phase.acceptanceCriteria.length ? ['Qabul mezonlari:', ...phase.acceptanceCriteria.map(item => '- ' + item)] : []), '',
    ]),
    '## Cheklovlar va xavfsizlik',
    ...(plan.constraints.length ? plan.constraints.map(item => '- ' + item) : ['- Maxsus cheklov ko‘rsatilmagan.']),
    ...plan.guardrails.map(item => '- ' + item), '',
    '## Keyingi qadam',
    'Mavjud Roblox Studio daraxtini tekshir, birinchi kichik playable vertical slice uchun aniq obyekt va skriptlar ro‘yxatini tuz, so‘ng bosqichma-bosqich amalga oshir.',
  ];
  return lines.join('\n').slice(0, 18000);
}
