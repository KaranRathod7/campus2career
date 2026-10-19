# Campus2Career — Engineering Competence & Diagnostic Platform

> **Exclusively engineered for B.Tech students, engineers, and tech recruiters to bridge the gap between textbook college curricula and high-scale production engineering.**

---

## 🚀 Quick Start for Team Members

### Option 1: One-Click Windows Launcher (Recommended)
Double-click **`start.bat`**. It automatically:
1. Starts the local Python server on port `8000`.
2. Launches your default web browser at `http://localhost:8000/index.html`.

### Option 2: Command Line (Windows / Mac / Linux)
```bash
python server.py
# or: python -m http.server 8000
```
Then visit `http://localhost:8000/index.html`.

### Option 3: Direct File Opening (No Server Required)
Simply double-click `index.html` in Google Chrome, Edge, Safari, or Firefox. All features, interactive diagrams, video playlist modals, and `localStorage` persistence function completely offline/client-side.

> [!NOTE]
> **Video Playback Tip:** YouTube's embedded player enforces HTTP/HTTPS origin verification. Running via **`start.bat`** (or `python server.py`) serves the app on `http://localhost:8000`, allowing embedded video players to stream smoothly inside the modal. If browsing directly via `file://`, use the built-in **"Watch on YouTube"** or **"Direct HD Stream"** buttons—the active stopwatch timer and skill leveling continue tracking seamlessly in the background!

---

## 📁 Package Contents

```text
website/
├── index.html                      # Core Single-Page Application (All views, styles, and logic)
├── campus2career_platform (2).html    # Exact synchronized mirror backup of index.html
├── server.py                       # Lightweight Python HTTP server for local development
├── start.bat                       # One-click Windows launcher (starts server & opens browser)
├── Campus2Career-Project.zip       # Packaged distributable bundle for sharing with team
└── README.md                       # Complete documentation & team developer guide
```

---

## 🎯 Key Features & Enhancements

### 1. Dual-Portal Architecture (Learner & Recruiter)
* **Learner Portal**:
  * **Guest Evaluation (No Sign-Up Required)**: Direct diagnostic wizard to assess baseline competence.
  * **Role-Tailored Roadmapping**: Target roles for **Student**, **Learner**, **Junior Engineer**, **Senior Engineer / Tech Lead**, **Engineering Intern**, and **System Architect**.
  * **Year Selection & Deselection**: Academic year is required for students, but for industry professionals, double-clicking any year deselects it (`Not Applicable`).
  * **Real-World Foundation Skills**: Automatically prescribes industry skills to learn from scratch (Git/PRs, Linux CLI, Docker, CI/CD, Idempotent APIs, Engineering Management, ADRs, SRE).
  * **Initial Baseline Cap ($\le 48\%$)**: Self-reported intake ratings are capped at $\le 48\%$ with an `UNVERIFIED BASELINE` badge to preserve recruiter trust. Higher scores ($50\% \to 100\%$) require passing verified 10-MCQ benchmarks.

* **Curated 4-Part Video Playlist Series**:
  * Every skill is backed by a structured 4-lesson curriculum (Fundamentals → Production Gotchas → Real Implementation → Debugging & Profiling).
  * Modal with interactive lesson switcher and active stopwatch timer.
  * 100% verified working, public YouTube tutorials.

* **10-MCQ Industrial Benchmark Engine**:
  * 20 modules (200 questions) across Mechanical (ME), ECE, CSE, IT, and AI/DS.
  * 15-minute countdown timer with `Question X of 10` counter.
  * Answers randomized across Options A, B, C, and D.
  * Interactive **`[💡 Full Solution & Fundamentals Guide]`** directly below Option D explaining the correct answer, traps, and real-world concept.

* **Mechanical Engineering (ME) Stream Architecture**:
  * **4 Industry Domains**:
    1. *CAD / Product Design & Mechanical Simulation* (7 skills)
    2. *Thermal Systems, HVAC & Fluid Simulation (CFD)* (7 skills)
    3. *Smart Manufacturing, Robotics & Industry 4.0* (7 skills)
    4. *Automotive Engineering & Electric Vehicle (EV) Systems* (7 skills)
  * **Dual-Tier 60-Video Architecture per Skill**:
    * **Tier 1 (45 Core Lectures)**: 15 Global English, 15 Indian English, 15 Indian Hindi.
    * **Tier 2 (15 Real-World Simulations)**: 5 English Software Runs (ANSYS, Fluent, SolidWorks), 5 Indian Lab Demos (Wind Tunnels, CMM, CNC, Dyno), 5 Hindi Physical Teardowns.
  * Exact real YouTube video durations synchronized with YouTube's player.

* **Recruiter Portal & Market Situation**:
  * Recruiter Workstation to input hiring signals (skills, observed deficits, verified standards, CTC packages).
  * Directory of candidates with verified test scores, study logs, and capstone breakdowns.

---

## 🌐 Deploying to the Web

To share a live public link with recruiters and collaborators:
* **Netlify Drop**: Drag the unpacked folder onto [app.netlify.com/drop](https://app.netlify.com/drop) for an instant `https://campus2career.netlify.app` link.
* **GitHub Pages**: Push this directory to a GitHub repository and turn on Pages in **Settings → Pages**.
* **Vercel**: Deploy via the Vercel dashboard or CLI (`vercel`).

---

## 👥 Sharing with Collaborators
1. Share `Campus2Career-Project.zip` via Slack, WhatsApp, Google Drive, or Email.
2. Team members only need to extract the zip and double-click `start.bat` or `index.html`.
