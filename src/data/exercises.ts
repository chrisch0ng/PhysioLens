import { Exercise } from '@/types';

export const exercises: Exercise[] = [

  // ─── TIER 1 — AI Form Detection ──────────────────────────────────────────────

  {
    id: 'cat-camel',
    name: 'Cat-Camel',
    slug: 'cat-camel',
    tier: 1,
    bodyRegion: 'lower_back',
    category: 'mobility',
    difficulty: 'beginner',
    description: 'A gentle spinal mobility exercise that alternates between arching and rounding the back while on all fours. Promotes segmental flexibility and reduces morning stiffness.',
    instructions: [
      'Start on all fours with hands under shoulders and knees under hips',
      'Keep your neck neutral, looking at the floor',
      'Inhale and slowly arch your back, dropping your belly (Camel)',
      'Exhale and round your spine toward the ceiling (Cat)',
      'Move slowly and smoothly between positions',
    ],
    commonMistakes: [
      'Moving too quickly between positions',
      'Not engaging the core during the movement',
      'Keeping the hips stationary instead of following the spine',
    ],
    targetMuscles: ['Spinal erectors', 'Rectus abdominis', 'Multifidus'],
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: 3,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'Non-specific low back pain',
      'Lumbar stiffness',
      'Degenerative disc disease',
      'Postpartum lumbar dysfunction',
    ],
    contraindicationsAvoid: [
      'Acute lumbar disc herniation with neurological deficit',
      'Wrist pain or carpal tunnel syndrome (modify with fists)',
      'Severe knee arthritis (use padding)',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'acute',
    clinicalSource: 'McGill, S.M. (2007). Low Back Disorders: Evidence-Based Prevention and Rehabilitation (2nd ed.). Human Kinetics.',
  },

  {
    id: 'cobra-stretch',
    name: 'Cobra Stretch',
    slug: 'cobra-stretch',
    tier: 1,
    bodyRegion: 'lower_back',
    category: 'stretch',
    difficulty: 'beginner',
    description: 'A prone back extension exercise that gently stretches the abdominal muscles and strengthens the lower back extensors. A cornerstone of the McKenzie extension protocol.',
    instructions: [
      'Lie face down with legs extended',
      'Place hands under shoulders, elbows close to body',
      'Press into your hands and slowly lift your chest',
      'Keep your hips and legs pressed into the mat',
      'Hold the position, breathing normally',
    ],
    commonMistakes: [
      'Lifting hips off the floor',
      'Pushing too high and hyperextending',
      'Shrugging shoulders toward ears',
    ],
    targetMuscles: ['Erector spinae', 'Multifidus', 'Rectus abdominis (lengthened)'],
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: 5,
    repType: 'hold',
    hasAiDetection: true,
    conditionsItHelps: [
      'Extension-biased low back pain',
      'Lumbar disc herniation (centralising symptoms)',
      'Postural lumbar flexion syndrome',
    ],
    contraindicationsAvoid: [
      'Lumbar spinal stenosis',
      'Spondylolisthesis (grade II or above)',
      'Flexion-intolerant presentations should be assessed first',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'acute',
    clinicalSource: 'McKenzie, R.A. & May, S. (2003). The Lumbar Spine: Mechanical Diagnosis and Therapy (2nd ed.). Spinal Publications New Zealand.',
  },

  {
    id: 'dead-bug',
    name: 'Dead Bug',
    slug: 'dead-bug',
    tier: 1,
    bodyRegion: 'core',
    category: 'stability',
    difficulty: 'intermediate',
    description: 'A supine core stability exercise that trains the deep stabilisers while moving the arms and legs. Teaches proper intra-abdominal pressure and neutral spine control.',
    instructions: [
      'Lie on your back with arms extended toward the ceiling',
      'Lift legs to tabletop position (90 degrees at hip and knee)',
      'Press your lower back firmly into the floor',
      'Slowly extend the opposite arm and leg toward the floor',
      'Return to start and repeat on the other side',
    ],
    commonMistakes: [
      'Allowing the lower back to arch off the floor',
      'Moving too quickly and losing lumbar control',
      'Not fully extending the arm and leg',
    ],
    targetMuscles: ['Transverse abdominis', 'Rectus abdominis', 'Obliques', 'Multifidus'],
    defaultSets: 2,
    defaultReps: 10,
    defaultHoldSeconds: 0,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'Lumbar instability',
      'Non-specific low back pain',
      'Core weakness post-surgery',
      'Lumbar segmental dysfunction',
    ],
    contraindicationsAvoid: [
      'Acute lumbar disc herniation (modify: reduce range of motion)',
      'Diastasis recti (avoid if >2-finger separation without physio guidance)',
    ],
    difficultyLevel: 2,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'McGill, S.M. (2007). Low Back Disorders: Evidence-Based Prevention and Rehabilitation (2nd ed.). Human Kinetics.',
  },

  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    slug: 'bodyweight-squat',
    tier: 1,
    bodyRegion: 'lower_body',
    category: 'strength',
    difficulty: 'beginner',
    description: 'A fundamental lower body exercise that strengthens the quadriceps, glutes, and core. The foundation of functional knee and lower extremity rehabilitation.',
    instructions: [
      'Stand with feet shoulder-width apart, toes slightly turned out',
      'Keep your chest up and core engaged',
      'Push your hips back and bend your knees',
      'Lower until thighs are parallel to the floor',
      'Press through your heels to return to standing',
    ],
    commonMistakes: [
      'Not reaching parallel depth',
      'Knees caving inward (valgus collapse)',
      'Excessive forward trunk lean',
    ],
    targetMuscles: ['Quadriceps', 'Gluteus maximus', 'Hamstrings', 'Transverse abdominis'],
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 0,
    repType: 'standard',
    hasAiDetection: true,
    conditionsItHelps: [
      'Knee osteoarthritis (mild to moderate)',
      'Patellofemoral pain syndrome',
      'Post-ACL reconstruction (phase 2+)',
      'Hip abductor weakness',
    ],
    contraindicationsAvoid: [
      'Acute knee effusion',
      'Post-surgical knee (<6 weeks, without clearance)',
      'Severe knee OA (Kellgren-Lawrence grade 4)',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Kisner, C. & Colby, L.A. (2012). Therapeutic Exercise: Foundations and Techniques (6th ed.). F.A. Davis Company.',
  },

  // ─── NSM / Neuromuscular Exercises ───────────────────────────────────────────

  {
    id: 'lunge',
    name: 'Forward Lunge',
    slug: 'lunge',
    tier: 1,
    bodyRegion: 'lower_body',
    category: 'strength',
    difficulty: 'beginner',
    description: 'A fundamental single-leg loading exercise that builds quad and glute strength while training neuromuscular control and knee tracking. Core of lower extremity rehab progressions.',
    instructions: [
      'Stand tall with feet hip-width apart',
      'Step one foot forward about two shoulder-widths',
      'Lower your back knee toward the floor — keep your front shin vertical',
      'Keep your chest upright throughout',
      'Push through your front heel to return to standing',
    ],
    commonMistakes: [
      'Front knee collapsing inward (valgus)',
      'Leaning forward with the trunk',
      'Not stepping far enough forward',
    ],
    targetMuscles: ['Quadriceps', 'Gluteus maximus', 'Hamstrings', 'Gastrocnemius'],
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 0,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'Knee osteoarthritis (mild-moderate)',
      'Patellofemoral pain syndrome',
      'Post-ACL reconstruction (phase 2+)',
      'Gluteal inhibition',
    ],
    contraindicationsAvoid: [
      'Acute knee effusion',
      'Post-surgical knee (<8 weeks without clearance)',
      'Significant balance impairment (use support)',
    ],
    difficultyLevel: 2,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Kisner, C. & Colby, L.A. (2012). Therapeutic Exercise: Foundations and Techniques (6th ed.). F.A. Davis Company.',
  },

  {
    id: 'hip-abduction',
    name: 'Standing Hip Abduction',
    slug: 'hip-abduction',
    tier: 1,
    bodyRegion: 'lower_body',
    category: 'strength',
    difficulty: 'beginner',
    description: 'A standing lateral leg raise that strengthens the gluteus medius — the primary hip stabiliser. Essential for correcting Trendelenburg gait and knee valgus patterns.',
    instructions: [
      'Stand tall beside a wall if needed for light support',
      'Keep both feet pointing forward',
      'Lift one leg directly to the side — keep toes forward, not turned out',
      'Keep your pelvis level — do not hike the hip of the lifting leg',
      'Slowly lower and repeat, then switch sides',
    ],
    commonMistakes: [
      'Hiking the hip of the lifting leg',
      'Leaning sideways to compensate',
      'Turning the toe outward (becomes hip flexion, not abduction)',
    ],
    targetMuscles: ['Gluteus medius', 'Gluteus minimus', 'Tensor fasciae latae'],
    defaultSets: 3,
    defaultReps: 15,
    defaultHoldSeconds: 2,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'Patellofemoral pain syndrome',
      'IT band syndrome',
      'Knee valgus (inward collapse)',
      'Hip abductor weakness post-surgery',
    ],
    contraindicationsAvoid: [
      'Acute lateral hip bursitis',
      'Hip labral tear (acute phase)',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Distefano, L.J. et al. (2009). Gluteal muscle activation during common therapeutic exercises. Journal of Orthopaedic & Sports Physical Therapy, 39(7), 532–540.',
  },

  {
    id: 'single-leg-balance',
    name: 'Single Leg Balance',
    slug: 'single-leg-balance',
    tier: 1,
    bodyRegion: 'lower_body',
    category: 'stability',
    difficulty: 'beginner',
    description: 'A static proprioceptive exercise that trains single-leg postural control and hip stabiliser activation. The foundation of all NSM lower limb rehabilitation.',
    instructions: [
      'Stand near a wall or chair for safety but try not to touch it',
      'Shift your weight onto one foot',
      'Lift the other foot off the floor — knee bent to about 90°',
      'Keep your hips level and your standing knee slightly soft (not locked)',
      'Hold for 10–30 seconds, then switch legs',
    ],
    commonMistakes: [
      'Letting the raised-side hip drop (Trendelenburg sign)',
      'Locking the standing knee',
      'Excessive trunk lean to the standing side',
    ],
    targetMuscles: ['Gluteus medius', 'Tibialis anterior', 'Peroneals', 'Deep ankle stabilisers'],
    defaultSets: 3,
    defaultReps: 6,
    defaultHoldSeconds: 10,
    repType: 'timed',
    hasAiDetection: true,
    conditionsItHelps: [
      'Ankle sprain (subacute/chronic)',
      'Knee OA (proprioception restoration)',
      'Post-ACL reconstruction',
      'Functional balance deficits',
    ],
    contraindicationsAvoid: [
      'Acute ankle or knee injury (use partial weight-bearing version)',
      'Severe vestibular dysfunction without supervision',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Hrysomallis, C. (2011). Balance ability and athletic performance. Sports Medicine, 41(3), 221–232.',
  },

  {
    id: 'hip-hinge',
    name: 'Hip Hinge',
    slug: 'hip-hinge',
    tier: 1,
    bodyRegion: 'lower_back',
    category: 'mobility',
    difficulty: 'beginner',
    description: 'A fundamental movement pattern that teaches dissociation of hip flexion from lumbar flexion. Foundational for safe lifting mechanics and posterior chain loading in rehab.',
    instructions: [
      'Stand with feet hip-width apart, soft bend in the knees',
      'Place hands on your hips or extend arms in front',
      'Push your hips straight back as if closing a car door with them',
      'Let your torso hinge forward — keep your back flat (neutral spine)',
      'Drive your hips forward to return upright',
    ],
    commonMistakes: [
      'Rounding the lower back instead of hinging at the hip',
      'Squatting down (knees bending too much) instead of hinging',
      'Looking up excessively, straining the neck',
    ],
    targetMuscles: ['Gluteus maximus', 'Hamstrings', 'Erector spinae', 'Multifidus'],
    defaultSets: 3,
    defaultReps: 12,
    defaultHoldSeconds: 2,
    repType: 'standard',
    hasAiDetection: true,
    conditionsItHelps: [
      'Low back pain (movement pattern retraining)',
      'Hamstring tightness',
      'Posterior chain weakness',
      'Safe return to lifting after lumbar injury',
    ],
    contraindicationsAvoid: [
      'Acute lumbar disc herniation with flexion aggravation',
      'Hamstring proximal tendinopathy (acute phase)',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Cook, G. (2010). Movement: Functional Movement Systems. On Target Publications.',
  },

  {
    id: 'lateral-lunge',
    name: 'Lateral Lunge',
    slug: 'lateral-lunge',
    tier: 1,
    bodyRegion: 'lower_body',
    category: 'strength',
    difficulty: 'intermediate',
    description: 'A frontal-plane single-leg loading exercise that trains hip abductor and adductor strength while challenging neuromuscular control in a movement plane often neglected in rehab.',
    instructions: [
      'Stand tall with feet together',
      'Step wide to one side — about 1.5–2 shoulder-widths',
      'Sit your hips back and bend the stepping-side knee deeply',
      'Keep the other leg straight with the foot flat',
      'Push off the bent leg to return to centre, then repeat to the other side',
    ],
    commonMistakes: [
      'Not stepping wide enough',
      'Bent-leg knee collapsing inward',
      'Straight leg rolling onto the toes',
    ],
    targetMuscles: ['Gluteus medius', 'Quadriceps', 'Hip adductors', 'Gluteus maximus'],
    defaultSets: 3,
    defaultReps: 10,
    defaultHoldSeconds: 0,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'IT band syndrome',
      'Hip abductor/adductor imbalance',
      'Patellofemoral pain syndrome',
      'Return to sport — frontal plane loading',
    ],
    contraindicationsAvoid: [
      'Acute groin strain',
      'Acute knee effusion',
      'Hip labral tear (acute phase)',
    ],
    difficultyLevel: 2,
    phaseOfRecovery: 'subacute',
    clinicalSource: 'Distefano, L.J. et al. (2009). Gluteal muscle activation during common therapeutic exercises. Journal of Orthopaedic & Sports Physical Therapy, 39(7), 532–540.',
  },

  {
    id: 'marching',
    name: 'Marching in Place',
    slug: 'marching',
    tier: 1,
    bodyRegion: 'core',
    category: 'stability',
    difficulty: 'beginner',
    description: 'A rhythmic alternating knee-lift exercise that trains core stability under dynamic load, coordinates hip flexor activation, and improves proprioceptive feedback — ideal as a warm-up or early-phase NSM exercise.',
    instructions: [
      'Stand tall with feet hip-width apart, core gently engaged',
      'Lift one knee up to hip height — keep your foot relaxed',
      'Lower it back down with control as you lift the other knee',
      'Keep a steady, controlled rhythm — do not rush',
      'Keep your trunk still — do not sway side to side',
    ],
    commonMistakes: [
      'Swaying the trunk side to side with each step',
      'Not lifting the knee high enough',
      'Holding the breath or tensing the shoulders',
    ],
    targetMuscles: ['Hip flexors', 'Transverse abdominis', 'Gluteus medius', 'Tibialis anterior'],
    defaultSets: 3,
    defaultReps: 20,
    defaultHoldSeconds: 0,
    repType: 'alternating',
    hasAiDetection: true,
    conditionsItHelps: [
      'Gait retraining',
      'Core stability deficits',
      'Early post-surgical mobilisation',
      'Balance and coordination rehabilitation',
    ],
    contraindicationsAvoid: [
      'Acute hip flexor strain',
      'Post-surgical hip (<6 weeks without clearance)',
    ],
    difficultyLevel: 1,
    phaseOfRecovery: 'acute',
    clinicalSource: 'Kolar, P. et al. (2013). Clinical Rehabilitation. Alena Kobesova.',
  },
];

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return exercises.find(e => e.slug === slug);
}

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(e => e.id === id);
}

export function getTier1Exercises(): Exercise[] {
  return exercises.filter(e => e.tier === 1);
}

export function getExercisesByRegion(region: Exercise['bodyRegion']): Exercise[] {
  return exercises.filter(e => e.bodyRegion === region);
}

export function getExercisesByCategory(category: Exercise['category']): Exercise[] {
  return exercises.filter(e => e.category === category);
}

export function getExercisesByPhase(phase: Exercise['phaseOfRecovery']): Exercise[] {
  return exercises.filter(e => e.phaseOfRecovery === phase);
}

export function getExercisesByCondition(condition: string): Exercise[] {
  const lower = condition.toLowerCase();
  return exercises.filter(e =>
    e.conditionsItHelps.some(c => c.toLowerCase().includes(lower))
  );
}
