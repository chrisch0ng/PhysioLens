"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
} from "lucide-react";

import { exercises, getExerciseBySlug } from "@/data/exercises";
import { Button, Card, Progress, Badge } from "@/components/ui";
import { usePoseDetector, extractLandmarks } from "@/hooks/use-pose-detector";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { analyzeForm, createAnalyzerState, FormAnalyzerState, FormAnalysisResult } from "@/lib/form-analyzer";
import { useSessionStore } from "@/stores/session-store";
import { useProgressStore } from "@/stores/progress-store";
import { FormFeedback, WorkoutSession } from "@/types";
import { getScoreColor, getScoreBgColor } from "@/lib/utils";

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("exercise");
  const exercise = slug ? getExerciseBySlug(slug) : null;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [analyzerState, setAnalyzerState] = useState<FormAnalyzerState>(createAnalyzerState());
  const [analysisResult, setAnalysisResult] = useState<FormAnalysisResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const session = useSessionStore();
  const progress = useProgressStore();
  const timer = useWorkoutTimer();

  const { videoRef, canvasRef, isInitialized, error, startCamera, stopCamera } = usePoseDetector({
    enabled: isCameraActive && exercise?.hasAiDetection,
    onResults: useCallback((results: any) => {
      if (!exercise?.hasAiDetection) return;
      
      const landmarks = extractLandmarks(results);
      if (landmarks.length === 0) return;

      const result = analyzeForm(exercise.id, landmarks, analyzerState);
      setAnalysisResult(result);

      if (result.repCount > session.repCount) {
        session.incrementRep();
      }
      session.updateFormScore(result.formScore);
      session.updatePhase(result.phase);
      session.setFormCorrectness(result.isCorrect);

      result.feedback.forEach((fb: FormFeedback) => {
        const isNew = !session.feedbackHistory.some(
          h => h.message === fb.message && Date.now() - h.timestamp < 3000
        );
        if (isNew) {
          session.addFeedback(fb);
          if (audioEnabled) {
            speakFeedback(fb.message);
          }
        }
      });
    }, [exercise, analyzerState, session, audioEnabled]),
  });

  useEffect(() => {
    if (exercise && !session.isActive) {
      session.startSession(exercise);
      progress.updateStreak();
    }
  }, [exercise, session, progress]);

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

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      await startCamera();
    }
  };

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

  const speakFeedback = (message: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.2;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="overflow-hidden border-sage-200">
              <div className="relative aspect-video bg-slate-900">
                {exercise.hasAiDetection ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover opacity-0"
                      playsInline
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Camera className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">Camera is off</p>
                        <p className="text-sm opacity-70 mb-4">Enable camera for AI form detection</p>
                        <Button onClick={handleToggleCamera} className="gradient-teal">
                          <Camera className="w-4 h-4 mr-2" />
                          Enable Camera
                        </Button>
                      </div>
                    )}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <p className="text-red-400">{error}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-sage-700 to-sage-900">
                    <Activity className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Guided Exercise</p>
                    <p className="text-sm opacity-70">Follow the instructions below</p>
                  </div>
                )}

                {isCameraActive && analysisResult && (
                  <div className="absolute top-4 right-4">
                    <div className={`px-4 py-2 rounded-full text-white font-bold ${getScoreBgColor(analysisResult.formScore)}`}>
                      {analysisResult.formScore}%
                    </div>
                  </div>
                )}

                {isCameraActive && analysisResult && (
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-black/50 text-white border-0 capitalize">
                      Phase: {analysisResult.phase.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {exercise.hasAiDetection && (
              <div className="flex justify-center gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
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
                  <span className={`text-2xl font-bold ${getScoreColor(session.formScore)}`}>
                    {session.formScore}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getScoreBgColor(session.formScore)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${session.formScore}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </Card>
            )}

            {exercise.hasAiDetection && (
              <Card className="p-6 border-sage-200">
                <h3 className="font-semibold text-sage-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-teal-600" />
                  Live Feedback
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {session.currentFeedback.length === 0 ? (
                      <p className="text-sage-400 text-sm italic">Start moving to receive feedback...</p>
                    ) : (
                      session.currentFeedback.slice(-3).map((feedback, index) => (
                        <motion.div
                          key={`${feedback.timestamp}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`p-3 rounded-lg text-sm ${
                            feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                            feedback.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {feedback.message}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
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
