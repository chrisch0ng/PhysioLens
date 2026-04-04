"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Exercise } from "@/types";

const REPEAT_COOLDOWN = 8000;
// How long to wait after TTS ends before re-opening the mic
const POST_SPEECH_DELAY_MS = 1500;

function pickBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const candidates = [
    (v: SpeechSynthesisVoice) => v.name === "Google US English",
    (v: SpeechSynthesisVoice) => /Aria.*Natural/i.test(v.name) && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => /Jenny.*Natural/i.test(v.name) && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => /Natural/i.test(v.name) && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => v.name.startsWith("Google") && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => v.name.startsWith("Microsoft") && v.lang === "en-US",
    (v: SpeechSynthesisVoice) => v.lang === "en-US",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
  ];
  for (const match of candidates) {
    const found = voices.find(match);
    if (found) return found;
  }
  return null;
}

export interface TranscriptEntry {
  role: "coach" | "user";
  message: string;
  timestamp: number;
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

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const spokenCacheRef = useRef<Map<string, number>>(new Map());
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);       // true while TTS is playing
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introSpokenRef = useRef(false);
  const queueRef = useRef<string[]>([]);     // pending messages waiting to be spoken

  // Stable refs so callbacks can read latest values without deps
  const formScoreRef = useRef(formScore);
  const repCountRef = useRef(repCount);
  const exerciseRef = useRef<Exercise | null | undefined>(exercise);
  useEffect(() => { formScoreRef.current = formScore; }, [formScore]);
  useEffect(() => { repCountRef.current = repCount; }, [repCount]);
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  // processUserSpeech stored in a ref so startListening can call it without being in its dep array
  const processUserSpeechRef = useRef<((text: string) => void) | null>(null);
  // startListening stored in a ref so speak() can call it without circular deps
  const startListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => { voiceRef.current = pickBestVoice(); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // ── playNext: dequeues and plays the next message ─────────────────────────
  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      // Queue empty — stop speaking and reopen mic after a short decay
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        startListeningRef.current?.();
      }, POST_SPEECH_DELAY_MS);
      return;
    }

    const message = queueRef.current.shift()!;

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voiceRef.current) utterance.voice = voiceRef.current;

    const done = () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      playNext(); // play next item in queue (or reopen mic if empty)
    };

    safetyTimerRef.current = setTimeout(done, 15000);
    utterance.onend = done;
    utterance.onerror = done;

    window.speechSynthesis.speak(utterance);
  }, []);

  // ── speak: dedup-check then enqueue ──────────────────────────────────────
  const speak = useCallback((message: string) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;

    const key = message.trim().toLowerCase();
    const lastSpoken = spokenCacheRef.current.get(key) ?? 0;
    if (Date.now() - lastSpoken < REPEAT_COOLDOWN) return;
    spokenCacheRef.current.set(key, Date.now());

    // Add to transcript immediately so UI updates right away
    setTranscript(prev => [...prev, { role: "coach", message, timestamp: Date.now() }]);

    // If already speaking, just enqueue — current utterance will finish first
    if (isSpeakingRef.current) {
      queueRef.current.push(message);
      return;
    }

    // Not currently speaking — kill mic, start playing immediately
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    isSpeakingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(true);
    window.speechSynthesis.cancel();

    queueRef.current.push(message);
    playNext();
  }, [audioEnabled, playNext]);

  // ── processUserSpeech ────────────────────────────────────────────────────
  // Defined as a regular callback and stored in a ref — startListening reads the ref
  const processUserSpeech = useCallback((text: string) => {
    const t = text.toLowerCase().trim();
    const score = formScoreRef.current;
    const reps = repCountRef.current;
    const ex = exerciseRef.current;

    setLastUserSpeech(text);
    setTranscript(prev => [...prev, { role: "user", message: text, timestamp: Date.now() }]);
    console.log("[VoiceCoach] heard:", text);

    let response = "";

    if (/\bpain\b|hurt(?:ing|s)?|ache|aching/.test(t)) {
      response =
        "Stop the exercise right away. Pain is your body's signal that something's wrong — " +
        "never push through it. Rest and check in with your physiotherapist before continuing.";

    } else if (/stiff|stiffness|tight|tightness|sore(?! throat)/.test(t)) {
      response =
        `Stiffness is really common, especially after long periods of sitting. ` +
        `${ex?.name ?? "This exercise"} is one of the best movements for exactly that — ` +
        `it lubricates the spinal joints and gently restores range of motion. Let's go slowly.`;

    } else if (/lower back|lumbar|my back/.test(t)) {
      response =
        "Got it. Lower back issues are one of the most common things I work with. " +
        "I'll keep an eye on your movement and let you know if anything looks off. " +
        "Just move at your own pace and stop if anything feels sharp.";

    } else if (/how am i doing|how'?s my form|my form|form score|am i doing (this |it )?right/.test(t)) {
      if (score >= 80) {
        response = `You're doing really well — your form score is ${score} percent. Keep that going.`;
      } else if (score >= 60) {
        response = `You're at ${score} percent. Focus on the movement cues and you'll get there.`;
      } else {
        response = `Your form score is ${score} percent. Slow right down and focus on the pattern — quality over speed.`;
      }

    } else if (/too hard|too difficult|can'?t do|cannot|too much/.test(t)) {
      response =
        "That's completely fine — reduce your range of motion and just focus on the pattern. " +
        "Quality always comes before range in rehab.";

    } else if (/tired|exhausted|fatigued/.test(t)) {
      response =
        "Listen to your body. Finish this rep if you can, then take a proper rest before the next set.";

    } else if (/tip|advice|what should i do|give me a|how do i|help/.test(t)) {
      const tip = ex?.instructions?.[1] ?? ex?.instructions?.[0];
      response = tip
        ? `Here's a key thing to focus on: ${tip}`
        : `Focus on slow, controlled movement and keep breathing throughout.`;

    } else if (/mistake|wrong|what not to|what am i doing wrong/.test(t)) {
      const mistake = ex?.commonMistakes?.[0];
      response = mistake
        ? `The most common thing to watch for: ${mistake}`
        : `The most common mistake is rushing. Stay slow and intentional.`;

    } else if (/ready|let'?s (go|start|begin)|start now/.test(t)) {
      response =
        `Great, let's get into it. Begin with the first movement — go slowly and I'll give you feedback as you move.`;

    } else if (/how many|how far|progress|reps done/.test(t)) {
      response = reps > 0
        ? `You've done ${reps} reps so far. Keep going.`
        : `You haven't started yet — begin whenever you're ready and I'll count your reps automatically.`;

    } else if (/\brest\b|\bbreak\b/.test(t)) {
      response = `Absolutely — take the break you need. Sixty seconds between sets is ideal.`;

    } else if (/\bdone\b|finished|all done|that'?s it/.test(t)) {
      response = `Well done — you've put in ${reps} reps today. Make sure you stretch and stay hydrated.`;

    } else if (/\bgood\b|\bgreat\b|\bnice\b|perfect|amazing|awesome|feels good|feels great/.test(t)) {
      response = `Great to hear. You've done ${reps} reps — keep that energy going.`;

    } else if (/hello|hey|hi\b|can you hear|are you there|testing/.test(t)) {
      response = `Yes, I can hear you clearly. Just talk to me naturally throughout your session.`;

    } else if (/what can you|what do you do|how does this work|what is this/.test(t)) {
      response =
        `I watch your movement through the camera and give you real-time feedback on your form. ` +
        `You can also talk to me — ask how you're doing, tell me if something hurts, or ask for a tip.`;

    } else {
      response =
        `I heard you. I'm here and tracking your movement — let me know if you want form feedback or have any questions.`;
    }

    speak(response);
  }, [speak]);

  // Keep the ref current
  useEffect(() => {
    processUserSpeechRef.current = processUserSpeech;
  }, [processUserSpeech]);

  // ── Speech recognition lifecycle ─────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !audioEnabled) {
      // Tear everything down
      isSpeakingRef.current = false;
      queueRef.current = [];
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      startListeningRef.current = null;
      setIsListening(false);
      window.speechSynthesis?.cancel();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Build and store startListening — reads processUserSpeechRef so no stale closures
    const startListening = () => {
      if (isSpeakingRef.current || !SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return; // Hard gate
        const text = event.results[event.results.length - 1][0].transcript;
        processUserSpeechRef.current?.(text);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") setIsListening(false);
      };

      recognition.onend = () => {
        // Natural browser timeout — restart if we're not mid-speech
        if (!isSpeakingRef.current && recognitionRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      try { recognition.start(); } catch {}
    };

    startListeningRef.current = startListening;
    startListening();

    return () => {
      startListeningRef.current = null;
      isSpeakingRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      window.speechSynthesis?.cancel();
    };
  }, [isActive, audioEnabled]);

  // ── Intro ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isActive && audioEnabled && !introSpokenRef.current && exercise) {
      introSpokenRef.current = true;
      const timer = setTimeout(() => {
        speak(
          `Hi, I'm your PhysioLens coach. Today we're working on ${exercise.name}. ` +
          `Start whenever you feel ready.`
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, audioEnabled, exercise, speak]);

  useEffect(() => {
    if (!isActive) {
      introSpokenRef.current = false;
      spokenCacheRef.current.clear();
      setTranscript([]);
      setLastUserSpeech("");
    }
  }, [isActive]);

  return { speak, isListening, isSpeaking, lastUserSpeech, transcript };
}
