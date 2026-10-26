import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Bot, Boxes, Check, ChevronDown, CircleHelp, Code2, Command, Copy,
  Cpu, Download, ExternalLink, Gamepad2, Github, Globe2, LoaderCircle,
  Menu, MessageSquare, Plus, Send, Settings2, ShieldCheck, Sparkles,
  Square, Unplug, X, Zap
} from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant' | 'tool' | 'error'; text: string; time?: string };
const suggestions = [
  { icon: '🌱', title: 'Pet simulator', text: 'Yashil zona, ochiladigan tuxum va orqamdan yuradigan pet tizimini yarat.' },
  { icon: '🏁', title: 'Obby o‘yini', text: '10 ta platforma, checkpoint, tanga va tanga hisoblagich UI bilan obby yarat.' },
  { icon: '🛒', title: 'Do‘kon tizimi', text: 'Server tekshiruvlari, inventar va chiroyli do‘kon interfeysini yarat.' },
];
const welcome: Message = { id: 'welcome', role: 'assistant', text: 'Salom! Men Quruvchi — Roblox Studio loyihangni bosqichma-bosqich yaratishga yordam beradigan AI agentman. Boshlash uchun o‘yin g‘oyangni yoz yoki quyidagi takliflardan birini tanla. Studio ulanishi va server sozlangach, o‘zgarishlarni loyihangga yuborish mumkin.' };

