import { create } from 'zustand';
import { Exercise, WorkoutSession, FormFeedback } from '@/types';

interface SessionState {
  // Current session
  isActive: boolean;
  currentExercise: Exercise | null;
  currentSet: number;
  targetSets: number;
  targetReps: number;
  
  // Rep tracking
  repCount: number;
  formScore: number;
  currentPhase: string;
  isCorrectForm: boolean;
  
  // Feedback
  feedbackHistory: FormFeedback[];
  currentFeedback: FormFeedback[];
  
  // Timing
  startTime: number;
  restTimeRemaining: number;
  isResting: boolean;
  
  // Session data
  sessionData: WorkoutSession | null;
  completedSets: Array<{
    setNumber: number;
    reps: number;
    formScore: number;
  }>;
  
  // Actions
  startSession: (exercise: Exercise, sets?: number, reps?: number) => void;
  endSession: () => void;
  incrementRep: () => void;
  updateFormScore: (score: number) => void;
  updatePhase: (phase: string) => void;
  setFormCorrectness: (isCorrect: boolean) => void;
  addFeedback: (feedback: FormFeedback) => void;
  clearFeedback: () => void;
  completeSet: () => void;
  startRest: (seconds: number) => void;
  endRest: () => void;
  nextSet: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  isActive: false,
  currentExercise: null,
  currentSet: 1,
  targetSets: 3,
  targetReps: 10,
  repCount: 0,
  formScore: 100,
  currentPhase: 'start',
  isCorrectForm: true,
  feedbackHistory: [],
  currentFeedback: [],
  startTime: 0,
  restTimeRemaining: 0,
  isResting: false,
  sessionData: null,
  completedSets: [],

  startSession: (exercise, sets, reps) => set({
    isActive: true,
    currentExercise: exercise,
    currentSet: 1,
    targetSets: sets || exercise.defaultSets,
    targetReps: reps || exercise.defaultReps,
    repCount: 0,
    formScore: 100,
    currentPhase: 'start',
    isCorrectForm: true,
    feedbackHistory: [],
    currentFeedback: [],
    startTime: Date.now(),
    restTimeRemaining: 0,
    isResting: false,
    completedSets: [],
    sessionData: {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      startTime: Date.now(),
      sets: [],
      totalReps: 0,
      averageFormScore: 0,
      completed: false,
    },
  }),

  endSession: () => {
    const state = get();
    set({
      isActive: false,
      sessionData: state.sessionData ? {
        ...state.sessionData,
        endTime: Date.now(),
        completed: true,
      } : null,
    });
  },

  incrementRep: () => set((state) => {
    const newRepCount = state.repCount + 1;
    return {
      repCount: newRepCount,
      sessionData: state.sessionData ? {
        ...state.sessionData,
        totalReps: newRepCount,
      } : null,
    };
  }),

  updateFormScore: (score) => set({ formScore: score }),
  
  updatePhase: (phase) => set({ currentPhase: phase }),
  
  setFormCorrectness: (isCorrect) => set({ isCorrectForm: isCorrect }),

  addFeedback: (feedback) => set((state) => ({
    currentFeedback: [...state.currentFeedback.slice(-2), feedback],
    feedbackHistory: [...state.feedbackHistory, feedback],
  })),

  clearFeedback: () => set({ currentFeedback: [] }),

  completeSet: () => set((state) => {
    const newCompletedSet = {
      setNumber: state.currentSet,
      reps: state.repCount,
      formScore: state.formScore,
    };
    
    const newCompletedSets = [...state.completedSets, newCompletedSet];
    const avgFormScore = Math.round(
      newCompletedSets.reduce((sum, s) => sum + s.formScore, 0) / newCompletedSets.length
    );
    
    return {
      completedSets: newCompletedSets,
      repCount: 0,
      sessionData: state.sessionData ? {
        ...state.sessionData,
        sets: [...state.sessionData.sets, {
          setNumber: state.currentSet,
          reps: state.repCount,
          formScore: state.formScore,
          feedback: state.currentFeedback,
          timestamp: Date.now(),
        }],
        averageFormScore: avgFormScore,
      } : null,
    };
  }),

  startRest: (seconds) => set({
    isResting: true,
    restTimeRemaining: seconds,
  }),

  endRest: () => set({
    isResting: false,
    restTimeRemaining: 0,
  }),

  nextSet: () => set((state) => ({
    currentSet: state.currentSet + 1,
    repCount: 0,
    isResting: false,
    restTimeRemaining: 0,
  })),

  reset: () => set({
    isActive: false,
    currentExercise: null,
    currentSet: 1,
    repCount: 0,
    formScore: 100,
    currentPhase: 'start',
    isCorrectForm: true,
    feedbackHistory: [],
    currentFeedback: [],
    startTime: 0,
    restTimeRemaining: 0,
    isResting: false,
    sessionData: null,
    completedSets: [],
  }),
}));
