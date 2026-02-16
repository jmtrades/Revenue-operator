"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBegin = () => {
    setLoading(true);
    router.push("/onboard/identity");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <p className="text-[18px] leading-relaxed text-[#1c1917]">
            Work becomes real when both sides see the same record.
          </p>
          <p className="text-[18px] leading-relaxed text-[#44403c]">
            Messages can be forgotten. Records cannot.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBegin}
          disabled={loading}
          className="w-full py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : "Begin record"}
        </button>
      </div>
    </main>
  );
}
