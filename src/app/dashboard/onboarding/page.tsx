"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [activating, setActivating] = useState(false);

  const activateAndRedirect = useCallback(async (workspaceId: string) => {
    setActivating(true);
    try {
      await fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
    } catch {
      // continue
    }
    setActivating(false);
    router.push(`/dashboard?workspace_id=${encodeURIComponent(workspaceId)}`);
  }, [router]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const wid = workspaceId || searchParams.get("workspace_id") || workspaces[0]?.id;

  useEffect(() => {
    if (!wid) return;
    if (searchParams.get("zoom_connected") === "1") {
      activateAndRedirect(wid);
      return;
    }
  }, [wid, searchParams, activateAndRedirect]);

  const handleConnect = () => {
    if (!wid) return;
    window.location.href = `/api/integrations/zoom/connect?workspace_id=${encodeURIComponent(wid)}&return_to=onboarding`;
  };

  const handleSkip = async () => {
    if (!wid) return;
    await activateAndRedirect(wid);
  };

  if (workspaces.length === 0 && !wid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">Protection ready</h1>
          <p className="text-stone-400 mt-2">
            Create an account to begin watching over your conversations.
          </p>
          <Link href="/activate" className="mt-6 inline-block text-amber-400 hover:underline">
            Start protection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Connect your calendar</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Connect your calendar so we can watch your conversations.
        </p>
        {wid ? (
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={activating}
              className="w-full py-3.5 rounded-lg font-medium"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              Connect calendar
            </button>
            <button
              onClick={handleSkip}
              disabled={activating}
              className="w-full py-3 rounded-lg font-medium"
              style={{ background: "var(--surface)", color: "var(--text-secondary)", borderColor: "var(--border)", borderWidth: "1px" }}
            >
              {activating ? "Connecting…" : "Skip for now"}
            </button>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center p-8"><p className="text-stone-500">Loading…</p></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
