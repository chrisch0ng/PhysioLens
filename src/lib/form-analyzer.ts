import { Landmark, FormFeedback, BodyOrientation } from '@/types';
import { calculateAngle, calculate3DAngle, getMidpoint, getDistance, checkOrientation, calculateAverageVisibility } from './utils';

// MediaPipe Pose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

export interface FormAnalysisResult {
  phase: string;
  repCount: number;
  formScore: number;
  isCorrect: boolean;
  feedback: FormFeedback[];
  debug?: Record<string, number>;
}

export interface FormAnalyzerState {
  phase: string;
  repCount: number;
  lastRepTime: number;
  calibrationFrames: number;
  baselineValues: Record<string, number>;
}

export function createAnalyzerState(): FormAnalyzerState {
  return {
    phase: 'start',
    repCount: 0,
    lastRepTime: 0,
    calibrationFrames: 0,
    baselineValues: {},
  };
}

// ===== CAT-CAMEL ANALYZER =====
export function analyzeCatCamel(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {
      phase: state.phase,
      repCount: state.repCount,
      formScore: 0,
      isCorrect: false,
      feedback: [{
        type: 'warning',
        message: 'Cannot detect body position',
        timestamp: Date.now(),
      }],
    };
  }

  const midShoulder = getMidpoint(leftShoulder, rightShoulder);
  const midHip = getMidpoint(leftHip, rightHip);
  const midKnee = getMidpoint(leftKnee, rightKnee);

  // Calculate spine curve (vertical displacement)
  const spineCurve = midShoulder.y - midHip.y;
  const hipAngle = calculateAngle(midShoulder, midHip, midKnee);

  debug.spineCurve = spineCurve;
  debug.hipAngle = hipAngle;

  // Phase detection
  const CAT_THRESHOLD = 0.12;
  const CAMEL_THRESHOLD = -0.08;

  let newPhase = state.phase;
  if (spineCurve >= CAT_THRESHOLD) newPhase = 'cat';
  else if (spineCurve <= CAMEL_THRESHOLD) newPhase = 'camel';
  else newPhase = 'neutral';

  // Rep counting: cat -> camel -> cat = 1 rep
  let repIncrement = false;
  if (state.phase === 'camel' && newPhase === 'cat') {
    const now = Date.now();
    if (now - state.lastRepTime > 1500) { // Debounce
      repIncrement = true;
      state.lastRepTime = now;
    }
  }

  if (repIncrement) {
    state.repCount++;
  }
  state.phase = newPhase;

  // Form checks
  if (hipAngle < 75) {
    feedback.push({
      type: 'warning',
      message: 'Keep hips stacked over knees',
      bodyPart: 'hips',
      timestamp: Date.now(),
    });
  }

  // Calculate form score
  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  ]);
  const formScore = Math.round(visibility * 100);

  return {
    phase: newPhase,
    repCount: state.repCount,
    formScore,
    isCorrect: feedback.length === 0,
    feedback,
    debug,
  };
}

// ===== COBRA STRETCH ANALYZER =====
export function analyzeCobraStretch(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {
      phase: state.phase,
      repCount: state.repCount,
      formScore: 0,
      isCorrect: false,
      feedback: [{
        type: 'warning',
        message: 'Cannot detect body position',
        timestamp: Date.now(),
      }],
    };
  }

  const midShoulder = getMidpoint(leftShoulder, rightShoulder);
  const midHip = getMidpoint(leftHip, rightHip);
  const chestLift = midHip.y - midShoulder.y;

  debug.chestLift = chestLift;

  // Phase detection
  const LIFT_THRESHOLD = 0.08;
  const HOLD_THRESHOLD = 0.25;

  let newPhase = state.phase;
  if (chestLift > HOLD_THRESHOLD) newPhase = 'hold';
  else if (chestLift > LIFT_THRESHOLD) newPhase = 'lift';
  else newPhase = 'prone';

  // Rep counting
  let repIncrement = false;
  if (state.phase === 'hold' && newPhase === 'prone') {
    const now = Date.now();
    if (now - state.lastRepTime > 1500) {
      repIncrement = true;
      state.lastRepTime = now;
    }
  }

  if (repIncrement) {
    state.repCount++;
  }
  state.phase = newPhase;

  // Form checks
  if (leftElbow && rightElbow && leftWrist && rightWrist) {
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    debug.leftElbowAngle = leftElbowAngle;
    debug.rightElbowAngle = rightElbowAngle;

    if (leftElbowAngle < 120 || rightElbowAngle < 120) {
      feedback.push({
        type: 'info',
        message: 'Soften the elbows slightly',
        bodyPart: 'elbows',
        timestamp: Date.now(),
      });
    }
  }

  if (chestLift > 0.35) {
    feedback.push({
      type: 'warning',
      message: 'Lift only to a comfortable height',
      bodyPart: 'spine',
      timestamp: Date.now(),
    });
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  ]);

  return {
    phase: newPhase,
    repCount: state.repCount,
    formScore: Math.round(visibility * 100),
    isCorrect: feedback.length === 0,
    feedback,
    debug,
  };
}

