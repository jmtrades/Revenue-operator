"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { isValueCompleted, setValueCompleted } from "@/lib/live-gate";

function ValuePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loading } = useWorkspace();
  const urlWid = searchParams.get("workspace_id") ?? "";
  const workspaceId = urlWid || contextWid || "";
  const [phase, setPhase] = useState<"analyzing" | "results" | "insights" | "active">("analyzing");
  const [data, setData] = useState<{
    conversations_likely_quiet: number;
    likely_missed_follow_ups: number;
    at_risk_attendance: number;
    insights?: string[];
  } | null>(null);

  useEffect(() => {
    if (!loading && workspaces.length === 0) {
      router.replace("/activate");
      return;
    }
    if (workspaceId && isValueCompleted(workspaceId)) {
      router.replace(`/dashboard?workspace_id=${encodeURIComponent(workspaceId)}`);
      return;
    }
  }, [loading, workspaces.length, workspaceId, router]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/value-reconstruction?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setPhase("results");
      })
      .catch(() => {
        setData({
          conversations_likely_quiet: 3,
          likely_missed_follow_ups: 2,
          at_risk_attendance: 2,
        });
        setPhase("results");
      });
  }, [workspaceId]);

  useEffect(() => {
    if (phase !== "results" || !data) return;
    const t = setTimeout(() => setPhase("insights"), 5000);
    return () => clearTimeout(t);
  }, [phase, data]);

  useEffect(() => {
    if (phase !== "insights" || !data) return;
    const t = setTimeout(() => setPhase("active"), 5000);
    return () => clearTimeout(t);
  }, [phase, data]);

  const handleContinue = () => {
    setValueCompleted(workspaceId);
    router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-md w-full rounded-xl border p-8" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
        {phase === "analyzing" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "var(--meaning-green)" }} aria-hidden />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Analyzing</p>
            </div>
            <p className="text-lg mb-6" style={{ color: "var(--text-primary)" }}>We analyzed your calendar and follow-through patterns.</p>
          </>
        )}
        {phase === "results" && data && (
          <>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>What we found</p>
            <p className="text-lg mb-6" style={{ color: "var(--text-primary)" }}>Where follow-through continues</p>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Follow-through likely to stall</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.conversations_likely_quiet}</span>
              </li>
              <li className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Decisions that needed a nudge</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.likely_missed_follow_ups}</span>
              </li>
              <li className="flex justify-between items-center py-2" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>At-risk attendance found</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.at_risk_attendance}</span>
              </li>
            </ul>
            <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>Protection is starting…</p>
          </>
        )}
        {phase === "insights" && data?.insights && (
          <>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>Insights</p>
            <ul className="space-y-3 text-sm mb-4">
              {data.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                  <span style={{ color: "var(--text-primary)" }}>{insight}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
              This is what normally slips through when follow-through is not in place.
            </p>
          </>
        )}
        {phase === "active" && (
          <>
            <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Protection is now active</p>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Follow-through and attendance continue here. You handle: calls.</p>
            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-lg font-medium"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              Access overview
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ValuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
          <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
        </div>
      }
    >
      <ValuePageContent />
    </Suspense>
  );
}
