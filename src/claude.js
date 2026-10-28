import { config } from './config.js';

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once:true });
  });
}
function toOpenAIMessages(messages, system) {
 const out=[{role:'system',content:system}];
 for(const m of messages){
  if(m.role==='assistant'){
   const text=(m.content||[]).filter(b=>b?.type==='text').map(b=>b.text).join('\n');
   const calls=(m.content||[]).filter(b=>b?.type==='tool_use').map(b=>({id:b.id,type:'function',function:{name:b.name,arguments:JSON.stringify(b.input||{})}}));
   if(text||calls.length) out.push({role:'assistant',...(text?{content:text}:{}),...(calls.length?{tool_calls:calls}:{})});
  } else {
   const text=(m.content||[]).filter(b=>b?.type==='text').map(b=>b.text).join('\n');
   for(const b of (m.content||[]).filter(b=>b?.type==='tool_result')) out.push({role:'tool',tool_call_id:b.tool_use_id,content:String(b.content||'')});
   if(text) out.push({role:'user',content:text});
  }
 }
 return out;
}
function normalizeOpenAI(data) {
 const choice=data?.choices?.[0], msg=choice?.message;
 if(!msg) throw new Error('OpenAI-compatible API javobi formati noto‘g‘ri');
 const content=[];
 if(typeof msg.content==='string'&&msg.content) content.push({type:'text',text:msg.content});
 for(const call of msg.tool_calls||[]){
  let input={};try{input=JSON.parse(call.function?.arguments||'{}');}catch{throw new Error('AI tool argument JSON formati noto‘g‘ri');}
  content.push({type:'tool_use',id:call.id,name:call.function?.name,input});
 }
 return {content,stop_reason:(msg.tool_calls||[]).length?'tool_use':'end_turn',usage:{input_tokens:data.usage?.prompt_tokens||0,output_tokens:data.usage?.completion_tokens||0}};
}
export async function createMessage({ messages, tools, system, signal, maxTokens = config.maxTokens, credential }) {
  const active=credential||(!config.anthropicApiKey?null:{provider:'anthropic',model:config.claudeModel,endpoint:config.anthropicBaseUrl,key:config.anthropicApiKey});
  if (!active?.key) throw Object.assign(new Error('AI provider sozlanmagan. Sozlamalarda API kalit kiriting.'),{status:503});
  const isAnthropic=active.provider==='anthropic';
  const url = isAnthropic ? active.endpoint.replace(/\/$/,'') + '/v1/messages' : active.endpoint.replace(/\/$/,'') + '/chat/completions';
  const openAITools=(tools||[]).map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.input_schema||{type:'object',properties:{}}}}));
  const body = isAnthropic ? { model:active.model, max_tokens:maxTokens, system, tools, messages } : {model:active.model,max_tokens:Math.min(maxTokens,16000),messages:toOpenAIMessages(messages,system),tools:openAITools,tool_choice:'auto'};
  let lastStatus = 0;
  for (let attempt=0;attempt<3;attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted','AbortError');
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), config.apiTimeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
    let response;
    try {
      response = await fetch(url,{method:'POST',signal:combinedSignal,headers:{
        ...(isAnthropic?{'x-api-key':active.key,'anthropic-version':'2023-06-01'}:{'authorization':'Bearer '+active.key}),
        'content-type':'application/json'
      },body:JSON.stringify(body)});
    } catch (error) {
      clearTimeout(timer);
      if (signal?.aborted || error?.name==='AbortError' && !timeoutController.signal.aborted) throw new DOMException('Aborted','AbortError');
      if (attempt<2) { await sleep(attempt===0?1000:3000,signal); continue; }
      throw new Error(timeoutController.signal.aborted?'AI provider so‘rovi vaqtida javob bermadi':'Anthropic API bilan ulanish amalga oshmadi');
    }
    clearTimeout(timer);
    if (response.ok) {
      let data;
      try { data = await response.json(); } catch { throw new Error('Anthropic API javobi JSON emas'); }
      if (!isAnthropic) return normalizeOpenAI(data);
      if (!Array.isArray(data.content) || typeof data.stop_reason!=='string') throw new Error('Anthropic javobi formati noto‘g‘ri');
      return data;
    }
    lastStatus=response.status;
    let errorBody = {};
    try { errorBody = await response.json(); } catch {}
    const providerError = errorBody?.error || {};
    const providerType = String(providerError.type || providerError.code || '');
    const providerMessage = String(providerError.message || 'Anthropic API request failed');
    const retryHeader = response.headers.get('retry-after');
    const retryMsFromHeader = retryHeader
      ? (/^\d+(?:\.\d+)?$/.test(retryHeader.trim())
        ? Math.max(0, Number(retryHeader) * 1000)
        : (Number.isFinite(Date.parse(retryHeader)) ? Math.max(0, Date.parse(retryHeader) - Date.now()) : null))
      : null;
    const resetHeaders = isAnthropic ? [response.headers.get('anthropic-ratelimit-requests-reset'),response.headers.get('anthropic-ratelimit-tokens-reset')].filter(Boolean) : [];
    const resetTimes = resetHeaders.map(value => Date.parse(value)).filter(Number.isFinite);
    const resetAt = resetTimes.length ? Math.min(...resetTimes) : null;
    const isLimit = response.status === 429 || /rate_limit|credit_balance_too_low|usage_limit|overloaded_error/i.test(providerType + ' ' + providerMessage);
    if ([429,529].includes(response.status)||response.status>=500) {
      if (attempt<2) { await sleep(attempt===0?1000:3000,signal); continue; }
    }
    throw Object.assign(new Error(providerMessage), {
      status: response.status,
      providerType,
      isLimit,
      retryAfterMs: retryMsFromHeader ?? (resetAt !== null ? Math.max(0, resetAt - Date.now()) : null),
      providerMessage
    });
  }
  throw Object.assign(new Error('Anthropic API temporarily unavailable'),{status:lastStatus});
}
