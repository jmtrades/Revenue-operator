/**
 * Curated ElevenLabs voices for onboarding and agent config.
 * We intentionally expose a small, production-ready set instead of the full library.
 */

export type CuratedVoice = {
  id: string;
  name: string;
  desc: string;
  description: string;
  accent: string;
  gender: "female" | "male";
  age: "young" | "middle-aged";
  tone: string;
  bestFor: string;
};

export const CURATED_VOICES: CuratedVoice[] = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    desc: "Warm & professional",
    description: "Warm & professional",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "friendly",
    bestFor: "Receptionist, customer service",
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    desc: "Calm & reassuring",
    description: "Calm & reassuring",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "soothing",
    bestFor: "Healthcare, insurance, support",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    desc: "Confident & clear",
    description: "Confident & clear",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "authoritative",
    bestFor: "Sales, legal, finance",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    desc: "Casual & approachable",
    description: "Casual & approachable",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "relaxed",
    bestFor: "Startups, tech, restaurants",
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    desc: "Polished & articulate",
    description: "Polished & articulate",
    accent: "British",
    gender: "female",
    age: "middle-aged",
    tone: "refined",
    bestFor: "Real estate, luxury, consulting",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    desc: "Energetic & upbeat",
    description: "Energetic & upbeat",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "enthusiastic",
    bestFor: "Events, fitness, retail",
  },
  {
    id: "jBpfuIE2acCO8z3wKNLl",
    name: "Gigi",
    desc: "Energetic & engaging",
    description: "Energetic & engaging",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "bright",
    bestFor: "Outbound campaigns, surveys",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    desc: "Deep & authoritative",
    description: "Deep & authoritative",
    accent: "British",
    gender: "male",
    age: "middle-aged",
    tone: "commanding",
    bestFor: "After-hours, security, enterprise",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    desc: "Natural & conversational",
    description: "Natural & conversational",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "natural",
    bestFor: "General purpose, follow-ups",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    desc: "Warm & maternal",
    description: "Warm & maternal",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "caring",
    bestFor: "Dental, pediatric, education",
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    desc: "Smooth & persuasive",
    description: "Smooth & persuasive",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "smooth",
    bestFor: "Sales qualification, outbound",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    desc: "Professional & precise",
    description: "Professional & precise",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "precise",
    bestFor: "Medical, legal intake, scheduling",
  },
];

export const DEFAULT_VOICE_ID = CURATED_VOICES[0].id;
