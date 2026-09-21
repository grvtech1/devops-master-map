/* ===== CORE APP ENGINE (State, Router, Lifecycle) ===== */
/* ================= STATE ================= */
const KEY='master_map_v1';
let S; try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
['q','m','qs','weak','bm','notes'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]={}});
if(!S.track||!TRACKS[S.track])S.track='full';
if(S.view!=='expert')S.view='beginner';
const DAY=86400000,INTERVALS=[0,1,3,7,14,30],XP_LVL=25;
const LVL=[{s:'○',t:'Not started'},{s:'◔',t:'Understood'},{s:'●',t:'Can recall'},{s:'◆',t:'Can apply'},{s:'★',t:'Interview ready'}];
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function quizPassed(c){const st=S.q[c.id]||[];return c.quiz.length>0&&c.quiz.every((_,i)=>st[i])}
function hasLab(c){return !!LABS[c.id]}
function qkey(cid,qi){return cid+'#'+qi}
function qStat(cid,qi){return S.qs[qkey(cid,qi)]||{n:0,next:0,w:0,c:0,last:0}}
function spacedOK(c){return c.quiz.length>0&&c.quiz.every((_,qi)=>qStat(c.id,qi).n>=2)}
/* mastery ladder — contiguous: ◔ quiz sab sahi → ● recall self-attest → ◆ lab done (agar lab hai) → ★ spaced drill me har sawaal 2+ baar sahi */
function mastery(c){const m=S.m[c.id]||{};if(!quizPassed(c))return 0;if(!m.r)return 1;if(hasLab(c)&&!m.a)return 2;if(!spacedOK(c))return 3;return 4}
function chDone(c){return mastery(c)>=1}
CH.forEach(c=>{if(quizPassed(c)){S.m[c.id]=S.m[c.id]||{};if(!S.m[c.id].u)S.m[c.id].u=Date.now()}});
function shuffled(items){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}

/* ================= TRACKS / ORDER ================= */
let ORDER=[];
function orderedCH(){
  const tr=TRACKS[S.track];if(!tr||!tr.ids)return CH.map(c=>({c:c,inTrack:true}));
  const byId={};CH.forEach(c=>{byId[c.id]=c});const set=new Set(tr.ids);
  return tr.ids.filter(id=>byId[id]).map(id=>({c:byId[id],inTrack:true})).concat(CH.filter(c=>!set.has(c.id)).map(c=>({c:c,inTrack:false})));
}
function setTrack(v){if(!TRACKS[v])return;S.track=v;save();render();observeAll();toast('🧭 Track: '+TRACKS[v].name)}
function toggleView(){S.view=S.view==='expert'?'beginner':'expert';save();render();observeAll();toast(S.view==='expert'?'🧑‍🔧 Expert view — sab layers khule':'👶 Beginner view — pehle Level 1, baaki click pe')}
function syncTrackUI(){
  const sel=document.getElementById('trackSel');
  if(sel){sel.innerHTML=Object.keys(TRACKS).map(k=>'<option value="'+k+'"'+(k===S.track?' selected':'')+'>'+TRACKS[k].name+'</option>').join('')}
  const d=document.getElementById('trackDesc');if(d)d.textContent=(TRACKS[S.track]||TRACKS.full).desc+(TRACKS[S.track].ids?' · '+TRACKS[S.track].ids.length+' chapters is track me, baaki reference.':'');
  const vb=document.getElementById('viewBtn');if(vb)vb.textContent=S.view==='expert'?'🧑‍🔧 Expert view (sab khula) — switch':'👶 Beginner view (layers band) — switch';
}

