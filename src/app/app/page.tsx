"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppRootPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const onboarded = localStorage.getItem("rt_onboarded");
      if (onboarded) {
        router.replace("/app/activity");
      } else {
        router.replace("/app/onboarding");
      }
    } catch {
      router.replace("/app/onboarding");
    }
  }, [mounted, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return null;
}
