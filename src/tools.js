export const tools = [
  { name: 'get_tree', description: 'Studio ierarxiyasini ko‘rish. O‘zgarishdan oldin chaqir.', input_schema: { type:'object', properties:{ path:{type:'string',description:'Masalan Workspace. Bo‘sh bo‘lsa asosiy servislar.'}, depth:{type:'integer',minimum:1,maximum:6,default:2} } } },
  { name: 'create_tree', description: 'Obyektlar ierarxiyasini bitta chaqiruvda yaratadi. Parent ichida bir xil nomli yuqori daraja obyekt bo‘lsa almashtiriladi.', input_schema: { type:'object', required:['parent','tree'], properties:{ parent:{type:'string'}, tree:{$ref:'#/$defs/node'} }, $defs:{ node:{type:'object',required:['className','name'],properties:{className:{type:'string'},name:{type:'string'},properties:{type:'object'},attributes:{type:'object'},children:{type:'array',items:{$ref:'#/$defs/node'}}} } } } },
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
  const target = input?.path || input?.parent || input?.tree?.name || '';
  return (name + (target ? ': ' + target : '')).slice(0, 300);
}
