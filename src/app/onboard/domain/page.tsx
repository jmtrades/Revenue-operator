"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "real_estate", label: "Real estate" },
  { value: "clinic", label: "Clinic" },
  { value: "finance", label: "Finance" },
  { value: "recruiting", label: "Recruiting" },
  { value: "home_services", label: "Home services" },
  { value: "generic", label: "Generic" },
];

export default function OnboardDomainPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    if (!wsId) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
  }, [router]);

  const handleContinue = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      await fetch("/api/onboard/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          domain_type: selected ?? "generic",
        }),
      });
      router.push("/onboard/governance");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboard/governance");
  };

  if (!workspaceId) return null;

  return (
    <main className="min-h-screen bg-[#fafaf9] p-6">
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-8">
          <OnboardExecutionStateBanner />
          <p className="text-[18px] leading-relaxed text-[#1c1917]">
            Choose a domain. This sets message templates and policy defaults.
          </p>
          <div className="space-y-3">
            {DOMAIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={`w-full py-3 px-6 text-[18px] text-left transition-colors ${
                  selected === opt.value
                    ? "bg-[#1c1917] text-[#fafaf9]"
                    : "text-[#1c1917] bg-white border border-[#e7e5e4] hover:bg-[#fafaf9]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="border-t border-[#e7e5e4] pt-8 flex gap-3">
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              className="flex-1 py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="py-3 px-6 text-[18px] font-medium text-[#78716c] hover:text-[#1c1917] disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
