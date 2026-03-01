"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

export default function OnboardCompletePage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [orientationLines, setOrientationLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    const extRef = sessionStorage.getItem("onboard_external_ref");
    if (!wsId || !extRef) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
    setExternalRef(extRef);

    let delayedTimer: NodeJS.Timeout | null = null;

    const fetchOrientation = async () => {
      try {
        const res = await fetch(`/api/onboard/orientation?workspace_id=${wsId}`);
        const json = await res.json();
        if (Array.isArray(json.lines)) {
          setOrientationLines(json.lines);
          const hasCompletionLine = json.lines.some((l: string) => l.includes("exists independently"));
          const hasDelayedLine = json.lines.some((l: string) => l.includes("Future activity may reference"));
          if (hasCompletionLine && !hasDelayedLine && !delayedTimer) {
            delayedTimer = setTimeout(async () => {
              await fetch("/api/onboard/delayed-line", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace_id: wsId }),
              }).catch(() => {});
            }, 5000);
          }
          const hasCompleteRecord = json.lines.some((l: string) => l.includes("record is now complete"));
          if (hasCompleteRecord) {
            setTimeout(() => {
              router.push("/dashboard");
            }, 3000);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchOrientation();
    const interval = setInterval(fetchOrientation, 2000);
    return () => {
      clearInterval(interval);
      if (delayedTimer) clearTimeout(delayedTimer);
    };
  }, [router]);

  if (!workspaceId || !externalRef || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
        <p className="text-[18px] text-[#78716c]">Preparing…</p>
      </main>
    );
  }

  const [continuityInput, setContinuityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleContinuitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!continuityInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboard/append-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          external_ref: externalRef,
          outcome_text: continuityInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.external_ref) {
        setContinuityInput("");
        const orientRes = await fetch(`/api/onboard/orientation?workspace_id=${workspaceId}`);
        const orientJson = await orientRes.json();
        if (Array.isArray(orientJson.lines)) {
          setOrientationLines(orientJson.lines);
        }
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#1c1917] p-6">
      <div className="mx-auto max-w-[720px] pt-16 space-y-8">
        <OnboardExecutionStateBanner />
        <h1 className="text-[21px] font-normal text-[#1c1917]">Record #1</h1>
        <section className="space-y-3">
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
        <section className="border-t border-[#e7e5e4] pt-8">
          <form onSubmit={handleContinuitySubmit} className="space-y-4">
            <input
              type="text"
              value={continuityInput}
              onChange={(e) => setContinuityInput(e.target.value)}
              placeholder="Add another outcome to this record"
              disabled={submitting}
              className="w-full px-4 py-2 text-[18px] text-[#1c1917] bg-white border border-[#e7e5e4] focus:outline-none focus:border-[#44403c]"
            />
            <button
              type="submit"
              disabled={submitting || !continuityInput.trim()}
              className="w-full py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Adding..." : "Add outcome"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
