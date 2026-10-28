(() => {
  const root = document.getElementById('app');
  if (!root) return;
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };
  const btn = (label, cls, fn) => { const b=el('button',cls,label); b.type='button'; b.addEventListener('click',fn); return b; };
  async function api(path, body) {
    const opts={credentials:'same-origin',headers:{}};
    if(body!==undefined){opts.method='POST';opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
    const res=await fetch(path,opts); const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'So‘rov bajarilmadi'); return data;
  }
  function mount() {
    const sidebar=root.querySelector('.sidebar'); if(!sidebar)return;
    if(!sidebar.querySelector('.v2-side-link')){
      const entry=btn('✦  Quruvchi V2','side-link v2-side-link',openPanel);entry.title='V2 imkoniyatlari va loyiha xotirasi';
      const settings=[...sidebar.querySelectorAll('.side-link')].find(n=>n.textContent.includes('Sozlamalar'));
      if(settings)settings.before(entry);else sidebar.append(entry);
    }
    if(!document.querySelector('.v2-floating-trigger')){
      const trigger=btn('✦','v2-floating-trigger',openPanel);trigger.setAttribute('aria-label','Quruvchi V2 panelini ochish');document.body.append(trigger);
    }
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
    const tabs=el('div','v2-tabs'),tabPlan=btn('Loyiha arxitektori','active',()=>showTab('plan')),tabMemory=btn('Loyiha xotirasi','',()=>showTab('memory')),tabCaps=btn('V2 imkoniyatlari','',()=>showTab('caps')),tabEngines=btn('10 texnologiya','',()=>showTab('engines'));
    tabs.append(tabPlan,tabMemory,tabEngines,tabCaps);panel.append(tabs);
    const content=el('div','v2-content');panel.append(content);const status=el('p','v2-status','Tayyor');panel.append(status);
    const foot=el('div','v2-foot');foot.append(el('span','','Studio ulanishi mavjud bo‘lsa, reja chatga yuborib qurishni boshlash mumkin.'));
    const link=el('a','','GitHub main');link.href='https://github.com/mirfayzfarxodov1-png/RobloxAI-Agent';link.target='_blank';link.rel='noreferrer';foot.append(link);panel.append(foot);
    backdrop.append(panel);backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.remove();});document.body.append(backdrop);
    async function showTab(name){
      for(const [key,b] of [['plan',tabPlan],['memory',tabMemory],['caps',tabCaps],['engines',tabEngines]])b.classList.toggle('active',key===name);
      content.replaceChildren();status.textContent='Tayyor';
      if(name==='plan'){
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
