"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWorkspaceMeCached } from "@/lib/client/workspace-me";

export default function AppRootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { onboardingCompletedAt?: string | null } | null) => {
        router.replace(data?.onboardingCompletedAt ? "/app/activity" : "/app/onboarding");
      })
      .catch(() => router.replace("/app/onboarding"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return null;
}
