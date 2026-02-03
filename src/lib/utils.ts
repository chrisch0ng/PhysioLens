import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Landmark } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  
  const dot = abx * cbx + aby * cby;
  const mag = Math.sqrt(abx * abx + aby * aby) * Math.sqrt(cbx * cbx + cby * cby);
  
  if (mag === 0) return 0;
  
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cos) * (180 / Math.PI);
}

export function calculate3DAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const abz = a.z - b.z;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const cbz = c.z - b.z;
  
  const dot = abx * cbx + aby * cby + abz * cbz;
  const mag = Math.sqrt(abx * abx + aby * aby + abz * abz) * 
              Math.sqrt(cbx * cbx + cby * cby + cbz * cbz);
  
  if (mag === 0) return 0;
  
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cos) * (180 / Math.PI);
}

export function getMidpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: (a.visibility + b.visibility) / 2,
  };
}

export function getDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getDistance3D(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function checkOrientation(
  landmarks: Landmark[],
  desired: 'front' | 'side'
): { isCorrect: boolean; feedback?: string } {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { isCorrect: false, feedback: "Cannot detect body position" };
  }
  
  const shoulderWidth = getDistance(leftShoulder, rightShoulder);
  const midShoulder = getMidpoint(leftShoulder, rightShoulder);
  const midHip = getMidpoint(leftHip, rightHip);
  const torsoHeight = getDistance(midShoulder, midHip) || 1;
  
  const ratio = shoulderWidth / torsoHeight;
  
  if (desired === 'side') {
    if (ratio > 0.6) return { isCorrect: false, feedback: "Turn to face the side" };
  } else {
    if (ratio < 0.5) return { isCorrect: false, feedback: "Turn to face forward" };
  }
  
  return { isCorrect: true };
}

export function calculateAverageVisibility(landmarks: Landmark[], indices: number[]): number {
  const total = indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0);
  return total / indices.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-teal-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-teal-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}
