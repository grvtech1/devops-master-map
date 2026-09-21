const TRACKS = {
  "full": {
    "name": "📚 Full map (default order)",
    "desc": "Sab 46 chapters, group-wise — reference/expert use.",
    "ids": null
  },
  "new": {
    "name": "🌱 New to DevOps",
    "desc": "Linux → Git → Docker → YAML → AWS/Terraform → CI/CD → K8s basics → GitOps → observe. Level 1 hi padho pehle pass me.",
    "ids": [
      "ch1",
      "chlinux",
      "chgit",
      "ch2",
      "chdocker",
      "chyaml",
      "ch12",
      "chtf",
      "ch13",
      "ch3",
      "chapi",
      "ch4",
      "chns",
      "ch5",
      "ch7b",
      "ch8",
      "ch9",
      "ch10",
      "chcfg",
      "chprobe",
      "ch14",
      "chflow",
      "chobs",
      "chctx",
      "ch17",
      "ch18"
    ]
  },
  "interview": {
    "name": "🎯 2–3 YOE Interview",
    "desc": "Linux troubleshooting → AWS/EKS → Terraform/Ansible → Docker/K8s core → CI/CD/GitOps → production scenarios → framework.",
    "ids": [
      "ch1",
      "chlinux",
      "ch12",
      "cheks",
      "chtf",
      "chans",
      "chdocker",
      "ch2",
      "ch3",
      "chapi",
      "ch5",
      "ch7",
      "ch7b",
      "ch9",
      "ch11",
      "chrbac",
      "chcfg",
      "chprobe",
      "chhpa",
      "ch16",
      "chgit",
      "ch13",
      "chscan",
      "ch14",
      "chflow",
      "ch15",
      "chobs",
      "chprod",
      "ch17",
      "ch18",
      "ch5pillars"
    ]
  },
  "k8s": {
    "name": "⎈ Kubernetes Deep Dive",
    "desc": "Container/Linux → API/control plane → workloads → networking/storage → security/scaling → delivery.",
    "ids": [
      "ch2",
      "chdocker",
      "ch3",
      "chapi",
      "ch4",
      "chyaml",
      "chns",
      "ch5",
      "chwl",
      "ch7",
      "ch7b",
      "chcfg",
      "chprobe",
      "ch6",
      "chhpa",
      "chvpa",
      "ch8",
      "ch9",
      "ch10",
      "ch11",
      "chnetpol",
      "chrbac",
      "chseccon",
      "ch16",
      "chnode",
      "chscale",
      "chasync",
      "ch15",
      "ch14",
      "ch5pillars"
    ]
  },
  "troubleshoot": {
    "name": "🚑 Production Troubleshooting",
    "desc": "Linux → network/DNS → pods/scheduling → service → storage → CI/CD → observability → playbooks.",
    "ids": [
      "chlinux",
      "ch8",
      "ch9",
      "ch11",
      "ch7",
      "ch7b",
      "chprobe",
      "ch5",
      "ch6",
      "chnetpol",
      "chrbac",
      "ch16",
      "ch13",
      "chflow",
      "chobs",
      "chctx",
      "chprod",
      "ch17"
    ]
  }
};
const META = {
  "chlinux": {
    "lvl": "Core"
  },
  "chapi": {
    "lvl": "Core"
  },
  "chyaml": {
    "lvl": "Beginner"
  },
  "chdocker": {
    "lvl": "Beginner"
  },
  "chflow": {
    "lvl": "Advanced"
  },
  "chprod": {
    "lvl": "Advanced"
  },
  "chscale": {
    "lvl": "Advanced"
  },
  "chasync": {
    "lvl": "Core"
  },
  "ch12": {
    "lvl": "Beginner"
  },
  "chgit": {
    "lvl": "Beginner"
  },
  "ch13": {
    "lvl": "Core"
  },
  "chctx": {
    "lvl": "Beginner"
  },
  "ch18": {
    "lvl": "Core"
  },
  "ch5pillars": {
    "lvl": "Advanced"
  }
};
