# 🗺️ DevOps Master Map — Teaching & Interview Defense Platform

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![DevOps: 46 Chapters](https://img.shields.io/badge/Chapters-46%20Deep--Dive-blue.svg)](#curriculum)
[![Interactive: Sandbox & Voice](https://img.shields.io/badge/Interactive-Terminal%20%7C%20Voice%20%7C%20Tracer-green.svg)](#interactive-features)

> **"Kubernetes seekhna components ki list ratna nahi — har component kisi failure ka jawab hai."**  
> An interactive, cognitive-science-driven educational platform designed to bridge the gap between abstract theory and real 2–3+ YOE DevOps production mastery.

---

## 🌟 Interactive Micro-Modules

| Module | Purpose | Tech / Mechanism |
| :--- | :--- | :--- |
| **💻 CLI Sandbox** | Zero-cloud-bill hands-on terminal | Interactive mock `kubectl`, Linux vitals (`uptime`, `lsof +L1`), 4 outage scenarios |
| **🎙️ Voice Teach-Back** | Overcome interview articulation freeze | Browser Speech-to-Text with real-time keyword scanner & seniority scoring |
| **🌐 Network Packet Tracer** | Visualize invisible distributed traffic | Hop-by-hop packet animation with dynamic header inspection (`VPC CNI` vs `Overlay`) |
| **🚨 War-Room Incidents** | Real production post-mortems | Deep analyses of 5 real outages (502 Rolling Update, OOM 137, ndots:5, AWS Bill, EKS Upgrade) |
| **🔄 Foundation vs Frontier** | Defend modern vs legacy choices | Side-by-side matrices: `eBPF` vs `iptables`, `Karpenter` vs `CA`, `Pod Identity` vs `IRSA` |
| **🧠 Spaced Repetition (SRS)** | Long-term memory retention | Algorithmic flashcards based on Ebbinghaus forgetting curve (1, 3, 7, 14, 30 days) |
| **💾 Progress Sync** | Never lose your learning streaks | JSON export and import for seamless multi-device persistence |

---

## 📂 Repository Architecture

This repository follows a decoupled, clean **Micro-Modular Architecture**:

```
devops-master-map/
├── .github/workflows/
│   └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── assets/
│   ├── css/
│   │   ├── main.css            # Design tokens, theme variables (Dark/Light), layout
│   │   ├── terminal.css        # CLI Sandbox emulator styling
│   │   ├── tracer.css          # Animated Network Packet Tracer styling
│   │   └── modules.css         # War-Room cards, Voice Teach-Back, Modals
│   └── js/
│       ├── data/
│       │   ├── chapters.js     # 46 deep-dive chapters with dual-project grounding
│       │   ├── labs.js         # Hands-on lab verification scripts
│       │   ├── simulators.js   # Live flow state machines (HPA, Deployment, etc.)
│       │   └── tracks.js       # Guided learning tracks & placement metadata
│       ├── services/
│       │   ├── terminal-service.js # Mock CLI engine & cluster state
│       │   ├── voice-service.js    # Speech-to-Text & keyword scoring
│       │   ├── tracer-service.js   # Network packet animation & header updates
│       │   ├── drill-service.js    # Spaced repetition SRS engine & JSON sync
│       │   └── sim-engine.js       # Flagship live flow state simulator
│       └── app.js              # Core lifecycle, router, navigation & DOM renderer
├── index.html                  # Lightweight semantic entry point (~18 KB)
├── .gitignore                  # Git ignore rules
└── README.md                   # Documentation & guide
```

---

## 🚀 Quick Start (Run Locally)

No Node.js runtime or build step required! You can run it instantly:

```bash
# Option 1: Double-click index.html in any browser

# Option 2: Run with any local server
npx serve .
# or
python -m http.server 8000
```

---

## 🌐 Free Deployment

### Deploy to Cloudflare Pages (100% Free Forever)
1. Push this repo to your GitHub account.
2. In [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages**.
3. Connect your GitHub repository.
4. Set Build command: *(leave empty)*, Output directory: `.` (root).
5. Click **Save and Deploy**. Every `git push` will automatically redeploy!

### Deploy to GitHub Pages (Built-In)
1. In your GitHub repository, go to **Settings** ➔ **Pages**.
2. Source: **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` will automatically build and deploy the site!

---

## 📜 License
MIT License — Feel free to use, customize, and share for DevOps education!
