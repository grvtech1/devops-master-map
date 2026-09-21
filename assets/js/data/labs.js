const LABS = {
  "chlinux": {
    "t": "60-sec vitals + ek fake I/O incident",
    "min": 10,
    "predict": "Load 4 ho par CPU idle — possible? <code>top</code> me kaunsa column batayega?",
    "steps": [
      "uptime; nproc",
      "dd if=/dev/zero of=/tmp/big bs=1M count=3000 oflag=direct &   # I/O pressure banao",
      "sleep 5; uptime; top -bn1 | head -5          # load vs %Cpu(us) vs wa",
      "ps -eo pid,stat,cmd | awk '$2 ~ /D/'         # D-state kaun",
      "wait; rm -f /tmp/big"
    ],
    "expect": "Load badha, %Cpu us kam, wa zyada; dd D-state (D/D+) me dikhta",
    "explain": "Load average kya ginta hai — sirf CPU kyun nahi? 3 line me bolo."
  },
  "chdocker": {
    "t": "Layers + cache ko todo",
    "min": 10,
    "predict": "Aakhri RUN badalne se kitni layers rebuild hongi? COPY . . upar rakho to?",
    "steps": [
      "docker build -t t1 . && docker history t1 | head",
      "# Dockerfile ki AAKHRI RUN line badlo, phir:",
      "docker build -t t2 . 2>&1 | grep -E \"CACHED|RUN\"",
      "docker images | grep -E \" t1 | t2 \""
    ],
    "expect": "Upar ki layers CACHED, sirf badli hui + neeche wali rebuild; size ~same",
    "explain": "Cache order kyun matter karta — deps install ko COPY . . se pehle kyun?"
  },
  "ch2": {
    "t": "Container = process + namespace + cgroup",
    "min": 8,
    "predict": "Host se container ka process dikhega? Andar PID 1 hoga?",
    "steps": [
      "docker run -d --name t --memory=64m nginx",
      "P=$(docker inspect -f \"{{.State.Pid}}\" t); ps -p $P -o pid,cmd    # host PID",
      "sudo nsenter -t $P -p -m ps aux | head -3                        # andar se PID 1",
      "cat /sys/fs/cgroup/system.slice/docker-$(docker inspect -f \"{{.Id}}\" t).scope/memory.max   # cgroup v2; v1: /sys/fs/cgroup/memory/docker/<id>/memory.limit_in_bytes",
      "docker rm -f t"
    ],
    "expect": "Host pe normal PID, andar PID 1; memory.max = 67108864",
    "explain": "Namespace vs cgroup — ek line each. VM se farak kya?"
  },
  "ch3": {
    "t": "Control plane ke actors ko chhuo",
    "min": 8,
    "predict": "Scheduler hata do — naya pod ka status? Purane pods chalte rahenge?",
    "steps": [
      "kubectl get pods -n kube-system -o wide           # apiserver/etcd/scheduler/cm = static pods",
      "ssh master \"ls /etc/kubernetes/manifests; systemctl is-active kubelet\"",
      "ssh master \"sudo mv /etc/kubernetes/manifests/kube-scheduler.yaml /tmp/\"",
      "kubectl run t --image=nginx; sleep 10; kubectl get pod t   # Pending?",
      "ssh master \"sudo mv /tmp/kube-scheduler.yaml /etc/kubernetes/manifests/\"; sleep 25; kubectl get pod t"
    ],
    "expect": "Scheduler gaya = pod Pending (nodeName khaali); wapas = Running; purane pods pe koi asar nahi",
    "explain": "Scheduler down tha to purane pods kyun chalte rahe? kubelet kise sunta?"
  },
  "chapi": {
    "t": "Gates ko ek-ek karke girao",
    "min": 10,
    "predict": "Galat token pe 401 aayega ya 403? Unknown field pe?",
    "steps": [
      "kubectl get pods -v=8 2>&1 | grep -E \"(GET|Response Status)\" | head -3   # asli HTTP",
      "kubectl --token=bad get pods                                          # authN gate",
      "kubectl auth can-i delete nodes --as=nobody                           # authZ gate",
      "kubectl run bad --image=nginx --overrides='{\"spec\":{\"containers\":[{\"name\":\"c\",\"image\":\"nginx\",\"imagee\":\"x\"}]}}'   # schema",
      "kubectl get --raw /readyz?verbose | tail -3"
    ],
    "expect": "401 Unauthorized · \"no\" · unknown field / strict decoding error · readyz check passed",
    "explain": "Har error kaunsa gate — 6 gates order me bolo."
  },
  "ch4": {
    "t": "Reconcile ko haath se todo",
    "min": 6,
    "predict": "Deployment ka pod delete karo — kaun banata, kitni der me?",
    "steps": [
      "kubectl create deploy web --image=nginx --replicas=2",
      "kubectl delete pod -l app=web --wait=false; sleep 4; kubectl get pods -l app=web",
      "kubectl scale deploy web --replicas=0; kubectl get rs -l app=web",
      "kubectl delete deploy web"
    ],
    "expect": "Delete ke 1-3 sec me naye pods; replicas 0 = RS DESIRED 0",
    "explain": "Deployment controller vs ReplicaSet controller — kaun kya reconcile karta?"
  },
  "chyaml": {
    "t": "Generate → badlo → validate",
    "min": 8,
    "predict": "<code>--dry-run=server</code> galat indent pe kya bolega? explain kya dikhayega?",
    "steps": [
      "kubectl create deploy web --image=nginx --dry-run=client -o yaml > d.yaml",
      "kubectl explain deploy.spec.template.spec.containers | head -20",
      "# d.yaml me replicas: 2 aur resources.requests add karo (haath se)",
      "kubectl apply --dry-run=server -f d.yaml",
      "# ab jaan-bujh ke ek indent todo → dobara dry-run"
    ],
    "expect": "Sahi = \"created (server dry run)\"; galat indent = error validating / unknown field",
    "explain": "Deployment ka double spec — kaunsa spec kiska? A-K-M-S bolo."
  },
  "chns": {
    "t": "Labels = selectors ka glue",
    "min": 6,
    "predict": "Pod ka label hata do — Service traffic dega? RS kya karega?",
    "steps": [
      "kubectl create ns lab; kubectl -n lab create deploy web --image=nginx; kubectl -n lab expose deploy web --port=80",
      "kubectl -n lab get endpointslices",
      "kubectl -n lab label pod -l app=web app-        # label hatao",
      "kubectl -n lab get endpointslices; kubectl -n lab get pods --show-labels",
      "kubectl delete ns lab"
    ],
    "expect": "Endpoints khaali ho gaye; RS ne NAYA pod banaya (purana orphan, chalta rehta)",
    "explain": "Namespace kya NAHI deta? Label hatane se RS ne naya pod kyun banaya?"
  },
  "ch5": {
    "t": "Rolling update dekho, phir todo",
    "min": 10,
    "predict": "Galat image pe purane pods hat jayenge? Prod down?",
    "steps": [
      "kubectl create deploy web --image=nginx:1.25 --replicas=3",
      "kubectl set image deploy/web nginx=nginx:1.26; kubectl rollout status deploy/web; kubectl get rs",
      "kubectl set image deploy/web nginx=nginx:doesnotexist; sleep 30; kubectl get pods -l app=web",
      "kubectl rollout status deploy/web --timeout=20s; kubectl rollout undo deploy/web",
      "kubectl delete deploy web"
    ],
    "expect": "Do RS (naya up, purana down); bad image = 1 naya ImagePullBackOff, 3 purane Running — stuck, not outage",
    "explain": "maxSurge/maxUnavailable ne kya roka? GitOps me undo kyun nahi?"
  },
  "chwl": {
    "t": "Job vs Deployment vs DaemonSet",
    "min": 6,
    "predict": "exit 0 wala container — Job me kya, Deployment me kya?",
    "steps": [
      "kubectl create job j1 --image=busybox -- sh -c \"echo hi; exit 0\"; sleep 10; kubectl get pods -l job-name=j1",
      "kubectl create deploy d1 --image=busybox -- sh -c \"echo hi; exit 0\"; sleep 25; kubectl get pods -l app=d1",
      "kubectl get ds -A",
      "kubectl delete job j1; kubectl delete deploy d1"
    ],
    "expect": "Job pod Completed; Deployment pod CrashLoopBackOff (restartPolicy Always); DS = har node pe ek",
    "explain": "Kab Job, kab Deployment, kab DaemonSet, kab StatefulSet — ek-ek line."
  },
  "ch6": {
    "t": "PVC → PV → data pod se bachta",
    "min": 10,
    "predict": "Pod delete pe data bachega? Kaun PV banata?",
    "steps": [
      "kubectl apply -f - <<EOF\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata: {name: data}\nspec: {accessModes: [ReadWriteOnce], resources: {requests: {storage: 1Gi}}}\nEOF",
      "kubectl run w --image=busybox --overrides='{\"spec\":{\"containers\":[{\"name\":\"w\",\"image\":\"busybox\",\"command\":[\"sh\",\"-c\",\"echo hello > /d/f; sleep 3600\"],\"volumeMounts\":[{\"name\":\"v\",\"mountPath\":\"/d\"}]}],\"volumes\":[{\"name\":\"v\",\"persistentVolumeClaim\":{\"claimName\":\"data\"}}]}}'",
      "kubectl get pvc,pv; kubectl delete pod w",
      "# upar wala kubectl run dobara chalao, phir:",
      "kubectl exec w -- cat /d/f"
    ],
    "expect": "PVC Bound (default StorageClass ne PV banaya); dobara pod me \"hello\" milta",
    "explain": "PVC/PV/StorageClass chain — kaun kise dhoondhta? hostPath/local-path ka DR problem (tera Velero scar)?"
  },
  "ch7": {
    "t": "Scheduler ko fail karwao",
    "min": 8,
    "predict": "100Gi memory request — pod status + Events me reason?",
    "steps": [
      "kubectl run big --image=nginx --overrides='{\"spec\":{\"containers\":[{\"name\":\"big\",\"image\":\"nginx\",\"resources\":{\"requests\":{\"memory\":\"100Gi\"}}}]}}'",
      "kubectl get pod big; kubectl describe pod big | grep -A3 Events",
      "kubectl taint nodes <worker1> key=v:NoSchedule; kubectl run t2 --image=nginx; sleep 5; kubectl get pod t2 -o wide",
      "kubectl taint nodes <worker1> key-; kubectl delete pod big t2"
    ],
    "expect": "Pending + FailedScheduling \"Insufficient memory\"; taint = t2 doosre node pe (ya Pending)",
    "explain": "Filter vs Score — 100Gi kahan gira? Taint kis phase me? Node crash pe kaun evict karta?"
  },
  "ch7b": {
    "t": "OOMKill khud karwao",
    "min": 8,
    "predict": "Limit 50Mi, process 100Mi maange — exit code? Pod ka QoS?",
    "steps": [
      "kubectl run oom --image=polinux/stress --restart=Never --overrides='{\"spec\":{\"containers\":[{\"name\":\"s\",\"image\":\"polinux/stress\",\"command\":[\"stress\",\"--vm\",\"1\",\"--vm-bytes\",\"100M\",\"--vm-hang\",\"1\"],\"resources\":{\"limits\":{\"memory\":\"50Mi\"}}}]}}'",
      "sleep 15; kubectl get pod oom; kubectl describe pod oom | grep -E \"Reason|Exit Code\"",
      "kubectl get pod oom -o jsonpath=\"{.status.qosClass}{'\\n'}\"",
      "kubectl delete pod oom"
    ],
    "expect": "OOMKilled, Exit Code 137; QoS Guaranteed (limits=requests)",
    "explain": "requests vs limits — scheduler kise dekhta, kernel kise? 137 = kya?"
  },
  "chcfg": {
    "t": "env = snapshot, volume = live",
    "min": 8,
    "predict": "ConfigMap badla — env var badlega? mounted file?",
    "steps": [
      "kubectl create cm c --from-literal=K=v1",
      "kubectl run cfg --image=busybox --overrides='{\"spec\":{\"containers\":[{\"name\":\"c\",\"image\":\"busybox\",\"command\":[\"sleep\",\"3600\"],\"env\":[{\"name\":\"K\",\"valueFrom\":{\"configMapKeyRef\":{\"name\":\"c\",\"key\":\"K\"}}}],\"volumeMounts\":[{\"name\":\"v\",\"mountPath\":\"/cfg\"}]}],\"volumes\":[{\"name\":\"v\",\"configMap\":{\"name\":\"c\"}}]}}'",
      "kubectl create cm c --from-literal=K=v2 --dry-run=client -o yaml | kubectl apply -f -",
      "sleep 75; kubectl exec cfg -- sh -c 'echo env=$K; cat /cfg/K'",
      "kubectl delete pod cfg cm c"
    ],
    "expect": "env=v1 (start-time snapshot), file = v2 (~1 min me refresh)",
    "explain": "Secret base64 = encryption? env-based config refresh ke liye kya karna padta (checksum annotation)?"
  },
  "chprobe": {
    "t": "Readiness = traffic gate, restart nahi",
    "min": 8,
    "predict": "Readiness fail — pod restart hoga ya sirf endpoints se hatega?",
    "steps": [
      "kubectl create deploy p --image=nginx; kubectl expose deploy p --port=80",
      "kubectl patch deploy p -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"nginx\",\"readinessProbe\":{\"httpGet\":{\"path\":\"/nope\",\"port\":80},\"periodSeconds\":3}}]}}}}'",
      "sleep 25; kubectl get pods -l app=p; kubectl get endpointslices -l kubernetes.io/service-name=p",
      "kubectl describe pod -l app=p | grep -A2 \"Readiness probe failed\" | head -3",
      "kubectl delete deploy p svc p"
    ],
    "expect": "Pod Running par 0/1 READY, RESTARTS 0, endpoints khaali; rollout stuck",
    "explain": "Liveness hota to kya alag hota? Startup probe kab chahiye?"
  },
  "chhpa": {
    "t": "HPA ko load do",
    "min": 12,
    "predict": "Target 50%, load aane pe replicas kab badhenge, kab ghatenge?",
    "steps": [
      "kubectl top nodes                       # metrics-server chahiye",
      "kubectl create deploy hp --image=nginx; kubectl set resources deploy hp --requests=cpu=50m; kubectl expose deploy hp --port=80",
      "kubectl autoscale deploy hp --cpu-percent=50 --min=1 --max=4",
      "kubectl run load --image=busybox --restart=Never -- sh -c \"while true; do wget -qO- hp >/dev/null; done\"",
      "kubectl get hpa hp -w                   # 2-3 min dekho; phir: kubectl delete pod load"
    ],
    "expect": "TARGETS % badhta → REPLICAS 1→N (~1-2 min); load hatane ke ~5 min baad neeche",
    "explain": "Formula bolo; scale-down slow kyun (stabilization)? GitOps me replicas conflict ka fix?"
  },
  "ch8": {
    "t": "7 levels ko trace karo",
    "min": 8,
    "predict": "Doosre node ke pod IP pe ping chalega? Node pe pod-CIDR routes dikhenge?",
    "steps": [
      "kubectl run a --image=busybox -- sleep 3600; kubectl run b --image=busybox -- sleep 3600; sleep 8",
      "kubectl get pods a b -o wide                     # alag nodes? (nahi to nodeSelector)",
      "kubectl exec a -- ping -c2 $(kubectl get pod b -o jsonpath=\"{.status.podIP}\")",
      "kubectl exec a -- nslookup kubernetes.default",
      "ssh worker1 \"ip route | grep -E '192.168|10.244|bird|vxlan'\""
    ],
    "expect": "Cross-node ping ok; DNS resolve; node pe per-node pod-CIDR routes (Calico)",
    "explain": "Ye ping 7 levels me se kaunse chhua? Pod ko IP kaun deta, kab?"
  },
  "ch9": {
    "t": "Service = stable number, pods badalte rehte",
    "min": 10,
    "predict": "Pod delete → Service IP badlega? EndpointSlice?",
    "steps": [
      "kubectl create deploy s --image=nginx --replicas=2; kubectl expose deploy s --port=80",
      "kubectl get svc s; kubectl get endpointslices -l kubernetes.io/service-name=s",
      "kubectl delete pod -l app=s --wait=false; sleep 6",
      "kubectl get svc s; kubectl get endpointslices -l kubernetes.io/service-name=s",
      "kubectl run c --rm -it --restart=Never --image=busybox -- wget -qO- s | head -2"
    ],
    "expect": "Service IP same, endpoint IPs naye; wget se nginx page",
    "explain": "DNS → ClusterIP → EndpointSlice → pod: har kadam kaun LIKHTA, kaun PADHTA?"
  },
  "ch10": {
    "t": "Ingress rule → Service → pod",
    "min": 10,
    "predict": "Galat Host header pe 404 kaun deta — Service ya controller?",
    "steps": [
      "# ingress-nginx installed (kind: cloud manifest ya helm)",
      "kubectl create deploy web --image=nginx; kubectl expose deploy web --port=80",
      "kubectl create ingress web --rule=\"web.local/*=web:80\" --class=nginx; sleep 10; kubectl get ingress web",
      "A=<ingress-address-or-nodeport>; curl -s -H \"Host: web.local\" http://$A/ | head -3",
      "curl -s -o /dev/null -w \"%{http_code}\\n\" -H \"Host: other\" http://$A/"
    ],
    "expect": "web.local = nginx page; other = 404 (ingress controller ka default backend)",
    "explain": "Ingress object vs controller vs Service — packet kaun chhoota? TLS kahan terminate?"
  },
  "ch11": {
    "t": "Ek request ka poora path — rules me dhoondo",
    "min": 8,
    "predict": "iptables me tumhari Service ka ClusterIP → pod IP rule dikhega?",
    "steps": [
      "kubectl get svc s -o wide; kubectl get endpointslices -l kubernetes.io/service-name=s",
      "ssh worker1 \"sudo iptables-save | grep -E 'KUBE-SVC|KUBE-SEP' | grep -i 'default/s' | head -4\"",
      "kubectl exec c -- wget -qO- s >/dev/null",
      "# conntrack tool nahi hai to: ssh worker1 \"sudo apt-get install -y conntrack\"",
      "ssh worker1 \"sudo conntrack -L 2>/dev/null | grep $(kubectl get svc s -o jsonpath='{.spec.clusterIP}') | head -2\""
    ],
    "expect": "KUBE-SVC → KUBE-SEP chains me ClusterIP → pod IPs (DNAT); request ke baad conntrack entry",
    "explain": "North-South vs East-West path — kahan alag? eBPF dataplane me kya badalta, kya nahi?"
  },
  "chrbac": {
    "t": "403 banao, phir theek karo",
    "min": 8,
    "predict": "Naya ServiceAccount default me kya kar sakta? Token me kaunse claims?",
    "steps": [
      "kubectl create sa dev; kubectl auth can-i list pods --as=system:serviceaccount:default:dev",
      "kubectl create role pr --verb=get,list --resource=pods; kubectl create rolebinding pr --role=pr --serviceaccount=default:dev",
      "kubectl auth can-i list pods --as=system:serviceaccount:default:dev; kubectl auth can-i delete pods --as=system:serviceaccount:default:dev",
      "kubectl create token dev | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | head -c 300; echo"
    ],
    "expect": "no → yes / no; token payload me iss, sub (system:serviceaccount:default:dev), exp",
    "explain": "Role vs ClusterRole vs binding; 401 vs 403; SA token pod me kahan mount hota, risk kya?"
  },
  "chnetpol": {
    "t": "allow → deny → DNS bhi deny",
    "min": 10,
    "predict": "Default-deny egress ke baad DNS chalega? <i>(Calico/Cilium chahiye — kind ka default kindnet policy enforce nahi karta)</i>",
    "steps": [
      "kubectl run web --image=nginx --labels=app=web; kubectl expose pod web --port=80; kubectl run c --image=busybox -- sleep 3600; sleep 8",
      "kubectl exec c -- wget -qO- --timeout=3 web | head -1              # allow",
      "kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: deny}\nspec: {podSelector: {}, policyTypes: [Ingress, Egress]}\nEOF",
      "kubectl exec c -- wget -qO- --timeout=3 web                        # timeout",
      "kubectl exec c -- nslookup web                                      # DNS bhi fail",
      "kubectl delete netpol deny"
    ],
    "expect": "allow = page → deny = timeout → DNS resolve fail (egress me 53 allow nahi)",
    "explain": "NetworkPolicy kaun enforce karta? DNS egress rule har default-deny ke saath kyun?"
  },
  "chseccon": {
    "t": "root vs non-root",
    "min": 6,
    "predict": "runAsNonRoot: true + root image — pod chalega? Kya error?",
    "steps": [
      "kubectl run r --image=nginx --overrides='{\"spec\":{\"securityContext\":{\"runAsNonRoot\":true},\"containers\":[{\"name\":\"r\",\"image\":\"nginx\"}]}}'",
      "sleep 10; kubectl get pod r; kubectl describe pod r | grep -i nonroot",
      "kubectl run ok --image=nginxinc/nginx-unprivileged --overrides='{\"spec\":{\"securityContext\":{\"runAsNonRoot\":true},\"containers\":[{\"name\":\"ok\",\"image\":\"nginxinc/nginx-unprivileged\"}]}}'",
      "sleep 10; kubectl exec ok -- id; kubectl delete pod r ok"
    ],
    "expect": "r = CreateContainerConfigError (container has runAsNonRoot and image will run as root); ok = uid=101",
    "explain": "readOnlyRootFilesystem + drop ALL caps lagao to kya toot sakta, kaise pata karoge?"
  },
  "chscan": {
    "t": "Trivy gate khud chalao",
    "min": 8,
    "predict": "nginx:1.25 me CRITICAL milenge? exit code kya hoga?",
    "steps": [
      "trivy image --severity CRITICAL --exit-code 1 nginx:1.25 | tail -3; echo \"exit=$?\"",
      "trivy image --severity CRITICAL --exit-code 1 nginx:latest | tail -3; echo \"exit=$?\"",
      "trivy image --format cyclonedx --output sbom.json nginx:latest; head -c 300 sbom.json; echo",
      "trivy image --ignore-unfixed --severity CRITICAL nginx:1.25 | tail -3"
    ],
    "expect": "Purani image exit 1 (CRITICAL), nayi kam/0; SBOM = CycloneDX JSON",
    "explain": "CI me gate kahan (build ke baad, push se pehle) — kyun? --ignore-unfixed ka tradeoff? Tera adservice netty case."
  },
  "ch12": {
    "t": "Public vs private subnet — proof",
    "min": 8,
    "predict": "Private subnet ka instance bina NAT internet pe jaa sakta? Route table me kya farak?",
    "steps": [
      "aws ec2 describe-route-tables --query \"RouteTables[].{id:RouteTableId,routes:Routes[].{dst:DestinationCidrBlock,gw:GatewayId,nat:NatGatewayId}}\" --output table",
      "aws ec2 describe-subnets --query \"Subnets[].{id:SubnetId,public:MapPublicIpOnLaunch,cidr:CidrBlock}\" --output table",
      "# private node se: curl -sI https://registry-1.docker.io | head -1   (NAT ke bina timeout)"
    ],
    "expect": "Public RT: 0.0.0.0/0 → igw-*; private RT: → nat-*; private curl sirf NAT ke saath",
    "explain": "IGW vs NAT ek line each; nodes private me kyun; NAT ka bill kahan chhupa?"
  },
  "chjoin": {
    "t": "Cert SANs + join dekho",
    "min": 6,
    "predict": "API server cert ke SAN me EIP hai? Nahi to kubectl kya bolega?",
    "steps": [
      "ssh master \"sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -text | grep -A1 'Subject Alternative Name'\"",
      "kubectl --server=https://<EIP>:6443 get nodes        # SAN me nahi = x509 error",
      "ssh master \"sudo kubeadm certs check-expiration | head -8\"",
      "ssh master \"sudo kubeadm token create --print-join-command\""
    ],
    "expect": "SAN me private IP + hostnames (+EIP agar --apiserver-cert-extra-sans diya); expiry ~1 saal; join command",
    "explain": "Join token + CA hash kya prove karte? Tera sed-jugaad kyun kaam kiya (TLS ke liye kya check hota)?"
  },
  "cheks": {
    "t": "EKS plan — bina paisa jalaye",
    "min": 10,
    "predict": "terraform plan me kitne IAM/IRSA resources dikhenge? Sabse mehnga item?",
    "steps": [
      "cd terraform-eks && terraform init && terraform plan -out p.tfplan | tail -15",
      "terraform show -json p.tfplan | jq -r \".resource_changes[].type\" | sort | uniq -c | sort -rn | head -12",
      "# apply SIRF budget ke saath: ~$0.10/hr CP + nodes + NAT — aur session end pe destroy ZAROOR",
      "# apply ke baad: aws eks update-kubeconfig --name <n>; kubectl get nodes; kubectl get pods -A"
    ],
    "expect": "Plan: eks cluster, node group, IAM roles (IRSA), addons, vpc/subnets/NAT; jq count table",
    "explain": "IRSA kis pe depend karta (OIDC provider)? vpc-cni before_compute kyun? Pod ko IP kahan se milegi?"
  },
  "chtf": {
    "t": "State + drift + replace",
    "min": 8,
    "predict": "Console se tag badlo — plan kya dikhayega? -replace kya karega?",
    "steps": [
      "terraform state list | head",
      "# AWS console/CLI se ek instance ka tag badlo, phir:",
      "terraform plan | grep -E \"~|update|Plan:\"",
      "terraform plan -replace=aws_instance.master | grep -E \"replace|forces|Plan:\""
    ],
    "expect": "Drift = \"~ update in-place\"; -replace = \"must be replaced\" (destroy + create)",
    "explain": "count index shift vs for_each; prevent_destroy kab; state S3+lock kyun?"
  },
  "chans": {
    "t": "Idempotency proof",
    "min": 6,
    "predict": "Doosri baar playbook — changed kitne? shell module me?",
    "steps": [
      "ansible all -i inv -m ping",
      "ansible-playbook -i inv site.yml | tail -3        # changed=N",
      "ansible-playbook -i inv site.yml | tail -3        # changed=0 ?",
      "ansible all -i inv -m shell -a \"echo hi\" | head -3"
    ],
    "expect": "Doosri run changed=0 (idempotent modules); shell har baar \"changed\"",
    "explain": "Module vs shell — idempotency kaun deta? Terraform vs Ansible kis layer pe?"
  },
  "chnode": {
    "t": "Pending pods — node aata ya nahi",
    "min": 6,
    "predict": "Self-managed cluster me 20 pods 1 CPU request — kya hoga?",
    "steps": [
      "kubectl create deploy big --image=nginx --replicas=20; kubectl set resources deploy big --requests=cpu=1",
      "sleep 15; kubectl get pods -l app=big | grep -c Pending",
      "kubectl describe pod $(kubectl get pod -l app=big --field-selector=status.phase=Pending -o name | head -1) | grep -A2 Events",
      "kubectl delete deploy big"
    ],
    "expect": "Kai Pending + \"Insufficient cpu\"; koi naya node nahi (CA/Karpenter nahi hai)",
    "explain": "CA vs Karpenter — trigger kya, node kaun banata, EKS me kaunsa?"
  },
  "chgit": {
    "t": "Branch → PR → squash → revert",
    "min": 10,
    "predict": "Squash ke baad kitne commits? Revert ke baad file rahegi?",
    "steps": [
      "git switch -c feat/x; echo x > x.txt; git add -A; git commit -m \"feat: x\"; git push -u origin feat/x",
      "gh pr create --fill; gh pr merge --squash --delete-branch",
      "git switch main; git pull; git log --oneline -3",
      "git revert HEAD --no-edit; git push; ls x.txt"
    ],
    "expect": "Squash = ek commit main pe; revert = naya commit, x.txt gayab (history intact)",
    "explain": "3-jagah model bolo; leaked secret pe pehla kadam (rotate) kyun, history rewrite kyun nahi kaafi?"
  },
  "ch13": {
    "t": "CI ko fail karwao, phir pass",
    "min": 8,
    "predict": "Test fail pe image push hogi? Run kaise dekhoge?",
    "steps": [
      "# ek test jaan-bujh ke fail karo; commit; push",
      "gh run watch; gh run view --log-failed | tail -20",
      "# fix; push; gh run list -L 3",
      "docker pull <registry>/<image>:<sha>      # sirf green run ka SHA registry me"
    ],
    "expect": "Red run = no push; green = SHA tag registry me",
    "explain": "Runner ephemeral ka matlab (cache, secrets)? Path filter kyun? Trivy gate kahan?"
  },
  "ch14": {
    "t": "Self-heal ko dekho",
    "min": 8,
    "predict": "kubectl set image ke baad Argo kya karega, kitni der me?",
    "steps": [
      "argocd app get <app> | grep -E \"Sync Status|Health Status\"",
      "kubectl -n <ns> set image deploy/<d> <c>=<img>:v0",
      "sleep 200; kubectl -n <ns> get deploy <d> -o jsonpath=\"{.spec.template.spec.containers[0].image}{'\\n'}\"",
      "argocd app history <app> | tail -3"
    ],
    "expect": "Image ~3 min me Git wala wapas; OutOfSync → Synced (tera live demo)",
    "explain": "Synced ≠ deployed — teen tick? Rollback Git se hi kyun?"
  },
  "chflow": {
    "t": "Push → pod → proof (poora safar)",
    "min": 15,
    "predict": "\"Deploy done\" bolne se pehle teen kya check karoge?",
    "steps": [
      "# app me ek log line badlo; commit; push",
      "gh run watch                                   # CI green?",
      "git log --oneline -3 -- <gitops-path>          # bump commit [skip ci]?",
      "argocd app get <app> | grep -E \"Sync|Health\"",
      "kubectl get pod -l app=<x> -o jsonpath=\"{.items[0].spec.containers[0].image}{'\\n'}\"; kubectl logs -l app=<x> | grep \"<new-line>\""
    ],
    "expect": "CI green → bump commit → Synced + Healthy → naya digest + naya log line",
    "explain": "10-point spine bolo bina dekhe; #1 failure point kaunsa; rollback kaise?"
  },
  "ch15": {
    "t": "Ek chart, do env",
    "min": 8,
    "predict": "--set replicaCount=3 template me kahan dikhega? rollback kya karega?",
    "steps": [
      "helm create app; helm template app ./app | grep -E \"replicas|image:\"",
      "helm template app ./app --set replicaCount=3 | grep replicas",
      "helm install app ./app -n dev --create-namespace; helm upgrade app ./app -n dev --set image.tag=1.26",
      "helm history app -n dev; helm rollback app 1 -n dev; helm uninstall app -n dev"
    ],
    "expect": "Values override render me; history 2-3 revisions; rollback = revision 1 wapas",
    "explain": "Argo + Helm me render kaun karta? values layering order? Chart vs release?"
  },
  "ch16": {
    "t": "Drain ko PDB se rokwao",
    "min": 8,
    "predict": "minAvailable = replicas — drain kya karega, kaunsa code?",
    "steps": [
      "kubectl create deploy d --image=nginx --replicas=2",
      "kubectl create pdb d --selector=app=d --min-available=2",
      "kubectl drain <node-with-d-pod> --ignore-daemonsets --delete-emptydir-data --timeout=30s",
      "kubectl get pdb d                              # ALLOWED DISRUPTIONS 0",
      "kubectl uncordon <node>; kubectl delete pdb d deploy d"
    ],
    "expect": "Eviction blocked (429 \"Cannot evict pod as it would violate the pod's disruption budget\"), drain timeout; ALLOWED 0",
    "explain": "Voluntary vs involuntary — PDB kya NAHI rok sakti? minAvailable galat = deadlock kaise?"
  },
  "chobs": {
    "t": "RED ko khud query karo",
    "min": 10,
    "predict": "5xx rate query me kaunse labels chahiye? Symptom alert vs cause alert?",
    "steps": [
      "kubectl -n monitoring port-forward svc/prometheus-k8s 9090 &",
      "curl -s \"localhost:9090/api/v1/query?query=sum(rate(http_requests_total[5m]))\" | jq \".data.result[0]\"",
      "# 5xx rate: sum(rate(http_requests_total{code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
      "kubectl -n monitoring get prometheusrules | head"
    ],
    "expect": "Numbers aate; rules list; 5xx ratio 0 (ya reviews-db down karke badhta)",
    "explain": "RED teeno; SLO burn-rate ek line; symptom pe alert kyun, cause pe kyun nahi?"
  },
  "chctx": {
    "t": "Galat cluster pe delete mat karo",
    "min": 5,
    "predict": "current-context prod pe — script me kaunsa guard?",
    "steps": [
      "kubectl config get-contexts",
      "kubectl config set-context --current --namespace=lab; kubectl config view --minify | grep namespace",
      "kubectl config use-context <other>; kubectl config current-context",
      "[[ $(kubectl config current-context) == *prod* ]] && echo \"PROD! soch ke\" || echo \"safe\""
    ],
    "expect": "Namespace default badla; context switch; guard message",
    "explain": "Context = kaunsi 3 cheezein? Namespace baar-baar na likhne ka tarika (tera sawaal)?"
  },
  "chprod": {
    "t": "Pre-change checklist ek asli change pe",
    "min": 5,
    "predict": "Change se pehle 3 sawaal? Rollback path kya?",
    "steps": [
      "kubectl get deploy <d> -o yaml > before.yaml           # rollback plan pehle",
      "kubectl apply --dry-run=server -f change.yaml",
      "# apply → 5 min observe: kubectl get pods -w + 5xx panel",
      "# bigda → git revert (GitOps) ya kubectl apply -f before.yaml"
    ],
    "expect": "Change + rollback path pehle se tayyar, observe window tay",
    "explain": "\"Kabhi nahi\" list me se 3 bolo; pre-change 5 sawaal."
  },
  "ch17": {
    "t": "Ek playbook chalao",
    "min": 8,
    "predict": "CrashLoopBackOff — pehli 3 commands?",
    "steps": [
      "kubectl run crash --image=busybox -- sh -c \"exit 1\"; sleep 40",
      "kubectl get pod crash; kubectl describe pod crash | grep -A5 \"Last State\"",
      "kubectl logs crash --previous",
      "kubectl get events --sort-by=.lastTimestamp | tail -5; kubectl delete pod crash"
    ],
    "expect": "Exit Code 1, Reason Error, RESTARTS badhta; events me BackOff",
    "explain": "CrashLoop vs ImagePullBackOff vs Pending vs OOMKilled — har ek ka pehla command."
  },
  "ch1": {
    "t": "Problem-chain ek object pe (kaagaz)",
    "min": 6,
    "predict": "Service ke BINA kya tootta? Verify command kya hoga?",
    "steps": [
      "# Kaagaz pe ek component chuno: Service",
      "# Likho: PROBLEM (pod IP badalte) → ABSTRACTION (stable naam/IP) → COMPONENT (EndpointSlice ctrl + kube-proxy) → STATE CHANGE (Ready pod → endpoint) → FAILURE (0 endpoints = 503) → VERIFY (kubectl get endpointslices)",
      "# Ab wahi chain 5 aur pe: Deployment, Scheduler, PVC, Ingress, HPA — har ek 1 min"
    ],
    "expect": "6 chains, har ek me failure + verify command likha",
    "explain": "6 me se 3 chain bina kaagaz dekhe bolo — kaunsa component kis failure ka jawab."
  },
  "chvpa": {
    "t": "VPA Off mode — sirf naap lo, restart nahi",
    "min": 10,
    "predict": "Recommendation kitni der me aayegi? Off mode me pod restart hoga?",
    "steps": [
      "# VPA install (kind/kubeadm): git clone https://github.com/kubernetes/autoscaler && cd autoscaler/vertical-pod-autoscaler && ./hack/vpa-up.sh",
      "kubectl apply -f - <<EOF\napiVersion: autoscaling.k8s.io/v1\nkind: VerticalPodAutoscaler\nmetadata: {name: web-vpa}\nspec:\n  targetRef: {apiVersion: apps/v1, kind: Deployment, name: web}\n  updatePolicy: {updateMode: \"Off\"}\nEOF",
      "sleep 120; kubectl describe vpa web-vpa | grep -A12 Recommendation",
      "kubectl get pods -l app=web        # RESTARTS 0?"
    ],
    "expect": "Target/LowerBound/UpperBound cpu + memory dikhte; koi restart nahi (Off)",
    "explain": "Off vs Auto — prod me Off kyun? Recommendation ko GitOps me kaise le jaoge?"
  },
  "chasync": {
    "t": "Queue + 2 workers + crash — double-send/loss khud dekho",
    "min": 10,
    "predict": "Worker crash ke baad uthaya hua message wapas queue me aayega? Kaise rokoge?",
    "steps": [
      "docker run -d --name q redis",
      "for i in $(seq 1 20); do docker exec q redis-cli LPUSH jobs \"msg-$i\" >/dev/null; done; docker exec q redis-cli LLEN jobs",
      "# 2 terminals (workers): docker exec -it q sh -c 'while m=$(redis-cli BRPOP jobs 5 | tail -1); [ -n \"$m\" ]; do echo \"send $m\"; sleep 1; done'",
      "# ek worker ko \"send\" se pehle Ctrl-C karo → wo msg queue se nikal chuka = KHO gaya; safe = BRPOPLPUSH jobs processing + ack ke baad LREM",
      "docker exec q redis-cli LLEN jobs; docker rm -f q"
    ],
    "expect": "Dono workers alag msgs lete (fan-out); crash pe message loss dikhta; processing-list + ack pattern se at-least-once (phir idempotency)",
    "explain": "At-least-once + idempotency kyun saath chahiye? Provider TPS ceiling workers se kyun nahi tootti?"
  },
  "chscale": {
    "t": "Diwali capacity — kaagaz pe numbers",
    "min": 8,
    "predict": "23K merchants × 500 msgs, provider 100 TPS — kitna time? Workers kitne chahiye?",
    "steps": [
      "# Total = 23000 × 500 = 11.5M msgs; 100 TPS → 11.5M / 100 = 115000 s ≈ 32 h — workers badhane se NAHI ghatega",
      "# Options likho: doosra provider (TPS ×2) · pre-scheduled send windows · priority queue (OTP/bill pehle, campaign baad)",
      "# Workers = TPS / per-worker rate (100 / 5 = 20) — 200 nahi",
      "# Isolation: campaign workers spot + taint; critical API on-demand multi-AZ; alert queue-age pe"
    ],
    "expect": "Time ≈ 32h single provider · workers ~20 · 4-line isolation plan",
    "explain": "Kaunsa number asli ceiling hai? Spot kahan theek, kahan nahi?"
  },
  "chinfra": {
    "t": "ECS task-def ↔ K8s Deployment mapping",
    "min": 8,
    "predict": "ECS \"service\" K8s me kya hai? \"task\" kya? Task role kya banega?",
    "steps": [
      "# 2 columns: task-definition → Pod template · service (desiredCount) → Deployment · task role → ServiceAccount + IRSA · ALB target group → Service + Ingress · Secrets Manager valueFrom → ESO/Secret · awslogs → stdout + agent · capacity provider → node group/Karpenter",
      "# (agar read access hai) aws ecs describe-task-definition --task-definition <family> | jq \".taskDefinition.containerDefinitions[0] | {image,cpu,memory,environment}\"",
      "# Wahi 4 fields se ek Deployment YAML draft karo (image, resources, env)"
    ],
    "expect": "7-row mapping table + Deployment YAML draft",
    "explain": "containerd dono me kahan chal raha? EKS pe ECS ki kaunsi cheezein khud manage karni padti?"
  },
  "ch18": {
    "t": "7-step answer live, timer ke saath",
    "min": 6,
    "predict": "60-sec \"Service kya hai\" answer me kaunsa step sabse zyada chhoot-ta hai?",
    "steps": [
      "# Timer 60s: \"Kubernetes Service kya hai?\" — bolo, phone pe record karo",
      "# Checklist tick: problem · abstraction · component · mechanism · state-change · failure-mode · verify-command",
      "# Jo chhoota, us chapter ka Level 2 kholo; phir 3 aur topics: HPA, PDB, GitOps rollback"
    ],
    "expect": "4 answers, har ek 7/7 steps, 60-90 sec",
    "explain": "Senior signal kaunse 2 steps hain jo junior kabhi nahi bolta?"
  },
  "ch5pillars": {
    "t": "Karpenter Dual-NodePool + PSA Restricted dry-run",
    "min": 10,
    "predict": "Privileged pod Restricted namespace me chalega? Karpenter stateful pod ko spot pe daalega?",
    "steps": [
      "kubectl get nodepool -o wide",
      "kubectl label ns prod-lab pod-security.kubernetes.io/enforce=restricted",
      "kubectl run bad-root --image=nginx --privileged -n prod-lab   # PSA Admission check",
      "kubectl run safe-app --image=nginxinc/nginx-unprivileged -n prod-lab",
      "kubectl get pods -n prod-lab -o wide"
    ],
    "expect": "bad-root REJECTED by admission (violates Restricted: privileged, non-root); safe-app schedules onto stateless-spot Graviton node",
    "explain": "PSA admission webhook apiserver me kab trigger hota hai (etcd se pehle)? Spot termination pe PDB kya ensure karta hai?"
  }
};
