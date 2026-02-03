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
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [debug, setDebug] = useState<string>('');

  // Load MediaPipe scripts immediately on mount
  useEffect(() => {
    console.log('[PoseDetector] Starting script load, enabled:', enabled);
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
        script.onload = () => {
          console.log(`[PoseDetector] Loaded: ${src}`);
          resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        setIsLoading(true);
        setDebug('Loading MediaPipe...');
        
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        
        // Wait for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('[PoseDetector] Scripts loaded, Pose available:', !!window.Pose);
        setScriptsLoaded(true);
        setDebug('MediaPipe loaded');
        setError(null);
      } catch (err) {
        console.error('[PoseDetector] Failed to load scripts:', err);
        setError('Failed to load MediaPipe libraries');
        setDebug('Failed to load MediaPipe');
      } finally {
        setIsLoading(false);
      }
    };

    loadMediaPipe();
  }, [enabled]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    if (!enabled || !scriptsLoaded || !window.Pose) {
      console.log('[PoseDetector] Cannot init:', { enabled, scriptsLoaded, hasPose: !!window.Pose });
      return;
    }

    try {
      console.log('[PoseDetector] Initializing Pose...');
      setDebug('Initializing pose detector...');
      
      const pose = new window.Pose({
        locateFile: (file) => {
          console.log('[PoseDetector] Loading file:', file);
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
        console.log('[PoseDetector] Got results:', { hasLandmarks: !!results.poseLandmarks });
        
        // Draw on canvas
        if (canvasRef.current && videoRef.current && window.drawConnectors && window.drawLandmarks) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const video = videoRef.current;
          
          if (ctx && video.readyState >= 2) {
            // Set canvas size to match video
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
            }

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw video frame
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (e) {
              console.error('[PoseDetector] Draw error:', e);
            }

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
      setDebug('Pose detector ready');
      console.log('[PoseDetector] Pose initialized');
      
    } catch (err) {
      console.error('[PoseDetector] Init error:', err);
      setError('Failed to initialize pose detector');
      setDebug('Init failed');
    }

    return () => {
      poseRef.current?.close();
    };
  }, [enabled, scriptsLoaded, onResults]);

  // Start camera
  const startCamera = useCallback(async () => {
    console.log('[PoseDetector] startCamera called');
    setDebug('Requesting camera...');
    
    if (!videoRef.current) {
      setError('Video element not ready');
      setDebug('Video ref missing');
      return;
    }

    if (!poseRef.current) {
      setError('Pose detector not ready');
      setDebug('Pose ref missing');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get camera stream
      console.log('[PoseDetector] Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('[PoseDetector] Got stream:', stream.id);
      streamRef.current = stream;
      
      const video = videoRef.current;
      video.srcObject = stream;
      
      setDebug('Starting video...');

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);
        
        video.onloadedmetadata = () => {
          console.log('[PoseDetector] Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          clearTimeout(timeout);
          video.play().then(() => {
            console.log('[PoseDetector] Video playing');
            resolve();
          }).catch(reject);
        };
        
        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error('Video error: ' + e));
        };
      });

      setDebug('Video playing, starting detection...');

      // Start processing frames
      let isProcessing = false;
      const processFrame = async () => {
        if (!videoRef.current || !poseRef.current) {
          console.log('[PoseDetector] Stopping frame loop - refs gone');
          return;
        }
        
        if (isProcessing) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
        
        const video = videoRef.current;
        if (video.readyState < 2 || video.paused || video.ended) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
        
        isProcessing = true;
        
        try {
          await poseRef.current.send({ image: video });
        } catch (err) {
          console.error('[PoseDetector] Send error:', err);
        } finally {
          isProcessing = false;
        }
        
        animationFrameRef.current = requestAnimationFrame(processFrame);
      };

      // Start the loop
      animationFrameRef.current = requestAnimationFrame(processFrame);
      setIsLoading(false);
      setDebug('Camera active');
      console.log('[PoseDetector] Camera started successfully');

    } catch (err: any) {
      console.error('[PoseDetector] Camera error:', err);
      let errorMsg = 'Failed to access camera';
      let debugMsg = err.message || 'Unknown error';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found. Please connect a camera.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application.';
      }
      
      setError(errorMsg);
      setDebug(debugMsg);
      setIsLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('[PoseDetector] Stopping camera');
    
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
    
    setDebug('Camera stopped');
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
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
  }));
}
