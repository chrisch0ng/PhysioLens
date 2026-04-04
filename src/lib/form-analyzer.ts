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

  const torsoDy = midHip.y - midShoulder.y;
  const torsoDx = midHip.x - midShoulder.x;
  const trunkLeanAngle = Math.atan2(torsoDx, torsoDy) * (180 / Math.PI);

  // Calibrate baseline trunk angle during standing so we don't misread natural posture
  if (state.phase === 'standing') {
    state.baselineValues.trunkLean = trunkLeanAngle;
  }
  const baseline = state.baselineValues.trunkLean ?? trunkLeanAngle;
  // Knees shift in a known direction when squatting — use that as the "forward" direction
  const forwardDir = Math.sign(midKnee.x - midHip.x) || 1;
  // Forward lean = deviation from baseline in the knee direction
  const trunkLeanDelta = (trunkLeanAngle - baseline) * forwardDir;
  const trunkLean = Math.max(0, trunkLeanDelta);

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

  // Form checks during squat movement
  if (newPhase === 'descending' || newPhase === 'bottom' || newPhase === 'ascending') {
    if (kneeAngle > 110 && newPhase === 'bottom') {
      feedback.push({
        type: 'warning',
        message: 'Squat deeper — aim to get your thighs parallel to the floor',
        bodyPart: 'legs',
        timestamp: Date.now(),
      });
    }

    if (trunkLean > 25) {
      feedback.push({
        type: 'warning',
        message: 'Chest up — you\'re leaning too far forward, keep your torso more upright',
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

// ===== LUNGE ANALYZER =====
export function analyzeLunge(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee   = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee  = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle  = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Step back so your full body is visible', timestamp: Date.now() }] };
  }

  const midHip      = getMidpoint(leftHip, rightHip);
  const midShoulder = getMidpoint(leftShoulder, rightShoulder);

  // Calibrate standing hip height over first 20 frames
  if (state.calibrationFrames < 20) {
    state.calibrationFrames++;
    const n = state.calibrationFrames;
    state.baselineValues.standingHipY =
      ((state.baselineValues.standingHipY ?? midHip.y) * (n - 1) + midHip.y) / n;
    return { phase: 'calibrating', repCount: 0, formScore: 50, isCorrect: true,
      feedback: [{ type: 'info', message: 'Stand tall while we calibrate your position…', timestamp: Date.now() }] };
  }

  const hipDrop    = midHip.y - state.baselineValues.standingHipY; // positive = lower
  const trunkLeanX = Math.abs(midShoulder.x - midHip.x);

  debug.hipDrop   = hipDrop;
  debug.trunkLean = trunkLeanX;

  const DESCEND_THRESHOLD = 0.06;
  const BOTTOM_THRESHOLD  = 0.14;

  let newPhase = state.phase;
  if (hipDrop < DESCEND_THRESHOLD) {
    newPhase = 'standing';
  } else if (hipDrop >= BOTTOM_THRESHOLD) {
    newPhase = 'bottom';
  } else if (state.phase === 'bottom' || state.phase === 'ascending') {
    newPhase = 'ascending';
  } else {
    newPhase = 'descending';
  }

  let repIncrement = false;
  if (state.phase === 'ascending' && newPhase === 'standing') {
    const now = Date.now();
    if (now - state.lastRepTime > 1200) { repIncrement = true; state.lastRepTime = now; }
  }
  if (repIncrement) state.repCount++;
  state.phase = newPhase;

  if (newPhase === 'bottom' || newPhase === 'ascending') {
    if (hipDrop < BOTTOM_THRESHOLD + 0.02) {
      feedback.push({ type: 'info', message: 'Lower your back knee closer to the floor', bodyPart: 'legs', timestamp: Date.now() });
    }
    if (trunkLeanX > 0.07) {
      feedback.push({ type: 'warning', message: 'Keep your chest upright — avoid leaning forward', bodyPart: 'torso', timestamp: Date.now() });
    }
  }

  // Front knee valgus: front knee should track over the front ankle
  const frontKnee  = leftKnee.y  > rightKnee.y  ? leftKnee  : rightKnee;
  const frontAnkle = leftAnkle.y > rightAnkle.y ? leftAnkle : rightAnkle;
  if (Math.abs(frontKnee.x - frontAnkle.x) > 0.07 && newPhase !== 'standing') {
    feedback.push({ type: 'warning', message: 'Keep your front knee aligned over your foot', bodyPart: 'knee', timestamp: Date.now() });
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ]);

  let formScore = Math.round(visibility * 75);
  if (hipDrop >= BOTTOM_THRESHOLD)          formScore = Math.min(100, formScore + 15);
  if (feedback.length === 0 && hipDrop > 0) formScore = Math.min(100, formScore + 10);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
}

// ===== STANDING HIP ABDUCTION ANALYZER =====
export function analyzeHipAbduction(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftAnkle  = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Cannot detect lower body', timestamp: Date.now() }] };
  }

  const ankleYDiff   = Math.abs(leftAnkle.y - rightAnkle.y);
  const leftLifted   = leftAnkle.y  < rightAnkle.y - 0.09;
  const rightLifted  = rightAnkle.y < leftAnkle.y  - 0.09;
  const midHip       = getMidpoint(leftHip, rightHip);
  const midShoulder  = getMidpoint(leftShoulder, rightShoulder);
  const hipLevelDiff = Math.abs(leftHip.y - rightHip.y);

  debug.ankleYDiff   = ankleYDiff;
  debug.hipLevelDiff = hipLevelDiff;

  let newPhase = state.phase;
  if      (leftLifted)  newPhase = 'lift_left';
  else if (rightLifted) newPhase = 'lift_right';
  else                  newPhase = 'neutral';

  let repIncrement = false;
  if ((state.phase === 'lift_left' || state.phase === 'lift_right') && newPhase === 'neutral') {
    const now = Date.now();
    if (now - state.lastRepTime > 1000) { repIncrement = true; state.lastRepTime = now; }
  }
  if (repIncrement) state.repCount++;
  state.phase = newPhase;

  if (newPhase !== 'neutral') {
    if (hipLevelDiff > 0.055) {
      feedback.push({ type: 'warning', message: 'Keep your pelvis level — don\'t hike the hip', bodyPart: 'hips', timestamp: Date.now() });
    }
    if (Math.abs(midShoulder.x - midHip.x) > 0.07) {
      feedback.push({ type: 'info', message: 'Stay upright — avoid leaning sideways', bodyPart: 'torso', timestamp: Date.now() });
    }
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ]);

  let formScore = Math.round(visibility * 80);
  if (ankleYDiff > 0.09) formScore = Math.min(100, formScore + 15);
  if (feedback.length === 0 && newPhase !== 'neutral') formScore = Math.min(100, formScore + 5);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
}

