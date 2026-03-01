"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

export default function OnboardLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBegin = () => {
    setLoading(true);
    router.push("/onboard/identity");
  };

  return (
    <main className="min-h-screen p-6" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-8">
          <OnboardExecutionStateBanner />
          <div className="space-y-4">
            <p className="text-lg leading-relaxed" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
              Domain, jurisdiction, review level, and governance are set in order.
            </p>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Records are append-only and auditable.
            </p>
          </div>
          <div className="border-t pt-8" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={handleBegin}
              disabled={loading}
              className="btn-primary w-full max-w-[320px] disabled:opacity-50"
            >
              {loading ? "Preparing…" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
