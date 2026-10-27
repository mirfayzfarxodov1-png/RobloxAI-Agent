const OFFICIAL_HOSTS = [
  'roblox.com',
  'create.roblox.com',
  'devforum.roblox.com',
  'corp.roblox.com',
  'about.roblox.com',
  'blog.roblox.com',
];

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16))));
}
function plainText(html = '') {
  return decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function unwrapSearchUrl(raw) {
  try {
    let url = new URL(decodeHtml(raw), 'https://html.duckduckgo.com');
    if (url.hostname.endsWith('duckduckgo.com') && url.searchParams.has('uddg')) url = new URL(url.searchParams.get('uddg'));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname.endsWith('duckduckgo.com')) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}
function isOfficialUrl(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return OFFICIAL_HOSTS.some(domain => host === domain || host.endsWith('.' + domain));
  } catch { return false; }
}
export function parseSearchResults(html, query, maxResults = 6) {
  const links = [];
  for (const match of String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1];
    const cls = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
    if (!cls.split(/\s+/).includes('result__a')) continue;
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const url = href && unwrapSearchUrl(href);
    const title = plainText(match[2]);
    if (!url || !title) continue;
    links.push({ title, url, domain: new URL(url).hostname.replace(/^www\./, ''), official: isOfficialUrl(url), query });
  }
  const snippets = [...String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter(match => ((match[1].match(/\bclass=["']([^"']*)["']/i)?.[1] || '').split(/\s+/)).includes('result__snippet'))
    .map(match => plainText(match[2]));
  const seen = new Set();
  return links.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, maxResults).map((item, i) => ({ ...item, snippet: (snippets[i] || '').slice(0, 700) }));
}
export async function searchWeb({ queries, officialOnly = false, maxResults = 6, fetchImpl = fetch, signal } = {}) {
  const cleanQueries = (Array.isArray(queries) ? queries : [queries])
    .map(q => String(q || '').trim().slice(0, 220)).filter(Boolean).slice(0, 4);
  if (!cleanQueries.length) throw new Error('Kamida bitta qidiruv so‘rovi kerak.');
  const limit = Math.max(1, Math.min(8, Number.isInteger(maxResults) ? maxResults : 6));
  const results = [];
  const failures = [];
  for (const query of cleanQueries) {
    try {
      const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
      const response = await fetchImpl(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; QuruvchiResearch/1.0)', accept: 'text/html' },
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(9000)]) : AbortSignal.timeout(9000),
      });
      if (!response.ok) throw new Error('Qidiruv HTTP ' + response.status);
      const html = (await response.text()).slice(0, 2_000_000);
      const parsed = parseSearchResults(html, query, officialOnly ? 30 : limit);
      results.push(...(officialOnly ? parsed.filter(item => item.official) : parsed));
    } catch (error) {
      failures.push(query + ': ' + String(error?.message || error).slice(0, 160));
    }
  }
  const unique = new Map();
  for (const result of results) if (!unique.has(result.url)) unique.set(result.url, result);
  const sorted = [...unique.values()].sort((a, b) => Number(b.official) - Number(a.official));
  if (!sorted.length) {
    return {
      searchedAt: new Date().toISOString(), queries: cleanQueries, results: [],
      warning: officialOnly ? 'Ushbu qidiruvda tasdiqlangan rasmiy domenlardan natija topilmadi. Qidiruvni kengaytirish yoki boshqa so‘rov berish kerak.' : 'Qidiruv natijalari olinmadi. Internet ulanishi yoki qidiruv xizmati vaqtincha ishlamayotgan bo‘lishi mumkin.',
      failures,
    };
  }
  return { searchedAt: new Date().toISOString(), queries: cleanQueries, results: sorted.slice(0, limit), warning: failures.length ? 'Ayrim qidiruvlar bajarilmadi: ' + failures.join(' | ') : undefined };
}