// ===== SINGLE LEG BALANCE ANALYZER =====
export function analyzeSingleLegBalance(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftAnkle  = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Cannot detect body position', timestamp: Date.now() }] };
  }

  const ankleYDiff  = leftAnkle.y - rightAnkle.y; // >0 = left foot higher = right leg standing
  const isBalancing = Math.abs(ankleYDiff) > 0.09;
  const standingAnkle = ankleYDiff > 0 ? rightAnkle : leftAnkle;
  const standingHip   = ankleYDiff > 0 ? rightHip   : leftHip;
  const liftedHip     = ankleYDiff > 0 ? leftHip    : rightHip;
  const hipDrop       = liftedHip.y - standingHip.y; // positive = lifted side drooping
  const midShoulder   = getMidpoint(leftShoulder, rightShoulder);
  const lateralSway   = Math.abs(midShoulder.x - standingAnkle.x);

  debug.hipDrop     = hipDrop;
  debug.lateralSway = lateralSway;
  debug.ankleYDiff  = Math.abs(ankleYDiff);

  let newPhase = isBalancing
    ? (ankleYDiff > 0 ? 'balance_right' : 'balance_left')
    : 'both_feet';

  // Count a rep per 3-second hold (~60 frames at 20fps)
  if (newPhase !== 'both_feet') {
    state.baselineValues.holdFrames = (state.baselineValues.holdFrames ?? 0) + 1;
    if (state.baselineValues.holdFrames >= 60) {
      const now = Date.now();
      if (now - state.lastRepTime > 3000) {
        state.repCount++; state.lastRepTime = now; state.baselineValues.holdFrames = 0;
      }
    }
  } else {
    state.baselineValues.holdFrames = 0;
  }
  state.phase = newPhase;

  if (isBalancing) {
    if (hipDrop > 0.045) {
      feedback.push({ type: 'warning', message: 'Keep your hips level — don\'t let the raised side drop', bodyPart: 'hips', timestamp: Date.now() });
    }
    if (lateralSway > 0.09) {
      feedback.push({ type: 'info', message: 'Try not to lean — stay centred over your standing foot', bodyPart: 'torso', timestamp: Date.now() });
    }
    if (Math.abs(ankleYDiff) < 0.12) {
      feedback.push({ type: 'info', message: 'Lift your foot a little higher', bodyPart: 'legs', timestamp: Date.now() });
    }
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
  ]);

  let formScore = Math.round(visibility * 70);
  if (isBalancing) formScore += 20;
  if (feedback.length === 0 && isBalancing) formScore = Math.min(100, formScore + 10);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
}

