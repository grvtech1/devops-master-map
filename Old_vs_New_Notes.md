# 🔄 DevOps & Kubernetes: Foundation to Modern Architecture (The 22 Evolutions)

> **Core Principle:** Har modern tool kisi purani **scalability limit, security hole, ya operational toil** ka jawab hai. 
> Interview me kabhi mat bolna ki "purana bekaar tha" — balki bolo: *"Foundation pattern kya solve karta tha, uska trade-off kya tha, aur modern standard kis boundary condition ko solve karne aaya."*

---

## 🧭 Master Context Legend
* **`[EKS Only]`**: Sirf AWS EKS managed service par lagu hota hai.
* **`[Kubeadm / Bare-Metal]`**: Self-managed control plane par lagu hota hai.
* **`[Universal K8s]`**: Kubeadm, EKS, GKE, AKS sabhi Kubernetes clusters par lagu hota hai.

---

## 📊 The 22 Battle-Tested Evolutions Table

| # | Domain / Layer | Scope | 📜 Foundation (Pehle) | 🚀 Modern Standard (Ab) | 🔍 Real Engineering Trade-Off & Nuance |
|---|---|---|---|---|---|
| **1** | **EKS Auth** | `[EKS Only]` | `aws-auth` ConfigMap in `kube-system` | **EKS Access Entries API** (v20+) | `aws-auth` abhi bhi chal sakti hai (`API_AND_CONFIG_MAP` mode), lekin migration one-way hai. Access Entries se race conditions aur accidental lockout khatam ho gaye. |
| **2** | **Pod Cloud IAM** | `[EKS Only]` | Node IAM Role (Sab pods ko EC2 ki full power) ➔ **IRSA** (OIDC Web Identity) | **EKS Pod Identity** (DaemonSet Agent) | **IRSA obsolete nahi hai!** IRSA aaj bhi standard baseline hai. Pod Identity Fargate pe **nahi chalta**, aur cluster bootstrap add-ons (jaise VPC CNI) ko node role ya IRSA chahiye kyunki Pod Identity DaemonSet baad me start hota hai. |
| **3** | **Node Autoscaling** | `[EKS Only]` | Cluster Autoscaler (CAS tied to EC2 ASGs) | **Karpenter** (Group-less Direct Fleet API) | CAS 3-5 minute leta tha aur rigid ASGs chahiye the. Karpenter 40s me launch karta hai + bin-packing consolidation karta hai. Note: Underlying EC2 hardware boot floor dono me same rehta hai. |
| **4a** | **Service Routing** | `[Universal K8s]` | `kube-proxy` in `iptables` mode | `kube-proxy` **nftables mode (GA 1.33)** ya **Cilium eBPF** | ⚠️ **Never say "Kernel Bypass"!** eBPF Linux kernel ke *andar* chalta hai; wo `netfilter/iptables` bypass karta hai, kernel nahi (kernel bypass = DPDK). In-tree K8s ka modern jawab `nftables` hai. |
| **4b** | **Pod CNI** | `[EKS / Universal]`| Calico / Flannel Overlay (VXLAN packet-in-packet) | **AWS VPC CNI** (EKS) / **Cilium Native Routing** | Overlay me pod IP VPC me unroutable thi (ALB to NodePort double-hop). VPC CNI me har pod ko real VPC private IP milti hai (ALB Target Group direct to Pod IP). |
| **5** | **Container Runtime** | `[Universal K8s]` | Docker Engine + `dockershim` adapter | **containerd / CRI-O** (Pure CRI Standard) | K8s 1.24 me dockershim officially delete ho gaya. Kubelet ab direct gRPC CRI calls se containerd chalata hai. Node overhead 30% kam ho gaya. |
| **6** | **Ingress Routing** | `[Universal K8s]` | `Ingress-Nginx` (Monolithic + custom annotations) | **Kubernetes Gateway API** + AWS LB Controller | Ingress-Nginx community retirement track par hai. Gateway API roles separate karta hai (`GatewayClass` vs `Gateway` vs `HTTPRoute`) aur native canary percentage splitting deta hai bina annotations ke. |
| **7** | **Pod Security** | `[Universal K8s]` | PodSecurityPolicy (PSP - Removed in 1.25) | **PSA (Pod Security Admission) + Kyverno** | PSP ka inheritance model confusing tha. Modern prod baseline: Namespace level par PSA `enforce=baseline` + `warn/audit=restricted` lagate hain, aur custom guardrails ke liye Kyverno use karte hain. |
| **8a** | **Secrets in Git** | `[Universal K8s]` | Out-of-band manual / CI injected secrets | **External Secrets Operator (ESO)** / Secrets Store CSI / Sealed Secrets | Plain base64 in Git hamesha se anti-pattern tha. ESO me Git me sirf pointer rehta hai (`remoteRef`), aur actual secret AWS Secrets Manager / Vault se runtime par sync hota hai. |
| **8b** | **Secrets at Rest** | `[Universal / EKS]`| `etcd` plaintext storage on disk | `EncryptionConfiguration` (Kubeadm) / **EKS Default KMS** | EKS 1.28+ se AWS-owned KMS key se etcd secrets by default encrypted hote hain. Customer-managed KMS (CMK) sirf PCI-DSS / BYOK compliance ke liye lagayi jaati hai. |
| **9** | **Deployment Flow** | `[Universal K8s]` | Push: Jenkins/CI executing `kubectl apply` | Pull: **GitOps (Argo CD)** + Optional **Argo Rollouts (Canary)** | **RollingUpdate obsolete nahi hai!** 90% production aaj bhi RollingUpdate use karta hai. Canary (Argo Rollouts) ek progressive delivery *add-on* hai, replacement nahi. Rollback ka source of truth `git revert` hai. |
| **10** | **Image Packaging** | `[Universal K8s]` | Single-stage heavy base (`FROM ubuntu:20.04`, 800MB) | **Multi-stage (`AS builder`) + Distroless / Alpine (40MB)** | Compiler aur package manager final runtime image me nahi hone chahiye. Saath me CI gate: **Trivy CRITICAL gate + CycloneDX SBOM** image push hone se pehle pass hona mandatory hai. |
| **11** | **Persistent Storage**| `[Universal K8s]` | In-Tree Volume Plugins (`kubernetes.io/aws-ebs`) | **Out-of-Tree CSI Driver** (`ebs.csi.aws.com`) | In-tree plugins K8s binary ke sath compile hote the (bug fix ke liye poora K8s upgrade karna padta tha). CSI driver independent lifecycle, volume snapshots, aur `WaitForFirstConsumer` topology binding deta hai. |
| **12** | **Logging Pipeline** | `[Universal K8s]` | Elasticsearch index-everything + Fluentd | **Grafana Loki (Label-only index on S3) + Fluent Bit / Vector / Alloy** | Datadog "pehle" nahi tha, wo aaj bhi commercial SaaS hai. Architectural shift index-everything (RAM heavy) se label-indexing (storage S3 pe, cheap) ka hai. Note: **Promtail EOL (Mar 2026)** ho chuka hai, uska modern successor **Grafana Alloy** hai. |
| **13** | **Control Plane Ops**| `[Architecture]` | Self-Managed Kubeadm on EC2 | **Managed EKS Control Plane** ($0.10/hr) | Kubeadm me 3-node etcd raft quorum, EBS fsync latency, aur 365-day TLS cert rotation khud maintain karna padta hai ($140/mo EC2 cost). EKS me AWS 99.95% HA control plane $73/mo me deta hai. |
| **14** | **Node OS & Bootstrap**| `[EKS Only]` | Amazon Linux 2 (AL2) + legacy bootstrap script | **Amazon Linux 2023 (AL2023) + `nodeadm`** | AL2 deprecated ho raha hai. AL2023 systemd-resolved, cgroup v2, aur declarative YAML-based `nodeadm` bootstrap configuration use karta hai. |
| **15** | **Cluster Upgrades** | `[EKS / Kubeadm]`| Manual `kubeadm upgrade` per node | **EKS Managed Upgrade / Terraform version bump** | Kubeadm me 1 typo = bricked cluster. EKS background me managed control plane replace karta hai. Note: K8s versions ko standard support me rakhna zaroori hai, warna Extended Support me **$0.60/hr (6x cost spike)** lagta hai. |
| **16** | **Cluster Disaster Recovery**| `[Universal K8s]`| Manual `etcdctl snapshot save` to local disk | **Velero S3 Backups + Git as Source of Truth** | K8s manifests Git me hote hain, aur persistent state (PVC snapshots + cluster resources) Velero har 4 ghante me encrypted S3 bucket me daalta hai. Tested restore drill har 6 mahine me zaroori hai. |
| **17** | **Image Immutability**| `[Universal K8s]` | Mutable image tags (`:latest`, `:staging`) | **Immutable SHA256 Digests** (`image@sha256:...`) | `:latest` use karne par do alag nodes par alag container versions chal sakte hain bina kisi ko pata chale. Digest pinning audit compliance aur supply-chain reproducibility guarantee karta hai. |
| **18** | **K8s API Mutation** | `[Universal K8s]` | Client-Side Apply (`kubectl apply` with annotation) | **Server-Side Apply (SSA with field managers)** | Client-side apply me 264KB ki `last-applied-configuration` annotation banti thi jo CRDs par phat jati thi. SSA me API server field-level ownership track karta hai (Argo vs HPA conflict resolve karta hai). |
| **19** | **Package Management**| `[Universal K8s]` | Helm 2 (Monolithic Tiller Pod with cluster-admin) | **Helm 3 (Tiller-less, User RBAC)** | Helm 2 ka Tiller pod cluster me bohot bada security vulnerability tha (koi bhi user Tiller se cluster-admin ban sakta tha). Helm 3 pure client-side binary hai jo caller ke apne `kubeconfig` RBAC ko respect karta hai. |
| **20** | **TLS PKI Management**| `[Kubeadm Only]` | Manual `kubeadm certs renew` (365 days expiry bomb) | **Automated cert-manager / External CA automation** | Kubeadm me 1 saal baad certs expire hote hi `kubectl` mar jata tha. cert-manager Let's Encrypt / Vault se auto-renewal handle karta hai. |
| **21** | **EKS Terraform Module**| `[IaC / EKS]` | `terraform-aws-modules/eks/aws` v18/v19 (`aws-auth`) | `terraform-aws-modules/eks/aws` **v20 / v21** (`access_entries`) | v19 tak `manage_aws_auth_configmap` manage hota tha. v20 me native Access Entries aaye. v21 me `cluster_` prefix hata diya gaya (`name`, `kubernetes_version`, `addons`). |
| **22** | **Container Init & Exec**| `[Docker / Pod]` | Shell form `CMD node app.js` (Subshell PID 1 trap) | **Exec form `CMD ["node", "app.js"]` (Direct PID 1)** | Shell form me `/bin/sh -c` PID 1 banta hai jo SIGTERM forward nahi karta (30s delay ➔ SIGKILL 137 dirty crash). Exec form app ko direct PID 1 banata hai taaki graceful shutdown chal sake. |

---

## 🎯 The Senior Engineering Mental Model (Interview Defense)

Jab bhi interviewer pooche: *"Aapne infrastructure ko modern standard par kaise migrate kiya?"*, toh ye 3 golden rules follow karo:

1. **Context Pehle Clear Karo**: *"Hum EKS managed cloud ki baat kar rahe hain ya on-premise Kubeadm ki? Dono me evolution alag hai."*
2. **Never Bash the Foundation**: *"IRSA ya RollingUpdate purane ya kharab nahi hain — IRSA aaj bhi multi-cloud standard hai aur 90% production workloads RollingUpdate par hi chalte hain. Humne jahan multi-cluster IAM friction tha wahan EKS Pod Identity add kiya, aur jahan blast radius risk tha wahan Argo Rollouts canary lagaya."*
3. **Use Precise Technical Vocabulary**: *"Cilium in-kernel eBPF socket routing use karta hai taaki iptables aur netfilter bypass ho sakein — ye kernel bypass nahi hai."*
