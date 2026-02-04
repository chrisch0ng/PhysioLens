## Resume Entry

---

**PhysioLens** | Personal Project  
*AI-Powered Physical Therapy Platform with Real-Time Form Correction*

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Zustand, Google MediaPipe Pose, Web Speech API

**Links:**
- Live Demo: [https://yourusername.github.io/physiolens](https://yourusername.github.io/physiolens)
- GitHub: [https://github.com/yourusername/physiolens](https://github.com/yourusername/physiolens)

---

### What It Does

Building a platform that uses computer vision to provide real-time form feedback during physical therapy exercises. Patients get instant voice coaching like "squat deeper" or "keep your back straight" while PTs can monitor adherence and progress remotely.

**Built (Client-side, static hosting):**
- 4 exercises with full AI form detection and automatic rep counting
- Real-time pose tracking at 20fps with smooth 60fps video
- Voice feedback using Web Speech API (browser-native, free, offline)
- Session tracking with form scoring and progress dashboard
- GitHub Pages deployment with zero backend costs

**Planned (Requires infrastructure):**
- User accounts with cloud persistence (Supabase/Neon)
- PT dashboard for remote patient monitoring
- AI-generated exercise plans (Gemini/Claude)
- Insurance billing integration (CPT codes)

---

### Key Technical Work

**Computer Vision Engine**
- Integrated Google MediaPipe Pose to track 33 body landmarks locally in the browser
- Built custom form analyzers for 4 exercises (squat, dead bug, cat-camel, cobra stretch)
- Implemented phase detection (e.g., detecting when a squat hits bottom position) for accurate rep counting
- Added debouncing to prevent double-counting reps

**Performance Architecture**
- Separated video rendering (60fps) from pose detection (20fps) using requestAnimationFrame throttling
- Cached canvas context to avoid repeated getContext() calls
- Designed skeleton overlay to completely remove from DOM when disabled, not just hide
- Used MediaPipe Lite model for faster inference on consumer hardware

**Form Analysis System**
Each exercise analyzer calculates joint angles and tracks movement phases:
```
Squat: descending → bottom (knee angle < 90°) → ascending → standing
```
Generates contextual feedback based on position (e.g., "squat deeper" when above parallel, "keep chest up" when torso leans forward).

**State Management**
- Zustand stores for session state, workout history, and progress tracking
- Designed for future backend integration (stores structured to sync with API)
- Persistent streak tracking and completed set history

**Critical Bug Fixes**
- Fixed infinite camera initialization loop by implementing ref guard pattern
- Solved overlay flickering by refactoring conditional rendering into mutually exclusive state machine
- Worked around MediaPipe npm package export issues by loading from CDN with duplicate detection

**Privacy-First Architecture**
- All computer vision runs locally; no video data leaves the device
- Static export compatible (no backend required for core features)
- Enables HIPAA-compliant deployment without complex infrastructure

---

### Current Status

**Working:**
- 4 exercise analyzers detecting form and counting reps in real-time
- Voice feedback working in Chrome/Edge/Safari
- Static deployment on GitHub Pages with camera functionality
- Basic progress tracking and streak counting

**Known Limitations:**
- Form accuracy depends on camera angle and lighting
- Speech synthesis quality varies by browser
- No backend yet (all data local to browser)

---

### Alternative Shorter Version (for 1-page resume)

**PhysioLens** — *Personal Project*  
AI-powered PT platform with real-time form correction using computer vision

- Built with Next.js, TypeScript, Tailwind, Google MediaPipe Pose
- Tracks 33 body landmarks at 20fps; auto-counts reps
- Voice feedback via Web Speech API (browser-native, not paid services)
- Optimized performance by separating 60fps video rendering from 20fps pose detection
- Static deployment on GitHub Pages (no backend/database yet)

---

### Skills Demonstrated

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS, responsive design, animations (Framer Motion)
- **State Management:** Zustand, complex state patterns, optimistic UI
- **Computer Vision:** MediaPipe integration, coordinate math, real-time processing, performance optimization
- **Architecture:** Privacy-first design, static export patterns, progressive enhancement
- **Problem Solving:** Debugged infinite loops, implemented throttling, CDN workarounds
- **Healthcare Tech:** Understanding of PT exercise patterns, form validation logic
