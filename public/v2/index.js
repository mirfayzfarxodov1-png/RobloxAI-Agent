(() => {
  const root = document.getElementById('app');
  if (!root) return;
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };
  const btn = (label, cls, fn) => { const b=el('button',cls,label); b.type='button'; b.addEventListener('click',fn); return b; };
  function markIcon(){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('aria-hidden','true');svg.innerHTML='<path d="M32 9a23 23 0 1 0 14.8 40.6l7.1 6.1 4.2-4.8-7.2-6.2A23 23 0 0 0 32 9Zm0 8a15 15 0 1 1 0 30 15 15 0 0 1 0-30Z" fill="#9f9aff" fill-rule="evenodd"/><path d="M13 12h8v4h-8zM10 20h4v8h-4z" fill="#f3d77b"/>';return svg;}

  async function api(path, body) {
    const opts={credentials:'same-origin',headers:{}};
    if(body!==undefined){opts.method='POST';opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
    const res=await fetch(path,opts); const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'So‘rov bajarilmadi'); return data;
  }
  function mount() {
    root.querySelectorAll('.v2-side-link,.v2-floating-trigger').forEach(n=>n.remove());
    root.dataset.quruvchiV2='ready';
  }
  function field(label, placeholder, value='') {
    const wrap=el('label','v2-field');wrap.append(el('span','',label));const input=el('textarea','',value);input.placeholder=placeholder;input.rows=2;wrap.append(input);return {wrap,input};
  }
  function openPanel() {
    if(document.querySelector('.v2-backdrop'))return;
    const backdrop=el('div','v2-backdrop'),panel=el('section','v2-panel');
    const head=el('div','v2-panel-head'),titleWrap=el('div','');
    titleWrap.append(el('span','v2-eyebrow','QURUVCHI AI · V2.1'),el('h2','','V2 Command Center'),el('p','','Loyihani rejalashtir, xotirani saqla va tekshiruvlarni kuzat.'));
    head.append(titleWrap,btn('×','v2-close',()=>backdrop.remove()));panel.append(head);
    const tabs=el('div','v2-tabs'),tabDNA=btn('Game DNA','',()=>showTab('dna')),tabPlan=btn('Loyiha arxitektori','active',()=>showTab('plan')),tabMemory=btn('Loyiha xotirasi','',()=>showTab('memory')),tabV3=btn('V3 AI Studio','',()=>showTab('v3')),tabCaps=btn('V2 imkoniyatlari','',()=>showTab('caps')),tabEngines=btn('10 texnologiya','',()=>showTab('engines'));
    tabs.append(tabDNA,tabPlan,tabMemory,tabV3,tabEngines,tabCaps);panel.append(tabs);
    const content=el('div','v2-content');panel.append(content);const status=el('p','v2-status','Tayyor');panel.append(status);
    const foot=el('div','v2-foot');foot.append(el('span','','Studio ulanishi mavjud bo‘lsa, reja chatga yuborib qurishni boshlash mumkin.'));
    const link=el('a','','GitHub main');link.href='https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent';link.target='_blank';link.rel='noreferrer';foot.append(link);panel.append(foot);
    backdrop.append(panel);backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.remove();});document.body.append(backdrop);
    async function showTab(name){
      for(const [key,b] of [['dna',tabDNA],['plan',tabPlan],['memory',tabMemory],['v3',tabV3],['caps',tabCaps],['engines',tabEngines]])b.classList.toggle('active',key===name);
      content.replaceChildren();status.textContent='Tayyor';
      if(name==='dna'){
        content.append(el('p','v2-muted','Game DNA o‘yin rejasini, papkalar xaritasini va script vazifalarini hisobingizda saqlaydi. Tashqi AI va Studio plugin ulanganida agent to‘liq Luau kod yozib, scriptlarni joylaydi.'));
        let savedManifest=null;
        const title=field('O‘yin nomi','Masalan: Steal an Egg'),idea=field('O‘yin g‘oyasi','Mexanika, dunyo, progression, UI va kerakli tizimlarni yozing.'),output=el('pre','v2-tool-output','Saqlangan Game DNA yoki yangi reja shu yerda ko‘rinadi.');
        const display=data=>{savedManifest=data.manifest||data.project?.manifest||null;output.textContent=JSON.stringify(savedManifest||data,null,2);};
        const load=btn('Saqlangan Game DNA’ni yuklash','v2-secondary',async()=>{load.disabled=true;try{const data=await api('/api/game-dna');if(data.project){title.input.value=data.project.title;idea.input.value=data.project.idea;display({manifest:data.project.manifest});status.textContent='Game DNA yuklandi · v'+data.project.version;}else status.textContent='Hozircha saqlangan Game DNA yo‘q.';}catch(e){status.textContent=e.message;}finally{load.disabled=false;}});
        const create=btn('Game DNA yaratish va saqlash','v2-primary',async()=>{create.disabled=true;status.textContent='Reja tuzilmoqda…';try{const data=await api('/api/game-dna',{title:title.input.value,idea:idea.input.value});display(data);status.textContent='Game DNA saqlandi · v'+data.project.version;}catch(e){status.textContent=e.message;}finally{create.disabled=false;}});
        const build=btn('Luau kodlarni yozdirib Studio’da yaratish','v2-primary',()=>{if(!savedManifest){status.textContent='Avval Game DNA yarating yoki yuklang.';return;}const task=['GAME DNA IMPLEMENTATION · v'+savedManifest.version,'Quyidagi manifestni amalda bajargin. Faqat maslahat yoki snippet qaytarma. Ulangan Studio’da mavjud loyihani tekshir, parent folderlarni create_script orqali yarat, har bir listed path uchun to‘liq Luau source yoz va scriptlarni haqiqatan joyla. Kichik batchlar bilan ishlagin; mavjud kodni ko‘r-ko‘rona almashtirma; audit_project/get_logs bilan tekshir. Play-testni o‘zing bajara olmasang not-run deb belgilagin.','',JSON.stringify(savedManifest,null,2)].join('\n');const composer=document.querySelector('#prompt');if(!composer){status.textContent='Chat input topilmadi.';return;}composer.value=task;composer.dispatchEvent(new Event('input',{bubbles:true}));composer.focus();status.textContent='Game DNA chatga tayyor. Endi chatning yuborish tugmasini bos.';});
        const copy=btn('Game DNA nusxalash','v2-secondary',async()=>{try{await navigator.clipboard.writeText(output.textContent);status.textContent='Nusxalandi.';}catch{status.textContent='Clipboard ruxsati yo‘q; qo‘lda nusxalang.';}});
        const actions=el('div','v2-tool-actions');actions.append(load,create,build,copy);content.append(title.wrap,idea.wrap,actions,output);
        try{const data=await api('/api/game-dna');if(data.project){title.input.value=data.project.title;idea.input.value=data.project.idea;display({manifest:data.project.manifest});status.textContent='Game DNA yuklandi · v'+data.project.version;}}catch(e){status.textContent=e.message;}
      }else if(name==='plan'){
        content.append(el('p','v2-muted','G‘oyani yozing. Quruvchi uni 8 ta ish fazasi va QA mezonlariga ajratadi.'));
        const title=field('Loyiha nomi','Masalan: Steal an Egg'),idea=field('O‘yin g‘oyasi','Mexanika, xarita, UI, multiplayer va kerakli tizimlar...');
        const generate=btn('✦  Reja yaratish','v2-primary',async()=>{generate.disabled=true;status.textContent='Reja tuzilmoqda…';
          try{const data=await api('/api/v2/plan',{title:title.input.value,idea:idea.input.value});const result=el('div','v2-result');
            result.append(el('h3','',data.plan.title),el('p','',data.plan.pitch));const phases=el('div','v2-phase-list');
            for(const phase of data.plan.phases){const item=el('article','v2-phase');item.append(el('b','',phase.order+'. '+phase.name),el('p','',phase.goal));phases.append(item);}
            result.append(phases,el('h4','','QA checklist'));for(const item of data.qaChecklist){const row=el('label','v2-check'),cb=el('input');cb.type='checkbox';row.append(cb,el('span','',item));result.append(row);}
            result.append(btn('Rejani chatga yuborish','v2-secondary',()=>{const prompt='Quyidagi V2 loyiha rejasini Roblox Studio’da bosqichma-bosqich amalga oshir. Avval get_tree/audit bilan mavjud loyihani tekshir, kichik fazalar bilan ishlagin, mavjud funksiyalarni saqla, o‘zgarishlarni tekshir va bajarilmagan testni tayyor deb aytma.\n\n'+data.markdown;const composer=document.querySelector('#prompt');if(composer){composer.value=prompt;composer.dispatchEvent(new Event('input',{bubbles:true}));composer.focus();status.textContent='Reja chatga ko‘chirildi. Yuborish tugmasini bosing.';}else status.textContent='Chat oynasi topilmadi.';}));
            content.append(result);status.textContent='Reja tayyor · 8 faza';
          }catch(e){status.textContent=e.message;}finally{generate.disabled=false;}
        });content.append(title.wrap,idea.wrap,generate);
      }else if(name==='memory'){
        content.append(el('p','v2-muted','Bu xotira hisobingizda saqlanadi va keyingi sessiyada davom ettirish uchun qayta ochiladi.'));
        try{const data=await api('/api/v2/memory'),m=data.memory||{};content.replaceChildren();
          const title=field('Loyiha nomi','Quruvchi loyihasi',m.title||''),idea=field('Asosiy g‘oya','Loyiha nima qilishi kerak?',m.idea||'');
          const decisions=field('Qarorlar (har qator alohida)','Masalan: faqat main branch',(m.decisions||[]).join('\n'));
          const completed=field('Bajarilgan ishlar','Har qator alohida',(m.completed||[]).join('\n')),next=field('Keyingi vazifalar','Har qator alohida',(m.nextSteps||[]).join('\n')),notes=field('Qo‘shimcha izohlar','Muhim kontekst va texnik cheklovlar',m.notes||'');
          const save=btn('Xotirani saqlash','v2-primary',async()=>{save.disabled=true;try{await api('/api/v2/memory',{title:title.input.value,idea:idea.input.value,decisions:decisions.input.value.split('\n'),completed:completed.input.value.split('\n'),nextSteps:next.input.value.split('\n'),notes:notes.input.value});status.textContent='Xotira saqlandi.';}catch(e){status.textContent=e.message;}finally{save.disabled=false;}});
          for(const f of [title,idea,decisions,completed,next,notes])content.append(f.wrap);content.append(save);
        }catch(e){content.replaceChildren(el('p','v2-muted',e.message));}
      }else if(name==='v3'){
        content.append(el('p','v2-muted','G‘oyani arxitekturaga aylantiring, kodni ko‘p qatlamli audit qiling va Studio chatiga topshiriq tayyorlang. Asosiy analizlar API kalitisiz ishlaydi.'));
        const title=field('O‘yin nomi','Masalan: Steal an Egg');const idea=field('To‘liq o‘yin g‘oyasi','Gameplay, xarita, progress, UI, multiplayer va maxsus mexanikalarni yozing.');const context=field('Mavjud Studio loyihasi (ixtiyoriy)','Mavjud scriptlar, ishlaydigan tizimlar yoki xatolar...');const code=field('Luau kodi — audit uchun','Tekshiriladigan server/client skriptini joylang.');const modelName=field('Model nomi','Masalan: Cosmic Egg','Quruvchi Model');const modelStyle=field('Model uslubi','stylized, sci-fi, fantasy...','stylized');const modelScale=field('Model o‘lchami (0.25–20)','4','4');const result=el('pre','v2-tool-output','V3 natijalari shu yerda ko‘rinadi.');
        const runV3=async(action,payload={})=>{status.textContent='V3 ishlayapti…';try{const data=await api('/api/v3/action',{action,...payload});result.textContent=JSON.stringify(data,null,2);status.textContent='Tayyor · natija tekshirish uchun tayyor.';return data;}catch(e){status.textContent=e.message;return null;}};
        const architect=btn('AI Game Architect','v2-primary',async()=>{await runV3('architect',{title:title.input.value,idea:idea.input.value});});const spec=btn('Studio uchun Build Spec','v2-primary',async()=>{const data=await runV3('build-spec',{title:title.input.value,idea:idea.input.value,existingContext:context.input.value});if(data?.prompt){result.textContent=data.prompt;status.textContent='Build Spec tayyor · chatga yuborish mumkin.';}});const audit=btn('Multi-pass Luau audit','v2-secondary',async()=>{await runV3('audit',{source:code.input.value});});const qa=btn('QA test matrix','v2-secondary',async()=>{await runV3('qa',{title:title.input.value});});const model=btn('3D Model Spec','v2-secondary',async()=>{await runV3('model-spec',{name:modelName.input.value,style:modelStyle.input.value,scale:modelScale.input.value});});
        const copy=btn('Natijani nusxalash','v2-secondary',async()=>{try{await navigator.clipboard.writeText(result.textContent);status.textContent='Natija nusxalandi.';}catch{status.textContent='Clipboard ruxsati yo‘q. Natijani qo‘lda belgilang.';}});const send=btn('Build Spec’ni chatga yuborish','v2-primary',()=>{const text=result.textContent||'';if(!text.includes('QURUVCHI V3')){status.textContent='Avval “Studio uchun Build Spec” yarating.';return;}const composer=document.querySelector('#prompt');if(!composer){status.textContent='Chat input topilmadi.';return;}composer.value=text;composer.dispatchEvent(new Event('input',{bubbles:true}));composer.focus();status.textContent='Build Spec chatga ko‘chirildi. Yuborish tugmasini bosing.';});
        const actions=el('div','v2-tool-actions');actions.append(architect,spec,audit,qa,model,copy,send);content.append(title.wrap,idea.wrap,context.wrap,actions,code.wrap,modelName.wrap,modelStyle.wrap,modelScale.wrap,result);
      }else if(name==='engines'){
        content.append(el('p','v2-muted','API kalitisiz ishlaydigan lokal auditlar va aniq chegarasi ko‘rsatilgan yordamchi engine’lar. Natija Studio ichida obyekt yaratildi degani emas.'));
        const source=field('Luau kod yoki skript','Tahlil qilinadigan Luau kodini shu yerga qo‘ying.');
        const seed=field('Xarita seed / nomi','Masalan: Steal an Egg · desert', 'quruvchi-v2');
        const paths=field('Skript/fayl yo‘llari (har qator alohida)','ServerScriptService/Main.server.lua', '');
        const result=el('pre','v2-tool-output','Natija shu yerda ko‘rinadi.');
        const run=async(action,payload={})=>{status.textContent='Tekshirilmoqda…';try{const data=await api('/api/v2/toolkit',{action,...payload});result.textContent=JSON.stringify(data,null,2);status.textContent='Tayyor · natijani ko‘rib chiqing.';}catch(e){status.textContent=e.message;}};
        const actions=el('div','v2-tool-actions');
        actions.append(btn('Luau audit','v2-secondary',()=>run('luau-audit',{source:source.input.value})),
          btn('Performance audit','v2-secondary',()=>run('performance-audit',{source:source.input.value})),
          btn('12 zona blueprint','v2-primary',()=>run('world-blueprint',{seed:seed.input.value,style:'user-defined'})),
          btn('QA checklist','v2-secondary',()=>run('qa-plan',{title:seed.input.value||'Roblox o‘yini'})),
          btn('Modul xaritasi','v2-secondary',()=>run('architecture-graph',{paths:paths.input.value})),
          btn('Rollback checklist','v2-secondary',()=>run('rollback-checklist')),
          btn('Parallel Luau yo‘riqnomasi','v2-secondary',()=>run('parallel-luau')),
          btn('Parametrik model spec','v2-secondary',()=>run('parametric-model')));
        const catalog=el('div','v2-engine-list');
        try{const data=await api('/api/v2/engines');for(const tech of data.technologies){const card=el('article','v2-engine-card');card.append(el('b','',tech.name),el('span','v2-badge',''+tech.status),el('p','',tech.description));catalog.append(card);}}catch(e){catalog.append(el('p','v2-muted',e.message));}
        content.append(source.wrap,seed.wrap,paths.wrap,actions,result,el('h3','v2-section-title','10 texnologiya'),catalog);
      }else{
        content.append(el('p','v2-muted','Holat haqiqiy imkoniyatni bildiradi. “Yordamchi” holati avtomatik Play-test bajarildi degani emas.'));
        try{const data=await api('/api/v2/capabilities'),grid=el('div','v2-cap-grid');for(const cap of data.capabilities){const card=el('article','v2-cap-card'),top=el('div','v2-cap-top');top.append(el('b','',cap.name),el('span','v2-badge v2-'+cap.status,cap.status));card.append(top,el('p','',cap.description));grid.append(card);}content.append(grid);}
        catch(e){content.append(el('p','v2-muted',e.message));}
      }
    }
    showTab('plan');const onKey=e=>{if(e.key==='Escape'){backdrop.remove();document.removeEventListener('keydown',onKey);}};document.addEventListener('keydown',onKey);
  }
  new MutationObserver(mount).observe(root,{childList:true,subtree:true});mount();
})();
