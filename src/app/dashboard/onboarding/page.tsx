"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

const LEAD_SOURCES = [
  { id: "sms", label: "SMS", available: true },
  { id: "email", label: "Email", available: true },
  { id: "website", label: "Website form", available: true },
  { id: "instagram", label: "Instagram", available: false },
  { id: "other", label: "Other", available: true },
];

const PREVIEW_ACTIONS = [
  { text: "Followed up with lead after 6 hours", delay: 0 },
  { text: "Booked call with Sarah", delay: 800 },
  { text: "Recovered ghosted prospect after 2 days", delay: 1600 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [previewItems, setPreviewItems] = useState<typeof PREVIEW_ACTIONS>([]);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (searchParams.get("zoom_connected") === "1") {
      setStep(2);
      setShowConnected(true);
      router.replace("/dashboard/onboarding");
      const t = setTimeout(() => {
        setShowConnected(false);
        setStep(3);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router]);

  const wid = workspaceId || workspaces[0]?.id;

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-stone-50">Get started</h1>
          <p className="text-stone-400 mt-2">
            You need an account to activate. Sign up or contact us.
          </p>
          <Link href="/" className="mt-6 inline-block text-amber-400 hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  const [showConnected, setShowConnected] = useState(false);

  const handleStep2Connect = () => {
    setConnected(true);
    setStep(3);
  };

  const handleStep3Preview = () => {
    setPreviewItems([]);
    let i = 0;
    for (const a of PREVIEW_ACTIONS) {
      setTimeout(() => {
        setPreviewItems((prev) => [...prev, a]);
      }, a.delay + 400 * i);
      i++;
    }
    setTimeout(() => setStep(4), 3000);
  };

  const handleStep4Activate = async () => {
    if (!wid) return;
    setActivating(true);
    try {
      await fetch(`/api/activation?workspace_id=${wid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      for (let i = 0; i < 3; i++) {
        await fetch(`/api/activation?workspace_id=${wid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "simulate" }),
        });
      }
      await fetch(`/api/activation?workspace_id=${wid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
    } catch {
      // continue
    }
    setActivating(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${s <= step ? "bg-amber-500" : "bg-stone-700"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 className="text-xl font-semibold text-stone-50 mb-2">Where do leads come from?</h1>
            <p className="text-stone-400 text-sm mb-6">Select your main channel</p>
            <div className="grid grid-cols-2 gap-3">
              {LEAD_SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => src.available && setSelectedSource(src.id)}
                  disabled={!src.available}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selectedSource === src.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : src.available
                        ? "border-stone-700 hover:border-stone-600 text-stone-200"
                        : "border-stone-800 text-stone-600 cursor-not-allowed"
                  }`}
                >
                  {src.label}
                  {!src.available && <span className="block text-xs mt-0.5">Coming soon</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedSource && setStep(2)}
              disabled={!selectedSource}
              className="mt-6 w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-medium"
            >
              Next
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {showConnected ? (
              <p className="text-lg text-emerald-400 font-medium text-center py-8">
                Operator is now watching conversations.
              </p>
            ) : (
              <>
            <h1 className="text-xl font-semibold text-stone-50 mb-2">Connect</h1>
            <p className="text-stone-400 text-sm mb-6">
              Connect your {selectedSource === "email" ? "email" : selectedSource === "sms" ? "SMS" : selectedSource === "website" ? "website" : "channel"} so the operator can start watching conversations.
            </p>
            {wid && (
              <div className="space-y-3">
                <a
                  href={`/api/integrations/zoom/connect?workspace_id=${wid}&return_to=onboarding`}
                  className="block p-4 rounded-xl border border-stone-700 hover:border-amber-500 bg-stone-900/60 text-stone-200 text-center"
                >
                  Connect Zoom (recommended)
                </a>
                <button
                  onClick={handleStep2Connect}
                  className="w-full py-3 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 font-medium"
                >
                  Skip for now — I&apos;ll connect later
                </button>
              </div>
            )}
            <p className="mt-4 text-stone-500 text-xs text-center">
              Operator can also work with calendar events without Zoom.
            </p>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-xl font-semibold text-stone-50 mb-2">Preview</h1>
            <p className="text-stone-400 text-sm mb-6">Here&apos;s what it does</p>
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3 min-h-[120px]">
              {previewItems.length === 0 ? (
                <button
                  onClick={handleStep3Preview}
                  className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
                >
                  Run 3 sample actions
                </button>
              ) : (
                previewItems.map((item, i) => (
                  <p key={i} className="flex items-center gap-2 text-sm text-emerald-400">
                    <span>✔</span> {item.text}
                  </p>
                ))
              )}
            </div>
            {previewItems.length >= 3 && (
              <button
                onClick={() => setStep(4)}
                className="mt-6 w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
              >
                Continue
              </button>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-xl font-semibold text-stone-50 mb-2">Activate operator</h1>
            <p className="text-stone-400 text-sm mb-6">
              It will now reply and follow up automatically.
            </p>
            <button
              onClick={handleStep4Activate}
              disabled={activating}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 font-medium"
            >
              {activating ? "Activating…" : "Activate operator"}
            </button>
          </>
        )}

        <Link href="/dashboard" className="block mt-6 text-center text-stone-500 text-sm hover:text-stone-300">
          Skip to dashboard
        </Link>
      </div>
    </div>
  );
}
