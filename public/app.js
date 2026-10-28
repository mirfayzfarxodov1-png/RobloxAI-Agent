const root = document.getElementById('app');
const state = {
  user:null,messages:[],busy:false,paused:null,status:{connected:false,placeName:'',deviceId:null},
  steps:{used:0,limit:300},modal:null,authMode:new URLSearchParams(location.search).has('ref')?'register':'login',login:'',password:'',invite:new URLSearchParams(location.search).get('ref')||'',referral:null,
  notice:'',prompt:'',code:'',expiresAt:0,devices:[],serverOnline:false,mobileMenu:false,ownerServerUrl:location.origin
};
let stream=null,codeTicker=null,pauseReadyState=null;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
function button(text,cls,action,disabled=false){const b=node('button',cls,text);b.type='button';b.disabled=disabled;b.addEventListener('click',action);return b;}
function link(text,href,cls){const a=node('a',cls,text);a.href=href;if(/^https?:\/\//.test(href)){a.target='_blank';a.rel='noreferrer';}return a;}
function iconButton(label,glyph,action){const b=button(glyph,'icon-button',action);b.setAttribute('aria-label',label);b.title=label;return b;}
async function api(path,body,method){
  const options={method:method||(body===undefined?'GET':'POST'),credentials:'same-origin',headers:{}};
  if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}else if(options.method==='POST'||options.method==='DELETE'){options.headers['Content-Type']='application/json';}
  const response=await fetch(path,options);const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||'So‘rov bajarilmadi');error.status=response.status;error.data=data;throw error;}return data;
}
function addMessage(message){const id=String(message.id||Date.now()+'-'+Math.random());const idx=state.messages.findIndex(m=>String(m.id)===id);const item={...message,id};if(idx>=0)state.messages[idx]=item;else state.messages.push(item);state.scrollBottom=true;render();}
function safeInline(parent,text){
  const regex=/(\*\*[^*]+\*\*|\x60[^\x60]+\x60)/g;let cursor=0,match;
  while((match=regex.exec(text))!==null){if(match.index>cursor)parent.append(document.createTextNode(text.slice(cursor,match.index)));const raw=match[0];if(raw.startsWith('**'))parent.append(node('strong','',raw.slice(2,-2)));else parent.append(node('code','',raw.slice(1,-1)));cursor=match.index+raw.length;}
  if(cursor<text.length)parent.append(document.createTextNode(text.slice(cursor)));
}
function safeMarkdown(parent,text){
  const parts=String(text||'').split(/\x60{3}([a-zA-Z0-9_-]*)\n?([\s\S]*?)\x60{3}/g);
  for(let i=0;i<parts.length;i++){
    if(i%3===1){const pre=node('pre');pre.append(node('code','',parts[i+1]||''));parent.append(pre);i++;continue;}
    const lines=parts[i].split('\n');let paragraph=[];
    const flush=()=>{if(!paragraph.length)return;const p=node('p');safeInline(p,paragraph.join('\n'));parent.append(p);paragraph=[];};
    for(const line of lines){if(!line.trim()){flush();continue;}if(/^\s*[-*]\s+/.test(line)){flush();let list=parent.lastElementChild;if(!list||list.tagName!=='UL'){list=node('ul');parent.append(list);}const li=node('li');safeInline(li,line.replace(/^\s*[-*]\s+/,''));list.append(li);}else paragraph.push(line);}flush();
  }
}
function renderMessage(m){
  if(m.role==='tool'||m.role==='tool_result'){
    const wrap=node('div','message-tool');const b=button('', 'tool-row',()=>{const p=wrap.querySelector('.tool-preview');if(p)p.classList.toggle('hidden');});
    b.append(node('span','',m.role==='tool'?'🧱':(m.ok?'✓':'✕')),node('span','',m.text||m.summary||m.name||'Studio buyrug‘i'),node('span','tool-state',m.role==='tool'?'…':(m.ok?'✓':'✕')));wrap.append(b);
    if(m.preview||m.details)wrap.append(node('div','tool-preview hidden',m.preview||m.details));return wrap;
  }
  const article=node('article','message message-'+(m.role||'assistant'));article.append(node('div','message-avatar',m.role==='user'?'M':m.role==='error'?'!':'Q'));
  const body=node('div','message-body'),meta=node('div','message-meta');meta.append(node('strong','',m.role==='user'?'Sen':m.role==='error'?'Xatolik':'Quruvchi AI'));body.append(meta);
  const text=node('div','message-text');safeMarkdown(text,m.text||'');body.append(text);article.append(body);return article;
}
function render(){
  const oldScroll=root.querySelector('.chat-scroll');const oldScrollTop=oldScroll?oldScroll.scrollTop:0;
  const oldPrompt=root.querySelector('#prompt');const promptFocused=oldPrompt===document.activeElement;const selectionStart=oldPrompt?oldPrompt.selectionStart:0;const selectionEnd=oldPrompt?oldPrompt.selectionEnd:0;
  root.replaceChildren();if(!state.user){renderAuth();return;}
  const shell=node('div','app-shell'),sidebar=node('aside','sidebar'+(state.mobileMenu?' open':''));
  const brand=node('div','brand-row');brand.append(node('div','brand-mark','Q'));const brandCopy=node('div','brand-copy');brandCopy.append(node('strong','','Quruvchi'),node('small','','ROBLOX AI STUDIO'));brand.append(brandCopy,iconButton('Menyuni yopish','×',()=>{state.mobileMenu=false;render();}));brand.lastElementChild.className='icon-button mobile-close';sidebar.append(brand);
  sidebar.append(button('＋  Yangi chat','new-chat',newChat),node('div','side-label','ISH MAYDONI'),button('◫  AI bilan qurish','side-link active',()=>{}));
  const studioLink=button('▣  Studio ulash','side-link',openPair);studioLink.append(node('span','tiny-status'+(state.status.connected?' online':'')));sidebar.append(studioLink,button('↗  Taklif havolasi','side-link',openReferral),button('⚙  Sozlamalar','side-link',()=>{state.modal='settings';render();}),node('div','side-label','YORDAM'),button('?  Qanday ishlaydi?','side-link',()=>{state.modal='help';render();}),node('div','sidebar-spacer'));
  const usage=node('div','usage-card'),usageTitle=node('div','usage-title','ϟ  Kunlik limit');usageTitle.append(node('span','',state.steps.used+' / '+state.steps.limit));usage.append(usageTitle);
  const track=node('div','usage-track'),fill=node('span');const pct=state.steps.limit?Math.min(100,state.steps.used/state.steps.limit*100):0;fill.className=pct>=100?'bar-full':pct>=66?'bar-two-thirds':pct>=33?'bar-one-third':'bar-low';track.append(fill);usage.append(track,node('p','','Bugungi AI tool qadamlari'));sidebar.append(usage);
  const profile=node('div','profile-row');profile.append(node('div','avatar',state.user.login.slice(0,1).toUpperCase()));const profileInfo=node('div','profile-info');profileInfo.append(node('strong','',state.user.login),node('small','',state.serverOnline?'Server ulangan':'Server offline'));profile.append(profileInfo,iconButton('Chiqish','↪',logout));sidebar.append(profile);shell.append(sidebar);

  const main=node('main','main-area'),top=node('header','topbar'),topLeft=node('div','topbar-left');const menu=iconButton('Menyuni ochish','☰',()=>{state.mobileMenu=!state.mobileMenu;render();});menu.className='icon-button menu-button';topLeft.append(menu);
  const crumbs=node('div','breadcrumbs');crumbs.append(node('span','','Ish maydoni'),node('b','', '/'),node('strong','','AI bilan qurish'));topLeft.append(crumbs);
  const actions=node('div','topbar-actions'),backend=node('div','backend-pill '+(state.serverOnline?'online':'offline'));backend.append(node('i'),document.createTextNode(state.serverOnline?'Server ulangan':'Server offline'));
  const studio=button('','studio-pill'+(state.status.connected?' connected':''),openPair);studio.append(node('span','studio-dot'),document.createTextNode(state.status.connected?(state.status.placeName||'Studio ulangan'):'Studio ulash'),node('span','','⌄'));
  actions.append(backend,studio,link('↗','https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent','github-link'));top.append(topLeft,actions);main.append(top);

  const layout=node('div','chat-layout'),heading=node('div','chat-heading'),headingText=node('div');headingText.append(node('div','eyebrow','✧  AI GAME BUILDER'));
  const h1=node('h1');h1.append(document.createTextNode('G‘oyangni o‘yinga aylantir'),node('span','','.'));headingText.append(h1,node('p','','Oddiy tilda yoz. Quruvchi reja tuzadi, Luau kodini tayyorlaydi va Studio bilan bog‘lanishga yordam beradi.'));
  const chip=node('div','heading-chip'+(state.status.connected?' connected':''));chip.append(node('span','pulse-dot'),document.createTextNode(state.status.connected?'Studio ulangan':'Studio ulanmagan'));heading.append(headingText,chip);layout.append(heading);
  const scroll=node('div','chat-scroll');
  if(!state.messages.length){
    const welcome=node('section','welcome-block'),art=node('div','welcome-art');art.append(node('div','art-orbit orbit-one'),node('div','art-orbit orbit-two'),node('div','art-cube','✧'),node('div','floating-icon float-spark','✦'),node('div','floating-icon float-code','</>'),node('div','floating-icon float-game','▣'));
    welcome.append(art,node('h2','','Nimani quramiz?'),node('p','','O‘yin mexanikasi, UI, skriptlar yoki butun loyiha — g‘oyangni yozib boshlaymiz.'));
    const grid=node('div','suggestion-grid'),suggestions=[
      ['🌌','Katta open-world','Katta xarita, zonalar, questlar, NPC, inventar, saqlash va server/client arxitekturasi bilan o‘yin rejasini tuz'],
      ['🧬','Simulator + progression','Petlar, tuxum ochish, rarity, rebirth, upgrade, DataStore va balanslangan progression tizimi qur'],
      ['🗡️','Action / RPG','Qurol, combat, skill cooldown, dushman AI, boss, loot va quest tizimi bilan RPG yarat'],
      ['🏁','Obby + checkpoint','30 bosqichli obby, checkpoint, timer, mukofotlar, leaderboard va mobilga mos UI yarat'],
      ['🏘️','Tycoon / multiplayer','Plot claim, ishlab chiqarish, upgrade, pul iqtisodi, saqlash va multiplayer xavfsizligini qur'],
      ['🛠️','To‘liq loyiha karkasi','ServerScriptService, ReplicatedStorage, StarterPlayer, UI, ModuleScriptlar va test checklist bilan production-style loyiha tuz']
    ];
    for(const [emoji,title,prompt] of suggestions){const card=button('', 'suggestion-card',()=>{state.prompt=prompt;render();const area=root.querySelector('#prompt');if(area){area.focus();area.setSelectionRange(area.value.length,area.value.length);}});card.append(node('span','suggestion-emoji',emoji),node('strong','',title),node('span','',prompt),node('div','suggestion-arrow','＋'));grid.append(card);}
    welcome.append(grid);scroll.append(welcome);
  }
  const list=node('div','message-list');for(const m of state.messages)list.append(renderMessage(m));scroll.append(list);
  if(state.busy){const work=node('div','working-row');work.append(node('span','spinner'),document.createTextNode('Quruvchi ishlayapti…'));scroll.append(work);}
  if(state.paused){
    const pause=state.paused,card=node('section','pause-card'),title=node('strong','pause-title','⏸  Loyiha pauzada — ish saqlandi');
    card.append(title,node('p','',pause.reason==='daily_step_limit'?'Kunlik Quruvchi limiti tugadi. Keyingi UTC kunida davom ettirish mumkin.':pause.reason==='provider_rate_limit'?'AI provayder so‘rov limiti tugadi. Tiklanish vaqtini kuting, keyin davom eting.':pause.reason==='credit_limit'?'AI provayder krediti yoki foydalanish limiti tugadi. Provayder limitni tiklashi yoki kreditni to‘ldirish talab qilinishi mumkin.':'Ish checkpoint’da saqlandi. Davom etishdan oldin AI xizmati holatini tekshiring.'));
    if(pause.retryAt){
      const retryDate=new Date(pause.retryAt),waiting=pause.retryAt>Date.now();
      card.append(node('p','pause-time', (waiting?'Davom etish mumkin bo‘ladi: ':'Limit tekshiruvi uchun vaqt: ')+retryDate.toLocaleString()));
      if(waiting){const seconds=Math.ceil((pause.retryAt-Date.now())/1000),hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60),secs=seconds%60;card.append(node('p','pause-countdown','Qolgan vaqt: '+(hours?hours+' soat ':'')+(minutes?minutes+' daqiqa ':'')+secs+' soniya'));}
    }else card.append(node('p','pause-time','Aniq tiklanish vaqti API tomonidan berilmadi. Limit holati tekshirilgach, davom ettirishni sinab ko‘rishingiz mumkin.'));
    if(pause.details)card.append(node('small','pause-details','Tafsilot: '+pause.details));
    const ready=!pause.retryAt||pause.retryAt<=Date.now();
    card.append(button(ready?'▶  Davom etish':'◷  Limit tiklanishini kutish','resume-button',resumeBuild,!ready||state.busy));
    scroll.append(card);
  }
  layout.append(scroll);
  const composerWrap=node('div','composer-wrap'),quickActions=node('div','builder-shortcuts');
  const shortcutPrompts=[
    ['⌕  Tadqiqot + savol','Mening o‘yin g‘oyamni avval internetdan rasmiy manbalarda o‘rgan. Agar referens o‘yin bo‘lsa, mexanikalarini umumlashtir, manbalarni ko‘rsat va Studio’ni o‘zgartirishdan oldin mendan original uslub tanlashni so‘ra.'],
    ['◇  Avval reja','Hozircha Studio’ni o‘zgartirma. G‘oyam uchun arxitektura, asosiy gameplay loop, server/client tizimlari, UI, saqlash, xavfsizlik va testlardan iborat 7 bosqichli reja tuz.'],
    ['▦  Loyiha arxitekturasi','Mening o‘yin g‘oyam uchun create_project_plan orqali batafsil loyiha arxitekturasi tuz: janr, core gameplay loop, modullar, server/client mas’uliyati, data, UI, xavfsizlik, fazalar va har fazaning qabul mezonlari. Hozircha Studio’ni o‘zgartirma.'],
    ['↗  Katta loyiha','Bu g‘oyani oddiy demo emas, bosqichma-bosqich quriladigan to‘liq Roblox loyihasi sifatida ishlab chiq. Avval mavjud Studio loyihasini tekshir, keyin reja, ishlaydigan asosiy gameplay va testlarni kichik fazalarda bajar.']
  ];
  for(const [label,prompt] of shortcutPrompts){quickActions.append(button(label,'builder-shortcut',()=>{state.prompt=prompt;render();const area=root.querySelector('#prompt');if(area){area.focus();area.setSelectionRange(area.value.length,area.value.length);}}));}
  composerWrap.append(quickActions);
  const composer=node('div','composer'),textarea=node('textarea');textarea.id='prompt';textarea.rows=2;textarea.maxLength=30000;textarea.value=state.prompt;textarea.placeholder='O‘yin g‘oyangni yoki boshqa AI bergan to‘liq texnik promptni shu yerga joyla (30 000 belgigacha)...';textarea.setAttribute('aria-label','Xabaringiz');textarea.addEventListener('input',e=>state.prompt=e.target.value);textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});
  const bottom=node('div','composer-bottom'),hints=node('div','composer-hints');hints.append(node('span','','↵ Enter yuborish'),node('span','','·'),node('span','','Shift + Enter yangi qator'),node('span','prompt-limit',state.prompt.length.toLocaleString()+' / 30 000'));
  const composerActions=node('div','composer-actions');
  composerActions.append(button('▣  Clipboard’dan joylash','paste-prompt-button',async()=>{try{const pasted=await navigator.clipboard.readText();if(!pasted.trim())throw new Error('Clipboard bo‘sh. Avval promptni nusxalang.');state.prompt=pasted.slice(0,30000);render();const next=root.querySelector('#prompt');if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}}catch(error){addMessage({role:'error',text:error.message||'Clipboard’ni o‘qib bo‘lmadi. Matn maydoniga Ctrl+V bilan joylang.'});}},state.busy));
  composerActions.append(button(state.busy?'■  To‘xtatish':'➤  Qurishni boshlash','send-button'+(state.busy?' stop':''),state.busy?stop:sendMessage,!state.busy&&!state.prompt.trim()));
  bottom.append(hints,composerActions);
  composer.append(textarea,bottom);composerWrap.append(composer,node('div','composer-foot','◇  AI yaratgan kodni Roblox Studio’da sinab ko‘r. Haqiqiy Play-test alohida talab qilinadi.'));layout.append(composerWrap);main.append(layout);shell.append(main,shellVersion());root.append(shell);
  if(state.modal)renderModal(shell);if(state.scrollBottom){scroll.scrollTop=scroll.scrollHeight;state.scrollBottom=false;}else if(oldScroll)scroll.scrollTop=oldScrollTop;
  if(promptFocused){const nextPrompt=root.querySelector('#prompt');if(nextPrompt){nextPrompt.focus();try{nextPrompt.setSelectionRange(selectionStart,selectionEnd);}catch{}}}
}
function shellVersion(){return node('div','version-label','QURUVCHI  WEB · v1.0');}
function renderAuth(){
  const wrap=node('div','auth-page'),card=node('section','auth-card');card.append(node('div','brand-mark','Q'),node('h1','','Quruvchi'),node('p','auth-intro','Roblox Studio uchun AI quruvchi'));
  const tabs=node('div','auth-tabs');tabs.append(button('Kirish',state.authMode==='login'?'active':'',()=>{state.authMode='login';state.notice='';render();}),button('Ro‘yxatdan o‘tish',state.authMode==='register'?'active':'',()=>{state.authMode='register';state.notice='';render();}));card.append(tabs);
  const form=node('form'),loginLabel=node('label','form-label','LOGIN'),loginInput=node('input');loginInput.name='login';loginInput.autocomplete='username';loginInput.required=true;loginInput.minLength=3;loginInput.maxLength=32;loginInput.value=state.login;loginInput.placeholder='foydalanuvchi';loginInput.addEventListener('input',e=>state.login=e.target.value);loginLabel.append(loginInput);form.append(loginLabel);
  const passLabel=node('label','form-label','PAROL'),passInput=node('input');passInput.type='password';passInput.name='password';passInput.autocomplete=state.authMode==='login'?'current-password':'new-password';passInput.required=true;passInput.minLength=8;passInput.maxLength=200;passInput.value=state.password;passInput.placeholder='Kamida 8 belgi';passInput.addEventListener('input',e=>state.password=e.target.value);passLabel.append(passInput);form.append(passLabel);
  if(state.authMode==='register'){const label=node('label','form-label','TAKLIF HAVOLASI / KODI'),input=node('input');input.name='invite';input.value=state.invite;input.placeholder='Taklif havolasidan avtomatik tushadi';input.autocomplete='off';input.addEventListener('input',e=>state.invite=e.target.value.trim());label.append(input);form.append(label);if(new URLSearchParams(location.search).has('ref'))form.append(node('p','referral-auth-note','Siz taklif havolasi orqali keldingiz. Ro‘yxatdan o‘tish ushbu serverda davom etadi.'));}
  if(state.notice)form.append(node('div','form-error',state.notice));
  const submit=button(state.authMode==='login'?'Kirish':'Hisob yaratish','primary-button full',()=>{});submit.type='submit';form.append(submit);
  form.addEventListener('submit',async e=>{e.preventDefault();state.notice='';try{const data=await api(state.authMode==='login'?'/api/login':'/api/register',{login:state.login,password:state.password,...(state.authMode==='register'?{invite:state.invite}:{})});state.user={login:data.login||state.login};state.password='';state.notice='';await loadApp();}catch(error){state.notice=error.message;render();}});
  card.append(form,node('p','auth-security','Sessiya xavfsiz cookie bilan saqlanadi. AI kaliti brauzerga yuborilmaydi.'));wrap.append(card);root.append(wrap);
}
function renderModal(shell){
  const backdrop=node('div','modal-backdrop');backdrop.addEventListener('mousedown',e=>{if(e.target===backdrop)closeModal();});
  const card=node('section','modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');const close=iconButton('Yopish','×',closeModal);close.classList.add('modal-close');card.append(close);
  if(state.modal==='pair'){
    card.append(node('div','modal-icon','▣'),node('h2','','Roblox Studio’ni ulash'),node('p','modal-subtitle','Sayt va Studio pluginini bir martalik kod orqali bog‘lang.'));
    const steps=node('div','pair-steps');for(const [n,title,desc] of [['1','Pluginni oling','Quyidagi yuklab olish havolasini bosing; fayl nomi Quruvchi.lua bo‘ladi.'],['2','Studio’da ishga tushiring','Windows: %LOCALAPPDATA%\\Roblox\\Plugins papkasiga joylang, keyin Studio’ni qayta ishga tushiring. Game Settings → Security’da HTTP so‘roviga ruxsat bering.'],['3','Kodni kiriting','Panelda server URL va quyidagi kodni kiriting.']]){const row=node('div');row.append(node('b','',n));const span=node('span');span.append(node('strong','',title),node('small','',desc));row.append(span);steps.append(row);}card.append(steps);
    const serverAddress=node('div','server-address-card');
    serverAddress.append(node('strong','','Server egasining manzili'));
    const serverAddressRow=node('div','server-address-row');
    const serverAddressText=node('code','server-address-value',state.ownerServerUrl||location.origin);
    serverAddressRow.append(serverAddressText,iconButton('Server manzilini nusxalash','▣',async()=>{try{await navigator.clipboard.writeText(state.ownerServerUrl||location.origin);state.notice='Server manzili nusxalandi';}catch{state.notice='Nusxalab bo‘lmadi';}render();}));
    serverAddressCardWarning(serverAddress,state.ownerServerUrl||location.origin);
    serverAddress.append(serverAddressRow);
    card.append(serverAddress);
    const code=node('div','pair-code'),codeText=state.code?state.code.slice(0,4)+'-'+state.code.slice(4):'••••-••••';code.append(node('strong','',codeText),iconButton('Kodni nusxalash','▣',async()=>{if(!state.code)return;try{await navigator.clipboard.writeText(state.code);state.notice='Kod nusxalandi';}catch{state.notice='Nusxalab bo‘lmadi';}render();}));card.append(code);
    const remaining=Math.max(0,Math.ceil((state.expiresAt-Date.now())/1000));card.append(node('div','pair-timer',state.code?(remaining?'Kod muddati: '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):'Kod muddati tugagan'):'Kod olish uchun tugmani bosing'),button(state.code?'Yangi kod olish':'Ulash kodini olish','primary-button full',createPair),link('Plugin faylini yuklab olish','/plugin.lua','plugin-download'));
    const list=node('div','device-list');for(const d of state.devices){const item=node('div','device-item');item.append(node('span','device-status'+(d.connected?' connected':'')));const info=node('div');info.append(node('strong','',d.placeName||'Roblox Studio'),node('small','',d.connected?'Ulangan':'Uzilgan'));item.append(info,button('O‘chirish','device-delete',async()=>{if(!confirm('Ushbu Studio qurilmasini uzasizmi?'))return;try{await api('/api/devices/'+d.id,undefined,'DELETE');await loadDevices();render();}catch(e){state.notice=e.message;render();}}));list.append(item);}card.append(list);
    if(state.notice)card.append(node('div','form-error',state.notice));
  }else if(state.modal==='referral'){
    card.append(node('div','modal-icon','↗'),node('h2','','Taklif havolasi'),node('p','modal-subtitle','Do‘stingizga shu havolani yuboring. U ochganda sizning serveringizga kiradi; o‘z localhost serveriga emas.'));
    if(!state.referral){
      card.append(node('p','referral-loading','Taklif havolasi yuklanmoqda…'));
    }else{
      const linkCard=node('div','referral-link-card');
      linkCard.append(node('strong','','Sizning shaxsiy havolangiz'));
      const linkRow=node('div','referral-link-row'),urlInput=node('input','referral-url');
      urlInput.readOnly=true;urlInput.value=state.referral.referralUrl;urlInput.setAttribute('aria-label','Taklif havolasi');
      linkRow.append(urlInput,button('Nusxalash','primary-button',async()=>{try{await navigator.clipboard.writeText(state.referral.referralUrl);state.notice='Taklif havolasi nusxalandi';}catch{urlInput.select();state.notice='Havola tanlandi — Ctrl+C bosing.';}render();}));
      linkCard.append(linkRow);
      const stats=node('div','referral-stats');stats.append(node('div','referral-stat',String(state.referral.referrals)),node('small','referral-stat-label','Sizning havolangiz orqali ro‘yxatdan o‘tganlar'));
      linkCard.append(stats);
      if(state.referral.localOnly){
        linkCard.append(node('p','referral-warning','Muhim: hozir PUBLIC_URL localhost manzilida. Bu havola boshqa kompyuterda ishlamaydi. Boshqa kompyuterdan foydalanish uchun PUBLIC_URL ni server egasining LAN IP manziliga o‘zgartiring va bir xil Wi‑Fi/LAN tarmog‘ida bo‘ling. Internet orqali ulanish uchun ommaviy HTTPS server kerak.'));
      }else{
        linkCard.append(node('p','referral-success','Taklif havolasi server egasining manziliga bog‘langan. Sherik shu manzilda ro‘yxatdan o‘tadi.'));
      }
      card.append(linkCard);
    }
    if(state.notice)card.append(node('div','form-error',state.notice));
  }else if(state.modal==='settings'){
    card.append(node('div','modal-icon','⚙'),node('h2','','Sozlamalar'),node('p','modal-subtitle','Quruvchi ish muhiti va xavfsizlik holati.'));
    for(const [label,value] of [['Server',state.serverOnline?'ONLINE':'OFFLINE'],['Studio bridge',state.status.connected?'ULANGAN':'ULANMAGAN'],['Bugungi tool limiti',state.steps.used+' / '+state.steps.limit],['run_code','Plugin ichida sukut bo‘yicha O‘CHIQ']]){const row=node('div','settings-row'),left=node('div');left.append(node('strong','',label));row.append(left,node('span','state-tag',value));card.append(row);}card.append(node('p','modal-footnote','API kalitni .env ichida saqlang. GitHub yoki frontend kodiga qo‘ymang.'));
  }else if(state.modal==='help'){
    card.append(node('div','modal-icon','?'),node('h2','','Quruvchi qanday ishlaydi?'),node('p','modal-subtitle','Brauzer serverga, server Claude API’ga, server esa Studio pluginiga buyruqlar yuboradi.'));
    const help=node('div','help-list');for(const line of ['G‘oyangni chatga yoz.','AI avval mavjud Studio ierarxiyasini ko‘radi va reja tuzadi.','Plugin ruxsat etilgan tool buyruqlarini bajaradi.','Play-testni o‘zing bajar; muammo bo‘lsa “logs” deb yoz.'])help.append(node('p','',line));card.append(help,node('p','modal-footnote','AI yaratgan kodda xato bo‘lishi mumkin. Plugin Play rejimini bosmaydi. DataStore uchun Studio API Services sozlamasi kerak.'));
  }
  backdrop.append(card);shell.append(backdrop);
}
function serverAddressCardWarning(parent,url){
  const local=/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
  parent.append(node('p','modal-footnote',local?'Diqqat: localhost faqat shu kompyuterda ishlaydi. Boshqa kompyuter uchun .env ichida PUBLIC_URL ni server egasining LAN IP manziliga o‘zgartiring; boshqa tarmoqdan ulanish uchun server ommaviy HTTPS manzilda bo‘lishi kerak.':'Sherik shu manzil orqali server egasining API’siga ulanadi. Manzil sherikka yetib borishi va server porti firewall’da ruxsat etilgan bo‘lishi kerak.'));
}
async function openReferral(){
  state.modal='referral';state.notice='';state.referral=null;render();
  try{state.referral=await api('/api/referral');}
  catch(error){state.notice=error.message||'Taklif havolasi olinmadi.';}
  if(state.modal==='referral')render();
}
function closeModal(){state.modal=null;state.notice='';if(codeTicker){clearInterval(codeTicker);codeTicker=null;}render();}
async function openPair(){state.modal='pair';state.notice='';try{const info=await api('/server-info');state.ownerServerUrl=info.serverUrl||location.origin;}catch{state.ownerServerUrl=location.origin;}render();await loadDevices();if(state.modal==='pair')render();if(codeTicker)clearInterval(codeTicker);codeTicker=setInterval(()=>{if(state.modal==='pair')render();else{clearInterval(codeTicker);codeTicker=null;}},1000);}
async function createPair(){try{const d=await api('/api/pair',{});state.code=d.code;state.expiresAt=d.expiresAt;state.notice='';render();}catch(e){state.notice=e.message;render();}}
async function loadDevices(){try{state.devices=await api('/api/devices');}catch{state.devices=[];}}
async function loadHistory(){try{const d=await api('/api/chat/history');state.messages=(d.messages||[]).map(m=>({...m,role:m.role==='user'?'user':'assistant'}));}catch{}}
async function loadApp(){try{const me=await api('/api/me');state.user={login:me.login};state.steps=me.steps||state.steps;state.status=me.status||state.status;state.serverOnline=true;state.busy=!!me.running;state.paused=me.paused||null;await loadHistory();connectStream();}catch(error){state.user=null;state.serverOnline=false;state.notice=error.message;}render();}
function connectStream(){
  if(stream)stream.close();stream=new EventSource('/api/stream');
  stream.addEventListener('status',e=>{try{state.status=JSON.parse(e.data);render();}catch{}});
  stream.addEventListener('state',e=>{try{const d=JSON.parse(e.data);state.busy=!!d.running;if(d.steps)state.steps=d.steps;state.paused=d.paused||null;render();}catch{}});
  stream.addEventListener('message',e=>{try{const d=JSON.parse(e.data);if(d.kind==='user'||d.kind==='assistant')addMessage({id:d.id,role:d.kind,text:d.text});else if(d.kind==='tool')addMessage({id:d.id||d.toolId,role:'tool',name:d.name,summary:d.summary,text:(d.name||'Tool')+(d.summary?' · '+d.summary:'')});else if(d.kind==='tool_result')addMessage({id:d.id||('result-'+d.toolId+'-'+Date.now()),role:'tool_result',toolId:d.toolId,ok:d.ok,preview:d.preview,text:(d.ok?'✓ ':'✕ ')+(d.preview||'Tool natijasi')});else if(d.kind==='error'||d.kind==='pause')addMessage({id:d.id,role:'error',text:d.text||'Xatolik yuz berdi'});else if(d.kind==='info')addMessage({id:d.id,role:'assistant',text:d.text||''});}catch{}});
  stream.addEventListener('pause',e=>{try{state.paused=JSON.parse(e.data);state.busy=false;render();}catch{}});
  stream.addEventListener('reset',()=>{state.messages=[];state.paused=null;render();});stream.onerror=()=>{};
}
async function sendMessage(){const text=state.prompt.trim();if(!text||state.busy)return;try{const result=await api('/api/chat',{text});state.prompt='';state.paused=result.pause||state.paused;state.busy=!result.paused;render();}catch(error){if(error.status===412||error.data?.needPairing){openPair().then(()=>{state.notice='Avval Roblox Studio’ni ulang.';render();});}else if(error.data?.paused){state.paused=error.data.paused;addMessage({role:'error',text:error.message});render();}else addMessage({role:'error',text:error.message});}}
async function resumeBuild(){
  if(state.busy||!state.paused)return;
  try{
    await api('/api/resume',{});
    state.paused=null;state.busy=true;render();
  }catch(error){
    if(error.status===412||error.data?.needPairing){openPair();}
    if(error.data?.paused)state.paused=error.data.paused;
    addMessage({role:'error',text:error.message||'Davom ettirib bo‘lmadi.'});render();
  }
}
async function stop(){try{await api('/api/stop',{});}catch(e){addMessage({role:'error',text:e.message});}state.busy=false;render();}
async function newChat(){try{await api('/api/chat/new',{});state.messages=[];state.prompt='';state.busy=false;state.paused=null;render();}catch(e){addMessage({role:'error',text:e.message});}}
async function logout(){try{await api('/api/logout',{});}catch{}if(stream){stream.close();stream=null;}state.user=null;state.messages=[];state.password='';state.notice='';state.modal=null;render();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal)closeModal();});
setInterval(()=>{const ready=state.paused?(!state.paused.retryAt||state.paused.retryAt<=Date.now()):null;if(ready!==pauseReadyState){pauseReadyState=ready;if(state.user)render();}},1000);
(async function boot(){try{const me=await api('/api/me');state.user={login:me.login};state.steps=me.steps||state.steps;state.status=me.status||state.status;state.serverOnline=true;state.busy=!!me.running;state.paused=me.paused||null;await loadHistory();connectStream();}catch{state.user=null;try{const r=await fetch('/healthz');state.serverOnline=r.ok;if(!r.ok)state.notice='Server javob bermadi.';}catch{state.serverOnline=false;state.notice='Server ishga tushmagan. PowerShell’da npm start buyrug‘ini bajaring.';}}render();})();


// Lightweight motion layer: no per-frame cursor animation or subtree MutationObserver.
(function installQuruvchiMotion(){
  const progress=document.createElement('div');
  progress.className='q-scroll-progress';
  progress.setAttribute('aria-hidden','true');
  const bar=document.createElement('span');
  progress.appendChild(bar);
  document.body.appendChild(progress);
  let scheduled=false;
  function updateProgress(){
    scheduled=false;
    const scrollEl=document.querySelector('.chat-scroll');
    const max=scrollEl?scrollEl.scrollHeight-scrollEl.clientHeight:document.documentElement.scrollHeight-window.innerHeight;
    const now=scrollEl?scrollEl.scrollTop:window.scrollY;
    bar.style.width=(max>0?Math.min(100,Math.max(0,now/max*100)):0)+'%';
  }
  function requestProgress(){
    if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}
  }
  document.addEventListener('scroll',requestProgress,{passive:true,capture:true});
  window.addEventListener('resize',requestProgress,{passive:true});
  updateProgress();
})();
