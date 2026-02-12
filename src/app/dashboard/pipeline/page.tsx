"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PipelinePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/conversations");
  }, [router]);
  return (
    <div className="p-8">
      <p style={{ color: "var(--text-muted)" }}>Redirecting…</p>
    </div>
  );
}
