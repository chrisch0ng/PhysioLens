'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Landmark } from '@/types';

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PoseResults {
  poseLandmarks?: PoseLandmark[];
  image: HTMLVideoElement;
}

type PoseSolution = {
  locateFile: (file: string) => string;
  setOptions: (options: {
    modelComplexity: number;
    smoothLandmarks: boolean;
    enableSegmentation: boolean;
    smoothSegmentation: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }) => void;
  onResults: (callback: (results: PoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
};

declare global {
  interface Window {
    Pose: new (config: { locateFile: (file: string) => string }) => PoseSolution;
    drawConnectors: (
      ctx: CanvasRenderingContext2D,
      landmarks: PoseLandmark[],
      connections: Array<[number, number]>,
      style: { color: string; lineWidth: number }
    ) => void;
    drawLandmarks: (
      ctx: CanvasRenderingContext2D,
      landmarks: PoseLandmark[],
      style: { color: string; lineWidth: number; radius: number }
    ) => void;
    POSE_CONNECTIONS: Array<[number, number]>;
  }
}

interface UsePoseDetectorOptions {
  onResults?: (results: PoseResults) => void;
  enabled?: boolean;
  showSkeleton?: boolean;
}

export function usePoseDetector({ onResults, enabled = true, showSkeleton = true }: UsePoseDetectorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseSolution | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const onResultsRef = useRef(onResults);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [debug, setDebug] = useState<string>('');

  // Keep onResults ref up to date without re-triggering effects
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Load scripts
  useEffect(() => {
    if (!enabled) return;

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed'));
      document.head.appendChild(script);
    });

    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'))
      .then(() => new Promise(r => setTimeout(r, 500)))
      .then(() => setScriptsLoaded(true))
      .catch(() => setError('Failed to load'));
  }, [enabled]);

  // Init pose
  useEffect(() => {
    if (!enabled || !scriptsLoaded || !window.Pose) return;

    try {
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: false,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      pose.onResults((results) => {
        // Only draw skeleton if enabled
        if (showSkeleton && canvasRef.current && videoRef.current && results.poseLandmarks) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const video = videoRef.current;
          
          if (!ctx || video.readyState < 2) return;

          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (window.drawConnectors) {
            window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
              color: '#14b8a6', lineWidth: 2,
            });
            window.drawLandmarks(ctx, results.poseLandmarks, {
              color: '#0d9488', lineWidth: 1, radius: 3,
            });
          }
        }

        // Call user's onResults handler
        onResultsRef.current?.(results);
      });

      poseRef.current = pose;
      setIsInitialized(true);
    } catch {
      setError('Init failed');
    }

    return () => poseRef.current?.close();
  }, [enabled, scriptsLoaded, showSkeleton]);

  // Frame processing loop with throttling
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) return;

    const video = videoRef.current;
    const now = performance.now();
    
    // Throttle to 5fps (200ms between frames)
    if (now - lastFrameTimeRef.current >= 200) {
      lastFrameTimeRef.current = now;
      
      if (video.readyState >= 2 && !video.paused) {
        try {
          await poseRef.current.send({ image: video });
        } catch (e) {
          // Ignore frame errors
        }
      }
    }

    // Schedule next frame
    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    console.log('[startCamera] Called');
    
    if (!videoRef.current || !poseRef.current) {
      console.log('[startCamera] Missing refs');
      setError('Not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop existing
      stopCameraInternal();

      // Get camera at lower resolution for performance
      console.log('[startCamera] Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { max: 10 }
        },
        audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      console.log('[startCamera] Waiting for video...');
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            console.log('[startCamera] Video ready:', video.videoWidth, 'x', video.videoHeight);
            resolve();
          } else if (attempts > 50) {
            reject(new Error('Video timeout'));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      // Play video
      await video.play();

      // Start processing loop
      console.log('[startCamera] Starting 5fps loop...');
      lastFrameTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(processFrame);

      setIsLoading(false);
      setDebug('5fps');
      console.log('[startCamera] Camera active');

    } catch (err: any) {
      console.error('[startCamera] Error:', err);
      setIsLoading(false);
      let msg = 'Camera failed';
      if (err.name === 'NotAllowedError') msg = 'Permission denied';
      else if (err.name === 'NotFoundError') msg = 'No camera found';
      else if (err.message) msg = err.message;
      setError(msg);
    }
  }, [processFrame]);

  // Internal stop function
  const stopCameraInternal = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Public stop function
  const stopCamera = useCallback(() => {
    console.log('[stopCamera] Called');
    stopCameraInternal();
    setIsLoading(false);
  }, [stopCameraInternal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCameraInternal();
  }, [stopCameraInternal]);

  return { videoRef, canvasRef, isInitialized, isLoading, error, debug, startCamera, stopCamera };
}

export function extractLandmarks(results: PoseResults): Landmark[] {
  return results.poseLandmarks?.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })) ?? [];
}
