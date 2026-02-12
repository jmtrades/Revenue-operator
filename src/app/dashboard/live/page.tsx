"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useWorkspace } from "@/components/WorkspaceContext";
import { isLiveCompleted, setLiveCompleted } from "@/lib/live-gate";

const FEED_ITEMS: { text: string; delaySec: number }[] = [
  { text: "New inquiry noticed", delaySec: 0 },
  { text: "Prepared a reply you can send", delaySec: 2 },
  { text: "Follow-up scheduled", delaySec: 5 },
  { text: "Conversation moved toward a call", delaySec: 7 },
  { text: "Attendance confirmed", delaySec: 10 },
  { text: "Conversation stabilised", delaySec: 13 },
];

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loading } = useWorkspace();
  const urlWid = searchParams.get("workspace_id") ?? "";
  const workspaceId = urlWid || contextWid || "";
  const [phase, setPhase] = useState<"feed" | "fade" | "ready">("feed");
  const [feedIndex, setFeedIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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

  // Removed value page redirect - go directly to dashboard

  useEffect(() => {
    if (phase !== "feed") return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        // Wait 2 seconds after final item (at 13s) before showing ready
        if (next >= 15) {
          setPhase("fade");
          return next;
        }
        setFeedIndex(FEED_ITEMS.filter((f) => f.delaySec <= next).length);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "fade") {
      const t = setTimeout(() => setPhase("ready"), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleContinue = () => {
    setLiveCompleted(workspaceId);
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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 transition-opacity duration-500"
      style={{
        background: "var(--background)",
        color: "var(--text-primary)",
        opacity: phase === "fade" ? 0.85 : 1,
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
            Conversations are now being maintained
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Watch what happens
          </p>

          <div className="space-y-3 min-h-[200px] text-left">
            {phase === "feed" &&
              FEED_ITEMS.slice(0, feedIndex).map((item, i) => (
                <div
                  key={i}
                  className="py-3.5 px-4 rounded-lg text-sm flex items-center gap-3 transition-opacity duration-300"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    borderWidth: "1px",
                    color: "var(--meaning-green)",
                  }}
                >
                  <span className="shrink-0">✔</span>
                  {item.text}
                </div>
              ))}
            {phase === "ready" && (
              <p className="text-base font-medium py-4" style={{ color: "var(--text-primary)" }}>
                We&apos;ll keep doing this automatically
              </p>
            )}
          </div>

          {phase === "ready" && (
            <button
              onClick={handleContinue}
              className="mt-10 w-full py-3.5 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              Continue
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
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}
