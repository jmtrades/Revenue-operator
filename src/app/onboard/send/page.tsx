"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

type ApprovalMode = "autopilot" | "review_required";

interface PreviewData {
  proposed_text: string;
  disclosures: string[];
  requires_approval: boolean;
  policy_basis: Array<{ check?: string; passed?: boolean; reason?: string }>;
}

export default function OnboardSendPage() {
  const t = useTranslations("onboard");
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [counterpartyContact, setCounterpartyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHesitationFallback, setShowHesitationFallback] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("autopilot");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    const extRef = sessionStorage.getItem("onboard_external_ref");
    if (!wsId || !extRef) {
      router.push("/onboard/identity");
      return;
    }
    const id = setTimeout(() => {
      setWorkspaceId(wsId);
      setExternalRef(extRef);
    }, 0);
    return () => clearTimeout(id);
  }, [router]);

  useEffect(() => {
    if (!workspaceId) return;
    const id = setTimeout(() => setPreviewLoading(true), 0);
    fetch(`/api/enterprise/message-preview?workspace_id=${encodeURIComponent(workspaceId)}&intent_type=first_record_send`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; proposed_text?: string; disclosures?: string[]; requires_approval?: boolean; policy_basis?: PreviewData["policy_basis"] }) => {
        if (json.ok) {
          setPreview({
            proposed_text: json.proposed_text ?? "This matches what we agreed. Adjust it if anything is off.",
            disclosures: json.disclosures ?? [],
            requires_approval: json.requires_approval ?? false,
            policy_basis: json.policy_basis ?? [],
          });
        } else {
          setPreview({
            proposed_text: "This matches what we agreed. Adjust it if anything is off.",
            disclosures: [],
            requires_approval: false,
            policy_basis: [],
          });
        }
      })
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
    return () => clearTimeout(id);
  }, [workspaceId]);

  useEffect(() => {
    if (!counterpartyContact.trim()) return;
    const timer = setTimeout(() => {
      setShowHesitationFallback(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [counterpartyContact]);

  const handleSend = async () => {
    if (!counterpartyContact.trim()) {
      setError("Contact required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          external_ref: externalRef,
          counterparty_contact: counterpartyContact.trim(),
          approval_mode: approvalMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to send");
        setLoading(false);
        return;
      }
      router.push("/onboard/waiting");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  if (!workspaceId || !externalRef) return null;

  return (
    <main className="min-h-screen bg-[#fafaf9] p-6">
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-8">
          <OnboardExecutionStateBanner />
          <div className="space-y-4">
            <p className="text-[18px] leading-relaxed text-[#1c1917]">
              Send this record to someone who can confirm it.
            </p>
            <div className="border-t border-[#e7e5e4] pt-4">
              <p className="text-[18px] leading-relaxed text-[#44403c]">
                This matches what we agreed. Adjust it if anything is off.
              </p>
            </div>
          </div>
          {previewLoading ? (
            <p className="text-[18px]" style={{ color: "var(--text-tertiary)" }}>One moment…</p>
          ) : preview && (
            <section className="border border-[#e7e5e4] p-4 space-y-3">
              <p className="text-[13px] font-medium uppercase tracking-wide text-[#78716c]">Message preview</p>
              <p className="text-[18px] leading-relaxed text-[#1c1917]">{preview.proposed_text}</p>
              {preview.disclosures.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-[16px] text-[#44403c]">
                  {preview.disclosures.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
              {preview.policy_basis.length > 0 && (
                <p className="text-[13px] text-[#78716c]">
                  Policy checks: {preview.policy_basis.filter((c) => c.passed).length} passed.
                </p>
              )}
              {preview.requires_approval && (
                <p className="text-[13px] text-[#78716c]">This message type requires approval before send.</p>
              )}
            </section>
          )}

          <div className="space-y-2">
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#78716c]">Approval mode</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setApprovalMode("autopilot")}
                className={`py-2 px-4 text-[18px] ${approvalMode === "autopilot" ? "bg-[#1c1917] text-[#fafaf9]" : "bg-[#e7e5e4] text-[#1c1917]"}`}
              >
                Autopilot
              </button>
              <button
                type="button"
                onClick={() => setApprovalMode("review_required")}
                className={`py-2 px-4 text-[18px] ${approvalMode === "review_required" ? "bg-[#1c1917] text-[#fafaf9]" : "bg-[#e7e5e4] text-[#1c1917]"}`}
              >
                Review required
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="contact" className="block text-[13px] font-medium uppercase tracking-wide text-[#78716c]">
              Contact (email or phone)
            </label>
            <input
              id="contact"
              type="text"
              value={counterpartyContact}
              onChange={(e) => {
                setCounterpartyContact(e.target.value);
                setShowHesitationFallback(false);
              }}
              className="w-full px-4 py-2 text-[18px] text-[#1c1917] bg-white border border-[#e7e5e4] focus:outline-none focus:border-[#44403c]"
              disabled={loading}
              placeholder={t("send.contactPlaceholder")}
            />
          </div>
          {showHesitationFallback && (
            <p className="text-[18px] leading-relaxed text-[#78716c]">
              A record can be sent now or shared later.
            </p>
          )}
          {error && <p className="text-[18px] text-[#78716c]">{error}</p>}
          <div className="border-t border-[#e7e5e4] pt-8">
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="w-full py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : "Send record"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
