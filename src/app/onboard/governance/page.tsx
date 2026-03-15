"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

const JURISDICTIONS: { value: string; label: string }[] = [
  { value: "UK", label: "United Kingdom" },
  { value: "US-CA", label: "United States — California" },
  { value: "US-NY", label: "United States — New York" },
  { value: "US-TX", label: "United States — Texas" },
  { value: "US-FL", label: "United States — Florida" },
  { value: "EU-GDPR", label: "EU (GDPR)" },
];

const APPROVAL_MODES: { value: string; label: string }[] = [
  { value: "autopilot", label: "Autopilot — release per policy without human approval" },
  { value: "preview_required", label: "Preview required — human must preview before release" },
  { value: "approval_required", label: "Approval required — explicit approval before release" },
  { value: "locked_script", label: "Locked script — only approved script blocks" },
  { value: "jurisdiction_locked", label: "Jurisdiction locked — no release outside selected jurisdiction" },
];

export default function OnboardGovernancePage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string>("UK");
  const [approvalMode, setApprovalMode] = useState<string>("autopilot");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    if (!wsId) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
  }, [router]);

  const handleContinue = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      await fetch("/api/onboard/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          jurisdiction,
          approval_mode: approvalMode,
        }),
      });
      router.push("/onboard/source");
    } finally {
      setLoading(false);
    }
  };

  if (!workspaceId) return null;

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-8">
          <OnboardExecutionStateBanner />
          <p className="text-[18px] leading-relaxed text-stone-900">
            Execution infrastructure requires jurisdiction, approval mode, and voice governance. Set jurisdiction, approval mode, and voice governance.
          </p>

          <div className="space-y-4">
            <p className="text-[15px] font-medium text-stone-700">Jurisdiction</p>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full py-3 px-4 text-[16px] text-stone-900 bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              {JURISDICTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <p className="text-[15px] font-medium text-stone-700">Approval mode</p>
            <div className="space-y-2">
              {APPROVAL_MODES.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                    approvalMode === opt.value ? "border-stone-900 bg-stone-100" : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="approval_mode"
                    value={opt.value}
                    checked={approvalMode === opt.value}
                    onChange={() => setApprovalMode(opt.value)}
                    className="mt-1"
                  />
                  <span className="text-[15px] text-stone-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-stone-200 bg-stone-50 p-4">
            <p className="text-[14px] text-stone-700">
              Governed script blocks and consent capture are on by default.
            </p>
          </div>

          <div className="border-t border-stone-200 pt-8">
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              className="w-full py-3 px-6 text-[18px] font-medium text-stone-900 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
