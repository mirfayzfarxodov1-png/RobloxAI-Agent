export const tools = [
  { name: 'web_research', description: 'Internetda o‘yin reference nomi, uning umumiy mexanikasi va eng yangi rasmiy Roblox ma’lumotlarini qidir. Rasmiy Roblox/Creator Hub/DevForum manbalarini ustun qo‘y; topilmagan faktni uydirma. Natijalarni foydalanuvchiga manba URL bilan tushuntir. Bu serverda bajariladi, Studio plugin talab qilmaydi.', input_schema: { type:'object', required:['queries'], properties:{ queries:{type:'array',minItems:1,maxItems:4,items:{type:'string',minLength:2,maxLength:220}}, officialOnly:{type:'boolean',default:false}, maxResults:{type:'integer',minimum:1,maximum:8,default:6} } } },
  { name: 'get_selection', description: 'Studio’da hozir tanlangan obyektlarning to‘liq path, class va nomini oladi.', input_schema: {type:'object',properties:{}} },
  { name: 'search_instances', description: 'Studio loyihasida nom yoki class bo‘yicha obyektlarni qidiradi. Natija 100 tadan oshmaydi.', input_schema: {type:'object',properties:{path:{type:'string',description:'Qidiruv root path, default Workspace'},nameContains:{type:'string',maxLength:100},className:{type:'string',maxLength:80},maxResults:{type:'integer',minimum:1,maximum:100,default:40}}} },
  { name: 'inspect_instance', description: 'Obyektning xavfsiz tanlangan xossalari, atributlari, childlari va pathini tekshiradi.', input_schema: {type:'object',required:['path'],properties:{path:{type:'string'}}} },
  { name: 'rename_instance', description: 'Obyekt nomini o‘zgartiradi; Undo/Redo tarixiga yozadi.', input_schema: {type:'object',required:['path','name'],properties:{path:{type:'string'},name:{type:'string',minLength:1,maxLength:100}}} },
  { name: 'duplicate_instance', description: 'Ruxsat etilgan obyektni nusxalab, xohishga ko‘ra boshqa parentga joylaydi; Undo/Redo tarixiga yozadi.', input_schema: {type:'object',required:['path'],properties:{path:{type:'string'},parent:{type:'string'},name:{type:'string',maxLength:100}}} },
  { name: 'select_instances', description: 'Path ro‘yxatidagi obyektlarni Studio Selection panelida tanlaydi.', input_schema: {type:'object',required:['paths'],properties:{paths:{type:'array',minItems:1,maxItems:100,items:{type:'string',maxLength:500}}}} },

  { name: 'get_tree', description: 'Studio ierarxiyasini ko‘rish. O‘zgarishdan oldin chaqir.', input_schema: { type:'object', properties:{ path:{type:'string',description:'Masalan Workspace. Bo‘sh bo‘lsa asosiy servislar.'}, depth:{type:'integer',minimum:1,maximum:6,default:2} } } },
  { name: 'create_tree', description: 'Obyektlar ierarxiyasini bitta chaqiruvda yaratadi. Mos classdagi mavjud obyekt yangilanadi; class farq qilsa xato qaytaradi.', input_schema: { type:'object', required:['parent','tree'], properties:{ parent:{type:'string'}, tree:{$ref:'#/$defs/node'} }, $defs:{ node:{type:'object',required:['className','name'],properties:{className:{type:'string'},name:{type:'string'},properties:{type:'object'},attributes:{type:'object'},children:{type:'array',items:{$ref:'#/$defs/node'}}} } } } },
  { name: 'create_script', description: 'Script/LocalScript/ModuleScript yaratadi yoki borini yangilaydi. Yo‘q oraliq papkalar Folder sifatida yaratiladi.', input_schema: {type:'object',required:['path','className','source'],properties:{path:{type:'string'},className:{type:'string',enum:['Script','LocalScript','ModuleScript']},source:{type:'string'}}} },
  { name: 'read_script', description: 'Skript matnini qator raqamlari bilan o‘qish.', input_schema: {type:'object',required:['path'],properties:{path:{type:'string'},startLine:{type:'integer'},endLine:{type:'integer'}}} },
  { name: 'set_properties', description: 'Mavjud obyekt xossalari va atributlarini o‘zgartirish.', input_schema: {type:'object',required:['path'],properties:{path:{type:'string'},properties:{type:'object'},attributes:{type:'object'}}} },
  { name: 'delete_instance', description: 'Obyektni o‘chirish. Himoyalangan servislarni o‘chirib bo‘lmaydi.', input_schema: {type:'object',required:['path'],properties:{path:{type:'string'}}} },
  { name: 'run_code', description: 'Studio edit rejimida Luau bajarish. Faqat foydalanuvchi plugin ichida alohida ruxsat berganda ishlaydi; sukut bo‘yicha o‘chiq.', input_schema: {type:'object',required:['code'],properties:{code:{type:'string'}}} },
  { name: 'get_logs', description: 'Studio Output jurnalini o‘qish. Foydalanuvchi logs desa chaqir.', input_schema: {type:'object',properties:{limit:{type:'integer',minimum:1,maximum:500,default:200},onlyErrors:{type:'boolean',default:false},clear:{type:'boolean',default:false}}} },
];
export function truncateOutput(value, limit = 20000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > limit ? text.slice(0, limit) + '\n[chiqish qisqartirildi]' : text;
}
export function toolSummary(name, input) {
  const target = input?.path || input?.parent || input?.tree?.name || input?.queries?.[0] || (input?.paths?.length ? input.paths.length + ' obyekt' : '') || input?.name || '';
  return (name + (target ? ': ' + target : '')).slice(0, 300);
}
