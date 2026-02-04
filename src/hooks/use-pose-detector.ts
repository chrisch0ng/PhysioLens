'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Landmark } from '@/types';

// MediaPipe gives us normalized coordinates (0-1) for each landmark
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

// MediaPipe's Pose class - we load this from CDN since the npm package 
// has issues with Next.js static exports
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

// Tell TypeScript about the globals MediaPipe adds to window
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

// Run pose detection at 20fps - good balance of responsiveness and performance
// Video still renders at 60fps via requestAnimationFrame
const PROCESS_INTERVAL = 50;

export function usePoseDetector({ onResults, enabled = true, showSkeleton = true }: UsePoseDetectorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseSolution | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const lastResultsRef = useRef<PoseResults | null>(null);
  const processingRef = useRef<boolean>(false);
  const onResultsRef = useRef(onResults);
  const showSkeletonRef = useRef(showSkeleton);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [debug, setDebug] = useState<string>('');

  // Keep the callback fresh without triggering re-renders
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

  // Load MediaPipe scripts from CDN
  useEffect(() => {
    if (!enabled) return;

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      // Skip if already loaded
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed'));
      document.head.appendChild(script);
    });

    // Load pose detection and drawing utils, then give it a moment to settle
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'))
      .then(() => new Promise(r => setTimeout(r, 500)))
      .then(() => setScriptsLoaded(true))
      .catch(() => setError('Failed to load'));
  }, [enabled]);

  // Set up the pose detector once scripts are ready
  useEffect(() => {
    if (!enabled || !scriptsLoaded || !window.Pose) return;

    try {
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 0, // Lite model - fastest option
        smoothLandmarks: true, // Reduces jitter in the skeleton
        enableSegmentation: false, // Don't need the person mask
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      pose.onResults((results) => {
        // Cache results for the render loop and notify the workout page
        lastResultsRef.current = results;
        processingRef.current = false;
        onResultsRef.current?.(results);
      });

      poseRef.current = pose;
      setIsInitialized(true);
    } catch {
      setError('Init failed');
    }

    return () => poseRef.current?.close();
  }, [enabled, scriptsLoaded]);

  // Main render loop - runs at display refresh rate (60fps)
  // We draw video every frame but only run pose detection every 50ms
  const frameLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    // Get canvas context once and reuse it
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { alpha: true }) || null;
    }
    const ctx = ctxRef.current;
    if (!ctx) {
      rafRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    // Match canvas size to video on first frame
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Draw the video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay the skeleton if user has it enabled
    if (showSkeletonRef.current && lastResultsRef.current?.poseLandmarks && window.drawConnectors) {
      window.drawConnectors(ctx, lastResultsRef.current.poseLandmarks, window.POSE_CONNECTIONS, {
        color: '#14b8a6', lineWidth: 2,
      });
      window.drawLandmarks(ctx, lastResultsRef.current.poseLandmarks, {
        color: '#0d9488', lineWidth: 1, radius: 3,
      });
    }

    // Run pose detection at 20fps (throttled)
    const now = performance.now();
    if (now - lastProcessTimeRef.current >= PROCESS_INTERVAL && !processingRef.current) {
      lastProcessTimeRef.current = now;
      processingRef.current = true;
      
      poseRef.current?.send({ image: video }).catch(() => {
        processingRef.current = false;
      });
    }

    rafRef.current = requestAnimationFrame(frameLoop);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) {
      setError('Not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      stopCameraInternal();

      // Request camera at 640x480, 30fps - smooth enough for exercise tracking
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video to actually start producing frames
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            resolve();
          } else if (attempts > 50) {
            reject(new Error('Video timeout'));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      await video.play();

      // Kick off the render loop
      lastProcessTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(frameLoop);

      setIsLoading(false);
      setDebug('smooth');

    } catch (err: any) {
      setIsLoading(false);
      let msg = 'Camera failed';
      if (err.name === 'NotAllowedError') msg = 'Permission denied';
      else if (err.name === 'NotFoundError') msg = 'No camera found';
      else if (err.message) msg = err.message;
      setError(msg);
    }
  }, [frameLoop]);

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
    
    ctxRef.current = null;
    lastResultsRef.current = null;
    processingRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraInternal();
    setIsLoading(false);
  }, [stopCameraInternal]);

  // Clean up everything when component unmounts
  useEffect(() => {
    return () => stopCameraInternal();
  }, [stopCameraInternal]);

  return { videoRef, canvasRef, isInitialized, isLoading, error, debug, startCamera, stopCamera };
}

// Helper to convert MediaPipe results to our internal format
export function extractLandmarks(results: PoseResults): Landmark[] {
  return results.poseLandmarks?.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })) ?? [];
}
