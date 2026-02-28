"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

export default function OnboardRecordPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [orientationLines, setOrientationLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    if (!wsId) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
    fetch("/api/onboard/create-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: wsId }),
    })
      .then((res) => res.json())
      .then(async (json) => {
        if (json.external_ref) {
          setExternalRef(json.external_ref);
          sessionStorage.setItem("onboard_external_ref", json.external_ref);
          const orientRes = await fetch(`/api/onboard/orientation?workspace_id=${wsId}`);
          const orientJson = await orientRes.json();
          if (Array.isArray(orientJson.lines)) {
            setOrientationLines(orientJson.lines);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafaf9] p-6">
        <div className="mx-auto max-w-[720px] pt-16">
          <p className="text-[18px] text-[#78716c]">Loading.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#1c1917] p-6">
      <div className="mx-auto max-w-[720px] pt-16 space-y-8">
        <OnboardExecutionStateBanner />
        <h1 className="text-[21px] font-normal text-[#1c1917]">Record #1</h1>
        <section>
          {orientationLines.length === 0 ? (
            <p className="text-[18px] leading-relaxed text-[#78716c]">No entries.</p>
          ) : (
            <ul className="space-y-2">
              {orientationLines.map((line, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
        <footer className="border-t border-[#e7e5e4] pt-8">
          <p className="text-[18px] leading-relaxed text-[#44403c]">
            This record becomes complete when another party confirms.
          </p>
        </footer>
        <div className="pt-4">
          <button
            type="button"
            onClick={() => router.push("/onboard/send")}
            className="w-full py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
