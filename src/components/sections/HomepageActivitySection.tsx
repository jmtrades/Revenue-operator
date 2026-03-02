"use client";

import dynamic from "next/dynamic";

const HomepageActivityPreview = dynamic(
  () => import("@/components/sections/HomepageActivityPreview").then((m) => ({ default: m.HomepageActivityPreview })),
  { ssr: false }
);

export function HomepageActivitySection() {
  return <HomepageActivityPreview />;
}
