<div align="center">

# 🎙️ Stage Anchor
**Voice-Tracked Script Reader for Live Performances**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)

*Never lose your place on stage again.*

[**Live Demo**](https://stageanchor.netlify.app) • [**Report Bug**](#) • [**Request Feature**](#)

</div>

<br/>

## 🚀 The Magic (How it works)

A speaker reading a script on stage often loses their place when looking up at the audience and back down. **Stage Anchor** solves this by tracking your voice in real-time against the script.

1. **Upload** your PDF or TXT script.
2. **Speak naturally** — the app listens continuously.
3. **Follow the glow** — the system fuzzy-matches your words and automatically highlights your current position directly on top of the original PDF layout.

<br/>

<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=F59E0B&center=true&vCenter=true&width=600&lines=Speak+naturally.;Stage+Anchor+follows+your+voice.;Never+lose+your+place+again." alt="Typing Animation" />
</div>

<br/>

---

## ✨ Features That Feel Like Magic

### 🎯 Phase 1: Voice-Tracking Engine
* **Continuous Voice Tracking:** Hooks directly into the browser's Web Speech API with automatic restarts for infinite listening.
* **Smart Fuzzy Matching:** Two-pass bounded window matcher identifies spoken words, skipping "ums" and "ahs", and gracefully handling stutters or skipped lines.
* **Layout Preservation:** Extracts text from PDFs while maintaining spatial logic using `pdfjs-dist`.

### 🎨 Phase 2: Visual Rendering & Inline Highlighting
* **Pixel-Perfect Canvas:** Renders the exact PDF layout so you retain your spatial memory of the document.
* **Spatial Highlighting:** Calculates PDF affine transformation matrices on the fly to cast a high-visibility, semi-transparent highlight exactly over the words.
* **Butter-Smooth Performance:** Isolates expensive canvas rendering from the cheap DOM highlight toggling.
* **Scroll Modes:** Choose between **Continuous** (stacked pages auto-scrolling) or **Page-by-page** (auto-jumping when the speaker advances).

---

## 🔮 What's Next? (Phase 3)

We are pushing the boundaries for live stage usability:
* 🔋 **Wake Lock:** Prevent tablets/devices from sleeping mid-performance.
* 🖥️ **Fullscreen Mode:** Seamless, distraction-free presentation mode.
* 🎛️ **Confidence Thresholds:** Filter out background stage noise automatically.
* 📱 **PWA:** Installable offline application for theatres with zero internet access.
* 🎮 **Remote Control:** Allow a phone to control the tablet display via WebRTC.

---

## 💻 Running Locally

Get it spinning on your machine in seconds:

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open `http://localhost:3000` in Chrome, Edge, or Safari.  
*(Note: Microphone access on mobile devices requires HTTPS).*

<br/>
<div align="center">
  Built for public speakers.
</div>
