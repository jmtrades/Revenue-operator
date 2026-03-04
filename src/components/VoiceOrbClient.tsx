"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const VoiceOrb = dynamic(
  () => import("@/components/VoiceOrb").then((m) => ({ default: m.VoiceOrb })),
  { ssr: false }
);

export function VoiceOrbClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <VoiceOrb />;
}
