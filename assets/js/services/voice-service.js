/* ===== AUDIO TEACH-BACK LOGIC ===== */
const VOICE_TOPICS = {
  irsa: {
    prompt: '"Interviewer asks: Why did AWS introduce EKS Pod Identity over IRSA, and how does it work?"',
    keywords: ['OIDC', 'STS', 'Pod Identity', 'DaemonSet', 'IAM Role', 'Trust Policy', 'Token', 'AssumeRole']
  },
  karpenter: {
    prompt: '"Interviewer asks: What makes Karpenter faster and cheaper than traditional Cluster Autoscaler?"',
    keywords: ['ASG', 'EC2 Fleet', 'Group-less', 'Bin-packing', 'Spot', 'Consolidation', 'Pending Pods', 'Startup Time']
  },
  cilium: {
    prompt: '"Interviewer asks: Why does Cilium eBPF outperform kube-proxy with iptables at high scale?"',
    keywords: ['eBPF', 'iptables', 'Hash Table', 'O(1)', 'O(N)', 'Kernel', 'Socket', 'Packet Drop']
  },
  container: {
    prompt: '"Interviewer asks: Explain the core difference between a Linux Container and a Virtual Machine."',
    keywords: ['Host Kernel', 'Namespaces', 'cgroups', 'Process', 'Hypervisor', 'Guest OS', 'Isolation', 'PID']
  },
  '502bug': {
    prompt: '"Interviewer asks: Users got 502 errors during your deployment rollout. How did you diagnose and fix it?"',
    keywords: ['readinessProbe', 'preStop', 'SIGTERM', 'ALB Target Group', 'Graceful Shutdown', '502 Bad Gateway', 'Endpoints']
  }
};

let voiceRec = null;
let voiceIsRec = false;
let voiceTimerInterval = null;
let voiceTimeLeft = 60;

function loadVoiceTopic(k) {
  const t = VOICE_TOPICS[k];
  if (!t) return;
  document.getElementById('voiceTopicPrompt').textContent = t.prompt;
  const pool = document.getElementById('voiceKeywords');
  pool.innerHTML = t.keywords.map(kw => '<span class="kw-chip" id="kw-' + kw.replace(/[^a-zA-Z0-9]/g,'_') + '">' + kw + '</span>').join('');
  resetVoice();
}

function resetVoice() {
  if (voiceRec) {
    try { voiceRec.stop(); } catch(e){}
  }
  clearInterval(voiceTimerInterval);
  voiceIsRec = false;
  voiceTimeLeft = 60;
  document.getElementById('voiceTimer').textContent = '60s';
  document.getElementById('micLabel').textContent = 'Start 60s Teach-Back';
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('voiceTranscript').textContent = '';
  document.getElementById('voiceVerdict').style.display = 'none';
  document.querySelectorAll('.kw-chip').forEach(c => c.classList.remove('hit'));
}

function toggleVoiceRecording() {
  if (voiceIsRec) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function startVoiceRecording() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Aapka browser live speech recognition support nahi karta. Aap transcript box me directly type karke ya bol kar paste karke keyword test kar sakte hain!');
    return;
  }

  voiceRec = new SpeechRec();
  voiceRec.continuous = true;
  voiceRec.interimResults = true;
  voiceRec.lang = 'en-US';

  const box = document.getElementById('voiceTranscript');
  box.textContent = '';
  voiceIsRec = true;
  document.getElementById('micLabel').textContent = 'Listening... Click to Stop';
  document.getElementById('micBtn').classList.add('recording');

  voiceRec.onresult = function(e) {
    let finalStr = '';
    for (let i = 0; i < e.results.length; ++i) {
      finalStr += e.results[i][0].transcript + ' ';
    }
    box.textContent = finalStr;
    evaluateVoiceKeywords(finalStr);
  };

  voiceRec.onerror = function() {
    stopVoiceRecording();
  };

  voiceRec.start();

  voiceTimeLeft = 60;
  clearInterval(voiceTimerInterval);
  voiceTimerInterval = setInterval(() => {
    voiceTimeLeft--;
    document.getElementById('voiceTimer').textContent = voiceTimeLeft + 's';
    if (voiceTimeLeft <= 0) {
      stopVoiceRecording();
    }
  }, 1000);
}

function stopVoiceRecording() {
  if (voiceRec) {
    try { voiceRec.stop(); } catch(e){}
  }
  clearInterval(voiceTimerInterval);
  voiceIsRec = false;
  document.getElementById('micLabel').textContent = 'Teach-Back Finished';
  document.getElementById('micBtn').classList.remove('recording');
  showVoiceVerdict();
}

function evaluateVoiceKeywords(text) {
  const lower = text.toLowerCase();
  const k = document.getElementById('voiceTopicSel').value;
  const t = VOICE_TOPICS[k] || VOICE_TOPICS.irsa;

  t.keywords.forEach(kw => {
    const el = document.getElementById('kw-' + kw.replace(/[^a-zA-Z0-9]/g,'_'));
    if (el) {
      if (lower.includes(kw.toLowerCase())) {
        el.classList.add('hit');
      }
    }
  });
}

function showVoiceVerdict() {
  const hits = document.querySelectorAll('.kw-chip.hit').length;
  const total = document.querySelectorAll('.kw-chip').length;
  const verdict = document.getElementById('voiceVerdict');
  verdict.style.display = 'block';

  let rank = '🥉 Junior / Bookish';
  let color = 'var(--yellow)';
  let advice = 'Aapne basic points touch kiye, par interview me senior impact banane ke liye architecture ke underlying terms (plumbing) include karein.';

  if (hits >= total - 1) {
    rank = '🥇 Senior Production Engineer (100% Interview Defense!)';
    color = 'var(--green)';
    advice = 'Bohot shaandar! Aapne lagbhag saare critical production keywords aur architecture mechanisms bol diye. Interviewer 100% impress hoga!';
  } else if (hits >= Math.ceil(total / 2)) {
    rank = '🥈 Mid-Level DevOps Engineer (Strong Base)';
    color = 'var(--cyan)';
    advice = 'Good attempt! Aapka base clear hai. Thoda aur practice karein taaki baaki missing keywords bhi natural flow me nikal sakein.';
  }

  verdict.innerHTML = '<b style="color:' + color + ';font-size:14px">' + rank + '</b> (' + hits + '/' + total + ' keywords detected)<br><span style="color:var(--sub);font-size:12.5px">' + advice + '</span>';
}
