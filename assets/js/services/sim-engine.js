/* ================= SIM ENGINE (v3 live flows: state · actor · event · why) ================= */
if(!S.sim||typeof S.sim!=='object')S.sim={};
const SIMR={};
function mkStep(at,who,saw,decision,action,result,extra){return Object.assign({at:at,who:who,saw:saw,decision:decision,action:action,result:result},extra||{})}
function plain(s){return String(s||'').replace(/<[^>]+>/g,'')}
function simFlowDef(cid,fid){const s=SIMS[cid];if(!s)return null;if(fid==='normal')return {id:'normal',label:'▶ Normal flow',steps:s.normal||[]};if(fid==='hpa')return {id:'hpa',label:'Traffic simulator',steps:(SIMR[cid]&&SIMR[cid].gen)||[],q:s.q,hint:s.hint,ans:s.ans,cmd:s.cmd};return (s.breaks||[]).find(x=>x.id===fid)||null}
function simStepsOf(cid){const r=SIMR[cid];if(!r)return [];if(r.flow==='hpa')return r.gen||[];const d=simFlowDef(cid,r.flow);return d?d.steps:[]}
function simHtml(cid){
  const s=SIMS[cid];if(!s)return '';
  const actors=s.actors.map(a=>'<div class="sim-actor" id="sa-'+cid+'-'+a.id+'"><span class="sim-ico">'+(a.ico||'•')+'</span><span>'+a.label+'</span></div>').join('<div class="sim-link"></div>');
  const breaks=(s.breaks||[]).map(b=>'<button type="button" class="sim-brk" onclick="simFlow(\''+cid+'\',\''+b.id+'\')">💥 '+b.label+'</button>').join('');
  const slider=s.type==='hpa'?'<div class="sim-slider">🚦 Traffic: <input type="range" min="100" max="1000" step="50" value="200" id="sr-'+cid+'" oninput="document.getElementById(\'srv-'+cid+'\').textContent=this.value"> <b id="srv-'+cid+'">200</b> RPS <button type="button" class="primary" onclick="simHpa(\''+cid+'\')">Apply traffic →</button> <span class="sim-hint">2 pods se shuru · 1 node × 3 pods capacity · target 50% CPU · 200 RPS = ek pod 100%</span></div>':'';
  const total=(s.type==='hpa'?0:1)+(s.breaks||[]).length+(s.type==='hpa'?1:0),nd=Object.keys(S.sim[cid]||{}).length;
  return '<details class="lvl sim" id="sim-'+cid+'" open><summary><span class="lvl-n">LIVE</span>▶ Live flow <span class="lvl-sub">— '+s.title+'</span><span class="sim-badge" id="sbdg-'+cid+'">'+(nd?nd+'/'+total+' flows dekhe':'')+'</span><span class="lvl-time">state · actor · event · why</span></summary><div class="lvlbody">'+slider+
    '<div class="sim-body"><div class="sim-diagram"><div class="sim-dot" id="sd-'+cid+'"></div>'+actors+'</div><div class="sim-side"><div class="sim-state" id="ss-'+cid+'"></div><div class="sim-panel" id="sp-'+cid+'"></div></div></div>'+
    '<div class="sim-ctl"><span class="sim-flowname" id="sf-'+cid+'"></span><span class="sim-sep"></span>'+(s.type==='hpa'?'':'<button type="button" class="sim-norm" onclick="simFlow(\''+cid+'\',\'normal\')">▶ Normal flow</button>')+breaks+'</div>'+
    '<div class="sim-ctl"><button type="button" class="primary" onclick="simNext(\''+cid+'\')">⏭ Next step</button><button type="button" id="sb-play-'+cid+'" onclick="simPlay(\''+cid+'\')">▶ Play</button><button type="button" onclick="simReset(\''+cid+'\')">↺ Restart</button><label class="sim-pred"><input type="checkbox" id="spd-'+cid+'" checked> 🎯 predict mode — pehle guess: ab kaun act karega?</label></div>'+
    '<div class="sim-q" id="sq-'+cid+'"></div><div class="sim-log" id="sl-'+cid+'"></div></div></details>';
}
function simInitAll(){Object.keys(SIMS).forEach(cid=>{if(document.getElementById('sim-'+cid)){delete SIMR[cid];simReset(cid)}})}
function openSim(cid){const d=document.getElementById('sim-'+cid);if(!d)return;d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}
function simReset(cid){
  const s=SIMS[cid];if(!s)return;const prev=SIMR[cid]||{};if(prev.timer)clearTimeout(prev.timer);
  const flow=prev.flow||(s.type==='hpa'?'hpa':'normal');
  const r={flow:flow,i:-1,playing:false,pending:null,score:null,state:Object.assign({},s.state0||{}),packet:Object.assign({},s.packet0||{}),hpa:s.hpa?Object.assign({},s.hpa):null,hpaFinal:null,gen:null};
  SIMR[cid]=r;
  document.querySelectorAll('#sim-'+cid+' .sim-actor').forEach(a=>{a.className='sim-actor'});
  const dot0=document.getElementById('sd-'+cid);if(dot0)dot0.className='sim-dot';
  const pb=document.getElementById('sb-play-'+cid);if(pb)pb.textContent='▶ Play';
  document.getElementById('sq-'+cid).innerHTML='';document.getElementById('sl-'+cid).innerHTML='';
  if(flow!=='normal'&&flow!=='hpa'){(s.normal||[]).forEach(st=>{if(st.state)Object.assign(r.state,st.state);if(st.packet)Object.assign(r.packet,st.packet)})}
  const def=simFlowDef(cid,flow);
  document.getElementById('sf-'+cid).textContent=def?(def.label+(def.steps.length?' · '+def.steps.length+' steps':'')):'';
  simState(cid);
  const sp=document.getElementById('sp-'+cid);
  if(s.type==='hpa')sp.innerHTML='<div class="sim-hint">Slider se traffic set karo → <b>Apply traffic</b> → phir ⏭ Next step se ek-ek actor dekho (metrics → HPA → RS → scheduler → autoscaler).</div>';
  else if(flow==='normal')sp.innerHTML='<div class="sim-hint">⏭ <b>Next step</b> dabao. Predict mode ON = pehle guess karo ki ab kaun act karega, phir reveal — yahi asli learning hai. ▶ Play = auto.</div>';
  else sp.innerHTML='<div class="sim-hint">💥 <b>'+plain(def?def.label:'')+'</b> — normal flow ke END state se shuru (upar dekho). ⏭ Next step.</div>';
}
function simFlow(cid,fid){SIMR[cid]=SIMR[cid]||{};SIMR[cid].flow=fid;simReset(cid);const d=document.getElementById('sim-'+cid);if(d)d.open=true}
function simState(cid){
  const r=SIMR[cid],s=SIMS[cid],box=document.getElementById('ss-'+cid);if(!r||!box)return;let h='';
  if(s.type==='hpa'){const x=r.hpa;h='<div class="col d"><b>Desired (HPA)</b>replicas '+x.pods+' · target '+x.target+'% CPU · min '+x.min+' / max '+x.max+'</div><div class="col a"><b>Actual</b>Pods running '+(x.running!=null?x.running:x.pods)+(x.pending?' · <span style="color:var(--red)">Pending '+x.pending+'</span>':'')+' · CPU/pod '+(x.cpu!=null?x.cpu+'%':'—')+' · Nodes '+x.nodes+' (cap '+x.cap+' pods/node)</div>'}
  else{
    if(r.state.desired||r.state.actual)h+='<div class="col d"><b>Desired state</b>'+(r.state.desired||'—')+'</div><div class="col a"><b>Actual state</b>'+(r.state.actual||'—')+'</div>';
    const pk=Object.keys(r.packet||{});if(pk.length)h+='<div class="col pk"><b>Current packet</b>'+pk.map(k=>'<span>'+k+': <code>'+r.packet[k]+'</code></span>').join('')+'</div>';
  }
  box.innerHTML=h;
}
function simNext(cid){
  const r=SIMR[cid],s=SIMS[cid];if(!r||!s)return;if(r.pending)return;
  const steps=simStepsOf(cid);
  if(!steps.length){if(s.type==='hpa')toast('Pehle slider se traffic apply karo');return}
  if(r.i+1>=steps.length){simFinish(cid);return}
  const next=steps[r.i+1];
  const box=document.getElementById('spd-'+cid);
  if(box&&box.checked&&!r.playing){
    const acts=s.actors,ci=acts.findIndex(a=>a.id===next.at);
    const others=acts.filter((a,i)=>i!==ci);
    const pick=[others[(r.i+1)%others.length],others[(r.i+4)%others.length]].filter((a,i,arr)=>a&&arr.indexOf(a)===i);
    const opts=shuffled([acts[ci]].concat(pick));
    r.pending=next.at;
    document.getElementById('sp-'+cid).innerHTML='<div class="sim-pred-q">🎯 Ab kaun act karega? (step '+(r.i+2)+'/'+steps.length+')</div><div class="sim-pred-opts">'+opts.map(a=>'<button type="button" onclick="simGuess(\''+cid+'\',\''+a.id+'\')">'+(a.ico||'')+' '+a.label+'</button>').join('')+'</div>';
    return;
  }
  simReveal(cid,null);
}
function simGuess(cid,aid){const r=SIMR[cid];if(!r||!r.pending)return;const ok=aid===r.pending;r.pending=null;r.score=r.score||{ok:0,n:0};r.score.n++;if(ok)r.score.ok++;simReveal(cid,ok)}
function simReveal(cid,guess){
  const r=SIMR[cid],steps=simStepsOf(cid);r.i++;const st=steps[r.i];if(!st)return;
  document.querySelectorAll('#sim-'+cid+' .sim-actor.cur').forEach(a=>{a.classList.remove('cur');a.classList.add('done')});
  const el=document.getElementById('sa-'+cid+'-'+st.at);if(el){el.classList.remove('done');el.classList.add('cur');if(st.fail)el.classList.add('fail')}
  const dot=document.getElementById('sd-'+cid);if(dot&&el){dot.style.top=(el.offsetTop+el.offsetHeight/2-6)+'px';dot.className='sim-dot on'+(st.fail?' bad':'')}
  if(st.state)Object.assign(r.state,st.state);if(st.packet)Object.assign(r.packet,st.packet);if(st.hpa&&r.hpa)Object.assign(r.hpa,st.hpa);simState(cid);
  const verdict=guess===null?'':(guess?'<div class="verdict" style="color:var(--green)">✅ Sahi guess</div>':'<div class="verdict" style="color:var(--red)">❌ Nahi — dekho kaun tha aur kyun</div>');
  document.getElementById('sp-'+cid).innerHTML=verdict+
    '<div class="row"><span class="k">Step</span><span>'+(r.i+1)+'/'+steps.length+(st.fail?' · <span style="color:var(--red)">⚠ failure point</span>':'')+'</span></div>'+
    '<div class="row"><span class="k">Who</span><span><b>'+st.who+'</b></span></div>'+
    '<div class="row"><span class="k">Saw</span><span>'+st.saw+'</span></div>'+
    '<div class="row"><span class="k">Decision</span><span>'+st.decision+'</span></div>'+
    '<div class="row"><span class="k">API action</span><span>'+st.action+'</span></div>'+
    '<div class="row"><span class="k">Result</span><span>'+st.result+'</span></div>';
  const log=document.getElementById('sl-'+cid);log.insertAdjacentHTML('beforeend','<div>'+(r.i+1)+'. <b>'+plain(st.who).slice(0,42)+'</b> → '+plain(st.result).slice(0,100)+'</div>');log.scrollTop=log.scrollHeight;
  if(r.i+1>=steps.length)simFinish(cid);
  else if(r.playing)r.timer=setTimeout(()=>simNext(cid),1700);
}
function simPlay(cid){const r=SIMR[cid];if(!r)return;const pb=document.getElementById('sb-play-'+cid);if(r.playing){r.playing=false;if(r.timer)clearTimeout(r.timer);pb.textContent='▶ Play';return}r.playing=true;r.pending=null;pb.textContent='⏸ Pause';simNext(cid)}
function simFinish(cid){
  const r=SIMR[cid],s=SIMS[cid];r.playing=false;if(r.timer)clearTimeout(r.timer);const pb=document.getElementById('sb-play-'+cid);if(pb)pb.textContent='▶ Play';
  S.sim[cid]=S.sim[cid]||{};S.sim[cid][r.flow]=true;save();
  const total=(s.type==='hpa'?1:1)+(s.breaks||[]).length,nd=Object.keys(S.sim[cid]).length;const bd=document.getElementById('sbdg-'+cid);if(bd)bd.textContent=nd+'/'+total+' flows dekhe';
  const def=simFlowDef(cid,r.flow),sq=document.getElementById('sq-'+cid);
  const sc=r.score?'<div class="sim-hint" style="margin-top:6px">🎯 Predict score: '+r.score.ok+'/'+r.score.n+'</div>':'';
  if(def&&def.q){
    sq.innerHTML='<div class="box"><b class="q">🎯 Ab tum jawab do:</b> '+def.q+'<div>'+
      '<button type="button" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">💡 Hint</button><div class="rev" style="display:none">'+(def.hint||'')+'</div>'+
      (def.cmd?'<button type="button" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">⌨️ Pehla command</button><div class="rev" style="display:none"><code>'+escHtml(def.cmd)+'</code></div>':'')+
      '<button type="button" onclick="this.nextElementSibling.style.display=\'block\';this.style.display=\'none\'">✅ Answer</button><div class="rev" style="display:none">'+(def.ans||'')+'</div></div>'+sc+'</div>';
  }else{
    sq.innerHTML='<div class="box">✅ Flow complete — ab 💥 break karke dekho ki system kahan aur kaise tootta hai, phir 🧪 lab me khud reproduce karo.'+sc+'</div>';
  }
}
function simHpa(cid){
  const s=SIMS[cid];let r=SIMR[cid];if(!r){simReset(cid);r=SIMR[cid]}
  const h=Object.assign({},r.hpaFinal||r.hpa);
  const rps=+document.getElementById('sr-'+cid).value;
  const cpu=Math.round(rps/(h.pods*h.perPod)*100);
  let desired=Math.min(h.max,Math.max(h.min,Math.ceil(h.pods*cpu/h.target)));
  if(Math.abs(cpu-h.target)/h.target<0.1)desired=h.pods;
  const steps=[];
  steps.push(mkStep('traffic','Load balancer / Service',rps+' RPS aa raha','—','—',h.pods+' pods pe baant raha → ~'+cpu+'% CPU per pod',{hpa:{cpu:cpu}}));
  steps.push(mkStep('metrics','metrics-server','kubelet/cAdvisor se CPU usage (har 15s)','aggregate','<code>GET /apis/metrics.k8s.io/v1beta1/pods</code>','avg CPU '+cpu+'% (target '+h.target+'%)'));
  steps.push(mkStep('hpa','HPA controller (har 15s)','current '+cpu+'% vs target '+h.target+'%','desired = ceil('+h.pods+' × '+cpu+' / '+h.target+') = '+desired+' (min '+h.min+', max '+h.max+')',desired===h.pods?'(tolerance ±10% — koi PATCH nahi)':'<code>PATCH deployments/web/scale replicas='+desired+'</code>',desired===h.pods?'koi change nahi':'replicas '+h.pods+' → '+desired));
  if(desired>h.pods){
    const add=desired-h.pods;
    steps.push(mkStep('rs','ReplicaSet controller','desired '+desired+', actual '+h.pods,'create '+add+' pods','<code>POST pods ×'+add+'</code>','Pending (nodeName khaali)',{hpa:{pods:desired}}));
    const slots=h.nodes*h.cap,fit=Math.min(desired,slots),pending=desired-fit;
    steps.push(mkStep('sched','Scheduler','capacity '+h.nodes+' node × '+h.cap+' = '+slots+' slots; need '+desired,pending?'fit '+fit+', '+pending+' unschedulable':'sab fit','bind ×'+fit+(pending?'; FailedScheduling ×'+pending+' (Insufficient cpu)':''),fit+' Running'+(pending?', <b>'+pending+' Pending</b>':''),{fail:!!pending,hpa:{running:fit,pending:pending}}));
    if(pending){const nn=Math.ceil(pending/h.cap);
      steps.push(mkStep('ca','Cluster Autoscaler / Karpenter',pending+' Pending pods (unschedulable, resource reason)','add '+nn+' node(s)','AWS: ASG desired +'+nn+' / EC2 RunInstances (Karpenter: right-size)','naya node ~2 min me Ready',{hpa:{nodes:h.nodes+nn}}));h.nodes+=nn;
      steps.push(mkStep('sched','Scheduler','naya node Ready — pending pods retry','bind','<code>POST binding ×'+pending+'</code>','all '+desired+' Running',{hpa:{running:desired,pending:0}}))}
    const cpu2=Math.round(rps/(desired*h.perPod)*100);
    steps.push(mkStep('traffic','Traffic (steady)',rps+' RPS / '+desired+' pods','—','—','CPU per pod ~'+cpu2+'% — target ke paas ✅',{hpa:{cpu:cpu2}}));
    h.pods=desired;
  }else if(desired<h.pods){
    steps.push(mkStep('hpa','HPA controller','scale-down candidate '+h.pods+' → '+desired,'stabilization window 5 min — turant nahi (flapping roko)','(wait; window me highest recommendation)','5 min baad PATCH replicas='+desired));
    steps.push(mkStep('rs','ReplicaSet controller','desired '+desired+', actual '+h.pods,'delete '+(h.pods-desired)+' pods (endpoint remove ∥ SIGTERM → grace)','<code>DELETE pods</code>','running '+desired,{hpa:{pods:desired,running:desired,pending:0}}));
    const used=Math.max(1,Math.ceil(desired/h.cap));
    if(used<h.nodes){steps.push(mkStep('ca','Cluster Autoscaler','node underutilized 10 min, pods movable (PDB ok)','scale-in: cordon + drain + terminate','AWS: ASG desired -'+(h.nodes-used),'nodes '+h.nodes+' → '+used,{hpa:{nodes:used}}));h.nodes=used}
    const cpu2=Math.round(rps/(desired*h.perPod)*100);
    steps.push(mkStep('traffic','Traffic (steady)',rps+' RPS / '+desired+' pods','—','—','CPU per pod ~'+cpu2+'%',{hpa:{cpu:cpu2}}));
    h.pods=desired;
  }else{steps.push(mkStep('traffic','Traffic (steady)','koi scale nahi','—','—','CPU ~'+cpu+'% — target band ke andar'))}
  r.hpaFinal=h;r.gen=steps;r.flow='hpa';r.i=-1;r.pending=null;r.playing=false;r.score=null;if(r.timer)clearTimeout(r.timer);
  document.querySelectorAll('#sim-'+cid+' .sim-actor').forEach(a=>{a.className='sim-actor'});
  const dotH=document.getElementById('sd-'+cid);if(dotH)dotH.className='sim-dot';
  document.getElementById('sl-'+cid).innerHTML='';document.getElementById('sq-'+cid).innerHTML='';
  const pb=document.getElementById('sb-play-'+cid);if(pb)pb.textContent='▶ Play';
  document.getElementById('sf-'+cid).textContent='Traffic '+rps+' RPS · '+steps.length+' steps';
  document.getElementById('sp-'+cid).innerHTML='<div class="sim-hint">⏭ Next step — pehle guess: '+rps+' RPS pe sabse pehle kaun act karega?</div>';
  simState(cid);
}
