"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Shield, ShieldCheck, Download } from "lucide-react";
type ComplianceStatus = "compliant" | "partial" | "non_compliant";

interface ComplianceStandard {
  id: string;
  name: string;
  status: ComplianceStatus;
  lastAuditDate: string | null;
  nextReviewDate: string | null;
  targetDate?: string | null;
  progressPercent?: number;
}

type ConsentMode = "one-party" | "two-party";

interface RecordingPolicies {
  consentMode: ConsentMode;
  retentionDays: number;
  piiRedaction: boolean;
  autoTranscribe: boolean;
  consentAnnouncement: string;
}

const RETENTION_OPTIONS = [30, 60, 90, 180, 365] as const;

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 10;

export default function CompliancePage() {
  const t = useTranslations("compliance");
  const consentOptions: { value: ConsentMode; label: string }[] = useMemo(
    () => [
      { value: "one-party", label: t("consentOneParty") },
      { value: "two-party", label: t("consentTwoParty") },
    ],
    [t],
  );
  const [standards] = useState<ComplianceStandard[]>([]);
  const [policies, setPolicies] = useState<RecordingPolicies>({
    consentMode: "two-party",
    retentionDays: 90,
    piiRedaction: true,
    autoTranscribe: true,
    consentAnnouncement: "This call may be recorded for quality assurance and training purposes.",
  });
  const [toast, setToast] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditUserFilter, setAuditUserFilter] = useState<string>("all");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleSavePolicies = useCallback(() => {
    setPolicies((prev) => ({ ...prev }));
    showToast(t("toast.changesSaved"));
  }, [showToast, t]);

  const handleExportReport = useCallback(() => {
    showToast(t("toast.reportGenerated"));
  }, [showToast, t]);

  const auditEntries = useMemo(() => [] as AuditLogEntry[], []);
  const uniqueUsers = useMemo(() => Array.from(new Set(auditEntries.map((e) => e.user))).sort(), [auditEntries]);
  const uniqueActions = useMemo(() => Array.from(new Set(auditEntries.map((e) => e.action))).sort(), [auditEntries]);

  const filteredAudit = useMemo(() => {
    let list = auditEntries;
    const q = auditSearch.trim().toLowerCase();
    if (q) list = list.filter((e) => e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q) || e.user.toLowerCase().includes(q));
    if (auditUserFilter !== "all") list = list.filter((e) => e.user === auditUserFilter);
    if (auditActionFilter !== "all") list = list.filter((e) => e.action === auditActionFilter);
    return list;
  }, [auditEntries, auditSearch, auditUserFilter, auditActionFilter]);

  const paginatedAudit = useMemo(() => {
    const start = auditPage * PAGE_SIZE;
    return filteredAudit.slice(start, start + PAGE_SIZE);
  }, [filteredAudit, auditPage]);

  const totalPages = Math.ceil(filteredAudit.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white">{t("title")}</h1>

        {/* Section 1: Compliance Status */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t("statusSectionTitle")}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {standards.map((std) => (
              <div
                key={std.id}
                className={`rounded-xl border p-4 flex flex-col ${
                  std.status === "compliant"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : std.status === "partial"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-medium text-white">{std.name}</span>
                  {std.status === "compliant" ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Shield className={`w-5 h-5 shrink-0 ${std.status === "partial" ? "text-amber-400" : "text-red-400"}`} />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      std.status === "compliant"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : std.status === "partial"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {std.status === "compliant" ? "Compliant" : std.status === "partial" ? "In Progress" : "Non-compliant"}
                  </span>
                </div>
                {std.lastAuditDate && (
                  <p className="text-xs text-zinc-500">{t("lastAudit")}: {formatDate(std.lastAuditDate)}</p>
                )}
                {std.nextReviewDate && (
                  <p className="text-xs text-zinc-500">{t("nextReview")}: {formatDate(std.nextReviewDate)}</p>
                )}
                {std.status === "partial" && std.targetDate && (
                  <p className="text-xs text-amber-300/90 mt-1">{t("target")}: {formatDate(std.targetDate)}</p>
                )}
                {std.status === "partial" && std.progressPercent != null && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-[var(--border-default)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/60"
                        style={{ width: `${std.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{t("percentComplete", { percent: String(std.progressPercent) })}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Recording & Data Policies */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t("recordingPoliciesTitle")}</h2>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-6 max-w-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("consentModeLabel")}</label>
                <select
                  value={policies.consentMode}
                  onChange={(e) => setPolicies((p) => ({ ...p, consentMode: e.target.value as ConsentMode }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white text-sm focus:outline-none focus:border-[var(--border-medium)]"
                >
                  {consentOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("retentionPeriodLabel")}</label>
                <select
                  value={policies.retentionDays}
                  onChange={(e) => setPolicies((p) => ({ ...p, retentionDays: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white text-sm focus:outline-none focus:border-[var(--border-medium)]"
                >
                  {RETENTION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{t("piiRedaction")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={policies.piiRedaction}
                  onClick={() => setPolicies((p) => ({ ...p, piiRedaction: !p.piiRedaction }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${policies.piiRedaction ? "bg-emerald-600" : "bg-[var(--border-medium)]"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${policies.piiRedaction ? "left-5" : "left-1"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{t("autoTranscription")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={policies.autoTranscribe}
                  onClick={() => setPolicies((p) => ({ ...p, autoTranscribe: !p.autoTranscribe }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${policies.autoTranscribe ? "bg-emerald-600" : "bg-[var(--border-medium)]"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${policies.autoTranscribe ? "left-5" : "left-1"}`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("consentAnnouncementLabel")}</label>
                <textarea
                  value={policies.consentAnnouncement}
                  onChange={(e) => setPolicies((p) => ({ ...p, consentAnnouncement: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] resize-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSavePolicies}
              className="mt-4 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
            >
              {t("saveChanges")}
            </button>
          </div>
        </section>

        {/* Section 3: Audit Trail */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{t("auditTrailTitle")}</h2>
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-zinc-300 hover:bg-[var(--bg-input)]"
            >
              <Download className="w-4 h-4" />
              Export Audit Report
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="search"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder={t("audit.searchPlaceholder")}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-[var(--border-medium)]"
            />
            <select
              value={auditUserFilter}
              onChange={(e) => { setAuditUserFilter(e.target.value); setAuditPage(0); }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-300 text-sm focus:outline-none focus:border-[var(--border-medium)]"
            >
              <option value="all">{t("audit.allUsers")}</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select
              value={auditActionFilter}
              onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(0); }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-300 text-sm focus:outline-none focus:border-[var(--border-medium)]"
            >
              <option value="all">{t("audit.allActions")}</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-input)]/80 border-b border-[var(--border-default)]">
                  <tr>
                    <th className="py-3 px-4 font-medium text-zinc-400">Timestamp</th>
                    <th className="py-3 px-4 font-medium text-zinc-400">User</th>
                    <th className="py-3 px-4 font-medium text-zinc-400">Action</th>
                    <th className="py-3 px-4 font-medium text-zinc-400">Resource</th>
                    <th className="py-3 px-4 font-medium text-zinc-400">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAudit.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]">
                      <td className="py-3 px-4 text-zinc-500 text-xs">{formatDateTime(row.timestamp)}</td>
                      <td className="py-3 px-4 text-zinc-300">{row.user}</td>
                      <td className="py-3 px-4 text-white">{row.action}</td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">{row.resource}</td>
                      <td className="py-3 px-4 font-mono text-zinc-500 text-xs">{row.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-[var(--border-default)]">
              {paginatedAudit.map((row) => (
                <div key={row.id} className="p-4">
                  <p className="text-xs text-zinc-500">{formatDateTime(row.timestamp)}</p>
                  <p className="text-sm font-medium text-white mt-0.5">{row.action}</p>
                  <p className="text-xs text-zinc-400">{row.user} · {row.resource}</p>
                  <p className="font-mono text-[10px] text-zinc-500 mt-1">{row.ipAddress}</p>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-zinc-500">
                {t("audit.showing", {
                  from: String(auditPage * PAGE_SIZE + 1),
                  to: String(Math.min((auditPage + 1) * PAGE_SIZE, filteredAudit.length)),
                  total: String(filteredAudit.length),
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                  disabled={auditPage === 0}
                  className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-40 border border-[var(--border-medium)]"
                >
                  {t("audit.previous")}
                </button>
                <button
                  type="button"
                  onClick={() => setAuditPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={auditPage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-40 border border-[var(--border-medium)]"
                >
                  {t("audit.next")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-medium)] text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
