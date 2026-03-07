"use client";

import dynamic from "next/dynamic";

const CallSimulator = dynamic(
  () => import("@/components/demo/CallSimulator").then((m) => ({ default: m.CallSimulator })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 min-h-[280px] flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading demo…</p>
      </div>
    ),
  }
);

export function DemoSimulatorSection() {
  return <CallSimulator />;
}
