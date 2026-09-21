const TERM_HISTORY = [];
let termHistIdx = -1;

const MOCK_CLUSTER = {
  scenario: 'free',
  pods: [
    { name: 'web-prod-7f9a-x1', ready: '0/1', status: 'CrashLoopBackOff', restarts: 14, age: '42m', ip: '10.0.3.14', node: 'ip-10-0-1-12' },
    { name: 'web-prod-7f9a-x2', ready: '1/1', status: 'Running', restarts: 0, age: '4h', ip: '10.0.3.15', node: 'ip-10-0-1-13' },
    { name: 'order-service-58dc-b1', ready: '1/1', status: 'Running', restarts: 1, age: '2d', ip: '10.0.4.22', node: 'ip-10-0-1-12' },
    { name: 'payment-gateway-98cb-c4', ready: '1/1', status: 'Running', restarts: 0, age: '12d', ip: '10.0.4.99', node: 'ip-10-0-1-14' },
    { name: 'reviews-db-0', ready: '1/1', status: 'Running', restarts: 0, age: '35d', ip: '10.0.5.10', node: 'ip-10-0-1-15' }
  ],
  nodes: [
    { name: 'ip-10-0-1-10 (control-plane)', status: 'Ready', roles: 'control-plane', age: '45d', ver: 'v1.30.2' },
    { name: 'ip-10-0-1-12 (worker-1)', status: 'Ready', roles: 'node', age: '45d', ver: 'v1.30.2' },
    { name: 'ip-10-0-1-13 (worker-2)', status: 'Ready', roles: 'node', age: '45d', ver: 'v1.30.2' },
    { name: 'ip-10-0-1-14 (worker-3)', status: 'Ready', roles: 'node', age: '45d', ver: 'v1.30.2' },
    { name: 'ip-10-0-1-15 (worker-4)', status: 'Ready', roles: 'node', age: '45d', ver: 'v1.30.2' }
  ]
};