/* ================= RENDER (v2 layers) ================= */
function levelOf(c){const o=META[c.id]&&META[c.id].lvl;if(o)return o;return {'Foundations':'Beginner','Workloads':'Core','Networking':'Core','Security':'Core','Cloud & Delivery':'Advanced','Operations':'Advanced'}[c.grp]||'Core'}
function wc(s){return stripTags(s).split(' ').filter(Boolean).length}
function mins(w){return Math.max(2,Math.round(w/170))}
function splitMech(m){const x=m.match(/^(<div class="blk-label">🎯 \d+ tricks[\s\S]*?<\/table>(?:\s*<p[^>]*>[\s\S]*?<\/p>)?)([\s\S]*)$/);return x?{tricks:x[1],rest:x[2]}:{tricks:'',rest:m}}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function short(t){return t.split(' — ')[0]}
function navLink(c,isBm){const a=document.createElement('a');a.href='#'+c.id;a.dataset.idx=searchIndex(c);a.dataset.cid=c.id;const l=mastery(c);a.innerHTML='<span class="nsym l'+l+'">'+LVL[l].s+'</span>'+c.ico+' <span>'+short(c.tt)+'</span>'+(S.weak[c.id]?'<span class="nflag">⚠️</span>':'')+(!isBm&&S.bm[c.id]?'<span class="nflag">⭐</span>':'');return a}
function renderNav(){
  const nav=document.getElementById('navlist');nav.innerHTML='';
  const tr=TRACKS[S.track]||TRACKS.full;
  const bms=CH.filter(c=>S.bm[c.id]);
  if(bms.length){const g=document.createElement('div');g.className='grp';g.textContent='⭐ Bookmarks';nav.appendChild(g);bms.forEach(c=>nav.appendChild(navLink(c,true)))}
  let curGrp='';
  ORDER.forEach(o=>{const c=o.c;const grpName=tr.ids?(o.inTrack?tr.name:'📎 Baaki (reference)'):c.grp;
    if(grpName!==curGrp){curGrp=grpName;const g=document.createElement('div');g.className='grp';g.textContent=curGrp;nav.appendChild(g)}
    nav.appendChild(navLink(c,false))});
  filterNav();
}
function render(){
  ORDER=orderedCH();
  const wrap=document.getElementById('chapters');wrap.innerHTML='';
  const tr=TRACKS[S.track]||TRACKS.full,trackN=ORDER.filter(o=>o.inTrack).length,open=S.view==='expert'?' open':'';
  let dividerDone=false,ti=0,ri=0;
  ORDER.forEach((o,ci)=>{
    if(tr.ids&&!o.inTrack&&!dividerDone){dividerDone=true;const dv=document.createElement('div');dv.className='track-divider';dv.textContent='📎 Is track me nahi — reference ke liye neeche';wrap.appendChild(dv)}
    const pos=tr.ids?(o.inTrack?('Track '+(++ti)+' / '+trackN):('Ref '+(++ri))):((ci+1)+' / '+CH.length);
    wrap.appendChild(chapterEl(o.c,ci,pos,open));
  });
  renderNav();addCopy();simInitAll();updateProgress();syncTrackUI();
}
function chapterEl(c,ci,pos,open){
  const d=document.createElement('section');d.className='ch'+(mastery(c)>=1?' done':'');d.id=c.id;
  const m=S.m[c.id]||{},lvl=mastery(c);
  const learn=LEARNING[c.id]||{why:'Is chapter ka bridge note abhi likha nahi — content niche poora hai.',r:['Is chapter ka core idea ek line me bolo.','Ek real scenario bolo jahan ye kaam aata hai.']};
  const prev=ORDER[ci-1]&&ORDER[ci-1].c,next=ORDER[ci+1]&&ORDER[ci+1].c;
  const sp=splitMech(c.mech),L=LABS[c.id];
  const l1=mins(wc(c.wrong+c.ana.d+sp.tricks)),l2=mins(wc(sp.rest)),l3=mins(wc(c.gs.flat().join(' ')+c.proj.join(' ')+c.one));
  const tot=l1+l2+l3+Math.ceil(c.quiz.length*0.5)+(L?L.min:0);
  const gsRows=c.gs.map(r=>'<tr><td>❌ '+r[0]+'</td><td>✅ '+r[1]+'</td></tr>').join('');
  const quizHtml=c.quiz.map((q,qi)=>{
    const st=(S.q[c.id]||[])[qi];
    const pairs=shuffled(q.o.map((o,oi)=>({o:o,oi:oi})));
    const opts=pairs.map(p=>'<button type="button" class="qo'+(st&&p.oi===q.a?' ok':'')+'" onclick="ans(\''+c.id+'\','+qi+','+p.oi+','+q.a+',this)">'+p.o+'</button>').join('');
    return '<div class="qq"><div class="qt">'+(qi+1)+'. '+q.q+'</div><div class="qopts">'+opts+'</div><div class="qexp" id="exp-'+c.id+'-'+qi+'"'+(st?' style="display:block;background:rgba(34,197,94,.1);color:var(--green)"':'')+'>'+(st?'✅ '+q.exp:'')+'</div></div>';
  }).join('');
  const labHtml=L?'<details class="lvl lab" id="lab-'+c.id+'"'+open+'><summary><span class="lvl-n">LAB</span>🧪 Prove it yourself — <span class="lvl-sub">'+L.t+' · predict → execute → observe → explain</span><span class="lvl-time">~'+L.min+' min</span></summary><div class="lvlbody labbody"><div class="labstep"><b>1 · Predict (pehle likho)</b>'+L.predict+'</div><div class="labstep"><b>2 · Execute</b><pre>'+escHtml(L.steps.join('\n'))+'</pre></div><div class="labstep"><b>3 · Expect</b><span class="expect">'+L.expect+'</span></div><div class="labstep"><b>4 · Explain (bina dekhe)</b>'+L.explain+'</div><button type="button" class="attest'+(m.a?' done':'')+'" onclick="attest(\''+c.id+'\',\'a\',this)">'+(m.a?'✔ Lab done — ◆ Can apply (undo = click)':'✔ Expected output mila — lab done')+'</button></div></details>':'';
  const chapterNav='<div class="chapter-nav">'+(prev?'<button type="button" onclick="go(\''+prev.id+'\')">← '+short(prev.tt)+'</button>':'')+(next?'<button type="button" onclick="go(\''+next.id+'\')">Next: '+short(next.tt)+' →</button>':'<button type="button" onclick="go(\'rapid\')">Rapid-fire review →</button>')+'</div>';
  d.innerHTML=
    '<div class="ch-head"><span class="ico">'+c.ico+'</span><h2>'+c.tt+'</h2><span class="mchip l'+lvl+'">'+LVL[lvl].s+' '+LVL[lvl].t+'</span></div>'+
    '<div class="meta"><span>⏱ ~'+tot+' min <em>(Level 1: ~'+l1+' min)</em></span><span>📶 '+levelOf(c)+'</span>'+(prev?'<span>🔗 Pehle: '+short(prev.tt)+'</span>':'')+(SIMS[c.id]?'<button type="button" class="metabtn" onclick="openSim(\''+c.id+'\')">▶ Live flow</button>':'')+(L?'<button type="button" class="metabtn" onclick="openLab(\''+c.id+'\')">🧪 Do lab</button>':'')+'</div>'+
    '<div class="outcome">🎯 <b>Iske baad tum bol paoge:</b> '+learn.r[0]+'</div>'+
    '<div class="bridge"><span class="pos">'+pos+'</span><b>Ye chapter chain me kyun hai?</b><span>'+learn.why+'</span></div>'+
    '<section class="lvl lvl1"><div class="lvl-head"><span class="lvl-n">LEVEL 1</span>Samjho <span class="lvl-sub">— galat assumption, analogy, core tricks</span><span class="lvl-time">~'+l1+' min</span></div>'+
      '<div class="blk wrongbox"><div class="blk-label">❌ Pehle galat assumption pakdo</div>'+c.wrong+'</div>'+
      '<div class="blk anabox"><div class="blk-label">'+c.ana.e+' Analogy — '+c.ana.t+'</div>'+c.ana.d+'</div>'+
      (sp.tricks?'<div class="blk mech">'+sp.tricks+'</div>':'')+'</section>'+
    simHtml(c.id)+labHtml+
    '<details class="lvl lvl2"'+open+'><summary><span class="lvl-n">LEVEL 2</span>Mechanism <span class="lvl-sub">— kaun kisko call karta, commands, state, kyun chalta</span><span class="lvl-time">~'+l2+' min</span></summary><div class="lvlbody"><div class="blk mech">'+sp.rest+'</div></div></details>'+
    '<details class="lvl lvl3"'+open+'><summary><span class="lvl-n">LEVEL 3</span>Production / Interview <span class="lvl-sub">— galat-vs-sahi, projects, interview line</span><span class="lvl-time">~'+l3+' min</span></summary><div class="lvlbody">'+
      '<div class="blk"><div class="blk-label" style="color:var(--yellow)">❌ Galat vs ✅ Sahi</div><table class="gs"><tr><th>❌ Galat</th><th>✅ Sahi</th></tr>'+gsRows+'</table></div>'+
      '<div class="blk"><div class="blk-label" style="color:var(--orange)">🏭 Mere projects me</div><div class="proj-label">Generic concept upar hai; ye MERA context — Billfree wale "confirm karna" items = inferred, fact nahi.</div><div class="projbox"><div class="projcard"><b>🎓 MY PROJECT — VANTA (kind / kubeadm / EKS)</b>'+c.proj[0]+'</div><div class="projcard bf"><b>💼 MY PRODUCTION CONTEXT — Billfree (AWS)</b>'+c.proj[1]+'</div></div></div>'+
      '<div class="blk oneliner"><div class="blk-label">🎯 Interview me aise bolo</div>'+c.one+'</div></div></details>'+
    '<details class="recall" open><summary>🧠 Recall checkpoint — notes band karke bolo</summary><ol><li>'+learn.r[0]+'</li><li>'+learn.r[1]+'</li></ol><button type="button" class="attest'+(m.r?' done':'')+'" onclick="attest(\''+c.id+'\',\'r\',this)">'+(m.r?'✔ Bola — ● Can recall (undo = click)':'✔ Bina notes ke dono bol diye')+'</button></details>'+
    '<div class="blk quiz"><div class="blk-label">🧠 Quiz — saare sahi = ◔ Understood</div>'+quizHtml+'</div>'+
    '<div class="tools"><button type="button" class="'+(S.bm[c.id]?'on':'')+'" onclick="toggleFlag(\''+c.id+'\',\'bm\',this)">'+(S.bm[c.id]?'⭐ Bookmarked':'☆ Bookmark')+'</button><button type="button" class="'+(S.weak[c.id]?'on':'')+'" onclick="toggleFlag(\''+c.id+'\',\'weak\',this)">'+(S.weak[c.id]?'⚠️ Weak — drill me priority':'⚑ Mark weak')+'</button><details class="note"'+(S.notes[c.id]?' open':'')+'><summary>📝 Meri note</summary><textarea placeholder="Apne shabdon me — jo click hua, jo atka…" oninput="noteSave(\''+c.id+'\',this)">'+escHtml(S.notes[c.id]||'')+'</textarea></details></div>'+
    chapterNav;
  return d;
}
function addCopy(){document.querySelectorAll('#chapters pre').forEach(pre=>{if(pre.querySelector('.cp'))return;const b=document.createElement('button');b.type='button';b.className='cp';b.textContent='copy';b.addEventListener('click',()=>{const t=pre.innerText.replace(/copy$/,'');if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>{b.textContent='copied ✓';setTimeout(()=>{b.textContent='copy'},1200)})});pre.appendChild(b)})}
function openLab(cid){const d=document.getElementById('lab-'+cid);if(!d)return;d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}
function refreshChip(cid){const c=CH.find(x=>x.id===cid);if(!c)return;const l=mastery(c);const chip=document.querySelector('#'+cid+' .mchip');if(chip){chip.className='mchip l'+l;chip.textContent=LVL[l].s+' '+LVL[l].t}document.querySelectorAll('#navlist a[data-cid="'+cid+'"] .nsym').forEach(n=>{n.className='nsym l'+l;n.textContent=LVL[l].s});const sec=document.getElementById(cid);if(sec)sec.classList.toggle('done',l>=1)}
function attest(cid,k,el){
  S.m[cid]=S.m[cid]||{};const was=!!S.m[cid][k];
  if(was)delete S.m[cid][k];else S.m[cid][k]=Date.now();
  save();el.classList.toggle('done',!was);
  if(k==='r')el.textContent=was?'✔ Bina notes ke dono bol diye':'✔ Bola — ● Can recall (undo = click)';
  if(k==='a')el.textContent=was?'✔ Expected output mila — lab done':'✔ Lab done — ◆ Can apply (undo = click)';
  refreshChip(cid);updateProgress();
  const c=CH.find(x=>x.id===cid);if(!was){const l=mastery(c);toast(l>=2?LVL[l].s+' '+LVL[l].t+' — '+short(c.tt):(k==='a'?'Lab ✓ — ab quiz + recall bhi karo':'Recall ✓ — quiz sab sahi karo to ● milega'))}
}
function toggleFlag(cid,k,el){if(S[k][cid])delete S[k][cid];else S[k][cid]=true;save();const on=!!S[k][cid];el.classList.toggle('on',on);if(k==='bm')el.textContent=on?'⭐ Bookmarked':'☆ Bookmark';if(k==='weak')el.textContent=on?'⚠️ Weak — drill me priority':'⚑ Mark weak';renderNav();if(k==='weak'&&on)toast('⚠️ Weak mark — drill isko pehle uthayega')}
let noteT;function noteSave(cid,el){S.notes[cid]=el.value;clearTimeout(noteT);noteT=setTimeout(save,400)}
function ans(cid,qi,oi,a,el){
  const c=CH.find(x=>x.id===cid);
  if((S.q[cid]||[])[qi])return;
  const exp=document.getElementById('exp-'+cid+'-'+qi),st=qStat(cid,qi),now=Date.now();
  if(oi===a){
    el.classList.add('ok');
    if(!S.q[cid])S.q[cid]=[];S.q[cid][qi]=true;
    st.n=Math.max(st.n,1);st.next=now+INTERVALS[1]*DAY;st.c++;st.last=now;S.qs[qkey(cid,qi)]=st;
    exp.style.display='block';exp.style.background='rgba(34,197,94,.1)';exp.style.color='var(--green)';exp.textContent='✅ '+c.quiz[qi].exp;
    if(quizPassed(c)){S.m[cid]=S.m[cid]||{};if(!S.m[cid].u)S.m[cid].u=now;toast(c.ico+' ◔ Understood — ab recall checkpoint bolo'+(hasLab(c)?' + lab karo':''))}
    save();refreshChip(cid);updateProgress();
  }else{
    st.w++;st.n=0;st.next=now;S.qs[qkey(cid,qi)]=st;save();
    el.classList.add('no');
    exp.style.display='block';exp.style.background='rgba(239,68,68,.1)';exp.style.color='var(--red)';exp.textContent='❌ Nahi — phir socho. Hint: Level 1 ka galat-assumption box dubara padho.';
    setTimeout(()=>{el.classList.remove('no')},900);
  }
}
function updateProgress(){
  const ls=CH.map(mastery),n=[0,0,0,0,0];ls.forEach(l=>n[l]++);
  const pts=ls.reduce((a,b)=>a+b,0);
  document.getElementById('pfill').style.width=(pts/(4*CH.length)*100)+'%';
  document.getElementById('pdone').innerHTML='★ '+n[4]+' · ◆ '+n[3]+' · ● '+n[2]+' · ◔ '+n[1]+' · ○ '+n[0]+' <span style="opacity:.7">/ '+CH.length+'</span>';
  document.getElementById('pxp').textContent=(pts*XP_LVL)+' XP';
  const need=['Level 1 padho + quiz','Recall checkpoint bolo','Lab karo','Drill me spaced revise'];
  let nxt=null;for(let want=1;want<=4&&!nxt;want++){nxt=ORDER.find(o=>o.inTrack&&mastery(o.c)<want)||ORDER.find(o=>mastery(o.c)<want)}
  const btn=document.getElementById('continueBtn');
  if(btn){if(nxt){btn.textContent='Ab: '+short(nxt.c.tt)+' — '+need[mastery(nxt.c)];btn.dataset.target=nxt.c.id}else{btn.textContent='Sab ★ — drill chalao';btn.dataset.target='drill'}}
  const dn=document.getElementById('dueN');if(dn)dn.textContent=dueCount();
}
function continueLearning(){const b=document.getElementById('continueBtn');go(b.dataset.target||'ch1')}
function go(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth'});toggleMenu(false)}
/* ===== Expert search: full-content index, multi-word AND, count, Enter-jump ===== */
function stripTags(s){return String(s||'').replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ').toLowerCase()}
function searchIndex(c){
  return stripTags([c.grp,c.tt,c.wrong,c.ana&&c.ana.t,c.ana&&c.ana.d,c.mech,c.one,
    (c.gs||[]).map(r=>r.join(' ')).join(' '),(c.proj||[]).join(' '),
    (c.quiz||[]).map(q=>q.q+' '+q.exp).join(' '),LABS[c.id]?LABS[c.id].t+' '+LABS[c.id].steps.join(' '):'',S.notes[c.id]||''].join(' '));
}
let filtHits=[];
function filterNav(){
  const f=document.getElementById('filt');if(!f)return;
  const v=f.value.trim().toLowerCase();
  const terms=v.split(/\s+/).filter(Boolean);
  filtHits=[];
  document.querySelectorAll('#navlist a').forEach(a=>{
    const idx=a.dataset.idx||'';
    const hit=terms.every(t=>idx.includes(t));
    a.style.display=hit?'flex':'none';
    a.classList.toggle('hit',hit&&terms.length>0);
    if(hit&&terms.length)filtHits.push(a);
  });
  document.querySelectorAll('#navlist .grp').forEach(g=>{
    let n=g.nextElementSibling,any=false;
    while(n&&!n.classList.contains('grp')){if(n.style.display!=='none')any=true;n=n.nextElementSibling}
    g.style.display=any?'':'none';
  });
  const fc=document.getElementById('filtcount');
  if(fc)fc.textContent=terms.length?(filtHits.length?filtHits.length+' match'+(filtHits.length===1?'':'es')+' — Enter = pehle pe jao':'koi match nahi — spelling/doosra shabd try karo'):'';
}
function filterKey(e){
  if(e.key==='Enter'&&filtHits.length){e.preventDefault();const id=filtHits[0].getAttribute('href').slice(1);go(id);flashCh(id);}
  if(e.key==='Escape'){e.target.value='';filterNav();}
}
function flashCh(id){const el=document.getElementById(id);if(!el)return;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1400)}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function tog(){
  const t=document.documentElement,isD=t.getAttribute('data-theme')==='dark';
  t.setAttribute('data-theme',isD?'light':'dark');
  document.getElementById('tog').textContent=isD?'🌙 Dark':'☀️ Light';
  localStorage.setItem('master_map_theme',isD?'light':'dark');
}
function toggleMenu(force){
  const side=document.getElementById('side'),backdrop=document.getElementById('backdrop'),btn=document.getElementById('menuBtn');
  const open=typeof force==='boolean'?force:!side.classList.contains('open');
  side.classList.toggle('open',open);backdrop.classList.toggle('open',open);btn.setAttribute('aria-expanded',String(open));
}

// DIAGNOSTIC PLACEMENT MODAL
function openDiagModal() {
  const el = document.getElementById('diagModal');
  if (el) el.classList.add('open');
}

function closeDiagModal() {
  const el = document.getElementById('diagModal');
  if (el) el.classList.remove('open');
}

function submitDiagQuiz() {
  const g1 = +document.querySelector('input[name="d1"]:checked').value;
  const g2 = +document.querySelector('input[name="d2"]:checked').value;
  const goal = document.querySelector('input[name="d3"]:checked').value;

  let chosen = 'new';
  if (goal === 'troubleshoot') {
    chosen = 'troubleshoot';
  } else if (goal === 'interview') {
    chosen = 'interview';
  } else if (g1 >= 1 && g2 >= 1) {
    chosen = 'k8s';
  }

  closeDiagModal();
  setTrack(chosen);
  toast('🎯 Recommended Track Activated: ' + (TRACKS[chosen] ? TRACKS[chosen].name : chosen));
}

/* ===== boot ===== */
const savedTheme=localStorage.getItem('master_map_theme');
if(savedTheme){document.documentElement.setAttribute('data-theme',savedTheme);document.getElementById('tog').textContent=savedTheme==='dark'?'☀️ Light':'🌙 Dark'}
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('#navlist a').forEach(l=>l.classList.remove('active'));const a=document.querySelector('#navlist a[href="#'+e.target.id+'"]');if(a)a.classList.add('active')}})},{rootMargin:'-20% 0px -70% 0px'});
function observeAll(){document.querySelectorAll('.ch').forEach(s=>io.observe(s))}
render();observeAll();
document.querySelectorAll('.mnode[onclick]').forEach(n=>{n.setAttribute('role','button');n.tabIndex=0;n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click()}})});
/* ===== 🎤 Interview Rapid-Fire — CH data se auto ===== */
(function(){
  var el=document.getElementById('rapidlist');if(!el)return;
  el.innerHTML=CH.map(function(c){return '<details class="recall" style="margin:8px 0"><summary>'+c.ico+' '+c.tt+'</summary><div>'+c.one+'</div></details>';}).join('');
})();
