import http from 'node:http';

function validateHistory(messages) {
  if (!Array.isArray(messages) || !messages.length) return 'messages bo‘sh';
  if (messages[0].role !== 'user') return 'birinchi xabar user bo‘lishi kerak';
  for (let i=1;i<messages.length;i++) if (messages[i].role === messages[i-1].role) return 'rollar navbatma-navbat kelishi kerak';
  for (let i=0;i<messages.length;i++) {
    const m=messages[i];
    if (m.role!=='assistant'||!Array.isArray(m.content)) continue;
    const uses=m.content.filter(b=>b.type==='tool_use');
    if (!uses.length) continue;
    const next=messages[i+1];
    const ids=new Set((next&&next.role==='user'&&Array.isArray(next.content)?next.content:[]).filter(b=>b.type==='tool_result').map(b=>b.tool_use_id));
    for(const use of uses) if(!ids.has(use.id)) return 'tool_use uchun tool_result yo‘q: '+use.id;
  }
  return null;
}
export async function startFakeClaude() {
  const queue=[],requests=[];
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='POST'||req.url!=='/v1/messages'){res.writeHead(404);res.end();return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    let body;
    try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{res.writeHead(400);res.end('bad json');return;}
    requests.push(body);
    const invalid=validateHistory(body.messages);
    if(invalid){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:invalid}}));return;}
    const scenario=queue.shift();
    if(!scenario){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'fake response queue empty'}}));return;}
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({id:'msg_fake_'+requests.length,type:'message',role:'assistant',model:body.model||'fake',content:scenario.content,stop_reason:scenario.stop_reason||'end_turn',stop_sequence:null,usage:{input_tokens:20,output_tokens:12}}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  return {
    url:'http://127.0.0.1:'+address.port,
    requests,
    enqueue(response){queue.push(response);},
    close(){return new Promise(resolve=>server.close(resolve));}
  };
}
export const toolUse=(name,input,id='tool_'+Math.random().toString(36).slice(2,10))=>({content:[{type:'tool_use',id,name,input}],stop_reason:'tool_use'});
export const textResponse=(text)=>({content:[{type:'text',text}],stop_reason:'end_turn'});