function termHandleKey(e) {
  if (e.key === 'Enter') {
    const input = e.target.value.trim();
    if (!input) return;
    TERM_HISTORY.push(input);
    termHistIdx = TERM_HISTORY.length;
    termExec(input);
    e.target.value = '';
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (termHistIdx > 0) {
      termHistIdx--;
      e.target.value = TERM_HISTORY[termHistIdx];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (termHistIdx < TERM_HISTORY.length - 1) {
      termHistIdx++;
      e.target.value = TERM_HISTORY[termHistIdx];
    } else {
      termHistIdx = TERM_HISTORY.length;
      e.target.value = '';
    }
  }
}

function termRunCmd(cmd) {
  document.getElementById('termInput').value = cmd;
  termExec(cmd);
  document.getElementById('termInput').value = '';
}

function termPrint(html, isCmd = false) {
  const box = document.getElementById('termOutput');
  const line = document.createElement('div');
  line.className = 'term-line';
  if (isCmd) {
    line.innerHTML = '<span style="color:var(--green)">admin@k8s-node:~$</span> <span class="term-cmd-in">' + escHtml(html) + '</span>';
  } else {
    line.innerHTML = html;
  }
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function termLoadScenario(scen) {
  MOCK_CLUSTER.scenario = scen;
  termExec('clear');
  if (scen === 'scen_psa') {
    termPrint('<span style="color:var(--yellow);font-weight:700">🚨 CHALLENGE ACTIVATED: Kyverno / PSA Restricted Admission Rejection</span>');
    termPrint('Symptom: Developer tried deploying payment-service with runAsUser: 0 and privileged: true into prod-secure namespace.');
    termPrint('Try: <code>kubectl get events -n prod-secure</code> or <code>kubectl apply -f deploy-payment.yaml</code>');
  } else 
  MOCK_CLUSTER.scenario = scen;
  termExec('clear');
  if (scen === 'scen_crash') {
    termPrint('<span style="color:var(--yellow);font-weight:700">🚨 CHALLENGE ACTIVATED: web-prod pod CrashLoopBackOff</span>');
    termPrint('Symptom: Developers reported payment webhook failing. Check pods and logs to find why!');
    termPrint('Try: <code>kubectl get pods</code> then <code>kubectl logs web-prod-7f9a-x1</code>');
  } else if (scen === 'scen_502') {
    termPrint('<span style="color:var(--yellow);font-weight:700">🚨 CHALLENGE ACTIVATED: 502 Bad Gateway Outage</span>');
    termPrint('Symptom: Public ALB is returning 502 for order-service.');
    termPrint('Try: <code>curl -I http://order-service</code> or <code>kubectl describe svc order-service</code>');
  } else if (scen === 'scen_oom') {
    termPrint('<span style="color:var(--yellow);font-weight:700">🚨 CHALLENGE ACTIVATED: OOMKilled 137 Heap Exhaustion</span>');
    termPrint('Symptom: Pod terminated abruptly with ExitCode 137 without JVM stacktrace.');
    termPrint('Try: <code>kubectl describe pod web-prod-7f9a-x1</code> or <code>dmesg | grep oom</code>');
  } else if (scen === 'scen_disk') {
    termPrint('<span style="color:var(--yellow);font-weight:700">🚨 CHALLENGE ACTIVATED: Disk Full Ghost File</span>');
    termPrint('Symptom: df -h shows 100% full, but du -sh /* shows only 5GB used! Where is the space?');
    termPrint('Try: <code>df -h</code> and <code>lsof +L1</code>');
  }
}

function termExec(cmd) {
  termPrint(cmd, true);
  const parts = cmd.trim().split(/\s+/);
  const base = parts[0].toLowerCase();

  if (base === 'clear') {
    document.getElementById('termOutput').innerHTML = '';
    return;
  }

  if (base === 'help') {
    termPrint(`<span style="color:var(--cyan)">Available Sandbox Commands:</span>
  • <b>Kubernetes:</b> kubectl get pods [-o wide], kubectl describe pod &lt;name&gt;, kubectl logs &lt;name&gt;, kubectl get nodes, kubectl get svc, kubectl fix pod
  • <b>Linux Vitals:</b> uptime, free -h, df -h, df -i, top, ss -tlnp, lsof +L1, dmesg, journalctl
  • <b>Network/Web:</b> curl -I &lt;url&gt;, dig &lt;host&gt;
  • <b>Utility:</b> help, clear`);
    return;
  }

  // KUBECTL COMMANDS
  if (base === 'kubectl') {
    const sub = parts[1] || '';
    const res = parts[2] || '';

    if (sub === 'get' && (res === 'pods' || res === 'pod')) {
      const wide = cmd.includes('-o wide');
      let out = 'NAME                          READY   STATUS             RESTARTS   AGE' + (wide ? '   IP           NODE' : '') + '\n';
      MOCK_CLUSTER.pods.forEach(p => {
        const color = p.status === 'Running' ? 'var(--green)' : 'var(--red)';
        out += (p.name + '       ').slice(0, 30) +
               (p.ready + '     ').slice(0, 8) +
               '<span style="color:' + color + '">' + (p.status + '                  ').slice(0, 19) + '</span>' +
               (p.restarts + '          ').slice(0, 11) +
               (p.age + '      ').slice(0, 7) +
               (wide ? (p.ip + '   ').slice(0, 13) + p.node : '') + '\n';
      });
      termPrint(out);
      return;
    }

    if (sub === 'get' && (res === 'nodes' || res === 'node')) {
      let out = 'NAME                              STATUS   ROLES           AGE   VERSION\n';
      MOCK_CLUSTER.nodes.forEach(n => {
        out += (n.name + '                                  ').slice(0, 34) +
               '<span style="color:var(--green)">' + (n.status + '   ').slice(0, 9) + '</span>' +
               (n.roles + '          ').slice(0, 16) +
               (n.age + '   ').slice(0, 6) + n.ver + '\n';
      });
      termPrint(out);
      return;
    }

    if (sub === 'get' && (res === 'svc' || res === 'services')) {
      termPrint(`NAME             TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
kubernetes       ClusterIP      10.100.0.1      &lt;none&gt;          443/TCP        45d
web-prod         ClusterIP      10.100.24.110   &lt;none&gt;          80/TCP         42m
order-service    ClusterIP      10.100.89.44    &lt;none&gt;          8080/TCP       2d
reviews-db       ClusterIP      10.100.190.5    &lt;none&gt;          5432/TCP       35d`);
      return;
    }

    if (sub === 'describe' && (res === 'pod' || res.startsWith('pod/'))) {
      const target = parts[3] || res.split('/')[1] || 'web-prod-7f9a-x1';
      termPrint(`<span style="color:var(--head);font-weight:700">Name:</span>         ${target}
<span style="color:var(--head);font-weight:700">Namespace:</span>    default
<span style="color:var(--head);font-weight:700">Node:</span>         ip-10-0-1-12/10.0.1.12
<span style="color:var(--head);font-weight:700">Status:</span>       <span style="color:var(--red)">CrashLoopBackOff</span>
<span style="color:var(--head);font-weight:700">Containers:</span>
  app:
    Container ID:   containerd://89a1f2b34c...
    Image:          123456789012.dkr.ecr.us-east-1.amazonaws.com/web:v2.4.1
    State:          <span style="color:var(--red)">Waiting: CrashLoopBackOff</span>
    Last State:     <span style="color:var(--red)">Terminated: ExitCode 1 (Error)</span>
    Reason:         Error
    Limits:         cpu: 500m, memory: 512Mi
    Requests:       cpu: 100m, memory: 256Mi
<span style="color:var(--head);font-weight:700">Events:</span>
  Type     Reason     Age                   From               Message
  ----     ------     ----                  ----               -------
  Normal   Scheduled  42m                   default-scheduler  Successfully assigned default/${target} to ip-10-0-1-12
  Normal   Pulled     41m (x4 over 42m)     kubelet            Container image pulled in 1.2s
  Warning  BackOff    2m14s (x14 over 40m)  kubelet            <span style="color:var(--yellow)">Back-off restarting failed container app</span>`);
      return;
    }

    if (sub === 'logs') {
      termPrint(`[2026-09-21 10:14:02] [INFO] Starting web application server on port 8080...
[2026-09-21 10:14:03] [INFO] Loading configuration from environment...
[2026-09-21 10:14:03] <span style="color:var(--red);font-weight:700">[FATAL] Missing required environment variable: DB_PASSWORD</span>
[2026-09-21 10:14:03] [ERROR] Process exited with status 1
<span style="color:var(--cyan)">💡 Hint: Secret ya ConfigMap env var missing hai! Fix karne ke liye chalao: 'kubectl fix pod'</span>`);
      return;
    }

    if (sub === 'fix' && res === 'pod') {
      const p = MOCK_CLUSTER.pods.find(x => x.name.includes('web-prod-7f9a-x1'));
      if (p) {
        p.status = 'Running';
        p.ready = '1/1';
        p.restarts = 0;
        termPrint('<span style="color:var(--green);font-weight:700">✅ Secret mounted and DB_PASSWORD injected!</span>');
        termPrint('Pod status updated: <span style="color:var(--green)">web-prod-7f9a-x1 is now 1/1 Running ✅</span>');
        toast('🎉 Challenge Solved: CrashLoop fixed!');
      }
      return;
    }
  }

  // LINUX COMMANDS
  if (base === 'uptime') {
    termPrint(' 15:52:14 up 45 days, 12:04,  2 users,  load average: <span style="color:var(--yellow)">3.84, 2.15, 1.05</span> (4 cores)');
    termPrint('<span style="color:var(--sub)">Tip: Load ~4 on 4 cores = capacity-level demand. Check if CPU or I/O wait with top!</span>');
    return;
  }

  if (base === 'free' || (base === 'free' && parts[1] === '-h')) {
    termPrint(`               total        used        free      shared  buff/cache   available
Mem:           15Gi       5.2Gi       1.1Gi       120Mi       8.7Gi        <span style="color:var(--green)">9.8Gi</span>
Swap:            0B          0B          0B`);
    termPrint('<span style="color:var(--sub)">Tip: "free" column mat dekho! "available" column 9.8Gi hai — cache zarurat padne par reclaim ho jata hai.</span>');
    return;
  }

  if (base === 'df') {
    termPrint(`Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p1   40G   39G  800M  <span style="color:var(--red);font-weight:700">98%</span> /
tmpfs           7.6G     0  7.6G   0% /dev/shm
/dev/nvme1n1     50G  4.2G   43G   9% /var/lib/containerd`);
    return;
  }

  if (base === 'lsof' || cmd.includes('lsof +L1')) {
    termPrint(`COMMAND     PID USER   FD   TYPE DEVICE SIZE/OFF NLINK   NODE NAME
java       4102 app    12u   REG  259,1 28941094828     0  39121 /var/log/app/payment.log (deleted)`);
    termPrint('<span style="color:var(--yellow);font-weight:700">💥 GHOST FILE DETECTED!</span> File /var/log/app/payment.log (28GB) was rm\'d by someone, but PID 4102 still holds open FD 12.');
    termPrint('Fix: Restart process or truncate: <code>&gt; /proc/4102/fd/12</code> to instantly free 28GB!');
    return;
  }

  if (base === 'ss') {
    termPrint(`State    Recv-Q Send-Q  Local Address:Port   Peer Address:PortProcess
LISTEN   0      128     0.0.0.0:22           0.0.0.0:*    users:(("sshd",pid=892,fd=3))
LISTEN   0      511     0.0.0.0:80           0.0.0.0:*    users:(("nginx",pid=1420,fd=6))
LISTEN   0      128     127.0.0.1:10248     0.0.0.0:*    users:(("kubelet",pid=1102,fd=15))
LISTEN   0      4096    0.0.0.0:10250        0.0.0.0:*    users:(("kubelet",pid=1102,fd=19))`);
    return;
  }

  if (base === 'curl') {
    const url = parts[1] || parts[2] || '';
    if (url.includes('order-service')) {
      termPrint(`<span style="color:var(--red)">HTTP/1.1 502 Bad Gateway</span>
Date: Mon, 21 Sep 2026 10:22:15 GMT
Server: awselb/2.0
Content-Type: text/html
Content-Length: 150
Connection: keep-alive

&lt;html&gt;&lt;head&gt;&lt;title&gt;502 Bad Gateway&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;&lt;center&gt;&lt;h1&gt;502 Bad Gateway&lt;/h1&gt;&lt;/center&gt;&lt;/body&gt;&lt;/html&gt;`);
      return;
    } else {
      termPrint(`<span style="color:var(--green)">HTTP/1.1 200 OK</span>
Date: Mon, 21 Sep 2026 10:22:18 GMT
Server: nginx/1.26.1
Content-Type: text/html; charset=UTF-8
Content-Length: 615`);
      return;
    }
  }

  if (base === 'dmesg') {
    termPrint(`[389102.144] [  T4102] Out of memory: Killed process 4102 (java) total-vm:2410200kB, anon-rss:1048560kB, file-rss:0kB
[389102.146] [  T4102] oom_reaper: reaped process 4102 (java), now anon-rss:0kB
[389105.210] [  T1102] kubelet: Container app in pod web-prod-7f9a-x1 terminated with exit code 137`);
    return;
  }

  // Fallback
  termPrint(`bash: ${base}: command not found in mock sandbox. Try: <span style="color:var(--cyan)">help</span>`);
}
