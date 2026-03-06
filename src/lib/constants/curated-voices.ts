/**
 * Curated ElevenLabs voices for onboarding and agent config.
 * 8 options so users aren't overwhelmed; each has a short preview line.
 */

export const CURATED_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Warm & professional", gender: "female" as const, accent: "American" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calm & reassuring", gender: "female" as const, accent: "American" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Confident & clear", gender: "male" as const, accent: "American" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", desc: "Friendly & upbeat", gender: "male" as const, accent: "American" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", desc: "Articulate & warm", gender: "female" as const, accent: "British" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", desc: "Relaxed & trustworthy", gender: "male" as const, accent: "American" },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", desc: "Energetic & engaging", gender: "female" as const, accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "Deep & authoritative", gender: "male" as const, accent: "British" },
] as const;

export const DEFAULT_VOICE_ID = CURATED_VOICES[0].id;
