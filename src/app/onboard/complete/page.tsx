"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

export default function OnboardCompletePage() {
  const t = useTranslations("onboard.complete");
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [orientationLines, setOrientationLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [continuityInput, setContinuityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      <main className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <p className="text-[18px]" style={{ color: "var(--text-tertiary)" }}>{t("oneMoment")}</p>
      </main>
    );
  }

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
    <main className="min-h-screen bg-stone-50 text-stone-900 p-6">
      <div className="mx-auto max-w-[720px] pt-16 space-y-8">
        <OnboardExecutionStateBanner />
        <h1 className="text-[21px] font-normal text-stone-900">{t("recordTitle")}</h1>
        <section className="space-y-3">
          {orientationLines.length === 0 ? (
            <p className="text-[18px] leading-relaxed text-stone-500">{t("noEntries")}</p>
          ) : (
            <ul className="space-y-2">
              {orientationLines.map((line, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-stone-700">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border-t border-stone-200 pt-8">
          <form onSubmit={handleContinuitySubmit} className="space-y-4">
            <input
              type="text"
              value={continuityInput}
              onChange={(e) => setContinuityInput(e.target.value)}
              placeholder={t("placeholder")}
              disabled={submitting}
              className="w-full px-4 py-2 text-[18px] text-stone-900 bg-white border border-stone-200 focus:outline-none focus:border-stone-700"
            />
            <button
              type="submit"
              disabled={submitting || !continuityInput.trim()}
              className="w-full py-3 px-6 text-[18px] font-medium text-stone-900 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 transition-colors"
            >
              {submitting ? t("adding") : t("addOutcome")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
