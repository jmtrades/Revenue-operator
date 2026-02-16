"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function OnboardSourcePage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    if (!wsId) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
  }, [router]);

  const handleSelect = (source: string) => {
    setSelected(source);
    setTimeout(() => {
      router.push("/onboard/record");
    }, 300);
  };

  if (!workspaceId) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
      <div className="max-w-md w-full space-y-6">
        <p className="text-[18px] leading-relaxed text-[#1c1917] text-center">
          Where do requests currently arrive?
        </p>
        <div className="space-y-3">
          {["Email inbox", "Phone / SMS", "Calendar bookings", "Form or CRM"].map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => handleSelect(source)}
              className="w-full py-3 px-6 text-[18px] text-left text-[#1c1917] bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] transition-colors"
            >
              {source}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
