"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useWorkspace } from "@/components/WorkspaceContext";
import { isLiveCompleted, setLiveCompleted } from "@/lib/live-gate";

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loading } = useWorkspace();
  const urlWid = searchParams.get("workspace_id") ?? "";
  const workspaceId = urlWid || contextWid || "";
  const [phase, setPhase] = useState<"feed" | "ready">("feed");

  useEffect(() => {
    if (!loading && workspaces.length === 0) {
      router.replace("/activate");
      return;
    }
    if (contextWid && !urlWid) {
      router.replace(`/dashboard/live?workspace_id=${encodeURIComponent(contextWid)}`);
      return;
    }
  }, [loading, workspaces.length, contextWid, urlWid, router]);

  // Single transition to ready after delay. No setInterval — UI changes only on navigation or one-off transition.
  useEffect(() => {
    if (phase !== "feed") return;
    const t = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleContinue = () => {
    setLiveCompleted(workspaceId);
    router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
        <p style={{ color: "var(--text-muted)" }}>One moment…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 transition-opacity duration-500"
        style={{
          background: "var(--background)",
          color: "var(--text-primary)",
        }}
    >
      <div className="max-w-md w-full">
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            borderWidth: "1px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ background: "var(--meaning-green)" }}
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Active
            </span>
          </div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Follow-through is now protected
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Watch what happens
          </p>

          <div className="space-y-3 min-h-[200px] text-left">
            {phase === "feed" && (
              <p className="text-base py-4" style={{ color: "var(--text-secondary)" }}>
                Follow-through is protected. Decisions remain on track.
              </p>
            )}
            {phase === "ready" && (
              <p className="text-base font-medium py-4" style={{ color: "var(--text-primary)" }}>
                We&apos;ll keep doing this under governance
              </p>
            )}
          </div>

          {phase === "ready" && (
            <button
              onClick={handleContinue}
              className="mt-10 w-full py-3.5 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              Open
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>One moment…</p>
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}
