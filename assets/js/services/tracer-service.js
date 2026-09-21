/* ===== NETWORK PACKET TRACER LOGIC ===== */
const TRACER_STEPS = [
  {
    node: 0,
    action: 'Client browser sends HTTP request',
    desc: 'Browser resolves domain and prepares TLS handshake SYN packet.',
    src: '142.250.190.4:54210',
    dst: '52.95.120.30:443 (ALB Public IP)',
    proto: 'TCP / TLS 1.3',
    payload: 'GET /orders HTTP/2'
  },
  {
    node: 1,
    action: 'Route53 DNS Query',
    desc: 'Client queries DNS for app.billfree.in. Route53 latency/weighted routing returns ALB DualStack A-Record.',
    src: '142.250.190.4:53',
    dst: '8.8.8.8:53 / Route53 Authoritative',
    proto: 'UDP / DNS',
    payload: 'A-Record: app.billfree.in -> 52.95.120.30'
  },
  {
    node: 2,
    action: 'AWS ALB: TLS Termination & Listener Rule Match',
    desc: 'AWS ALB terminates SSL cert via ACM, evaluates Host/Path rules, and chooses Target Group.',
    src: '52.95.120.30:443',
    dst: 'Target Group: k8s-tg-order-service',
    proto: 'HTTPS -> HTTP/1.1 (Decrypted)',
    payload: 'Host: app.billfree.in, X-Forwarded-For: 142.250.190.4'
  },
  {
    node: 3,
    action: 'Target Group Health Evaluation & Route Mode',
    desc: 'Target Group selects healthy endpoint. [VPC CNI mode = direct Pod secondary IP; Overlay mode = NodePort + SNAT].',
    src: '10.0.1.50 (ALB Private ENI)',
    dst: '10.0.3.15:8080 (Pod IP via VPC CNI)',
    proto: 'TCP HTTP/1.1',
    payload: 'Direct route via AWS VPC Route Table (Zero Extra Hop!)'
  },
  {
    node: 4,
    action: 'Pod Container: Application Request Processing',
    desc: 'Order Service container parses request, authenticates JWT, and executes SQL query against Database.',
    src: '10.0.3.15:39102',
    dst: '10.0.5.99:5432 (RDS Postgres)',
    proto: 'TCP / PostgreSQL Wire Protocol',
    payload: 'SELECT * FROM orders WHERE user_id = 9214;'
  },
  {
    node: 5,
    action: 'AWS RDS Postgres: Query Executed & 200 OK Returned',
    desc: 'PostgreSQL returns dataset. Pod serializes JSON response and sends 200 OK back through the chain.',
    src: '10.0.5.99:5432',
    dst: '142.250.190.4 (Client)',
    proto: 'HTTP/2 200 OK',
    payload: '{"status": "success", "orders": [{"id": 101, "total": 1299}]}'
  }
];

let tracerCurStep = 0;
let tracerTimer = null;

function tracerChangeMode(mode) {
  if (mode === 'overlay') {
    TRACER_STEPS[3].desc = 'Overlay NodePort: Packet sent to Worker Node IP:31245 -> iptables KUBE-SVC DNAT -> Pod IP (Double Hop + MTU overhead!)';
    TRACER_STEPS[3].dst = '10.0.2.10:31245 (NodePort) -> 10.244.1.5 (Pod)';
  } else {
    TRACER_STEPS[3].desc = 'VPC CNI IP Mode: Packet sent directly from ALB to Pod IP on ENI without NodePort or NAT translation (Sub-millisecond latency!).';
    TRACER_STEPS[3].dst = '10.0.3.15:8080 (Pod IP via VPC CNI)';
  }
  tracerRenderStep(tracerCurStep);
}

function tracerRenderStep(idx) {
  tracerCurStep = idx;
  const s = TRACER_STEPS[idx];
  for (let i = 0; i <= 5; i++) {
    const el = document.getElementById('tn-' + i);
    if (el) {
      el.className = 'tracer-node' + (i === idx ? ' active' : (i < idx ? ' done' : ''));
    }
  }

  document.getElementById('tracerAction').textContent = s.action;
  document.getElementById('tracerDesc').textContent = s.desc;
  document.getElementById('tracerHeader').textContent = 
`SRC: ${s.src}
DST: ${s.dst}
PROTO: ${s.proto}
PAYLOAD: ${s.payload}`;
}

function tracerStepNext() {
  if (tracerCurStep < TRACER_STEPS.length - 1) {
    tracerRenderStep(tracerCurStep + 1);
  } else {
    tracerRenderStep(0);
  }
}

function tracerSendPacket() {
  tracerReset();
  let step = 0;
  clearInterval(tracerTimer);
  tracerTimer = setInterval(() => {
    tracerRenderStep(step);
    step++;
    if (step >= TRACER_STEPS.length) {
      clearInterval(tracerTimer);
      toast('✅ Packet successfully delivered to Database and returned 200 OK!');
    }
  }, 1300);
}

function tracerReset() {
  clearInterval(tracerTimer);
  tracerCurStep = 0;
  tracerRenderStep(0);
}

// Initialize Voice keywords on load
window.addEventListener('load', () => {
  loadVoiceTopic('irsa');
  const box = document.getElementById('voiceTranscript');
  if (box) {
    box.addEventListener('input', () => {
      evaluateVoiceKeywords(box.textContent);
    });
  }
});
