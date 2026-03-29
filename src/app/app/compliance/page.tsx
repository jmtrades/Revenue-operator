"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { apiFetch } from "@/lib/api";

type ConsentMode = "one-party" | "two-party";

interface RecordingPolicies {
  consentMode: ConsentMode;
  retentionDays: number;
  piiRedaction: boolean;
  autoTranscribe: boolean;
  consentAnnouncement: string;
}

const RETENTION_OPTIONS = [30, 60, 90, 180, 365] as const;

function getDefaultPolicies(): RecordingPolicies {
  return {
    consentMode: "two-party",
    retentionDays: 90,
    piiRedaction: true,
    autoTranscribe: true,
    consentAnnouncement: "This call may be recorded for quality assurance and training purposes.",
  };
}

/* Built-in compliance standards — static display */
const BUILT_IN_STANDARDS = [
  { id: "soc2", name: "SOC 2 Type II", status: "compliant" as const, description: "Security, availability, and confidentiality controls independently audited." },
  { id: "hipaa", name: "HIPAA", status: "compliant" as const, description: "Protected health information handled per HIPAA requirements." },
  { id: "tcpa", name: "TCPA", status: "compliant" as const, description: "Telephone Consumer Protection Act consent and calling rules enforced." },
  { id: "gdpr", name: "GDPR", status: "compliant" as const, description: "EU data protection regulation compliance including right to erasure." },
  { id: "ssl", name: "256-bit SSL", status: "compliant" as const, description: "All data encrypted in transit with TLS 1.3." },
  { id: "pci", name: "PCI DSS", status: "compliant" as const, description: "Payment card data handled via Stripe — no card data stored on our servers." },
];

export default function CompliancePage() {
  const t = useTranslations("compliance");
  const { workspaceId } = useWorkspace();

  const consentOptions: { value: ConsentMode; label: string }[] = [
    { value: "one-party", label: t("consentOneParty") },
    { value: "two-party", label: t("consentTwoParty") },
  ];

  const [policies, setPolicies] = useState<RecordingPolicies>(getDefaultPolicies());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load policies from backend
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<RecordingPolicies>(
          `/api/workspace/compliance-settings?workspace_id=${workspaceId}`
        );
        if (!cancelled && data) {
          setPolicies({ ...getDefaultPolicies(), ...data });
        }
      } catch {
        // Keep defaults on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [workspaceId]);

  // Save policies to backend
  const handleSavePolicies = useCallback(async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await apiFetch("/api/workspace/compliance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policies),
      });
      toast.success(t("toast.changesSaved"));
    } catch {
      toast.error(t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [t, policies, workspaceId]);

  const handleExportReport = useCallback(() => {
    try {
      const csvHeaders = ["Setting", "Value"];
      const csvRows = [
        ["Consent Mode", policies.consentMode === "two-party" ? "Two-party (all parties notified)" : "One-party"],
        ["Retention Period (days)", String(policies.retentionDays)],
        ["PII Redaction Enabled", policies.piiRedaction ? "Yes" : "No"],
        ["Auto Transcribe Enabled", policies.autoTranscribe ? "Yes" : "No"],
        ["Consent Announcement", policies.consentAnnouncement],
      ];

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `compliance-report-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("toast.reportGenerated"));
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  }, [t, policies]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("title")}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{t("subtitle")}</p>
        </div>

        {/* Section 1: Compliance Standards */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">{t("statusSectionTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUILT_IN_STANDARDS.map((std) => (
              <div
                key={std.id}
                className="rounded-xl border p-4 flex flex-col bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-[var(--text-primary)]">{std.name}</span>
                  <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{std.description}</p>
                <span className="inline-flex self-start mt-3 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                  {t("statusCompliant")}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Recording & Data Policies */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">{t("recordingPoliciesTitle")}</h2>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("loading", { defaultValue: "Loading policies..." })}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("consentModeLabel")}</label>
                    <select
                      value={policies.consentMode}
                      onChange={(e) => setPolicies((p) => ({ ...p, consentMode: e.target.value as ConsentMode }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
                    >
                      {consentOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("retentionPeriodLabel")}</label>
                    <select
                      value={policies.retentionDays}
                      onChange={(e) => setPolicies((p) => ({ ...p, retentionDays: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
                    >
                      {RETENTION_OPTIONS.map((d) => (
                        <option key={d} value={d}>{t("retentionDaysOption", { days: String(d) })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{t("piiRedaction")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={policies.piiRedaction}
                      onClick={() => setPolicies((p) => ({ ...p, piiRedaction: !p.piiRedaction }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${policies.piiRedaction ? "bg-[var(--accent-primary)]" : "bg-[var(--border-medium)]"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--text-primary)] transition-transform ${policies.piiRedaction ? "left-5" : "left-1"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{t("autoTranscription")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={policies.autoTranscribe}
                      onClick={() => setPolicies((p) => ({ ...p, autoTranscribe: !p.autoTranscribe }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${policies.autoTranscribe ? "bg-[var(--accent-primary)]" : "bg-[var(--border-medium)]"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--text-primary)] transition-transform ${policies.autoTranscribe ? "left-5" : "left-1"}`} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("consentAnnouncementLabel")}</label>
                    <textarea
                      value={policies.consentAnnouncement}
                      onChange={(e) => setPolicies((p) => ({ ...p, consentAnnouncement: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)] resize-none"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSavePolicies}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportReport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t("exportReport")}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section 3: Audit Trail */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">{t("auditTrailTitle")}</h2>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[var(--text-tertiary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{t("auditTrailNotice")}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{t("auditTrailNoticeDesc")}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
