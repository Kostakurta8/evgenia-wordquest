"use client";

/**
 * TTS (Web Speech, prefer en-GB), tiny WebAudio SFX, and haptics.
 * All no-op safely on unsupported browsers; iOS requires a user gesture,
 * which is satisfied because every call site is a tap handler.
 */

let voiceCache: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (voiceCache) return voiceCache;
  const voices = window.speechSynthesis.getVoices();
  voiceCache =
    voices.find((v) => v.lang === "en-GB" && v.localService) ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null;
  return voiceCache;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voiceCache = null;
    pickVoice();
  };
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-GB";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

// --- SFX -------------------------------------------------------------------

type SfxKind = "correct" | "wrong" | "fanfare" | "tap";

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gainPeak = 0.12): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

export function playSfx(kind: SfxKind, muted: boolean): void {
  if (muted) return;
  const c = audioCtx();
  if (!c) return;
  switch (kind) {
    case "correct":
      tone(c, 659.25, 0, 0.12); // E5
      tone(c, 783.99, 0.09, 0.18); // G5
      break;
    case "wrong":
      tone(c, 196, 0, 0.22, 0.1); // G3
      break;
    case "fanfare":
      tone(c, 523.25, 0, 0.14); // C5
      tone(c, 659.25, 0.12, 0.14); // E5
      tone(c, 783.99, 0.24, 0.14); // G5
      tone(c, 1046.5, 0.36, 0.3); // C6
      break;
    case "tap":
      tone(c, 880, 0, 0.05, 0.05);
      break;
  }
}

// --- Haptics ---------------------------------------------------------------

export function buzz(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // iOS Safari: unsupported — micro-animations + sound carry the feedback
    }
  }
}
