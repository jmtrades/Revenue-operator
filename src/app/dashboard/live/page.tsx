"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isLiveCompleted, setLiveCompleted } from "@/lib/live-gate";

const FEED_ITEMS: { text: string; delaySec: number }[] = [
  { text: "Conversation detected", delaySec: 0 },
  { text: "Context understood", delaySec: 3 },
  { text: "Response prepared", delaySec: 6 },
  { text: "Follow-up scheduled", delaySec: 9 },
  { text: "Attendance protected", delaySec: 12 },
  { text: "Conversation stabilised", delaySec: 15 },
];

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace_id") ?? "";
  const [phase, setPhase] = useState<"feed" | "fade" | "ready">("feed");
  const [feedIndex, setFeedIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (workspaceId && isLiveCompleted(workspaceId)) {
      router.replace(`/dashboard?workspace_id=${encodeURIComponent(workspaceId)}`);
      return;
    }
  }, [workspaceId, router]);

  useEffect(() => {
    if (phase !== "feed") return;
    const interval = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= 18) {
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

  const handleGoToOverview = () => {
    setLiveCompleted(workspaceId);
    router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
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
        opacity: phase === "fade" ? 0.7 : 1,
      }}
    >
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-2">Conversations are now being maintained</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>Watch what happens</p>

        <div className="space-y-3 min-h-[200px] flex flex-col items-center">
          {phase === "feed" &&
            FEED_ITEMS.slice(0, feedIndex).map((item, i) => (
              <div
                key={i}
                className="w-full py-3 px-4 rounded-lg text-left text-sm flex items-center gap-2 transition-opacity duration-300"
                style={{
                  background: "rgba(46, 204, 113, 0.1)",
                  borderColor: "rgba(46, 204, 113, 0.3)",
                  borderWidth: "1px",
                  color: "var(--meaning-green)",
                }}
              >
                <span className="shrink-0">✔</span>
                {item.text}
              </div>
            ))}
          {phase === "ready" && (
            <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
              We&apos;ll keep doing this automatically
            </p>
          )}
        </div>

        {phase === "ready" && (
          <button
            onClick={handleGoToOverview}
            className="mt-10 w-full py-3.5 rounded-lg font-medium"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            Go to overview
          </button>
        )}
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
