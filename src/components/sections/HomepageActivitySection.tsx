"use client";

import dynamic from "next/dynamic";

const HomepageActivityPreview = dynamic(
  () => import("@/components/sections/HomepageActivityPreview").then((m) => ({ default: m.HomepageActivityPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[900px] mx-auto rounded-2xl h-64 bg-zinc-900/50 border border-zinc-800 animate-pulse" aria-hidden />
    ),
  }
);

export function HomepageActivitySection() {
  return <HomepageActivityPreview />;
}
