"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Exercise } from "@/types";

export interface TranscriptEntry {
  role: "coach" | "user";
  message: string;
  timestamp: number;
}

// Priority routing — mirrors Rehabify's FormEventBridge pattern
export enum FeedbackPriority {
  LOW = 1,      // encouragement, context → Gemini responds naturally
  MEDIUM = 2,   // first/second form error → Gemini responds naturally
  HIGH = 3,     // repeated error → vapi.say() immediate
  CRITICAL = 4, // pain/safety → vapi.say() immediately, stop
}

// Cooldown per feedback message before it can fire again
const FEEDBACK_COOLDOWN_MS: Record<FeedbackPriority, number> = {
  [FeedbackPriority.LOW]: 15000,
  [FeedbackPriority.MEDIUM]: 12000,
  [FeedbackPriority.HIGH]: 8000,
  [FeedbackPriority.CRITICAL]: 0,
};

function buildSystemPrompt(exercise: Exercise): string {
  const instructions = exercise.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const mistakes = exercise.commonMistakes?.map(m => `- ${m}`).join("\n") ?? "- Rushing the movement";

  return `You are PhysioLens, an expert AI physiotherapy coach in a live one-on-one rehabilitation session.

EXERCISE: ${exercise.name}
TARGET MUSCLES: ${exercise.targetMuscles.join(", ")}

TECHNIQUE:
${instructions}

COMMON MISTAKES:
${mistakes}

REAL-TIME DATA PROTOCOL:
- The system injects [Context update] messages with live form score and rep count as the patient moves
- When you receive [Form feedback] messages, rephrase them naturally — do not read verbatim
- Acknowledge rep milestones with specific encouragement ("Good, that's 5 — you're moving well")

COACHING RULES:
- 1–3 sentences per response, conversational, no lists
- If the patient mentions pain: immediately say "Stop — don't push through pain, rest now"
- Reference specific body parts and angles when correcting form
- Be encouraging but honest — acknowledge improvement when it happens
- You can see the patient's skeleton through the camera in real time

TONE: Calm, expert, warm. Like a physiotherapist who genuinely cares about recovery.`;
}

