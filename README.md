# PhysioLens

AI-powered physical therapy platform with real-time form correction.

**[Live Demo](https://chrisch0ng.github.io/PhysioLens)**

## What it does (Current)

- **Real-time form correction** - Webcam tracks your movement and speaks feedback like "squat deeper" or "keep chest up"
- **Automatic rep counting** - No manual logging, just focus on the exercise
- **Progress tracking** - See completion rates and form scores (stored locally in browser)
- **Privacy-first** - Video never leaves your device; computer vision runs locally

## Current State

**Built:**
- 4 exercises with full AI form detection (cat-camel, cobra, dead bug, squat)
- 4 additional guided exercises
- Real-time pose tracking at 20fps with 60fps video
- Voice feedback using browser's native Web Speech API (free, offline)
- Session tracking with set/rep/form-score history
- Progress dashboard with streak tracking
- Static deployment on GitHub Pages (no backend needed)

**Tech choices:**
- **Voice:** Web Speech API (browser-native, not Vapi/AI services)
- **State:** Zustand with localStorage only (no database yet)
- **Deployment:** Static export (no backend yet)

**Tech stack:**
- Next.js 16 + React 18 + TypeScript
- Tailwind CSS
- Zustand (state management)
- Google MediaPipe Pose (computer vision)
- Static export for GitHub Pages deployment

## Technical Implementation

### Form Detection Pipeline
```
Webcam (60fps display)
    ↓
MediaPipe Pose (20fps processing)
    ↓
Exercise-specific analyzer (phase detection, joint angles)
    ↓
Feedback engine (voice + UI)
```

### Performance Optimizations
- Separated render loop (requestAnimationFrame) from pose detection (throttled)
- Canvas context caching
- Skeleton toggle removes canvas from DOM entirely
- Lite MediaPipe model for faster inference

### Form Analysis
Each exercise has a custom analyzer that tracks:
- **Phase detection** - Where you are in the movement (e.g., descending/bottom/ascending for squats)
- **Joint angles** - Knee bend, hip angle, spine position
- **Rep counting** - With debouncing to prevent double-counts
- **Form scoring** - Based on depth, alignment, and visibility

Example: Squat analyzer checks if you hit parallel (knee angle < 90°) and warns if your chest drops forward.

## Roadmap

### Phase 1 - Core Experience ✅ Done
All client-side, static hosting:
- [x] Pose detection with MediaPipe
- [x] 4 exercise analyzers
- [x] Voice feedback (Web Speech API - free, browser-native)
- [x] Session tracking (localStorage)
- [x] Progress dashboard
- [x] GitHub Pages deployment

### Phase 2 - Exercise Library (Next)
Still client-side only:
- [ ] Expand to 12 exercises
- [ ] Exercise search/filtering
- [ ] Difficulty levels

### Phase 3 - Backend & Auth 🔧 Requires Infrastructure
Need to move off static hosting:
- [ ] User accounts (Clerk/NextAuth)
- [ ] Database (Supabase/Neon)
- [ ] Server functions (Vercel)

### Phase 4 - PT Dashboard 🔧 Requires Backend
- [ ] PT login and patient management
- [ ] Assign exercise plans
- [ ] View patient adherence
- [ ] Alert system

### Phase 5 - Voice AI 🔧 Requires Paid APIs
- [ ] Replace Web Speech API with Vapi/ElevenLabs
- [ ] AI-generated exercise plans (Gemini/Claude)
- [ ] Progress prediction

### Phase 6 - Clinical 🔧 Requires Compliance
- [ ] HIPAA compliance audit
- [ ] Insurance billing (CPT codes)
- [ ] EHR integration

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

Note: Camera requires HTTPS. For mobile testing, use `npm run dev -- --host` and access via local network IP.

## Building for production

```bash
npm run build
```

Outputs to `/dist` as static export for GitHub Pages.

## Project Structure

```
src/
  app/
    workout/          # Exercise session with camera
    exercises/        # Exercise library
    dashboard/        # Patient progress view
    pt-dashboard/     # (Planned) PT monitoring view
  components/ui/      # Reusable UI components
  hooks/
    use-pose-detector.ts    # MediaPipe integration
    use-workout-timer.ts    # Session timing
  lib/
    form-analyzer.ts        # Exercise analyzers
    exercise-plans.ts       # (Planned) Plan templates
  stores/
    session-store.ts        # Current workout state
    progress-store.ts       # Historical data
    patient-store.ts        # (Planned) Patient profiles
  types/
```

## License

MIT
