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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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
        if (!canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        if (!ctx || video.readyState < 2) return;

        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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
  }, [enabled, scriptsLoaded, onResults, showSkeleton]);

  // Start camera using setInterval instead of RAF for simpler control
  const startCamera = useCallback(async () => {
    console.log('[startCamera] Called');
    
    if (!videoRef.current || !poseRef.current) {
      console.log('[startCamera] Missing refs:', { video: !!videoRef.current, pose: !!poseRef.current });
      setError('Not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop existing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Get camera
      console.log('[startCamera] Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { max: 15 } },
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

      // Try to play
      video.play().catch(e => console.log('Play warning:', e));

      // Start processing at 10fps
      console.log('[startCamera] Starting interval...');
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !poseRef.current) return;
        const v = videoRef.current;
        if (v.readyState >= 2 && !v.paused) {
          try {
            await poseRef.current.send({ image: v });
          } catch (e) {}
        }
      }, 100);

      setIsLoading(false);
      setDebug('10fps');
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
  }, []);

  // Stop
  const stopCamera = useCallback(() => {
    console.log('[stopCamera] Called');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsLoading(false);
  }, []);

  return { videoRef, canvasRef, isInitialized, isLoading, error, debug, startCamera, stopCamera };
}

export function extractLandmarks(results: PoseResults): Landmark[] {
  return results.poseLandmarks?.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })) ?? [];
}
