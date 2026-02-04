# PhysioLens - AI Physical Therapy Platform

## Overview

Building an AI-powered physical therapy platform that provides real-time form feedback to patients at home and gives PTs remote visibility into their progress.

The core tech is computer vision (MediaPipe Pose) running entirely in the browser - no video leaves the device. This enables privacy-first health tech that patients can actually trust.

## Current Implementation

### Working Features
- **Real-time pose detection** - 33 body landmarks tracked at 20fps
- **4 exercise analyzers** - Cat-camel, cobra stretch, dead bug, squat with phase detection
- **Automatic rep counting** - With debouncing to prevent double-counts
- **Voice feedback** - Using Web Speech API for coaching cues
- **Session tracking** - Sets, reps, form scores, rest timers
- **Progress dashboard** - Streak tracking, workout history

### Performance Optimizations
- Video renders at 60fps while pose detection runs at 20fps (separate loops)
- requestAnimationFrame with throttling instead of setInterval
- Canvas context caching
- Skeleton toggle removes canvas from DOM completely

### Form Analysis Engine
Each exercise has a dedicated analyzer that:
1. Tracks movement phase (e.g., squat: descending → bottom → ascending)
2. Calculates joint angles (knee bend, hip angle, spine curvature)
3. Detects rep completion with 1.5s debounce
4. Scores form based on depth, alignment, and landmark visibility
5. Generates contextual feedback ("squat deeper", "keep chest up")

Example: The squat analyzer uses `calculateAngle(hip, knee, ankle)` to check depth and warns if knee angle > 100° at bottom position.

## Tech Stack

- **Frontend:** Next.js 16, React 18, TypeScript
- **Styling:** Tailwind CSS with custom sage/teal theme
- **State:** Zustand (client-side for now, will add persistence)
- **Animations:** Framer Motion
- **Computer Vision:** Google MediaPipe Pose (WASM, runs locally)
- **Voice:** Web Speech API (browser-native, free)
- **Deployment:** Static export → GitHub Pages (current), Vercel (future with backend)

## Technical Challenges Solved

### Camera Initialization Loop
The camera kept restarting infinitely because the useEffect would re-trigger when state changed. Fixed with a ref guard pattern:
```typescript
const cameraStartedRef = useRef(false);
// Only start if ref is false, then set to true
```

### Overlay State Management
Loading overlays were blinking because multiple conditions could be true simultaneously. Refactored to a single conditional chain that guarantees one state:
```typescript
!isCameraActive ? (isInitialized ? "Camera off" : "Loading AI") 
: isCameraLoading ? "Starting camera" 
: error ? "Error" 
: null
```

### MediaPipe npm Package Issues
The official package has export issues with Next.js static exports. Solution: Load from CDN with a script loader that checks for duplicates.

### HTTPS Requirement
Camera access requires secure context. Learned to configure GitHub Pages with custom domains for SSL, and local network testing with `--host` flag.

## Roadmap

### Phase 1 - Core Experience ✅ Complete
All client-side, no backend required:
- [x] Pose detection and skeleton rendering
- [x] 4 exercise analyzers with form feedback
- [x] Voice coaching (Web Speech API - free, browser-native)
- [x] Session tracking with localStorage
- [x] Progress dashboard
- [x] Static deployment on GitHub Pages

### Phase 2 - Exercise Library 🚧 In Progress
Still client-side only:
- [ ] 8 more exercises
- [ ] Exercise categories (spine, lower body, upper body)
- [ ] Difficulty filtering

### Phase 3 - Backend & Auth 🔧 Planned
Requires infrastructure:
- [ ] User accounts (Clerk/NextAuth)
- [ ] Database (Supabase/Neon)
- [ ] Move to Vercel with server functions

### Phase 4 - PT Dashboard 🔧 Planned
Requires backend:
- [ ] PT login and patient management
- [ ] Assign exercise plans
- [ ] View patient data

### Phase 5 - Voice AI 🔧 Planned
Requires paid APIs:
- [ ] Upgrade from Web Speech API to Vapi/ElevenLabs
- [ ] AI-generated exercise plans (Gemini/Claude)
- [ ] Progress prediction models

### Phase 6 - Clinical 🔧 Planned
Requires compliance:
- [ ] HIPAA audit
- [ ] Insurance billing (CPT codes)
- [ ] EHR integration

## Architecture Decisions

**Why static export first?**
- Fast iteration, free hosting
- Proves core tech works before investing in backend
- Demonstrates privacy-first approach (no server needed)

**Why MediaPipe over other CV solutions?**
- Runs entirely in browser (TensorFlow.js alternatives often need backend)
- Pre-trained, don't need to build custom pose models
- 33 landmarks sufficient for PT exercises
- Free and maintained by Google

**Why Web Speech API over TTS services?**
- No API keys or costs
- Works offline
- Good enough for short coaching phrases
- Can upgrade to ElevenLabs later for better quality

## What I Learned

- WebRTC/getUserMedia and browser camera permissions
- MediaPipe's coordinate system (normalized 0-1, inverted Y)
- Separating render and processing loops for performance
- Zustand patterns for complex state (sessions, history, streaks)
- Debugging React render loops (the infinite camera bug)

## Target Users

**Primary:** People doing PT at home who aren't sure if they're doing exercises correctly

**Secondary:** Physical therapists who want visibility into patient adherence between visits

**Tertiary:** Insurance providers looking for remote monitoring CPT code billing opportunities
