/**
 * Voice preview engine — SpeechSynthesis for demos and onboarding.
 * Real agents use premium AI voices; this is for browser preview only.
 */

export function speakText(
  text: string,
  options?: {
    gender?: "female" | "male";
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
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
  synth.speak(utterance);
  return () => synth.cancel();
}
