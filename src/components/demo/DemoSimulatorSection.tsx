"use client";

import dynamic from "next/dynamic";

const CallSimulator = dynamic(
  () => import("@/components/demo/CallSimulator").then((m) => ({ default: m.CallSimulator })),
  { ssr: false }
);

export function DemoSimulatorSection() {
  return <CallSimulator />;
}
