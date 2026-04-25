"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from "lucide-react";

import { exercises, getExerciseBySlug } from "@/data/exercises";
import { Button, Card, Progress, Badge } from "@/components/ui";
import { usePoseDetector, extractLandmarks } from "@/hooks/use-pose-detector";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { analyzeForm, createAnalyzerState, FormAnalyzerState, FormAnalysisResult } from "@/lib/form-analyzer";
import { useSessionStore } from "@/stores/session-store";
import { useProgressStore } from "@/stores/progress-store";
import { useVoiceCoach, TranscriptEntry, FeedbackPriority } from "@/hooks/use-voice-coach";
import { FormFeedback, WorkoutSession } from "@/types";
import { getScoreColor, getScoreBgColor } from "@/lib/utils";

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("exercise");
  const exercise = slug ? getExerciseBySlug(slug) : null;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyzerState, setAnalyzerState] = useState<FormAnalyzerState>(createAnalyzerState());
  const [analysisResult, setAnalysisResult] = useState<FormAnalysisResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [demoScore, setDemoScore] = useState<number | null>(null);
  const [coachPill, setCoachPill] = useState<string | null>(null);
  const [pillKey, setPillKey] = useState(0);
  const cameraStartedRef = useRef(false);
  const demoScoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDemoScore = useCallback((score: number) => {
    if (demoScoreTimerRef.current) clearTimeout(demoScoreTimerRef.current);
    setDemoScore(score);
    demoScoreTimerRef.current = setTimeout(() => setDemoScore(null), 5000);
  }, []);

  const session = useSessionStore();
  const progress = useProgressStore();
  const timer = useWorkoutTimer();

  // Voice coach — must come before usePoseDetector so speak is defined when onResults is created
  const lastFeedbackTimeRef = useRef<number>(0);
  const pendingContextRef = useRef<string | null>(null);
  const FEEDBACK_COOLDOWN = 3000;

  const { speak, injectContext, isListening, isSpeaking, lastUserSpeech, transcript, isCallReady, addTranscriptEntry } = useVoiceCoach({
    exercise,
    audioEnabled,
    formScore: session.formScore,
    repCount: session.repCount,
    isActive: isVoiceReady,
  });

  // Show the latest coach message in the camera pill overlay
  useEffect(() => {
    const lastCoach = [...transcript].reverse().find(t => t.role === 'coach');
    if (!lastCoach) return;
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setCoachPill(lastCoach.message);
    setPillKey(k => k + 1);
    pillTimerRef.current = setTimeout(() => setCoachPill(null), 6000);
  }, [transcript]);

  // Flush queued context when assistant stops speaking (mirrors Rehabify's pendingContext pattern)
  useEffect(() => {
    if (!isSpeaking && pendingContextRef.current && isVoiceReady) {
      injectContext(pendingContextRef.current);
      lastFeedbackTimeRef.current = Date.now();
      pendingContextRef.current = null;
    }
  }, [isSpeaking, isVoiceReady, injectContext]);

  // Demo keyboard shortcuts: B = forward lean, N = backward lean, L/M = lunge, 1/2/3 = squat
  // demoSay: uses Vapi if connected, falls back to browser TTS so demo keys always fire
  const demoSay = useCallback((message: string) => {
    if (isCallReady.current) {
      // speak() adds to transcript immediately for HIGH priority, then Vapi says it
      speak(message, FeedbackPriority.HIGH);
    } else {
      // Add to transcript before audio so pill and transcript show up first
      addTranscriptEntry({ role: 'coach', message, timestamp: Date.now() });
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find(v =>
          /aria|jenny|zira|samantha|google uk english female|karen|moira|tessa|fiona|female/i.test(v.name)
        );
        if (female) utterance.voice = female;
        window.speechSynthesis.speak(utterance);
      };
      if (window.speechSynthesis.getVoices().length) {
        pickVoice();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', pickVoice, { once: true });
      }
    }
  }, [speak, isCallReady, addTranscriptEntry]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        demoSay("Chest up — you're leaning too far forward, keep your torso more upright.");
      } else if (e.key === 'n' || e.key === 'N') {
        demoSay("You're leaning too far back — shift your weight slightly forward over your midfoot.");
      } else if (e.key === 'l' || e.key === 'L') {
        demoSay("Your front knee is caving inward — push it out so it tracks directly over your second toe.");
      } else if (e.key === 'm' || e.key === 'M') {
        demoSay("Drop your back knee lower — aim to hover it just above the floor to get the full range of motion.");
      } else if (e.key === '1' && exercise?.id === 'bodyweight-squat') {
        demoSay("Sit back more — keep your knees behind your toes.");
        triggerDemoScore(12);
      } else if (e.key === '2' && exercise?.id === 'bodyweight-squat') {
        demoSay("Squat a bit deeper.");
        triggerDemoScore(84);
      } else if (e.key === '3' && exercise?.id === 'bodyweight-squat') {
        demoSay("Good depth, hold it!");
        triggerDemoScore(91);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoSay, exercise, triggerDemoScore]);

  // Set up the pose detector hook
  const { videoRef, canvasRef, isInitialized, isLoading: isCameraLoading, error, debug, startCamera, stopCamera } = usePoseDetector({
    enabled: true,
    showSkeleton,
    onResults: useCallback((results: any) => {
      if (!exercise?.hasAiDetection) return;

      const landmarks = extractLandmarks(results);
      if (landmarks.length === 0) return;

      // Run the form analysis for this exercise
      const result = analyzeForm(exercise.id, landmarks, analyzerState);
      setAnalysisResult(result);

      session.updateFormScore(result.formScore);
      session.updatePhase(result.phase);
      session.setFormCorrectness(result.isCorrect);

      // Update UI feedback panel (display only — no voice per frame)
      result.feedback.forEach((fb: FormFeedback) => {
        const isNew = !session.feedbackHistory.some(
          h => h.message === fb.message && Date.now() - h.timestamp < 20000
        );
        if (isNew) session.addFeedback(fb);
      });

      // Rep-gated voice — only speak when a rep completes (Rehabify pattern)
      if (result.repIncremented) {
        session.incrementRep();
        result.repSummaryErrors.forEach(msg => {
          session.addFeedback({ type: 'warning', message: msg, timestamp: Date.now() });
        });

        if (audioEnabled) {
          const now = Date.now();
          const repNum = result.repCount;
          const targetReps = session.targetReps;
          const isHalfway = repNum === Math.floor(targetReps / 2);
          const isComplete = repNum >= targetReps;
          const isMilestone = isHalfway || isComplete;
          const cooldownOk = now - lastFeedbackTimeRef.current >= FEEDBACK_COOLDOWN;

          if (cooldownOk || isMilestone) {
            let context = '';
            if (isComplete) {
              context = `[SESSION END]\nExercise: ${exercise.name}\nReps completed: ${repNum}/${targetReps}\nFinal form score: ${result.formScore}%\nCongratulate them warmly on finishing the set.`;
            } else if (isHalfway) {
              context = `[REP COMPLETED]\nExercise: ${exercise.name}\nRep: ${repNum}/${targetReps} (HALFWAY POINT)\nForm score: ${result.formScore}%\n${result.repSummaryErrors.length > 0 ? `Form issues this rep: ${result.repSummaryErrors.join('; ')}` : 'Form was good.'}\nAcknowledge the halfway milestone briefly.`;
            } else if (result.repSummaryErrors.length > 0) {
              context = `[FORM FEEDBACK NEEDED]\nExercise: ${exercise.name}\nRep: ${repNum}/${targetReps}\nForm score: ${result.formScore}%\nForm issues this rep: ${result.repSummaryErrors.join('; ')}\nGive ONE brief correction (5-15 words max). Use varied phrasing.`;
            } else {
              context = `[REP COMPLETED]\nExercise: ${exercise.name}\nRep: ${repNum}/${targetReps}\nForm score: ${result.formScore}%\nForm was good. Brief encouragement (3-5 words max). Examples: "Nice!", "Good rep!", "Keep it up!"`;
            }

            if (isSpeaking) {
              pendingContextRef.current = context;
            } else {
              injectContext(context);
              lastFeedbackTimeRef.current = now;
            }
          }
        }
      }
    }, [exercise, analyzerState, session, audioEnabled, injectContext, isSpeaking]),
  });

  // Start the session when we load the exercise
  useEffect(() => {
    if (exercise && !session.isActive) {
      session.startSession(exercise);
      progress.updateStreak();
    }
  }, [exercise, session, progress]);

  // Clean up camera when leaving the page
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-sage-900 mb-4">Exercise not found</h1>
          <Link href="/exercises">
            <Button>Back to Exercises</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
      setIsCameraActive(false);
      setIsVoiceReady(false);
      cameraStartedRef.current = false;
    } else {
      setIsCameraActive(true);
    }
  };

  // Auto-start camera, then start Vapi 500ms later once stream is stable
  useEffect(() => {
    if (isCameraActive && isInitialized && !isCameraLoading && exercise?.hasAiDetection && !cameraStartedRef.current) {
      cameraStartedRef.current = true;
      startCamera();
      setTimeout(() => setIsVoiceReady(true), 500);
    }
    if (!isCameraActive) setIsVoiceReady(false);
  }, [isCameraActive, isInitialized, isCameraLoading, exercise?.hasAiDetection]);

  const handleCompleteSet = () => {
    session.completeSet();
    if (session.currentSet < session.targetSets) {
      session.startRest(60);
    } else {
      handleCompleteSession();
    }
  };

  const handleCompleteSession = () => {
    session.endSession();
    if (session.sessionData) {
      progress.addSession(
        exercise.id,
        session.sessionData.totalReps,
        session.sessionData.averageFormScore
      );
    }
    setShowSummary(true);
  };

  if (showSummary) {
    return <WorkoutSummary 
      exercise={exercise} 
      sessionData={session.sessionData} 
      completedSets={session.completedSets}
      onClose={() => {
        session.reset();
        router.push('/exercises');
      }}
      onRetry={() => {
        session.reset();
        setShowSummary(false);
        session.startSession(exercise);
      }}
    />;
  }

  return (
    <div className="min-h-screen bg-sage-50">
      <header className="sticky top-0 z-40 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/exercises">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-semibold text-sage-900">{exercise.name}</h1>
                <p className="text-xs text-sage-600">
                  Set {session.currentSet} of {session.targetSets}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {timer.isRunning ? (
                <Button variant="outline" size="sm" onClick={timer.pause}>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={timer.start}>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_3fr_1fr] gap-6 items-start">

          {/* Left column: demo video + instructions */}
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            {exercise.demoVideoUrl && (
              <Card className="overflow-hidden border-sage-200">
                <div className="px-5 py-3 border-b border-sage-100">
                  <span className="font-semibold text-sage-900 text-sm">Demo</span>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <video
                    src={exercise.demoVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: exercise.demoVideoPosition ?? 'center center' }}
                  />
                </div>
              </Card>
            )}
            <Card className="p-6 border-sage-200">
              <h3 className="font-semibold text-sage-900 mb-4">Instructions</h3>
              <ol className="space-y-2 text-sm text-sage-600 list-decimal list-inside">
                {exercise.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </Card>
          </div>

          {/* Center column: camera */}
          <div className="space-y-4">
            <Card className="overflow-hidden border-sage-200">
              <div className="relative bg-slate-900" style={{ height: 'calc(100vh - 220px)' }}>
                {exercise.hasAiDetection ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                      style={{ transform: 'scaleX(-1)', backgroundColor: '#000' }}
                    />

                    {/* Only show the canvas overlay when skeleton is enabled */}
                    {showSkeleton && (
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ transform: 'scaleX(-1)', opacity: isInitialized ? 1 : 0 }}
                      />
                    )}
                    
                    {/* 
                      Overlay states - using a single conditional chain to prevent 
                      multiple overlays from fighting each other and causing flicker
                    */}
                    {!isCameraActive ? (
                      isInitialized ? (
                        // Camera is ready but user hasn't turned it on yet
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90">
                          <Camera className="w-16 h-16 mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">Camera is off</p>
                          <p className="text-sm opacity-70 mb-4">Enable camera for AI form detection</p>
                          <Button onClick={handleToggleCamera} className="gradient-teal">
                            <Camera className="w-4 h-4 mr-2" />
                            Enable Camera
                          </Button>
                        </div>
                      ) : (
                        // Still loading MediaPipe
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90">
                          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
                          <p className="text-lg font-medium mb-2">Loading AI...</p>
                          <p className="text-sm opacity-70">Please wait while we initialize</p>
                        </div>
                      )
                    ) : isCameraLoading ? (
                      // Camera permission dialog or initializing
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90">
                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-lg font-medium">Starting camera...</p>
                        <p className="text-sm opacity-70">Please allow camera access</p>
                      </div>
                    ) : error ? (
                      // Something went wrong with the camera
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 p-8 text-center">
                        <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
                        <p className="text-lg font-medium text-red-400 mb-2">Camera Error</p>
                        <p className="text-sm opacity-70">{error}</p>
                        <Button 
                          variant="outline" 
                          className="mt-4 border-white/20 text-white hover:bg-white/10"
                          onClick={handleToggleCamera}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  // This exercise doesn't have AI detection - show placeholder
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-sage-700 to-sage-900">
                    <Activity className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Guided Exercise</p>
                    <p className="text-sm opacity-70">Follow the instructions below</p>
                  </div>
                )}

                {/* Coach speech pill */}
                <AnimatePresence>
                  {coachPill && (
                    <motion.div
                      key={pillKey}
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-4 left-4 z-10"
                      style={{ maxWidth: 'calc(100% - 7rem)' }}
                    >
                      <div className="bg-teal-700/90 backdrop-blur-sm text-white text-xl font-semibold px-6 py-4 rounded-2xl shadow-lg leading-snug">
                        {coachPill}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live form score badge */}
                {isCameraActive && analysisResult && (
                  <div className="absolute top-4 right-4">
                    <div className={`px-4 py-2 rounded-full text-white font-bold ${getScoreBgColor(demoScore ?? analysisResult.formScore)}`}>
                      {demoScore ?? analysisResult.formScore}%
                    </div>
                  </div>
                )}

                {/* Current exercise phase indicator */}
                {isCameraActive && analysisResult && (
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-black/50 text-white border-0 capitalize">
                      Phase: {analysisResult.phase.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}
                
                {/* Debug info - only in dev mode */}
                {process.env.NODE_ENV === 'development' && debug && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white text-xs p-2 rounded font-mospace max-w-[200px]">
                    {debug}
                  </div>
                )}
              </div>
            </Card>

            {exercise.hasAiDetection && (
              <div className="flex justify-center gap-2 flex-wrap">
                <Button
                  variant={isCameraActive ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleToggleCamera}
                >
                  {isCameraActive ? (
                    <><CameraOff className="w-4 h-4 mr-1" /> Stop Camera</>
                  ) : (
                    <><Camera className="w-4 h-4 mr-1" /> Start Camera</>
                  )}
                </Button>
                {isCameraActive && (
                  <Button
                    variant={showSkeleton ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSkeleton(!showSkeleton)}
                  >
                    {showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                {audioEnabled && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    isSpeaking
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : isListening
                      ? 'bg-teal-50 text-teal-700 border-teal-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {isSpeaking
                      ? <Volume2 className="w-3 h-3 animate-pulse" />
                      : isListening
                      ? <Mic className="w-3 h-3 animate-pulse" />
                      : <MicOff className="w-3 h-3" />}
                    {isSpeaking ? 'Speaking…' : isListening ? 'Listening' : 'Mic off'}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <Card className="p-6 border-sage-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sage-600">Reps Completed</span>
                <span className="text-3xl font-bold text-sage-900">
                  {session.repCount} <span className="text-lg text-sage-400">/ {session.targetReps}</span>
                </span>
              </div>
              <Progress value={(session.repCount / session.targetReps) * 100} className="h-3" />
            </Card>

            {exercise.hasAiDetection && (
              <Card className="p-6 border-sage-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sage-600">Form Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(demoScore ?? session.formScore)}`}>
                    {demoScore ?? session.formScore}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getScoreBgColor(demoScore ?? session.formScore)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${demoScore ?? session.formScore}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </Card>
            )}

            {exercise.hasAiDetection && (
              <TranscriptPanel
                transcript={transcript}
                isListening={isListening}
                isSpeaking={isSpeaking}
              />
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-sage-300"
                onClick={() => session.reset()}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                className="flex-1 gradient-teal text-white"
                onClick={handleCompleteSet}
                disabled={session.repCount === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {session.currentSet < session.targetSets ? 'Complete Set' : 'Finish Workout'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TranscriptPanel({
  transcript,
  isListening,
  isSpeaking,
}: {
  transcript: TranscriptEntry[];
  isListening: boolean;
  isSpeaking: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <Card className="border-sage-200 flex flex-col" style={{ minHeight: '220px' }}>
      <div className="px-5 py-3 border-b border-sage-100 flex items-center gap-2 shrink-0">
        <AlertCircle className="w-4 h-4 text-teal-600" />
        <span className="font-semibold text-sage-900 text-sm">Transcript</span>
        <span className="ml-auto">
          {isSpeaking ? (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Volume2 className="w-3 h-3 animate-pulse" />
              Speaking…
            </span>
          ) : isListening ? (
            <span className="flex items-center gap-1 text-xs text-teal-600">
              <Mic className="w-3 h-3 animate-pulse" />
              Listening…
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-56">
        {transcript.length === 0 ? (
          <p className="text-sage-400 text-sm italic">Enable camera to start the session…</p>
        ) : (
          transcript.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {entry.role === 'coach' && (
                <div className="w-6 h-6 rounded-full gradient-teal flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                  entry.role === 'coach'
                    ? 'bg-teal-50 text-teal-900 rounded-tl-sm'
                    : 'bg-sage-100 text-sage-800 rounded-tr-sm'
                }`}
              >
                {entry.message}
              </div>
              {entry.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-sage-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Mic className="w-3 h-3 text-sage-600" />
                </div>
              )}
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </Card>
  );
}

interface WorkoutSummaryProps {
  exercise: typeof exercises[0];
  sessionData: WorkoutSession | null;
  completedSets: Array<{ setNumber: number; reps: number; formScore: number }>;
  onClose: () => void;
  onRetry: () => void;
}

function WorkoutSummary({ exercise, sessionData, completedSets, onClose, onRetry }: WorkoutSummaryProps) {
  const totalReps = sessionData?.totalReps || 0;
  const avgFormScore = sessionData?.averageFormScore || 0;
  const duration = sessionData?.startTime 
    ? Math.round((Date.now() - sessionData.startTime) / 60000)
    : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-teal-50 to-sage-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center">
          <div className="w-20 h-20 rounded-full gradient-teal flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-sage-900 mb-2">Workout Complete!</h1>
          <p className="text-sage-600 mb-8">Great job completing {exercise.name}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-sage-50 rounded-xl">
              <p className="text-2xl font-bold text-sage-900">{totalReps}</p>
              <p className="text-xs text-sage-600">Total Reps</p>
            </div>
            <div className="p-4 bg-sage-50 rounded-xl">
              <p className="text-2xl font-bold text-teal-600">{avgFormScore}%</p>
              <p className="text-xs text-sage-600">Avg Form</p>
            </div>
            <div className="p-4 bg-sage-50 rounded-xl">
              <p className="text-2xl font-bold text-sage-900">{duration}</p>
              <p className="text-xs text-sage-600">Minutes</p>
            </div>
          </div>

          {completedSets.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-sage-900 mb-3">Set Breakdown</h3>
              <div className="space-y-2">
                {completedSets.map((set) => (
                  <div key={set.setNumber} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-sage-700">Set {set.setNumber}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-sage-600">{set.reps} reps</span>
                      <span className={`font-medium ${getScoreColor(set.formScore)}`}>
                        {set.formScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={onRetry} variant="outline" className="w-full border-sage-300">
              <RotateCcw className="w-4 h-4 mr-2" />
              Do It Again
            </Button>
            <Button onClick={onClose} className="w-full gradient-teal text-white">
              Browse More Exercises
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-sage-600">Loading workout...</p>
        </div>
      </div>
    }>
      <WorkoutContent />
    </Suspense>
  );
}
