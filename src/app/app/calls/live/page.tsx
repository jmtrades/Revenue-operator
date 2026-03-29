"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Phone, Clock, Headphones, MessageCircle, PhoneOff, AlertTriangle, MicOff, Mic, PauseCircle, PlayCircle, PhoneForwarded } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Skeleton } from "@/components/ui/Skeleton";

type ActiveCall = {
  id: string;
  call_started_at: string | null;
  transcript_text: string | null;
  summary: string | null;
  caller_number: string | null;
  caller_name: string | null;
  agent_name: string;
  sentiment?: "positive" | "neutral" | "negative" | null;
  call_control_id?: string | null;
};

function useActiveCalls(workspaceId: string | null) {
  const [data, setData] = useState<{ active: ActiveCall[]; in_progress: number; waiting: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchActive = useCallback(() => {
    if (!workspaceId) return;
    fetch(`/api/calls/active?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setData({ active: d.active ?? [], in_progress: d.in_progress ?? 0, waiting: d.waiting ?? 0 });
          setError(false);
          setLastRefreshed(new Date());
        }
      })
      .catch(() => {
        setError(true);
        setData({ active: [], in_progress: 0, waiting: 0 });
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchActive();
    if (!workspaceId) return;
    const interval = setInterval(fetchActive, 5000);
    return () => clearInterval(interval);
  }, [workspaceId, fetchActive]);

  return { data, loading, error, lastRefreshed, refetch: fetchActive };
}

function DurationTimer({ startedAt }: { startedAt: string | null }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return <span>{m}:{s.toString().padStart(2, "0")}</span>;
}

function SentimentBadge({ sentiment }: { sentiment?: "positive" | "neutral" | "negative" | null }) {
  if (!sentiment) return <span className="text-xs text-[var(--text-tertiary)]">Analyzing…</span>;
  const config = {
    positive: { label: "Positive", color: "text-[var(--accent-primary)]", bg: "bg-[color:var(--accent-primary)]/10" },
    neutral: { label: "Neutral", color: "text-[var(--text-secondary)]", bg: "bg-[var(--bg-inset)]" },
    negative: { label: "Negative", color: "text-[var(--accent-danger,#ef4444)]", bg: "bg-[color:var(--accent-danger,#ef4444)]/10" },
  }[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function CallsLivePage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations();
  const { data, loading, error, lastRefreshed } = useActiveCalls(workspaceId ?? null);
  const [mutedCalls, setMutedCalls] = useState<Set<string>>(new Set());
  const [heldCalls, setHeldCalls] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCallAction = async (callId: string, action: "mute" | "unmute" | "hold" | "unhold" | "transfer") => {
    setActionLoading(`${callId}-${action}`);
    try {
      const res = await fetch(`/api/calls/${callId}/control`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to update call");
        return;
      }
      if (action === "mute") setMutedCalls((prev) => new Set(prev).add(callId));
      if (action === "unmute") setMutedCalls((prev) => { const next = new Set(prev); next.delete(callId); return next; });
      if (action === "hold") setHeldCalls((prev) => new Set(prev).add(callId));
      if (action === "unhold") setHeldCalls((prev) => { const next = new Set(prev); next.delete(callId); return next; });
      if (action === "transfer") toast.success("Call transferred to fallback number");
    } catch (err) {
      toast.error("Failed to update call");
    } finally {
      setActionLoading(null);
    }
  };

  if (!workspaceId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <p className="text-[var(--text-tertiary)]">{t("calls.live.selectWorkspace", { defaultValue: "Select a workspace to view live calls." })}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-2">
        <Link href="/app/calls" className="hover:text-[var(--text-primary)]">{t("calls.live.breadcrumbCalls", { defaultValue: "Calls" })}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[var(--text-primary)]">{t("calls.live.breadcrumbLive", { defaultValue: "Live" })}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("calls.live.pageTitle", { defaultValue: "Live call monitoring" })}</h1>
        {!loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]" />
            </span>
            {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : "Connecting…"}
          </div>
        )}
      </div>
      <p className="text-[var(--text-secondary)] text-[13px] mt-1.5 leading-relaxed mb-6">{t("calls.live.pageSubtitle", { defaultValue: "Active calls across your workspace. Updates every 5 seconds." })}</p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[color:var(--accent-danger,#ef4444)]/10 border border-[color:var(--accent-danger,#ef4444)]/20 text-sm text-[var(--accent-danger,#ef4444)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Could not load live call data. Retrying automatically…
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Phone className="w-4 h-4" />
                {t("calls.live.inProgress", { defaultValue: "In progress" })}
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{data?.in_progress ?? 0}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Clock className="w-4 h-4" />
                {t("calls.live.waiting", { defaultValue: "Waiting" })}
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{data?.waiting ?? 0}</p>
            </div>
          </div>

          {!data?.active?.length ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
              <Phone className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-tertiary)]">{t("calls.live.noActiveCalls", { defaultValue: "No active calls right now." })}</p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">{t("calls.live.noActiveCallsHint", { defaultValue: "New calls will appear here when they start." })}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.active.map((call) => {
                const isMuted = mutedCalls.has(call.id);
                const isHeld = heldCalls.has(call.id);
                return (
                  <div
                    key={call.id}
                    className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color:var(--accent-primary)]/20 border border-[color:var(--accent-primary)]/40 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {call.caller_name || call.caller_number || t("calls.live.unknownCaller", { defaultValue: "Unknown caller" })}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">{call.agent_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-sm">
                          <Clock className="w-4 h-4" />
                          <DurationTimer startedAt={call.call_started_at} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{t("calls.live.liveTranscript", { defaultValue: "Live transcript" })}</p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {call.transcript_text?.trim() || call.summary?.trim() || t("calls.live.noTranscript", { defaultValue: "— No transcript yet —" })}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <SentimentBadge sentiment={call.sentiment} />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCallAction(call.id, isMuted ? "unmute" : "mute")}
                          disabled={actionLoading === `${call.id}-mute` || actionLoading === `${call.id}-unmute`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            isMuted
                              ? "border-[color:var(--accent-warning,#f59e0b)]/30 text-[var(--accent-warning,#f59e0b)] bg-[color:var(--accent-warning,#f59e0b)]/10 hover:bg-[color:var(--accent-warning,#f59e0b)]/20"
                              : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                          }`}
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {isMuted ? "Unmute" : "Mute"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCallAction(call.id, isHeld ? "unhold" : "hold")}
                          disabled={actionLoading === `${call.id}-hold` || actionLoading === `${call.id}-unhold`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            isHeld
                              ? "border-[var(--accent-primary)]/30 text-[var(--accent-primary)] bg-[color:var(--accent-primary)]/10 hover:bg-[color:var(--accent-primary)]/20"
                              : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                          }`}
                          title={isHeld ? "Resume" : "Hold"}
                        >
                          {isHeld ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                          {isHeld ? "Resume" : "Hold"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCallAction(call.id, "transfer")}
                          disabled={actionLoading === `${call.id}-transfer`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors disabled:opacity-50"
                          title="Transfer call"
                        >
                          <PhoneForwarded className="w-3.5 h-3.5" />
                          Transfer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
