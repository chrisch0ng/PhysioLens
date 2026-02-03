import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, ExerciseHistory } from '@/types';

interface ProgressState extends UserProgress {
  // Actions
  addSession: (exerciseId: string, reps: number, formScore: number) => void;
  updateStreak: () => void;
  getExerciseStats: (exerciseId: string) => ExerciseHistory | undefined;
  resetProgress: () => void;
}

const initialState: UserProgress = {
  totalSessions: 0,
  totalReps: 0,
  averageFormScore: 0,
  currentStreak: 0,
  lastWorkoutDate: '',
  exerciseHistory: [],
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addSession: (exerciseId, reps, formScore) => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        
        // Update exercise history
        const existingHistory = state.exerciseHistory.find(h => h.exerciseId === exerciseId);
        let newHistory: ExerciseHistory[];
        
        if (existingHistory) {
          newHistory = state.exerciseHistory.map(h => 
            h.exerciseId === exerciseId
              ? {
                  ...h,
                  sessions: h.sessions + 1,
                  averageFormScore: Math.round((h.averageFormScore * h.sessions + formScore) / (h.sessions + 1)),
                  lastPerformed: today,
                }
              : h
          );
        } else {
          newHistory = [
            ...state.exerciseHistory,
            {
              exerciseId,
              sessions: 1,
              averageFormScore: formScore,
              lastPerformed: today,
            },
          ];
        }

        // Calculate new average form score
        const totalFormScore = state.averageFormScore * state.totalSessions + formScore;
        const newTotalSessions = state.totalSessions + 1;
        const newAverageFormScore = Math.round(totalFormScore / newTotalSessions);

        return {
          totalSessions: newTotalSessions,
          totalReps: state.totalReps + reps,
          averageFormScore: newAverageFormScore,
          exerciseHistory: newHistory,
          lastWorkoutDate: today,
        };
      }),

      updateStreak: () => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let newStreak = state.currentStreak;
        
        if (state.lastWorkoutDate === today) {
          // Already worked out today
          newStreak = state.currentStreak;
        } else if (state.lastWorkoutDate === yesterday) {
          // Worked out yesterday, increment streak
          newStreak = state.currentStreak + 1;
        } else {
          // Streak broken, start over
          newStreak = 1;
        }
        
        return {
          currentStreak: newStreak,
        };
      }),

      getExerciseStats: (exerciseId) => {
        return get().exerciseHistory.find(h => h.exerciseId === exerciseId);
      },

      resetProgress: () => set(initialState),
    }),
    {
      name: 'physiolens-progress',
    }
  )
);
