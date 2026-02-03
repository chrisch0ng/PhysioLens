# PhysioLens

**AI-Powered Physical Therapy Coach with Real-Time Form Correction**

> Like having a physiotherapist in your living room

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose-green?style=for-the-badge)](https://mediapipe.dev)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## The Story

After spending thousands on physio bills and facing weeks of wait times for appointments, I realized the broken part of physical therapy isn't the clinic—it's what happens **at home**.

- Only **35%** of patients complete their prescribed exercises
- Patients are unsure if they're doing exercises correctly
- Zero supervision between clinic visits
- PTs have no visibility into home exercise quality

**PhysioLens** solves this with **computer vision + real-time AI feedback** using just your webcam. Get instant guidance like *"Keep your back straight"* or *"Lower those hips"*—transforming PT from guesswork into data-driven care.

---

## Features

### For Patients
- **Real-Time Form Correction** — AI watches your movement and provides instant voice & visual feedback
- **Personalized Exercise Library** — Curated PT exercises with detailed instructions
- **Progress Tracking** — See completion rates, form scores, and improvement over time
- **Privacy-First** — All computer vision runs locally in your browser

### AI-Powered Exercises
| Exercise | AI Detection | Feedback |
|----------|--------------|----------|
| Cat-Camel | ✅ | Spinal curve, hip alignment |
| Cobra Stretch | ✅ | Chest lift, elbow angle |
| Dead Bug | ✅ | Limb extension tracking |
| Bodyweight Squat | ✅ | Depth, knee angle, trunk lean |

### More Guided Exercises
- Glute Bridge
- Bird Dog
- Side Plank
- Child's Pose
- And more...

---

## How It Works

```
Webcam (30fps) → MediaPipe Pose → Form Analysis Engine → Voice/Visual Feedback
                    ↓
            33 body landmarks
         (runs locally in browser)
```

1. **Select** an exercise from the library
2. **Enable** camera for AI form detection (optional)
3. **Move** and receive real-time feedback
4. **Track** your progress over time

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Computer Vision** | MediaPipe Pose (browser-based) |
| **State Management** | Zustand |
| **Animations** | Framer Motion |
| **UI Components** | Radix UI primitives |
| **Deployment** | Vercel |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/physiolens.git
cd physiolens

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Build for Production

```bash
npm run build
```

The static files will be generated in the `dist` folder.

---

## Deployment on Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option 2: Manual Deploy

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/physiolens.git
git push -u origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Add New Project"
- Import your GitHub repository
- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: `dist`
- Click "Deploy"

3. **Done!** Your app will be live at `https://your-project.vercel.app`

---

## Project Structure

```
physiolens/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Landing page
│   │   ├── exercises/       # Exercise library
│   │   ├── workout/[slug]/  # Workout session with AI
│   │   └── dashboard/       # Progress tracking
│   ├── components/
│   │   └── ui/              # UI components
│   ├── lib/
│   │   └── form-analyzer.ts # AI form detection engine
│   ├── hooks/
│   │   ├── use-pose-detector.ts
│   │   └── use-workout-timer.ts
│   ├── stores/
│   │   ├── session-store.ts
│   │   └── progress-store.ts
│   ├── data/
│   │   └── exercises.ts     # Exercise database
│   └── types/
│       └── index.ts         # TypeScript types
├── public/                  # Static assets
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Privacy & Security

- **100% Privacy-First**: All pose detection runs locally in your browser
- **No video storage**: Your camera feed is never sent to any server
- **Local storage only**: Progress data is stored in your browser

---

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

Camera access requires HTTPS (except localhost).

---

## Customization

### Adding New Exercises

Edit `src/data/exercises.ts`:

```typescript
{
  id: 'your-exercise',
  name: 'Your Exercise',
  slug: 'your-exercise',
  tier: 1, // 1 = AI detection, 2 = guided only
  bodyRegion: 'core',
  category: 'strength',
  difficulty: 'beginner',
  description: 'Exercise description',
  instructions: ['Step 1', 'Step 2', 'Step 3'],
  commonMistakes: ['Mistake 1', 'Mistake 2'],
  targetMuscles: ['Muscle 1', 'Muscle 2'],
  defaultSets: 3,
  defaultReps: 10,
  defaultHoldSeconds: 0,
  repType: 'standard',
  hasAiDetection: true,
}
```

### Adding Form Analysis

Edit `src/lib/form-analyzer.ts` and add a new analyzer function:

```typescript
export function analyzeYourExercise(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  // Your analysis logic
}
```

---

## License

MIT License - feel free to use this for your own resume project!

---

## Acknowledgments

- Inspired by the challenges of physical therapy adherence
- Built with MediaPipe for accessible, privacy-preserving pose detection
- Designed for anyone recovering from injury at home

---

**Built with care for better recovery outcomes**
