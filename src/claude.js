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
    const resetHeaders = [
      response.headers.get('anthropic-ratelimit-requests-reset'),
      response.headers.get('anthropic-ratelimit-tokens-reset')
    ].filter(Boolean);
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
