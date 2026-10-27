import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const MAX_BODY = 256 * 1024;
const INVITE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TTL_MS = 2 * 60 * 1000;
const DAILY_REQUEST_LIMIT = Number(process.env.SHARE_DAILY_REQUEST_LIMIT || 100);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT noto‘g‘ri');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'quruvchi-relay.sqlite'));
db.exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS owners(id INTEGER PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invites(code_hash TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, used_at INTEGER);
CREATE TABLE IF NOT EXISTS partners(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE, token_hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','active','revoked')), created_at INTEGER NOT NULL, approved_at INTEGER, revoked_at INTEGER);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE, partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE, payload TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','processing','done','failed','expired')), result TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usage(partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE, day TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(partner_id,day));
CREATE INDEX IF NOT EXISTS idx_jobs_owner_status ON jobs(owner_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_partners_owner ON partners(owner_id,status);
`);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const json = (res, status, body) => { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' }); res.end(JSON.stringify(body)); };
async function body(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > MAX_BODY) throw Object.assign(new Error('So‘rov juda katta'), { status:413 }); }
  try { return data ? JSON.parse(data) : {}; } catch { throw Object.assign(new Error('JSON noto‘g‘ri'), { status:400 }); }
}
function bearer(req) { return String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{32,})$/)?.[1] || ''; }
function ownerFor(req) { const t=bearer(req); return t ? db.prepare('SELECT id FROM owners WHERE token_hash=?').get(hash(t)) : null; }
function partnerFor(req) { const t=bearer(req); return t ? db.prepare("SELECT id,owner_id,status FROM partners WHERE token_hash=?").get(hash(t)) : null; }
function route(path, method, req, res) { return method+' '+path; }
const server = http.createServer(async (req,res) => {
  res.setHeader('access-control-allow-origin', process.env.ALLOWED_ORIGIN || 'null');
  res.setHeader('access-control-allow-headers','authorization,content-type');
  res.setHeader('access-control-allow-methods','GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const u = new URL(req.url || '/', 'http://relay.local');
  try {
    if (req.method==='GET' && u.pathname==='/healthz') return json(res,200,{ok:true,service:'quruvchi-share-relay'});
    if (req.method==='POST' && u.pathname==='/v1/owners/register') {
      const raw=token(); const result=db.prepare('INSERT INTO owners(token_hash,created_at) VALUES(?,?)').run(hash(raw),Date.now());
      return json(res,201,{ownerToken:raw,ownerId:Number(result.lastInsertRowid),warning:'Tokenni maxfiy saqlang. U yo‘qolsa qayta ro‘yxatdan o‘ting.'});
    }
    if (req.method==='POST' && u.pathname==='/v1/invites') {
      const owner=ownerFor(req); if(!owner)return json(res,401,{error:'Owner token kerak'});
      const code=crypto.randomInt(0,100000000).toString().padStart(8,'0');
      db.prepare('DELETE FROM invites WHERE owner_id=?').run(owner.id);
      db.prepare('INSERT INTO invites(code_hash,owner_id,expires_at,used_at) VALUES(?,?,?,NULL)').run(hash(code),owner.id,Date.now()+INVITE_TTL_MS);
      return json(res,201,{code,expiresAt:Date.now()+INVITE_TTL_MS,approvalRequired:true});
    }
    if (req.method==='POST' && u.pathname==='/v1/pair') {
      const input=await body(req); const code=String(input.code||'').replace(/\s/g,'');
      if(!/^\d{8}$/.test(code))return json(res,400,{error:'8 xonali kod kerak'});
      const inv=db.prepare('SELECT owner_id,expires_at,used_at FROM invites WHERE code_hash=?').get(hash(code));
      if(!inv||inv.expires_at<Date.now()||inv.used_at!==null)return json(res,400,{error:'Kod noto‘g‘ri yoki muddati tugagan'});
      const raw=token(), label=String(input.label||'Sherik').trim().slice(0,60)||'Sherik';
      db.exec('BEGIN IMMEDIATE');
      try {
        const fresh=db.prepare('SELECT owner_id,expires_at,used_at FROM invites WHERE code_hash=?').get(hash(code));
        if(!fresh||fresh.expires_at<Date.now()||fresh.used_at!==null)throw new Error('Kod allaqachon ishlatilgan');
        db.prepare('UPDATE invites SET used_at=? WHERE code_hash=?').run(Date.now(),hash(code));
        db.prepare('INSERT INTO partners(owner_id,token_hash,label,status,created_at) VALUES(?,?,?,\'pending\',?)').run(inv.owner_id,hash(raw),label,Date.now());
        db.exec('COMMIT');
      } catch(e){db.exec('ROLLBACK');return json(res,409,{error:e.message||'Ulash amalga oshmadi'});}
      return json(res,201,{partnerToken:raw,status:'pending',message:'API egasi ruxsat bergandan keyin ishlaydi.'});
    }
    if (req.method==='GET' && u.pathname==='/v1/partners') {
      const owner=ownerFor(req); if(!owner)return json(res,401,{error:'Owner token kerak'});
      return json(res,200,{partners:db.prepare('SELECT id,label,status,created_at,approved_at,revoked_at FROM partners WHERE owner_id=? ORDER BY id DESC').all(owner.id)});
    }
    const partnerAction=u.pathname.match(/^\/v1\/partners\/(\d+)\/(approve|revoke)$/);
    if(req.method==='POST'&&partnerAction){
      const owner=ownerFor(req);if(!owner)return json(res,401,{error:'Owner token kerak'});
      const id=Number(partnerAction[1]),action=partnerAction[2];
      const row=db.prepare('SELECT id FROM partners WHERE id=? AND owner_id=?').get(id,owner.id);
      if(!row)return json(res,404,{error:'Sherik topilmadi'});
      if(action==='approve')db.prepare("UPDATE partners SET status='active',approved_at=? WHERE id=? AND status='pending'").run(Date.now(),id);
      else {db.prepare("UPDATE partners SET status='revoked',revoked_at=? WHERE id=?").run(Date.now(),id);db.prepare("UPDATE jobs SET status='failed',result=? WHERE partner_id=? AND status IN ('queued','processing')").run(JSON.stringify({error:'Ruxsat bekor qilindi'}),id);}
      return json(res,200,{ok:true,status:action==='approve'?'active':'revoked'});
    }
    if(req.method==='POST'&&u.pathname==='/v1/requests'){
      const p=partnerFor(req);if(!p)return json(res,401,{error:'Sherik tokeni noto‘g‘ri'});
      if(p.status!=='active')return json(res,403,{error:p.status==='pending'?'API egasi hali ruxsat bermadi':'Ulash bekor qilingan'});
      const input=await body(req);
      if(!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))return json(res,400,{error:'payload object bo‘lishi kerak'});
      const serialized=JSON.stringify(input.payload);
      if(serialized.length>180000)return json(res,413,{error:'AI so‘rovi juda katta'});
      const day=new Date().toISOString().slice(0,10);
      const used=db.prepare('SELECT requests FROM usage WHERE partner_id=? AND day=?').get(p.id,day)?.requests||0;
      if(used>=DAILY_REQUEST_LIMIT)return json(res,429,{error:'Sheriklik kunlik limiti tugadi'});
      db.prepare('INSERT INTO usage(partner_id,day,requests) VALUES(?,?,1) ON CONFLICT(partner_id,day) DO UPDATE SET requests=requests+1').run(p.id,day);
      const id=crypto.randomUUID(),now=Date.now();
      db.prepare("INSERT INTO jobs(id,owner_id,partner_id,payload,status,created_at,updated_at) VALUES(?,?,?,?, 'queued',?,?)").run(id,p.owner_id,p.id,serialized,now,now);
      return json(res,202,{jobId:id,pollAfterMs:1200});
    }
    if(req.method==='GET'&&u.pathname==='/v1/owner/jobs'){
      const owner=ownerFor(req);if(!owner)return json(res,401,{error:'Owner token kerak'});
      const now=Date.now();
      db.prepare("UPDATE jobs SET status='expired',updated_at=? WHERE owner_id=? AND status IN ('queued','processing') AND created_at<?").run(now,owner.id,now-REQUEST_TTL_MS);
      const jobs=db.prepare("SELECT id,partner_id,payload,created_at FROM jobs WHERE owner_id=? AND status='queued' ORDER BY created_at LIMIT 5").all(owner.id);
      for(const job of jobs)db.prepare("UPDATE jobs SET status='processing',updated_at=? WHERE id=? AND status='queued'").run(now,job.id);
      return json(res,200,{jobs:jobs.map(j=>({id:j.id,partnerId:j.partner_id,payload:JSON.parse(j.payload),createdAt:j.created_at}))});
    }
    const resultMatch=u.pathname.match(/^\/v1\/owner\/jobs\/([0-9a-f-]+)\/result$/);
    if(req.method==='POST'&&resultMatch){
      const owner=ownerFor(req);if(!owner)return json(res,401,{error:'Owner token kerak'});
      const id=resultMatch[1],input=await body(req);
      const job=db.prepare("SELECT id FROM jobs WHERE id=? AND owner_id=? AND status='processing'").get(id,owner.id);
      if(!job)return json(res,404,{error:'Ish topilmadi yoki muddati tugagan'});
      const result=JSON.stringify(input.result??{error:'Owner natija qaytarmadi'});
      if(result.length>180000)return json(res,413,{error:'Natija juda katta'});
      db.prepare("UPDATE jobs SET status=?,result=?,updated_at=? WHERE id=?").run(input.ok===false?'failed':'done',result,Date.now(),id);
      return json(res,200,{ok:true});
    }
    const poll=u.pathname.match(/^\/v1\/requests\/([0-9a-f-]+)$/);
    if(req.method==='GET'&&poll){
      const p=partnerFor(req);if(!p)return json(res,401,{error:'Sherik tokeni noto‘g‘ri'});
      const job=db.prepare('SELECT status,result,created_at FROM jobs WHERE id=? AND partner_id=?').get(poll[1],p.id);
      if(!job)return json(res,404,{error:'So‘rov topilmadi'});
      if(job.status==='done'||job.status==='failed'||job.status==='expired')return json(res,200,{status:job.status,result:job.result?JSON.parse(job.result):null});
      return json(res,200,{status:job.status});
    }
    return json(res,404,{error:'Topilmadi'});
  } catch(e){return json(res,e.status||500,{error:e.status?e.message:'Relay ichki xatosi'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log('[Quruvchi relay] port '+PORT));
function shutdown(){server.close(()=>{db.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
