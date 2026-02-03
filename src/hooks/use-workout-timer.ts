'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWorkoutTimerOptions {
  onTick?: (seconds: number) => void;
  onComplete?: () => void;
}

export function useWorkoutTimer(options: UseWorkoutTimerOptions = {}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      options.onTick?.(elapsed);
    }, 1000);
  }, [elapsedSeconds, isRunning, options]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning]);

  const resume = useCallback(() => {
    if (isRunning) return;
    start();
  }, [isRunning, start]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    options.onComplete?.();
  }, [options]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    formattedTime: formatTime(elapsedSeconds),
    start,
    pause,
    resume,
    stop,
    reset,
    formatTime,
  };
}

export function useRestTimer(initialSeconds: number = 60) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((seconds?: number) => {
    const targetSeconds = seconds ?? initialSeconds;
    setSecondsRemaining(targetSeconds);
    setIsRunning(true);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((seconds?: number) => {
    stop();
    setSecondsRemaining(seconds ?? initialSeconds);
  }, [initialSeconds, stop]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    secondsRemaining,
    isRunning,
    formattedTime: formatTime(secondsRemaining),
    isComplete: secondsRemaining === 0,
    start,
    stop,
    reset,
    formatTime,
  };
}
