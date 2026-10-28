import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFakeClaude, toolUse, textResponse } from './fake-claude.js';
import { pairPlugin, pollPlugin, sendPluginResult } from './fake-plugin.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function freePort() {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function waitForServer(url, child, output) {
  for(let i=0;i<100;i++){
    if(child.exitCode!==null) throw new Error('Quruvchi server exited early with code '+child.exitCode+'; output: '+output());
    try{const r=await fetch(url+'/healthz');if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Quruvchi server did not start; output: '+output());
}
async function waitUntil(fn, timeout=7000) {
  const start=Date.now();
  while(Date.now()-start<timeout){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}
  throw new Error('Condition timed out');
}
async function post(base,path,body,{cookie,origin=base,contentType=true}={}) {
  const headers={};if(contentType)headers['Content-Type']='application/json';if(origin!==null)headers.Origin=origin;if(cookie)headers.Cookie=cookie;
  return fetch(base+path,{method:'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
}

test('Quruvchi auth, CSRF, pairing, tool loop, cancellation history, and device removal', async t => {
  const fake=await startFakeClaude();
  const port=await freePort(),base='http://127.0.0.1:'+port;
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'quruvchi-test-'));
  const child=spawn(process.execPath,['--experimental-sqlite',path.join(projectRoot,'src','server.js')],{
    cwd:dataDir,
    env:{...process.env,NODE_ENV:'test',PORT:String(port),PUBLIC_URL:base,DATA_DIR:dataDir,ANTHROPIC_API_KEY:'fake-key',ANTHROPIC_BASE_URL:fake.url,CLAUDE_MODEL:'fake-model',COOKIE_SECURE:'false',INVITE_CODE:'test123',COMMAND_TIMEOUT_MS:'5000',MAX_STEPS:'3',DAILY_STEP_LIMIT:'20',TRUST_PROXY:'false'},
    stdio:['ignore','pipe','pipe']
  });
  let childOutput='';
  child.stdout.on('data',chunk=>childOutput+=chunk.toString());
  child.stderr.on('data',chunk=>childOutput+=chunk.toString());
  t.after(async()=>{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},1500);});await fake.close();await rm(dataDir,{recursive:true,force:true});});
  await waitForServer(base,child,()=>childOutput);

  const missingOrigin=await post(base,'/api/register',{login:'tester_one',password:'correct-horse',invite:'test123'},{origin:null});
  assert.equal(missingOrigin.status,403,'Originless browser POST should fail CSRF check');
  const wrongInvite=await post(base,'/api/register',{login:'tester_one',password:'correct-horse',invite:'bad-code'});
  assert.equal(wrongInvite.status,403,'bad invite code should be rejected');
  const registered=await post(base,'/api/register',{login:'tester_one',password:'correct-horse',invite:'test123'});
  assert.equal(registered.status,201);
  const cookie=registered.headers.get('set-cookie').split(';')[0];
  assert.ok(cookie.startsWith('qs='));

  const referralResponse=await fetch(base+'/api/referral',{headers:{Cookie:cookie}});
  assert.equal(referralResponse.status,200);
  const referral=await referralResponse.json();
  assert.match(referral.referralCode,/^[a-f0-9]{16}$/);
  assert.equal(referral.referralUrl,base+'/?ref='+referral.referralCode);
  assert.equal(referral.localOnly,true);
  const invited=await post(base,'/api/register',{login:'tester_two',password:'correct-horse',invite:referral.referralCode});
  assert.equal(invited.status,201,'a personal referral code should allow registration even when INVITE_CODE is configured');
  const invitedCookie=invited.headers.get('set-cookie').split(';')[0];
  const secondReferral=await (await fetch(base+'/api/referral',{headers:{Cookie:invitedCookie}})).json();
  assert.equal(secondReferral.referrals,0);
  const updatedReferral=await (await fetch(base+'/api/referral',{headers:{Cookie:cookie}})).json();
  assert.equal(updatedReferral.referrals,1,'the referrer should see one successful signup');

  const duplicate=await post(base,'/api/register',{login:'tester_one',password:'correct-horse',invite:'test123'});
  assert.equal(duplicate.status,409);
  const wrongLogin=await post(base,'/api/login',{login:'tester_one',password:'wrong-password'});
  assert.equal(wrongLogin.status,401);

  const health=await fetch(base+'/healthz');
  assert.equal(health.status,200);
  assert.match(health.headers.get('content-security-policy')||'',/default-src 'self'/);
  assert.equal(health.headers.get('x-content-type-options'),'nosniff');
  const home=await fetch(base+'/');
  assert.equal(home.status,200);
  assert.match(await home.text(),/Quruvchi/);
  const pluginDownload=await fetch(base+'/plugin.lua');
  assert.equal(pluginDownload.status,200);
  const downloadedPlugin=await pluginDownload.text();
  assert.ok(!downloadedPlugin.includes('__SERVER_URL__'));
  assert.ok(downloadedPlugin.includes('local SERVER = \"'+base+'\"'),'plugin download must contain the configured server URL');

  const noStudio=await post(base,'/api/chat',{text:'Workspace ichida papka yarat'},{cookie});
  assert.equal(noStudio.status,412);
  assert.equal((await noStudio.json()).needPairing,true);

  const codeResponse=await post(base,'/api/pair',{}, {cookie});
  assert.equal(codeResponse.status,200);
  const {code}=await codeResponse.json();
  const invalidPair=await pairPlugin(base,'ZZZZZZZZ');
  assert.equal(invalidPair.response.status,400);
  const paired=await pairPlugin(base,code,'Test Place');
  assert.equal(paired.response.status,200);
  const token=paired.data.token,deviceId=paired.data.deviceId;
  assert.ok(token && deviceId);
  const reused=await pairPlugin(base,code,'Second Place');
  assert.equal(reused.response.status,400);
  const devicesResponse=await fetch(base+'/api/devices',{headers:{Cookie:cookie}});
  assert.equal(devicesResponse.status,200);
  assert.equal((await devicesResponse.json()).length,1);

  fake.enqueue(toolUse('create_tree',{parent:'Workspace',tree:{className:'Folder',name:'Quruvchi_Test',children:[]}},'tool_create_1'));
  fake.enqueue(textResponse('Papka yaratish buyrug‘i bajarildi. Endi Studio’da Play bosib tekshir.'));
  const started=await post(base,'/api/chat',{text:'Workspace ichida Quruvchi_Test papkasini yarat'},{cookie});
  assert.equal(started.status,202);
  const command=await waitUntil(async()=>{
    const result=await pollPlugin(base,token,1);
    return result.response.ok&&result.data.type==='command'?result:null;
  },7000);
  assert.equal(command.data.name,'create_tree');
  assert.equal(command.data.input.tree.name,'Quruvchi_Test');
  const result=await sendPluginResult(base,token,{id:command.data.id,ok:true,output:{created:1,path:'Workspace/Quruvchi_Test',warnings:[]}});
  assert.equal(result.response.status,200);
  await waitUntil(async()=>{const r=await fetch(base+'/api/me',{headers:{Cookie:cookie}});const d=await r.json();return !d.running&&d.steps.used===1?d:null;},7000);
  assert.equal(fake.requests.length,2);
  assert.ok(fake.requests[1].messages.some(m=>m.role==='user'&&m.content.some(b=>b.type==='tool_result'&&b.tool_use_id==='tool_create_1')));
  const history=await (await fetch(base+'/api/chat/history',{headers:{Cookie:cookie}})).json();
  assert.ok(history.messages.some(m=>m.role==='assistant'&&m.text.includes('Play bosib tekshir')));

  // Stop while a tool is in flight; the following request must still have a valid Claude history.
  fake.enqueue(toolUse('get_tree',{path:'Workspace',depth:1},'tool_stop_1'));
  const second=await post(base,'/api/chat',{text:'Workspace tuzilmasini ko‘r'},{cookie});
  assert.equal(second.status,202);
  const pending=await waitUntil(async()=>{const r=await pollPlugin(base,token,1);return r.response.ok&&r.data.type==='command'?r:null;},7000);
  assert.equal(pending.data.name,'get_tree');
  const stopResponse=await post(base,'/api/stop',{}, {cookie});
  assert.equal(stopResponse.status,200);
  await waitUntil(async()=>{const r=await fetch(base+'/api/me',{headers:{Cookie:cookie}});return !(await r.json()).running;},7000);
  const late=await sendPluginResult(base,token,{id:pending.data.id,ok:true,output:'late result'});
  assert.equal(late.response.status,200);
  assert.equal(late.data.ignored,true);

  fake.enqueue(textResponse('Keyingi so‘rov ham muvaffaqiyatli ishladi.'));
  const third=await post(base,'/api/chat',{text:'Davom et va qisqa xulosa ber'},{cookie});
  assert.equal(third.status,202);
  await waitUntil(async()=>{const r=await fetch(base+'/api/me',{headers:{Cookie:cookie}});const d=await r.json();return !d.running&&d.steps.used===2?d:null;},7000);
  assert.ok(fake.requests.length>=4);
  assert.ok(fake.requests.at(-1).messages.some(m=>m.role==='user'&&m.content.some(b=>b.type==='tool_result'&&b.tool_use_id==='tool_stop_1')),'stopped tool_use must have a matching tool_result');
  assert.ok((await fetch(base+'/api/chat/history',{headers:{Cookie:cookie}})).ok);

  const removed=await fetch(base+'/api/devices/'+deviceId,{method:'DELETE',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'}});
  assert.equal(removed.status,200);
  const oldTokenPoll=await pollPlugin(base,token,0);
  assert.equal(oldTokenPoll.response.status,401);
  const me=await (await fetch(base+'/api/me',{headers:{Cookie:cookie}})).json();
  assert.equal(me.status.connected,false);
  const logout=await post(base,'/api/logout',{}, {cookie});
  assert.equal(logout.status,200);
  assert.equal((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status,401);
});
