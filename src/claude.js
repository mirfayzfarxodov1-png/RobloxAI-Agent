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
export async function createMessage({ messages, tools, system, signal, maxTokens = config.maxTokens }) {
  if (!config.anthropicApiKey) throw new Error('AI provider sozlanmagan');
  const url = config.anthropicBaseUrl + '/v1/messages';
  const body = { model:config.claudeModel, max_tokens:maxTokens, system, tools, messages };
  let lastStatus = 0;
  for (let attempt=0;attempt<3;attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted','AbortError');
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), config.apiTimeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
    let response;
    try {
      response = await fetch(url,{method:'POST',signal:combinedSignal,headers:{
        'x-api-key':config.anthropicApiKey,
        'anthropic-version':'2023-06-01',
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
      if (!Array.isArray(data.content) || typeof data.stop_reason!=='string') throw new Error('Anthropic javobi formati noto‘g‘ri');
      return data;
    }
    lastStatus=response.status;
    if ([429,529].includes(response.status)||response.status>=500) {
      if (attempt<2) { await sleep(attempt===0?1000:3000,signal); continue; }
    }
    throw Object.assign(new Error('Anthropic API request failed'),{status:response.status});
  }
  throw Object.assign(new Error('Anthropic API temporarily unavailable'),{status:lastStatus});
}
