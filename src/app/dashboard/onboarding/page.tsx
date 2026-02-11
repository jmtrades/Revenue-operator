"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [activating, setActivating] = useState(false);

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
  }, [wid, searchParams]);

  const activateAndRedirect = async (workspaceId: string) => {
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
    router.push(`/dashboard?workspace_id=${workspaceId}`);
  };

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
          <h1 className="text-2xl font-semibold text-stone-50">Get started</h1>
          <p className="text-stone-400 mt-2">
            Create an account to begin coverage. Sign up or contact us.
          </p>
          <Link href="/activate" className="mt-6 inline-block text-amber-400 hover:underline">
            Begin coverage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-xl font-semibold text-stone-50 mb-2">Connect your pipeline</h1>
        <p className="text-stone-400 text-sm mb-6">
          That&apos;s it. We protect your calendar — follow-ups, reminders, revivals. You take the calls.
        </p>
        {wid ? (
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={activating}
              className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium text-stone-950"
            >
              Connect calendar
            </button>
            <button
              onClick={handleSkip}
              disabled={activating}
              className="w-full py-3 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-200 font-medium"
            >
              {activating ? "Starting…" : "Skip for now"}
            </button>
          </div>
        ) : (
          <p className="text-stone-500">Select or create an account first.</p>
        )}
        <p className="text-stone-500 text-xs mt-4 text-center">
          Protection starts immediately once connected. You&apos;ll see activity within seconds.
        </p>
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
