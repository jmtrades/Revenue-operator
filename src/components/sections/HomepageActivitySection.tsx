"use client";

import dynamic from "next/dynamic";

const HomepageActivityPreview = dynamic(
  () => import("@/components/sections/HomepageActivityPreview").then((m) => ({ default: m.HomepageActivityPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[900px] mx-auto rounded-2xl h-64 bg-[var(--bg-card)]/50 border border-[var(--border-default)] animate-pulse" aria-hidden />
    ),
  }
);

export function HomepageActivitySection() {
  return <HomepageActivityPreview />;
}
