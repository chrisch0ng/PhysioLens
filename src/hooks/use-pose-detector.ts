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

export function usePoseDetector({ onResults, enabled = true }: UsePoseDetectorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseSolution | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

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
        
        // Wait a bit for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setScriptsLoaded(true);
        setError(null);
      } catch (err) {
        setError('Failed to load MediaPipe libraries');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMediaPipe();
  }, [enabled]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    if (!enabled || !scriptsLoaded || !window.Pose) return;

    try {
      const pose = new window.Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        // Draw on canvas
        if (canvasRef.current && videoRef.current && window.drawConnectors && window.drawLandmarks) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Set canvas size to match video
            const videoWidth = videoRef.current.videoWidth || 640;
            const videoHeight = videoRef.current.videoHeight || 480;
            
            if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
              canvas.width = videoWidth;
              canvas.height = videoHeight;
            }

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw video frame
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            // Draw pose landmarks
            if (results.poseLandmarks) {
              window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
                color: '#14b8a6',
                lineWidth: 3,
              });
              window.drawLandmarks(ctx, results.poseLandmarks, {
                color: '#0d9488',
                lineWidth: 2,
                radius: 5,
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
      setError('Failed to initialize pose detector');
      console.error(err);
    }

    return () => {
      poseRef.current?.close();
    };
  }, [enabled, scriptsLoaded, onResults]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !poseRef.current) {
      setError('Camera or pose detector not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = () => reject(new Error('Video error'));
      });

      // Start processing frames
      const processFrame = async () => {
        if (!videoRef.current || !poseRef.current) return;
        
        try {
          await poseRef.current.send({ image: videoRef.current });
        } catch (err) {
          console.error('Frame processing error:', err);
        }
        
        // Continue processing
        if (streamRef.current) {
          requestAnimationFrame(processFrame);
        }
      };

      // Start the loop
      processFrame();
      setIsLoading(false);

    } catch (err: any) {
      let errorMsg = 'Failed to access camera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found. Please connect a camera.';
      }
      setError(errorMsg);
      console.error('Camera error:', err);
      setIsLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isLoading,
    error,
    startCamera,
    stopCamera,
  };
}

export function extractLandmarks(results: PoseResults): Landmark[] {
  if (!results.poseLandmarks) return [];
  
  return results.poseLandmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
  }));
}
