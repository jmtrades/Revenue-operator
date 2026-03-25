/**
 * Voice preview engine — SpeechSynthesis for demos and onboarding.
 * speakTextViaApi tries Recall voice server /api/agent/speak endpoint first, then falls back to browser TTS.
 */

export type SpeakOptions = {
  gender?: "female" | "male" | "neutral";
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  voiceId?: string;
};

/**
 * Try Recall voice server TTS via /api/agent/speak; on 503/502 or error, fall back to browser TTS.
 * Returns { usedFallback: true } when browser TTS was used (caller can show "Using basic voice").
 */
export async function speakTextViaApi(
  text: string,
  options?: SpeakOptions
): Promise<{ usedFallback: boolean }> {
  if (typeof window === "undefined") {
    options?.onEnd?.();
    return { usedFallback: true };
  }
  try {
    const res = await fetch("/api/agent/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 5000), voiceId: options?.voiceId }),
    });
    if (res.ok && res.body) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onplay = () => options?.onStart?.();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        options?.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        speakText(text, options);
        options?.onEnd?.();
      };
      await audio.play();
      return { usedFallback: false };
    }
  } catch {
    // fall through to browser TTS
  }
  speakText(text, options);
  return { usedFallback: true };
}

export function speakText(
  text: string,
  options?: SpeakOptions
): (() => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options?.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const gender = options?.gender ?? "female";

  const genderVoices = voices.filter((v) => {
    const name = v.name.toLowerCase();
    return gender === "female"
      ? name.includes("female") ||
          name.includes("samantha") ||
          name.includes("karen") ||
          name.includes("fiona") ||
          name.includes("victoria") ||
          name.includes("moira")
      : name.includes("male") ||
          name.includes("daniel") ||
          name.includes("alex") ||
          name.includes("tom") ||
          name.includes("fred");
  });
  if (genderVoices.length > 0) utterance.voice = genderVoices[0]!;

  utterance.rate = options?.rate ?? 0.95;
  utterance.pitch = options?.pitch ?? (gender === "female" ? 1.05 : 0.9);
  utterance.onstart = () => options?.onStart?.();
  utterance.onend = () => options?.onEnd?.();
  utterance.onerror = () => options?.onEnd?.();
  synth.speak(utterance);
  return () => synth.cancel();
}

/** Uses Recall voice server via API when configured; otherwise browser TTS. Use for onboarding/activate previews. Pass voiceId for Recall voice. */
export function previewVoiceViaApi(
  text: string,
  genderOrOptions?: "female" | "male" | "neutral" | SpeakOptions
): void {
  if (typeof window === "undefined") return;
  const options: SpeakOptions =
    typeof genderOrOptions === "object" && genderOrOptions !== null
      ? genderOrOptions
      : { gender: genderOrOptions ?? "female" };
  void speakTextViaApi(text, options);
}

/** V25: Button-only voice preview (browser TTS fallback). Use ONLY when API is not desired. Never auto-play. */
export function previewVoice(text: string, gender: "female" | "male" | "neutral") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => {
    const n = v.name.toLowerCase();
    return gender === "female"
      ? n.includes("samantha") || n.includes("karen") || n.includes("fiona") || n.includes("victoria")
      : n.includes("daniel") || n.includes("alex") || n.includes("tom") || n.includes("fred");
  });
  if (match) u.voice = match;
  u.rate = 0.95;
  u.pitch = gender === "female" ? 1.05 : 0.9;
  window.speechSynthesis.speak(u);
}
