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

// Aggressive throttling - 5fps max
const FRAME_INTERVAL = 200; // 200ms = 5fps
const SKIP_FRAMES = 2; // Process every 3rd frame

export function usePoseDetector({ onResults, enabled = true, showSkeleton = true }: UsePoseDetectorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseSolution | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [debug, setDebug] = useState<string>('');

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
      script.onerror = () => reject(new Error(`Failed: ${src}`));
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

      // Ultra-light settings
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: false, // Disable smoothing - causes lag
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      pose.onResults((results) => {
        if (!canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        if (!ctx || video.readyState < 2) return;

        // Resize once
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        // Clear and draw video
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw skeleton (only if enabled)
        if (showSkeleton && results.poseLandmarks && window.drawConnectors) {
          window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: '#14b8a6', lineWidth: 2,
          });
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: '#0d9488', lineWidth: 1, radius: 3,
          });
        }

        onResults?.(results);
      });

      poseRef.current = pose;
      setIsInitialized(true);
    } catch {
      setError('Init failed');
    }

    return () => poseRef.current?.close();
  }, [enabled, scriptsLoaded, onResults]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) return;

    try {
      setIsLoading(true);

      // Stop existing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Low-res camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { max: 10 } },
        audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for ready
      await new Promise<void>((resolve) => {
        const check = () => {
          if (video.readyState >= 2 && video.videoWidth > 0) resolve();
          else setTimeout(check, 50);
        };
        check();
      });

      await video.play().catch(() => {});

      // Processing loop with frame skipping
      let lastTime = 0;
      const loop = async (time: number) => {
        if (!videoRef.current || !poseRef.current) return;
        
        // Throttle by time
        if (time - lastTime < FRAME_INTERVAL) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTime = time;
        
        // Skip frames
        frameCountRef.current++;
        if (frameCountRef.current % (SKIP_FRAMES + 1) !== 0) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const video = videoRef.current;
        if (video.readyState >= 2 && !video.paused) {
          await poseRef.current.send({ image: video }).catch(() => {});
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
      setIsLoading(false);
      setDebug('5fps mode');

    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'Denied' : 'Failed');
      setIsLoading(false);
    }
  }, []);

  // Stop
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    frameCountRef.current = 0;
  }, []);

  return { videoRef, canvasRef, isInitialized, isLoading, error, debug, startCamera, stopCamera };
}

export function extractLandmarks(results: PoseResults): Landmark[] {
  return results.poseLandmarks?.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })) ?? [];
}
