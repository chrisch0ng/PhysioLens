'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Landmark } from '@/types';

// MediaPipe types
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
}

// Throttle to 10fps for better performance
const FRAME_INTERVAL = 100; // ms

export function usePoseDetector({ onResults, enabled = true }: UsePoseDetectorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseSolution | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [debug, setDebug] = useState<string>('');

  // Load MediaPipe scripts
  useEffect(() => {
    if (!enabled) return;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        setIsLoading(true);
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await new Promise(resolve => setTimeout(resolve, 500));
        setScriptsLoaded(true);
        setError(null);
      } catch (err) {
        setError('Failed to load MediaPipe');
      } finally {
        setIsLoading(false);
      }
    };

    loadMediaPipe();
  }, [enabled]);

  // Initialize MediaPipe Pose with performance settings
  useEffect(() => {
    if (!enabled || !scriptsLoaded || !window.Pose) return;

    try {
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      // Use lightest model for best performance
      pose.setOptions({
        modelComplexity: 0, // 0 = lite, 1 = full, 2 = heavy
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3, // Lower threshold = faster
        minTrackingConfidence: 0.3,
      });

      pose.onResults((results) => {
        // Draw on canvas
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const video = videoRef.current;
          
          if (ctx && video.readyState >= 2) {
            // Only resize if needed
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
            }

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw video frame
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (e) {}

            // Draw skeleton if landmarks exist
            if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks) {
              window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
                color: '#14b8a6',
                lineWidth: 2, // Thinner lines
              });
              window.drawLandmarks(ctx, results.poseLandmarks, {
                color: '#0d9488',
                lineWidth: 1,
                radius: 3, // Smaller dots
              });
            }
            ctx.restore();
          }
        }

        onResults?.(results);
      });

      poseRef.current = pose;
      setIsInitialized(true);
    } catch (err) {
      setError('Failed to initialize pose');
    }

    return () => poseRef.current?.close();
  }, [enabled, scriptsLoaded, onResults]);

  // Start camera with throttled processing
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) {
      setError('Not ready');
      return;
    }

    if (isRunningRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      isRunningRef.current = true;

      // Stop existing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get camera with lower resolution for performance
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }, // Limit framerate
          facingMode: 'user' 
        },
        audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video with timeout
      let attempts = 0;
      const waitForVideo = () => {
        return new Promise<void>((resolve, reject) => {
          const check = () => {
            attempts++;
            if (video.readyState >= 2 && video.videoWidth > 0) {
              resolve();
            } else if (attempts > 100) {
              reject(new Error('Timeout'));
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        });
      };

      await waitForVideo();
      
      try { await video.play(); } catch (e) {}

      // Throttled processing loop
      const processFrame = async (timestamp: number) => {
        if (!isRunningRef.current || !videoRef.current || !poseRef.current) return;
        
        // Throttle to 10fps
        if (timestamp - lastFrameTimeRef.current < FRAME_INTERVAL) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
        lastFrameTimeRef.current = timestamp;
        
        const video = videoRef.current;
        if (video.readyState >= 2 && !video.paused) {
          try {
            await poseRef.current.send({ image: video });
          } catch (e) {}
        }
        
        if (isRunningRef.current) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(processFrame);
      setIsLoading(false);
      setDebug('Camera active (10fps)');

    } catch (err: any) {
      isRunningRef.current = false;
      let errorMsg = 'Camera failed';
      if (err.name === 'NotAllowedError') errorMsg = 'Permission denied';
      else if (err.name === 'NotFoundError') errorMsg = 'No camera';
      setError(errorMsg);
      setIsLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    lastFrameTimeRef.current = 0;
  }, []);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isLoading,
    error,
    debug,
    startCamera,
    stopCamera,
  };
}

export function extractLandmarks(results: PoseResults): Landmark[] {
  if (!results.poseLandmarks) return [];
  return results.poseLandmarks.map((landmark) => ({
    x: landmark.x, y: landmark.y, z: landmark.z, visibility: landmark.visibility ?? 0,
  }));
}