// ===== HIP HINGE ANALYZER =====
export function analyzeHipHinge(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee   = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee  = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle  = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Cannot detect upper body', timestamp: Date.now() }] };
  }

  const midShoulder = getMidpoint(leftShoulder, rightShoulder);
  const midHip      = getMidpoint(leftHip, rightHip);
  const midKnee     = getMidpoint(leftKnee, rightKnee);
  const midAnkle    = getMidpoint(leftAnkle, rightAnkle);

  // Trunk angle from vertical: when standing dy is large (shoulder well above hip),
  // when hinging dy shrinks as shoulders approach hip height
  const dy = midHip.y - midShoulder.y; // positive when shoulder above hip (upright)
  const dx = Math.abs(midHip.x - midShoulder.x);
  const trunkAngle = Math.abs(Math.atan2(dx, Math.max(dy, 0.001)) * (180 / Math.PI));

  const kneeAngle = calculateAngle(midHip, midKnee, midAnkle);

  debug.trunkAngle = trunkAngle;
  debug.kneeAngle  = kneeAngle;

  const HINGE_THRESHOLD = 22;
  const DEEP_THRESHOLD  = 48;

  let newPhase = state.phase;
  if (trunkAngle < HINGE_THRESHOLD) {
    newPhase = 'standing';
  } else if (trunkAngle >= DEEP_THRESHOLD) {
    newPhase = 'hold';
  } else if (state.phase === 'hold' || state.phase === 'returning') {
    newPhase = 'returning';
  } else {
    newPhase = 'hinging';
  }

  let repIncrement = false;
  if (state.phase === 'returning' && newPhase === 'standing') {
    const now = Date.now();
    if (now - state.lastRepTime > 1200) { repIncrement = true; state.lastRepTime = now; }
  }
  if (repIncrement) state.repCount++;
  state.phase = newPhase;

  if (newPhase === 'hinging' || newPhase === 'hold') {
    if (trunkAngle < DEEP_THRESHOLD - 8 && newPhase === 'hinging') {
      feedback.push({ type: 'info', message: 'Push your hips further back to deepen the hinge', bodyPart: 'hips', timestamp: Date.now() });
    }
    if (kneeAngle < 145) {
      feedback.push({ type: 'info', message: 'Soften the knees slightly — don\'t lock them out', bodyPart: 'knees', timestamp: Date.now() });
    }
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  ]);

  let formScore = Math.round(visibility * 80);
  if (trunkAngle >= DEEP_THRESHOLD) formScore = Math.min(100, formScore + 20);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
}

// ===== LATERAL LUNGE ANALYZER =====
export function analyzeLateralLunge(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee   = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee  = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle  = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Step back so your full body is visible', timestamp: Date.now() }] };
  }

  const midHip      = getMidpoint(leftHip, rightHip);
  const midShoulder = getMidpoint(leftShoulder, rightShoulder);

  if (state.calibrationFrames < 20) {
    state.calibrationFrames++;
    const n = state.calibrationFrames;
    state.baselineValues.standingHipY =
      ((state.baselineValues.standingHipY ?? midHip.y) * (n - 1) + midHip.y) / n;
    return { phase: 'calibrating', repCount: 0, formScore: 50, isCorrect: true,
      feedback: [{ type: 'info', message: 'Stand tall while we calibrate…', timestamp: Date.now() }] };
  }

  const hipDrop = midHip.y - state.baselineValues.standingHipY;

  // Lateral lunge: detect asymmetry — one knee bends while the other stays extended
  const leftKneeAngle  = calculateAngle(leftHip,  leftKnee,  leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const kneeDiff       = Math.abs(leftKneeAngle - rightKneeAngle);

  debug.hipDrop        = hipDrop;
  debug.leftKneeAngle  = leftKneeAngle;
  debug.rightKneeAngle = rightKneeAngle;
  debug.kneeDiff       = kneeDiff;

  const LUNGE_DROP_THRESHOLD = 0.05;
  const KNEE_DIFF_THRESHOLD  = 25; // one knee significantly more bent

  let newPhase = state.phase;
  if (hipDrop < LUNGE_DROP_THRESHOLD || kneeDiff < 15) {
    newPhase = 'standing';
  } else if (hipDrop >= 0.12 && kneeDiff >= KNEE_DIFF_THRESHOLD) {
    newPhase = leftKneeAngle < rightKneeAngle ? 'bottom_left' : 'bottom_right';
  } else {
    newPhase = state.phase === 'standing' ? 'descending' : state.phase;
  }

  let repIncrement = false;
  if ((state.phase === 'bottom_left' || state.phase === 'bottom_right') && newPhase === 'standing') {
    const now = Date.now();
    if (now - state.lastRepTime > 1200) { repIncrement = true; state.lastRepTime = now; }
  }
  if (repIncrement) state.repCount++;
  state.phase = newPhase;

  if (newPhase === 'bottom_left' || newPhase === 'bottom_right') {
    const bentAngle     = Math.min(leftKneeAngle, rightKneeAngle);
    const straightAngle = Math.max(leftKneeAngle, rightKneeAngle);
    if (bentAngle > 110) {
      feedback.push({ type: 'info', message: 'Sit deeper into the lunge — bend the knee more', bodyPart: 'knee', timestamp: Date.now() });
    }
    if (straightAngle < 160) {
      feedback.push({ type: 'info', message: 'Keep the straight leg fully extended', bodyPart: 'knee', timestamp: Date.now() });
    }
    if (Math.abs(midShoulder.x - midHip.x) > 0.07) {
      feedback.push({ type: 'warning', message: 'Keep your chest upright', bodyPart: 'torso', timestamp: Date.now() });
    }
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
  ]);

  let formScore = Math.round(visibility * 75);
  if (kneeDiff >= KNEE_DIFF_THRESHOLD && hipDrop >= 0.12) formScore = Math.min(100, formScore + 20);
  if (feedback.length === 0 && newPhase !== 'standing')    formScore = Math.min(100, formScore + 5);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
}

