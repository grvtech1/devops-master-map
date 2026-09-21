/* ===== 🎲 Spaced revision drill — due pehle, weak/wrong weighted, intervals 0/1/3/7/14/30 din ===== */
var drQ=[],drIdx=0,drOK=0;
function dueList(){const now=Date.now(),due=[],fresh=[],later=[];CH.forEach(c=>c.quiz.forEach((q,qi)=>{const st=S.qs[qkey(c.id,qi)];const it={c:c,qi:qi,q:q,st:st};if(!st)fresh.push(it);else if(st.next<=now)due.push(it);else later.push(it)}));return {due:due,fresh:fresh,later:later}}
function dueCount(){return dueList().due.length}
function startDrill(){
  const dl=dueList();
  const w=it=>(it.st?it.st.w*3:0)+(S.weak[it.c.id]?5:0)+Math.random();
  let pool=shuffled(dl.due).sort((a,b)=>w(b)-w(a)).slice(0,10);const nDue=pool.length;
  if(pool.length<10)pool=pool.concat(shuffled(dl.fresh).sort((a,b)=>w(b)-w(a)).slice(0,10-pool.length));
  if(pool.length<10)pool=pool.concat(shuffled(dl.later).slice(0,10-pool.length));
  drQ=pool;drIdx=0;drOK=0;
  document.getElementById('drillscore').textContent='';
  const info=document.getElementById('drillinfo');if(info)info.textContent='📅 Aaj due: '+dl.due.length+' · kabhi nahi poochhe: '+dl.fresh.length+' · scheduled aage: '+dl.later.length+' — is round me due '+nDue+', weak-marked chapters pehle.';
  showDr();
  document.getElementById('drill').scrollIntoView({block:'start'});
}
function showDr(){
  var b=document.getElementById('drillbody');
  if(drIdx>=drQ.length){
    b.innerHTML='';
    document.getElementById('drillscore').textContent='🏁 Score: '+drOK+'/'+drQ.length+(drOK===drQ.length?' — perfect! 🔥':' — jo galat hue, wo kal phir aayenge (interval reset)');
    updateProgress();return;
  }
  var item=drQ[drIdx],st=item.st;
  var pairs=shuffled(item.q.o.map(function(o,oi){return {o:o,oi:oi};}));
  var tag=st?(st.next<=Date.now()?'due · streak '+st.n:'scheduled'):'naya';
  b.innerHTML='<div class="qq"><div class="qt">'+(drIdx+1)+'/'+drQ.length+' · <span style="color:var(--sub);font-weight:600">['+short(item.c.tt)+' · '+tag+']</span> '+item.q.q+'</div><div class="qopts" id="dropts">'+pairs.map(function(p){return '<button type="button" class="qo" onclick="ansDr('+p.oi+','+item.q.a+',this)">'+p.o+'</button>';}).join('')+'</div><div class="qexp" id="drexp"></div></div>';
}
function ansDr(oi,a,el){
  var wrap=document.getElementById('dropts');if(wrap.dataset.done)return;wrap.dataset.done='1';
  var exp=document.getElementById('drexp'),item=drQ[drIdx],ok=(oi===a),now=Date.now();
  var st=qStat(item.c.id,item.qi);
  if(ok){st.n=Math.min(st.n+1,INTERVALS.length-1);st.next=now+INTERVALS[st.n]*DAY;st.c++;drOK++}else{st.w++;st.n=0;st.next=now}
  st.last=now;S.qs[qkey(item.c.id,item.qi)]=st;save();
  el.classList.add(ok?'ok':'no');
  exp.style.display='block';
  exp.style.background=ok?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)';
  exp.style.color=ok?'var(--green)':'var(--red)';
  exp.textContent=(ok?'✅ ':'❌ ')+item.q.exp+(ok?'  · agla revise: '+INTERVALS[st.n]+' din baad':'  · kal phir');
  var c=item.c,before=S.m[c.id]&&S.m[c.id].i;
  if(mastery(c)===4&&!before){S.m[c.id]=S.m[c.id]||{};S.m[c.id].i=now;save();toast('★ Interview ready — '+short(c.tt))}
  refreshChip(c.id);
  setTimeout(function(){drIdx++;showDr();},1700);
}

// BACKUP & SYNC FUNCTIONS
function openSyncModal() {
  const el = document.getElementById('syncModal');
  const txt = document.getElementById('syncJsonArea');
  if (el) el.classList.add('open');
  if (txt) txt.value = JSON.stringify(S, null, 2);
}

function closeSyncModal() {
  const el = document.getElementById('syncModal');
  if (el) el.classList.remove('open');
}

function exportProgressFile() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(S, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", "devops_master_map_progress.json");
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('💾 Progress exported successfully!');
}

function importProgressFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (typeof parsed === 'object') {
        S = Object.assign({}, S, parsed);
        save();
        render();
        renderNav();
        updateProgress();
        closeSyncModal();
        toast('🎉 Progress imported and restored!');
      }
    } catch(err) {
      alert('Invalid JSON file format.');
    }
  };
  reader.readAsText(file);
}

function copySyncJson() {
  const txt = document.getElementById('syncJsonArea');
  if (txt) {
    txt.select();
    navigator.clipboard.writeText(txt.value);
    toast('📋 Progress JSON copied to clipboard!');
  }
}

function applySyncJson() {
  const txt = document.getElementById('syncJsonArea');
  if (!txt) return;
  try {
    const parsed = JSON.parse(txt.value);
    S = Object.assign({}, S, parsed);
    save();
    render();
    renderNav();
    updateProgress();
    closeSyncModal();
    toast('✅ Progress applied successfully!');
  } catch(e) {
    alert('Invalid JSON entered. Please check syntax.');
  }
}

function resetAllProgress() {
  if (confirm('Kya aap sach me saari quiz streaks aur progress reset karna chahte hain?')) {
    localStorage.removeItem(KEY);
    S = { q: {}, m: {}, qs: {}, weak: {}, bm: {}, notes: {}, track: 'full' };
    save();
    render();
    renderNav();
    updateProgress();
    closeSyncModal();
    toast('🗑️ Progress reset to 0%');
  }
}
