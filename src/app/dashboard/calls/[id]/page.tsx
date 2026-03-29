"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader } from "@/components/ui";
import { Phone, MessageSquare, Check, FileText } from "lucide-react";

const TABS = ["Overview", "Transcript"] as const;
type TabId = (typeof TABS)[number];

interface CallDetail {
  id: string;
  lead_id?: string | null;
  matched_lead_id?: string | null;
  outcome?: string | null;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  transcript_text?: string | null;
  summary?: string | null;
  recording_url?: string | null;
  analysis_outcome?: string | null;
  confidence?: number | null;
  matched_lead?: { id: string; name?: string | null; email?: string | null; company?: string | null } | null;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export default function CallRecordDetailPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.callDetail");
  const params = useParams();
  const searchParams = useSearchParams();
  const { workspaceId } = useWorkspace();
  const id = typeof params.id === "string" ? params.id : "";
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [tab, setTab] = useState<TabId>("Overview");
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabLabels = useMemo(
    () => ({ Overview: tc("tabOverview"), Transcript: tc("tabTranscript") } as Record<TabId, string>),
    [tc]
  );

  useEffect(() => {
    if (!id || !workspaceId) {
      if (!workspaceId) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/calls/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => setCall((data as { call?: CallDetail }).call ?? null))
      .catch(() => setError(tc("loadError")))
      .finally(() => setLoading(false));
  }, [id, workspaceId, tc]);

  const name = call?.matched_lead?.name || call?.matched_lead?.email || call?.matched_lead?.company || tc("callerFallback");

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={tc("loadingTitle")} subtitle={t("loadingMessage")} />
        <div className="h-32 rounded-lg skeleton-shimmer" style={{ background: "var(--bg-elevated)" }} />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.record.title")} subtitle={error ?? t("empty.recordNotFound")} />
        <Link href={`/dashboard/calls${q}`} className="text-sm" style={{ color: "var(--accent-primary)" }}>{t("backToCalls")}</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <PageHeader
          title={`${name} — ${call.analysis_outcome ?? call.outcome ?? tc("callFallback")}`}
          subtitle={`${formatTime(call.call_started_at)} · ${formatDuration(call.call_started_at, call.call_ended_at)}`}
        />
        <Link href={`/dashboard/activity${q}`} className="text-sm" style={{ color: "var(--text-muted)" }}>{t("backToActivity")}</Link>
      </div>

      <div className="flex gap-2 border-b mb-6" style={{ borderColor: "var(--border-default)" }}>
        {TABS.map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === tabId ? "var(--accent-primary)" : "transparent",
              color: tab === tabId ? "var(--accent-primary)" : "var(--text-muted)",
            }}
          >
            {tabLabels[tabId]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-6 space-y-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        {tab === "Overview" && (
          <>
            {call.summary && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{tc("aiSummary")}</h3>
                <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{call.summary}</p>
              </section>
            )}
            {call.recording_url && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{tc("recording")}</h3>
                <a
                  href={call.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--accent-primary)" }}
                >
                  <FileText className="w-4 h-4" /> {tc("playRecording")}
                </a>
              </section>
            )}
            {call.matched_lead && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{tc("contact")}</h3>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{call.matched_lead.name || "—"}</p>
                {call.matched_lead.email && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{call.matched_lead.email}</p>}
                {call.matched_lead.company && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{call.matched_lead.company}</p>}
              </section>
            )}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{tc("quickActions")}</h3>
              <div className="flex flex-wrap gap-2">
                {call.matched_lead_id && (
                  <Link
                    href={`/dashboard/record/lead/${call.matched_lead_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                  >
                    <Phone className="w-4 h-4" /> {tc("callBack")}
                  </Link>
                )}
                <Link
                  href={`/dashboard/messages${q}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                >
                  <MessageSquare className="w-4 h-4" /> {tc("text")}
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                >
                  <Check className="w-4 h-4" /> {tc("markDone")}
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "Transcript" && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{tc("transcript")}</h3>
            {call.transcript_text ? (
              <pre className="text-sm whitespace-pre-wrap font-sans p-4 rounded-lg" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {call.transcript_text}
              </pre>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tc("noTranscript")}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