export function useVoiceCoach({
  exercise,
  audioEnabled,
  formScore,
  repCount,
  isActive,
}: {
  exercise: Exercise | null | undefined;
  audioEnabled: boolean;
  formScore: number;
  repCount: number;
  isActive: boolean;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastUserSpeech, setLastUserSpeech] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const vapiRef = useRef<Vapi | null>(null);
  const callReadyRef = useRef(false);
  const startingRef = useRef(false); // prevents double-start in React StrictMode
  const formScoreRef = useRef(formScore);
  const repCountRef = useRef(repCount);
  const lastInjectedRep = useRef(-1);
  const lastInjectedScore = useRef(-1);

  // Per-message cooldown tracking (key → last sent timestamp)
  const feedbackCooldownRef = useRef<Map<string, number>>(new Map());
  // Occurrence count per message key for priority escalation
  const occurrenceCountRef = useRef<Map<string, number>>(new Map());

  useEffect(() => { formScoreRef.current = formScore; }, [formScore]);
  useEffect(() => { repCountRef.current = repCount; }, [repCount]);

  // Inject rep updates into Gemini context
  useEffect(() => {
    if (!vapiRef.current || !callReadyRef.current) return;
    if (repCount === lastInjectedRep.current || repCount === 0) return;
    lastInjectedRep.current = repCount;
    vapiRef.current.send({
      type: "add-message",
      message: {
        role: "system",
        content: `[Context update] Patient completed rep ${repCount}. Form score: ${formScoreRef.current}%. Acknowledge naturally if it's a milestone.`,
      },
    });
  }, [repCount]);

  // Inject significant form score shifts
  useEffect(() => {
    if (!vapiRef.current || !callReadyRef.current) return;
    if (Math.abs(formScore - lastInjectedScore.current) < 10) return;
    lastInjectedScore.current = formScore;
    vapiRef.current.send({
      type: "add-message",
      message: {
        role: "system",
        content: `[Context update] Form score is now ${formScore}%.`,
      },
    });
  }, [formScore]);

  // ── Core speak function with priority-based routing ──────────────────────
  // Priority LOW/MEDIUM → Gemini responds naturally (triggerResponseEnabled)
  // Priority HIGH/CRITICAL → vapi.say() for immediate speech
  const speak = useCallback((message: string, priority: FeedbackPriority = FeedbackPriority.MEDIUM) => {
    if (!audioEnabled || !vapiRef.current || !callReadyRef.current) return;

    const key = message.trim().toLowerCase();
    const now = Date.now();
    const lastSent = feedbackCooldownRef.current.get(key) ?? 0;
    const cooldown = FEEDBACK_COOLDOWN_MS[priority];

    if (now - lastSent < cooldown) return;
    feedbackCooldownRef.current.set(key, now);

    // Track occurrences — repeated errors get escalated to HIGH priority
    const count = (occurrenceCountRef.current.get(key) ?? 0) + 1;
    occurrenceCountRef.current.set(key, count);
    const effectivePriority = count >= 3 && priority < FeedbackPriority.HIGH
      ? FeedbackPriority.HIGH
      : priority;

    try {
      if (effectivePriority >= FeedbackPriority.HIGH) {
        // Immediate speech — bypasses LLM, no latency
        vapiRef.current.say(message);
        setTranscript(prev => [...prev, { role: "coach", message, timestamp: now }]);
      } else {
        // Let Gemini rephrase and respond naturally
        vapiRef.current.send({
          type: "add-message",
          message: {
            role: "system",
            content: `[Form feedback — deliver naturally in your own words]: ${message}`,
          },
          triggerResponseEnabled: true,
        });
      }
    } catch (e) {
      console.warn("[VoiceCoach] speak failed:", e);
    }
  }, [audioEnabled]);

  useEffect(() => {
    if (!isActive || !audioEnabled || !exercise) {
      if (vapiRef.current) {
        callReadyRef.current = false;
        vapiRef.current.stop();
        vapiRef.current = null;
        setIsListening(false);
        setIsSpeaking(false);
      }
      return;
    }

    // StrictMode fires mount→cleanup→mount; skip the second start if one is already in progress
    if (startingRef.current) return;
    startingRef.current = true;

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      console.error("[VoiceCoach] NEXT_PUBLIC_VAPI_PUBLIC_KEY not set");
      startingRef.current = false;
      return;
    }

    const vapi = new Vapi(publicKey, undefined, {
      alwaysIncludeMicInPermissionPrompt: true,
    });
    vapiRef.current = vapi;
    lastInjectedRep.current = -1;
    lastInjectedScore.current = -1;
    feedbackCooldownRef.current.clear();
    occurrenceCountRef.current.clear();

    vapi.on("call-start", () => {
      startingRef.current = false;
      callReadyRef.current = true;
      try { vapi.setMuted(false); } catch {}
      setIsListening(true);
      setTranscript([]);
    });

    vapi.on("call-end", () => {
      callReadyRef.current = false;
      setIsListening(false);
      setIsSpeaking(false);
    });

    vapi.on("call-start-failed", (e: any) => {
      console.error("[VoiceCoach] Call failed to start:", e);
      startingRef.current = false;
      callReadyRef.current = false;
      setIsListening(false);
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));

    vapi.on("message", (msg: any) => {
      if (msg.type !== "transcript" || msg.transcriptType !== "final") return;
      const text: string = msg.transcript?.trim() ?? "";
      if (!text) return;

      if (msg.role === "user") {
        setLastUserSpeech(text);
        setTranscript(prev => [...prev, { role: "user", message: text, timestamp: Date.now() }]);
      } else if (msg.role === "assistant") {
        setTranscript(prev => [...prev, { role: "coach", message: text, timestamp: Date.now() }]);
      }
    });

    vapi.on("error", (e: any) => {
      const msg: string = e?.message ?? String(e);
      // Suppress known non-fatal Daily.co/Vapi noise
      if (!msg || msg === "[object Object]") return;
      if (msg.includes("ejection") || msg.includes("Meeting has ended")) return;
      console.error("[VoiceCoach] Error:", e);
      startingRef.current = false;
      setIsListening(false);
      setIsSpeaking(false);
    });

    vapi.start({
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US",
      },
      model: {
        provider: "google",
        model: "gemini-1.5-flash",
        messages: [{ role: "system", content: buildSystemPrompt(exercise) }],
        temperature: 0.7,
      },
      voice: {
        provider: "openai",
        voiceId: "nova",
      },
      firstMessage: `Hi, I'm your PhysioLens coach. Today we're doing ${exercise.name}. Start whenever you're ready.`,
    });

    return () => {
      startingRef.current = false;
      callReadyRef.current = false;
      vapi.stop();
      vapiRef.current = null;
      setIsListening(false);
      setIsSpeaking(false);
    };
  }, [isActive, audioEnabled, exercise]);

  useEffect(() => {
    if (!isActive) {
      setTranscript([]);
      setLastUserSpeech("");
    }
  }, [isActive]);

  // Raw context injection — no prefix, Gemini responds immediately
  // Mirrors Rehabify's injectContext() pattern
  const injectContext = useCallback((context: string) => {
    if (!audioEnabled || !vapiRef.current || !callReadyRef.current) return;
    try {
      vapiRef.current.send({
        type: "add-message",
        message: { role: "system", content: context },
        triggerResponseEnabled: true,
      });
    } catch (e) {
      console.warn("[VoiceCoach] injectContext failed:", e);
    }
  }, [audioEnabled]);

  return { speak, injectContext, isListening, isSpeaking, lastUserSpeech, transcript };
}