// ===== DEAD BUG ANALYZER =====
export function analyzeDeadBug(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return {
      phase: state.phase,
      repCount: state.repCount,
      formScore: 0,
      isCorrect: false,
      feedback: [{
        type: 'warning',
        message: 'Cannot detect limbs',
        timestamp: Date.now(),
      }],
    };
  }

  const midHip = getMidpoint(leftHip, rightHip);

  // Calculate extensions
  const leftLegExt = getDistance(leftHip, leftAnkle);
  const rightLegExt = getDistance(rightHip, rightAnkle);
  const leftArmExt = leftShoulder && leftWrist ? getDistance(leftShoulder, leftWrist) : 0;
  const rightArmExt = rightShoulder && rightWrist ? getDistance(rightShoulder, rightWrist) : 0;

  debug.leftLegExt = leftLegExt;
  debug.rightLegExt = rightLegExt;
  debug.leftArmExt = leftArmExt;
  debug.rightArmExt = rightArmExt;

  // Phase detection based on extension
  const EXTENSION_THRESHOLD = 0.7;

  const rightExtended = rightLegExt > EXTENSION_THRESHOLD && leftArmExt > EXTENSION_THRESHOLD;
  const leftExtended = leftLegExt > EXTENSION_THRESHOLD && rightArmExt > EXTENSION_THRESHOLD;

  let newPhase = state.phase;
  if (rightExtended) newPhase = 'extend_right';
  else if (leftExtended) newPhase = 'extend_left';
  else newPhase = 'start';

  // Rep counting - complete both sides = 1 rep
  let repIncrement = false;
  const lastPhase = state.phase;
  
  if ((lastPhase === 'extend_right' || lastPhase === 'extend_left') && newPhase === 'start') {
    const now = Date.now();
    if (now - state.lastRepTime > 1000) {
      // Track which side was done
      if (!state.baselineValues.sidesCompleted) {
        state.baselineValues.sidesCompleted = 0;
      }
      state.baselineValues.sidesCompleted++;
      
      if (state.baselineValues.sidesCompleted >= 2) {
        repIncrement = true;
        state.baselineValues.sidesCompleted = 0;
        state.lastRepTime = now;
      }
    }
  }

  if (repIncrement) {
    state.repCount++;
  }
  state.phase = newPhase;

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  ]);

  return {
    phase: newPhase,
    repCount: state.repCount,
    formScore: Math.round(visibility * 100),
    isCorrect: true,
    feedback,
    debug,
  };
}

// ===== SQUAT ANALYZER =====
export function analyzeSquat(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return {
      phase: state.phase,
      repCount: state.repCount,
      formScore: 0,
      isCorrect: false,
      feedback: [{
        type: 'warning',
        message: 'Cannot detect legs',
        timestamp: Date.now(),
      }],
    };
  }

  const midHip = getMidpoint(leftHip, rightHip);
  const midKnee = getMidpoint(leftKnee, rightKnee);
  const midAnkle = getMidpoint(leftAnkle, rightAnkle);
  const midShoulder = getMidpoint(leftShoulder, rightShoulder);

  // Calculate angles
  const kneeAngle = calculateAngle(midHip, midKnee, midAnkle);
  const hipAngle = calculate3DAngle(midShoulder, midHip, midKnee);

  // Calculate trunk lean
  const torsoDy = midHip.y - midShoulder.y;
  const torsoDx = midHip.x - midShoulder.x;
  const trunkLean = Math.abs(Math.atan2(torsoDx, torsoDy) * (180 / Math.PI));

  debug.kneeAngle = kneeAngle;
  debug.hipAngle = hipAngle;
  debug.trunkLean = trunkLean;

  // Phase detection
  let newPhase = state.phase;
  if (kneeAngle > 160) newPhase = 'standing';
  else if (kneeAngle < 90) newPhase = 'bottom';
  else if (state.phase === 'bottom' || (state.phase === 'descending' && kneeAngle < 120)) {
    newPhase = 'ascending';
  } else if (kneeAngle < 140) {
    newPhase = 'descending';
  }

  // Rep counting
  let repIncrement = false;
  if (state.phase === 'ascending' && newPhase === 'standing') {
    const now = Date.now();
    if (now - state.lastRepTime > 1000) {
      repIncrement = true;
      state.lastRepTime = now;
    }
  }

  if (repIncrement) {
    state.repCount++;
  }
  state.phase = newPhase;

  // Form checks (only during movement)
  if (newPhase === 'descending' || newPhase === 'bottom') {
    if (kneeAngle > 100 && newPhase === 'bottom') {
      feedback.push({
        type: 'warning',
        message: 'Squat deeper - thighs should be parallel',
        bodyPart: 'legs',
        timestamp: Date.now(),
      });
    }

    if (trunkLean > 50) {
      feedback.push({
        type: 'warning',
        message: 'Keep chest up',
        bodyPart: 'torso',
        timestamp: Date.now(),
      });
    }
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ]);

  // Form score based on depth
  let formScore = Math.round(visibility * 100);
  if (kneeAngle < 90) formScore = Math.min(100, formScore + 10);
  else if (kneeAngle > 120) formScore = Math.max(50, formScore - 20);

  return {
    phase: newPhase,
    repCount: state.repCount,
    formScore,
    isCorrect: feedback.length === 0,
    feedback,
    debug,
  };
}

// Main analyzer dispatcher
export function analyzeForm(
  exerciseId: string,
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  switch (exerciseId) {
    case 'cat-camel':
      return analyzeCatCamel(landmarks, state);
    case 'cobra-stretch':
      return analyzeCobraStretch(landmarks, state);
    case 'dead-bug':
      return analyzeDeadBug(landmarks, state);
    case 'bodyweight-squat':
      return analyzeSquat(landmarks, state);
    default:
      return {
        phase: 'unknown',
        repCount: 0,
        formScore: 0,
        isCorrect: false,
        feedback: [{
          type: 'info',
          message: 'AI form detection not available for this exercise',
          timestamp: Date.now(),
        }],
      };
  }
}
