"use client";

import dynamic from "next/dynamic";

const VoiceOrb = dynamic(
  () => import("@/components/VoiceOrb").then((m) => ({ default: m.VoiceOrb })),
  { ssr: false }
);

export function VoiceOrbClient() {
  return <VoiceOrb />;
}
