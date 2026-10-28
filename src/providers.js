import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db } from './db.js';

db.exec(`CREATE TABLE IF NOT EXISTS ai_credentials (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, model TEXT NOT NULL, endpoint TEXT NOT NULL,
 key_iv TEXT NOT NULL, key_tag TEXT NOT NULL, key_cipher TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);`);

const keyPath = path.join(config.dataDir, '.credential-key');
let masterKey;
try { masterKey = fs.readFileSync(keyPath); }
catch {
  masterKey = crypto.randomBytes(32);
  try { fs.writeFileSync(keyPath, masterKey, { flag:'wx', mode:0o600 }); }
  catch { masterKey = fs.readFileSync(keyPath); }
}
if (masterKey.length !== 32) throw new Error('Credential encryption key invalid');

const providers = {
 anthropic: { label:'Anthropic Claude', endpoint:'https://api.anthropic.com', models:['claude-sonnet-4-5','claude-haiku-4-5-20251001'] },
 openai: { label:'OpenAI', endpoint:'https://api.openai.com/v1', models:['gpt-4.1','gpt-4.1-mini','gpt-4o'] },
 openrouter: { label:'OpenRouter', endpoint:'https://openrouter.ai/api/v1', models:['anthropic/claude-sonnet-4','openai/gpt-4.1'] },
 google: { label:'Google Gemini', endpoint:'https://generativelanguage.googleapis.com/v1beta/openai', models:['gemini-2.5-flash','gemini-2.5-pro'] },
 groq: { label:'Groq', endpoint:'https://api.groq.com/openai/v1', models:['llama-3.3-70b-versatile'] },
 deepseek: { label:'DeepSeek', endpoint:'https://api.deepseek.com/v1', models:['deepseek-chat','deepseek-reasoner'] }
};
function seal(value) {
 const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',masterKey,iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),cipher:encrypted.toString('base64')};
}
function unseal(row) {
 const decipher=crypto.createDecipheriv('aes-256-gcm',masterKey,Buffer.from(row.key_iv,'base64'));
 decipher.setAuthTag(Buffer.from(row.key_tag,'base64'));
 return Buffer.concat([decipher.update(Buffer.from(row.key_cipher,'base64')),decipher.final()]).toString('utf8');
}
export function listProviders() { return Object.entries(providers).map(([id,p])=>({id,label:p.label,endpoint:p.endpoint,models:p.models,officialUrl:({anthropic:'https://console.anthropic.com/settings/keys',openai:'https://platform.openai.com/api-keys',openrouter:'https://openrouter.ai/keys',google:'https://aistudio.google.com/apikey',groq:'https://console.groq.com/keys',deepseek:'https://platform.deepseek.com/api_keys'})[id]})); }
export function getCredential(userId) {
 const row=db.prepare('SELECT * FROM ai_credentials WHERE user_id=?').get(userId);
 if(!row) {
  if(!config.anthropicApiKey) return null;
  return {provider:'anthropic',model:config.claudeModel,endpoint:config.anthropicBaseUrl,key:config.anthropicApiKey,source:'server'};
 }
 return {provider:row.provider,model:row.model,endpoint:row.endpoint,key:unseal(row),source:'user'};
}
export function credentialStatus(userId) {
 const row=db.prepare('SELECT provider,model,endpoint,updated_at FROM ai_credentials WHERE user_id=?').get(userId);
 if(row) return {configured:true,provider:row.provider,model:row.model,endpoint:row.endpoint,updatedAt:row.updated_at,source:'account'};
 return config.anthropicApiKey ? {configured:true,provider:'anthropic',model:config.claudeModel,endpoint:config.anthropicBaseUrl,source:'server'} : {configured:false,provider:null,model:null,source:null};
}
export async function saveCredential(userId,{provider,model,endpoint,key}) {
 if(!providers[provider]) throw Object.assign(new Error('AI provayder tanlanmadi.'),{status:400});
 key=String(key||'').trim(); model=String(model||'').trim();
 if(key.length<12||key.length>500) throw Object.assign(new Error('API kalit uzunligi noto‘g‘ri.'),{status:400});
 if(!model||model.length>160||/[\r\n]/.test(model)) throw Object.assign(new Error('Model nomini tekshiring.'),{status:400});
 const defaultEndpoint=providers[provider].endpoint;
 let parsed;
 try { parsed=new URL(String(endpoint||defaultEndpoint)); } catch { throw Object.assign(new Error('API endpoint URL noto‘g‘ri.'),{status:400}); }
 if(parsed.protocol!=='https:' || parsed.username || parsed.password) throw Object.assign(new Error('API endpoint HTTPS bo‘lishi kerak.'),{status:400});
 const safeEndpoint=parsed.origin+parsed.pathname.replace(/\/$/,'');
 if(!safeEndpoint.startsWith(defaultEndpoint) && !['openrouter','openai','anthropic','google','groq','deepseek'].includes(provider)) throw Object.assign(new Error('Endpoint ushbu provayder uchun ruxsat etilmagan.'),{status:400});
 const candidate={provider,model,endpoint:safeEndpoint,key};
 await testCredential(candidate);
 const encrypted=seal(key);
 db.prepare(`INSERT INTO ai_credentials(user_id,provider,model,endpoint,key_iv,key_tag,key_cipher,updated_at)
 VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,model=excluded.model,endpoint=excluded.endpoint,key_iv=excluded.key_iv,key_tag=excluded.key_tag,key_cipher=excluded.key_cipher,updated_at=excluded.updated_at`)
 .run(userId,provider,model,safeEndpoint,encrypted.iv,encrypted.tag,encrypted.cipher,Date.now());
 return credentialStatus(userId);
}
export async function testCredential(c) {
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
 try {
  let response;
  if(c.provider==='anthropic') {
   response=await fetch(c.endpoint.replace(/\/$/,'')+'/v1/messages',{method:'POST',signal:controller.signal,headers:{'x-api-key':c.key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:c.model,max_tokens:8,messages:[{role:'user',content:'Reply with OK'}]})});
  } else {
   response=await fetch(c.endpoint.replace(/\/$/,'')+'/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+c.key,'content-type':'application/json'},body:JSON.stringify({model:c.model,max_tokens:8,messages:[{role:'user',content:'Reply with OK'}]})});
  }
  if(!response.ok) {
   let data={};try{data=await response.json();}catch{}
   const msg=String(data?.error?.message||data?.message||'API kalitini tekshirib bo‘lmadi').slice(0,240);
   const code=response.status===401?'API kalit noto‘g‘ri yoki ruxsati yo‘q.':response.status===402?'Provayder hisobida kredit/billing muammosi.':response.status===429?'Provayder limiti yoki tezlik cheklovi tugagan.':msg;
   throw Object.assign(new Error(code),{status:response.status});
  }
  return true;
 } catch(error) {
  if(error.status) throw error;
  throw Object.assign(new Error(error.name==='AbortError'?'Provayder javobi 15 soniyada kelmadi.':'Provayderga ulanib bo‘lmadi. Internet/endpointni tekshiring.'),{status:502});
 } finally {clearTimeout(timer);}
}