export default function App() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [steps, setSteps] = useState({ used: 0, limit: 300 });
  const [modal, setModal] = useState<'pair' | 'settings' | 'help' | null>(null);
  const [pairCode, setPairCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [backend, setBackend] = useState<'checking' | 'online' | 'offline'>('checking');
  const [authView, setAuthView] = useState<'login' | 'register' | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/healthz').then(r => { if (!alive) return; setBackend(r.ok ? 'online' : 'offline'); })
      .catch(() => { if (alive) setBackend('offline'); });
    fetch('/api/me', { credentials: 'same-origin' }).then(async r => {
      if (!alive) return;
      if (r.ok) {
        const data = await r.json();
        if (data.steps) setSteps(data.steps);
        if (data.status) { setConnected(!!data.status.connected); setPlaceName(data.status.placeName || ''); }
        connectStream();
        fetchHistory();
      } else if (r.status === 401) setAuthView('login');
    }).catch(() => { if (alive) setBackend('offline'); });
    return () => { alive = false; eventRef.current?.close(); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  async function fetchHistory() {
    try {
      const r = await fetch('/api/chat/history', { credentials: 'same-origin' });
      if (r.ok) { const data = await r.json(); if (Array.isArray(data.messages) && data.messages.length) setMessages(data.messages.map((m: any, i: number) => ({ id: String(m.id ?? i), role: m.role === 'user' ? 'user' : 'assistant', text: typeof m.text === 'string' ? m.text : typeof m.content === 'string' ? m.content : '' }))); }
    } catch { /* backend may be starting */ }
  }

  function connectStream() {
    eventRef.current?.close();
    const es = new EventSource('/api/stream');
    eventRef.current = es;
    es.addEventListener('status', e => {
      const d = JSON.parse((e as MessageEvent).data);
      setConnected(!!d.connected); setPlaceName(d.placeName || '');
    });
    es.addEventListener('state', e => {
      const d = JSON.parse((e as MessageEvent).data);
      if (d.steps) setSteps(d.steps);
      setBusy(!!d.running);
    });
    es.addEventListener('message', e => {
      const d = JSON.parse((e as MessageEvent).data);
      if (d.kind === 'user' || d.kind === 'assistant') setMessages(prev => [...prev.filter(m => m.id !== String(d.id)), { id: String(d.id ?? crypto.randomUUID()), role: d.kind, text: d.text || '' }]);
      else if (d.kind === 'tool') setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'tool', text: (d.name || 'tool') + (d.summary ? ' · ' + d.summary : '') }]);
      else if (d.kind === 'tool_result') setMessages(prev => [...prev, { id: crypto.randomUUID(), role: d.ok ? 'tool' : 'error', text: (d.ok ? '✓ ' : '✕ ') + (d.preview || 'Buyruq yakunlandi') }]);
      else if (d.kind === 'error') setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'error', text: d.text || 'Xatolik yuz berdi' }]);
      else if (d.kind === 'info') setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: d.text || '' }]);
    });
    es.addEventListener('reset', () => setMessages([]));
    es.onerror = () => { /* EventSource retries automatically */ };
  }

  async function api(path: string, body?: unknown, method = 'POST') {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || (r.status === 404 ? 'Backend endpoint topilmadi.' : 'So‘rov bajarilmadi.'));
    return data;
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setNotice('');
    try {
      await api(authView === 'register' ? '/api/register' : '/api/login', { login, password, ...(authView === 'register' && invite ? { invite } : {}) });
      setAuthView(null); connectStream(); fetchHistory();
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Kirish amalga oshmadi.'); }
  }

  async function sendMessage(text = prompt) {
    const value = text.trim();
    if (!value || busy) return;
    if (backend !== 'online') {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: value }, { id: crypto.randomUUID(), role: 'error', text: 'Sayt interfeysi tayyor, lekin AI serveri hali ishga tushirilmagan. Backendni deploy qilgach, chat ishlaydi.' }]);
      setPrompt('');
      return;
    }
    setPrompt('');
    try {
      await api('/api/chat', { text: value });
      setBusy(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xatolik';
      if (msg.includes('Studio ulanmagan')) setModal('pair');
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'error', text: msg }]);
    }
  }

  async function stopTask() {
    try { await api('/api/stop', {}); } catch (e) { setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'error', text: e instanceof Error ? e.message : 'To‘xtatib bo‘lmadi' }]); }
    setBusy(false);
  }

  async function newChat() {
    try {
      await api('/api/chat/new', {});
      setMessages([]);
    } catch { setMessages([welcome]); }
  }

  async function createPair() {
    try {
      const data = await api('/api/pair', {});
      setPairCode(data.code || '');
      setExpiresAt(data.expiresAt || Date.now() + 600000);
      setSecondsLeft(600);
      setModal('pair');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Ulash kodi olinmadi.'); }
  }

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  async function logout() {
    try { await api('/api/logout', {}); } catch { /* clear local UI regardless */ }
    eventRef.current?.close(); setAuthView('login'); setMessages([welcome]);
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Bot size={23}/></div><div className="brand-copy"><strong>Quruvchi</strong><span>ROBLOX AI STUDIO</span></div><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Menyuni yopish"><X size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/> Yangi chat <span>⌘ K</span></button>
      <div className="side-label">ISH MAYDONI</div>
      <button className="side-link active"><MessageSquare size={17}/> AI bilan qurish</button>
      <button className="side-link" onClick={() => setModal('pair')}><Gamepad2 size={17}/> Studio ulash <span className={connected ? 'tiny-status online' : 'tiny-status'} /></button>
      <button className="side-link" onClick={() => setModal('settings')}><Settings2 size={17}/> Sozlamalar</button>
      <div className="side-label recent-label">YORDAM</div>
      <button className="side-link" onClick={() => setModal('help')}><CircleHelp size={17}/> Qanday ishlaydi?</button>
      <div className="sidebar-spacer"/>
      <div className="usage-card"><div className="usage-title"><Zap size={15}/> Kunlik limit <span>{steps.used}/{steps.limit}</span></div><div className="usage-track"><i style={{ width: `${Math.min(100, steps.limit ? steps.used / steps.limit * 100 : 0)}%` }}/></div><p>AI qadamlar sarfi</p></div>
      <div className="profile-row"><div className="avatar">Q</div><div className="profile-info"><strong>Quruvchi foydalanuvchi</strong><span>{backend === 'online' ? 'Serverga tayyor' : 'Frontend ko‘rinishi'}</span></div><button className="icon-button" onClick={logout} title="Chiqish"><ChevronDown size={17}/></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileMenu(v => !v)} aria-label="Menyuni ochish"><Menu size={19}/></button><div className="breadcrumbs"><span>Ish maydoni</span><b>/</b><strong>AI bilan qurish</strong></div></div><div className="topbar-actions"><div className={`backend-pill ${backend}`}><i/>{backend === 'online' ? 'Server ulangan' : backend === 'checking' ? 'Tekshirilmoqda' : 'Demo interfeys'}</div><button className={`studio-pill ${connected ? 'connected' : ''}`} onClick={() => setModal('pair')}><span className="studio-dot"/>{connected ? placeName || 'Studio ulangan' : 'Studio ulash'}<ChevronDown size={14}/></button><a className="github-link" href="https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17}/></a></div></header>

      <div className="chat-layout">
        <div className="chat-heading"><div><div className="eyebrow"><Sparkles size={13}/> AI GAME BUILDER</div><h1>G‘oyangni o‘yinga aylantir<span>.</span></h1><p>Oddiy tilda yoz. Quruvchi reja tuzadi, Luau kodini tayyorlaydi va Studio bilan bog‘lanishga yordam beradi.</p></div><div className="heading-chip"><span className="pulse-dot"/>{connected ? 'Studio online' : 'Studio ulanmagan'}</div></div>

        <div className="chat-scroll">
          {messages.length <= 1 && <section className="welcome-block"><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-cube"><Boxes size={37}/></div><div className="floating-icon float-spark"><Sparkles size={17}/></div><div className="floating-icon float-code"><Code2 size={17}/></div><div className="floating-icon float-game"><Gamepad2 size={18}/></div></div><h2>Nimani quramiz?</h2><p>O‘yin mexanikasi, UI, skriptlar yoki butun bir loyiha — g‘oyangni yozib boshlaymiz.</p><div className="suggestion-grid">{suggestions.map(s => <button key={s.title} className="suggestion-card" onClick={() => setPrompt(s.text)}><span className="suggestion-emoji">{s.icon}</span><strong>{s.title}</strong><span>{s.text}</span><div className="suggestion-arrow"><Plus size={15}/></div></button>)}</div></section>}
          <div className="message-list">{messages.map(m => <article key={m.id} className={`message message-${m.role}`}><div className="message-avatar">{m.role === 'user' ? 'M' : m.role === 'tool' ? <Code2 size={15}/> : m.role === 'error' ? <ShieldCheck size={15}/> : <Bot size={17}/>}</div><div className="message-body"><div className="message-meta"><strong>{m.role === 'user' ? 'Sen' : m.role === 'tool' ? 'Studio buyrug‘i' : m.role === 'error' ? 'Xabar' : 'Quruvchi AI'}</strong><span>{m.role === 'tool' ? 'TOOL' : ''}</span></div><p>{m.text}</p></div></article>)}</div>
          {busy && <div className="working-row"><LoaderCircle size={16} className="spin"/> Quruvchi ishlayapti…</div>}
          <div ref={endRef}/>
        </div>

        <div className="composer-wrap"><div className="composer"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Masalan: pet simulator uchun to‘liq tizim yarat..." rows={2} aria-label="Xabaringiz"/><div className="composer-bottom"><div className="composer-hints"><span><Command size={12}/> Enter yuborish</span><span>·</span><span>Shift + Enter yangi qator</span></div>{busy ? <button className="send-button stop-button" onClick={stopTask}><Square size={14} fill="currentColor"/> To‘xtatish</button> : <button className="send-button" onClick={() => sendMessage()} disabled={!prompt.trim()}><Send size={15}/> Yuborish</button>}</div></div><div className="composer-foot"><ShieldCheck size={13}/> Kodni haqiqiy Studio loyihangda sinab ko‘r. AI natijalarida xato bo‘lishi mumkin.</div></div>
      </div>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><section className="modal-card">
      <button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Yopish"><X size={18}/></button>
      {modal === 'pair' && <><div className="modal-icon"><Gamepad2 size={22}/></div><h2>Roblox Studio’ni ulash</h2><p className="modal-subtitle">Sayt va Studio pluginini bir martalik kod orqali bog‘lang.</p><div className="pair-steps"><div><b>1</b><span><strong>Pluginni yuklab oling</strong><small>Quruvchi pluginini server sozlangach yuklab olish mumkin.</small></span></div><div><b>2</b><span><strong>Studio’da pluginni ishga tushiring</strong><small>Plugins menyusidan Quruvchi panelini oching.</small></span></div><div><b>3</b><span><strong>Kodni kiriting</strong><small>Quyidagi kodni plugin paneliga kiriting.</small></span></div></div><div className="pair-code"><strong>{pairCode ? pairCode.match(/.{1,4}/g)?.join('-') : '••••-••••'}</strong><button className="icon-button" onClick={() => pairCode && navigator.clipboard?.writeText(pairCode)} title="Nusxalash"><Copy size={16}/></button></div><div className="pair-timer">{pairCode ? secondsLeft > 0 ? `Kod muddati: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Kod muddati tugagan' : 'Kod olish uchun server ishlayotgan bo‘lishi kerak'}</div><button className="primary-button full" onClick={createPair}><Zap size={16}/> {pairCode ? 'Yangi kod olish' : 'Ulash kodini olish'}</button><div className="modal-footnote"><ShieldCheck size={14}/> Kod 10 daqiqa amal qiladi. Hech kim bilan ulashmang.</div></>}
      {modal === 'settings' && <><div className="modal-icon"><Settings2 size={22}/></div><h2>Sozlamalar</h2><p className="modal-subtitle">Quruvchi ish muhiti va xavfsizlik haqida.</p><div className="settings-row"><div><strong>Server holati</strong><small>API va agent xizmatlari</small></div><span className={`state-tag ${backend}`}>{backend === 'online' ? 'ONLINE' : backend === 'checking' ? 'TEKSHIRILMOQDA' : 'OFFLINE'}</span></div><div className="settings-row"><div><strong>run_code ruxsati</strong><small>Studio pluginida sukut bo‘yicha o‘chiq</small></div><span className="state-tag safe">O‘CHIQ</span></div><div className="settings-row"><div><strong>Kunlik tool limiti</strong><small>Hozirgi sessiya</small></div><strong>{steps.used} / {steps.limit}</strong></div><button className="primary-button full" onClick={() => setModal(null)}>Tushunarli</button></>}
      {modal === 'help' && <><div className="modal-icon"><CircleHelp size={22}/></div><h2>Quruvchi qanday ishlaydi?</h2><p className="modal-subtitle">Sayt — boshqaruv paneli; Roblox Studio plugin esa loyihangdagi obyektlarni boshqaradi.</p><div className="help-list"><p><span>01</span> G‘oyangni chatga yoz.</p><p><span>02</span> Server AI modeli bilan reja va tool buyruqlarini tayyorlaydi.</p><p><span>03</span> Studio plugin buyruqlarni bajarib, natijani qaytaradi.</p><p><span>04</span> Studio’da Play bosib sinab ko‘r; xatolarni Output’dan tekshir.</p></div><div className="modal-footnote"><ShieldCheck size={14}/> Bu repodagi frontend hozircha interfeys. To‘liq ishlashi uchun backend, API kalit va Studio plugin alohida sozlanadi.</div><button className="primary-button full" onClick={() => setModal(null)}>Yopish</button></>}
    </section></div>}

    {authView && <div className="modal-backdrop"><section className="modal-card auth-card"><div className="modal-icon"><Bot size={23}/></div><h2>{authView === 'login' ? 'Qaytganingdan xursandmiz' : 'Quruvchi hisobini yarat'}</h2><p className="modal-subtitle">Loyihalaringni davom ettirish uchun tizimga kir.</p><form onSubmit={submitAuth}><label>LOGIN<input value={login} onChange={e => setLogin(e.target.value)} required minLength={3} maxLength={32} autoComplete="username" placeholder="foydalanuvchi"/></label><label>PAROL<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={200} autoComplete={authView === 'login' ? 'current-password' : 'new-password'} placeholder="Kamida 8 belgi"/></label>{authView === 'register' && <label>TAKLIF KODI (Ixtiyoriy)<input value={invite} onChange={e => setInvite(e.target.value)} placeholder="Taklif kodi"/></label>}{notice && <div className="auth-error">{notice}</div>}<button className="primary-button full" type="submit"><ShieldCheck size={16}/>{authView === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}</button></form><button className="auth-switch" onClick={() => { setNotice(''); setAuthView(authView === 'login' ? 'register' : 'login'); }}>{authView === 'login' ? 'Hisobing yo‘qmi? Ro‘yxatdan o‘t' : 'Hisobing bormi? Kirish'}</button></section></div>}
    <div className="version-label"><span/> QURUVCHI <b>WEB</b> · v1.0</div>
  </div>;
}
