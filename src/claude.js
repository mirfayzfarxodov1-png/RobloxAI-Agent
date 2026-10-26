import { config } from './config.js';

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  if (signal) {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  }
});
export async function createMessage({ messages, tools, system, signal, maxTokens = config.maxTokens }) {
  if (!config.anthropicApiKey) throw new Error('AI provider sozlanmagan');
  const url = config.anthropicBaseUrl + '/v1/messages';
  const body = { model: config.claudeModel, max_tokens: maxTokens, system, tools, messages };
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    let response;
    try {
      response = await fetch(url, { method:'POST', signal, headers:{
        'x-api-key': config.anthropicApiKey,
        'anthropic-version':'2023-06-01',
        'content-type':'application/json'
      }, body: JSON.stringify(body) });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (attempt < 2) { await sleep(attempt === 0 ? 1000 : 3000, signal); continue; }
      throw new Error('Anthropic API bilan ulanish amalga oshmadi');
    }
    if (response.ok) {
      const data = await response.json();
      if (!Array.isArray(data.content) || typeof data.stop_reason !== 'string') throw new Error('Anthropic javobi formati noto‘g‘ri');
      return data;
    }
    lastStatus = response.status;
    if ([429, 529].includes(response.status) || response.status >= 500) {
      if (attempt < 2) { await sleep(attempt === 0 ? 1000 : 3000, signal); continue; }
    }
    // Provider response body may contain internal details; never expose it to the browser.
    throw Object.assign(new Error('Anthropic API request failed'), { status: response.status });
  }
  throw Object.assign(new Error('Anthropic API temporarily unavailable'), { status: lastStatus });
}
