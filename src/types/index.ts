export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseData {
  landmarks: Landmark[];
  timestamp: number;
}

export interface FormFeedback {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  bodyPart?: string;
  timestamp: number;
}

export interface ExerciseState {
  phase: string;
  repCount: number;
  formScore: number;
  isCorrect: boolean;
  feedback: FormFeedback[];
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  tier: 1 | 2;
  bodyRegion: 'lower_back' | 'lower_body' | 'upper_body' | 'core';
  category: 'mobility' | 'strength' | 'stretch' | 'stability';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  instructions: string[];
  commonMistakes: string[];
  targetMuscles: string[];
  defaultSets: number;
  defaultReps: number;
  defaultHoldSeconds: number;
  repType: 'standard' | 'alternating' | 'hold' | 'timed';
  hasAiDetection: boolean;
  landmarks?: number[];
}

export interface WorkoutSession {
  id: string;
  exerciseId: string;
  startTime: number;
  endTime?: number;
  sets: SetData[];
  totalReps: number;
  averageFormScore: number;
  completed: boolean;
}

export interface SetData {
  setNumber: number;
  reps: number;
  formScore: number;
  feedback: FormFeedback[];
  timestamp: number;
}

export interface UserProgress {
  totalSessions: number;
  totalReps: number;
  averageFormScore: number;
  currentStreak: number;
  lastWorkoutDate: string;
  exerciseHistory: ExerciseHistory[];
}

export interface ExerciseHistory {
  exerciseId: string;
  sessions: number;
  averageFormScore: number;
  lastPerformed: string;
}

export type BodyOrientation = 'front' | 'side' | 'unknown';