// ===== MARCHING IN PLACE ANALYZER =====
export function analyzeMarching(
  landmarks: Landmark[],
  state: FormAnalyzerState
): FormAnalysisResult {
  const feedback: FormFeedback[] = [];
  const debug: Record<string, number> = {};

  const leftHip    = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip   = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee   = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee  = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftShoulder  = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
    return { phase: state.phase, repCount: state.repCount, formScore: 0, isCorrect: false,
      feedback: [{ type: 'warning', message: 'Cannot detect body', timestamp: Date.now() }] };
  }

  const midHip = getMidpoint(leftHip, rightHip);

  // A knee is "lifted" when it rises above the hip Y (in image coords, smaller Y = higher)
  const leftKneeLifted  = leftKnee.y  < leftHip.y  - 0.02;
  const rightKneeLifted = rightKnee.y < rightHip.y - 0.02;

  // Knee height relative to hip — bigger negative diff = higher knee
  const leftKneeHeight  = leftHip.y  - leftKnee.y;
  const rightKneeHeight = rightHip.y - rightKnee.y;

  debug.leftKneeHeight  = leftKneeHeight;
  debug.rightKneeHeight = rightKneeHeight;

  let newPhase = state.phase;
  if      (leftKneeLifted  && !rightKneeLifted) newPhase = 'lift_left';
  else if (rightKneeLifted && !leftKneeLifted)  newPhase = 'lift_right';
  else                                           newPhase = 'neutral';

  // Count each individual knee lift as a rep
  let repIncrement = false;
  if ((state.phase === 'lift_left' || state.phase === 'lift_right') && newPhase === 'neutral') {
    const now = Date.now();
    if (now - state.lastRepTime > 400) { repIncrement = true; state.lastRepTime = now; }
  }
  if (repIncrement) state.repCount++;
  state.phase = newPhase;

  // Form: check for excessive trunk sway
  const midShoulder = getMidpoint(leftShoulder, rightShoulder);
  const trunkSway   = Math.abs(midShoulder.x - midHip.x);
  if (trunkSway > 0.08 && newPhase !== 'neutral') {
    feedback.push({ type: 'info', message: 'Keep your core tight — reduce the trunk sway', bodyPart: 'torso', timestamp: Date.now() });
  }

  // Check knee isn't high enough
  const liftedHeight = newPhase === 'lift_left' ? leftKneeHeight : rightKneeHeight;
  if ((newPhase === 'lift_left' || newPhase === 'lift_right') && liftedHeight < 0.04) {
    feedback.push({ type: 'info', message: 'Lift your knee higher — aim for hip height', bodyPart: 'legs', timestamp: Date.now() });
  }

  const visibility = calculateAverageVisibility(landmarks, [
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
  ]);

  let formScore = Math.round(visibility * 80);
  if (liftedHeight > 0.06 && newPhase !== 'neutral') formScore = Math.min(100, formScore + 15);
  if (feedback.length === 0 && newPhase !== 'neutral') formScore = Math.min(100, formScore + 5);

  return { phase: newPhase, repCount: state.repCount, formScore, isCorrect: feedback.length === 0, feedback, debug };
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
    case 'lunge':
      return analyzeLunge(landmarks, state);
    case 'hip-abduction':
      return analyzeHipAbduction(landmarks, state);
    case 'single-leg-balance':
      return analyzeSingleLegBalance(landmarks, state);
    case 'hip-hinge':
      return analyzeHipHinge(landmarks, state);
    case 'lateral-lunge':
      return analyzeLateralLunge(landmarks, state);
    case 'marching':
      return analyzeMarching(landmarks, state);
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
