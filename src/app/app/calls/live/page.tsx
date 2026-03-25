"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Phone, Clock, Headphones, MessageCircle, PhoneOff, AlertTriangle } from "lucide-react";
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
};

function useActiveCalls(workspaceId: string | null) {
  const [data, setData] = useState<{ active: ActiveCall[]; in_progress: number; waiting: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(() => {
    if (!workspaceId) return;
    fetch(`/api/calls/active?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData({ active: d.active ?? [], in_progress: d.in_progress ?? 0, waiting: d.waiting ?? 0 });
      })
      .catch(() => setData({ active: [], in_progress: 0, waiting: 0 }))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchActive();
    if (!workspaceId) return;
    const interval = setInterval(fetchActive, 5000);
    return () => clearInterval(interval);
  }, [workspaceId, fetchActive]);

  return { data, loading, refetch: fetchActive };
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

export default function CallsLivePage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations();
  const { data, loading } = useActiveCalls(workspaceId ?? null);

  if (!workspaceId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <p className="text-[var(--text-tertiary)]">{t("calls.live.selectWorkspace")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-2">
        <Link href="/app/calls" className="hover:text-[var(--text-primary)]">{t("calls.live.breadcrumbCalls")}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[var(--text-primary)]">{t("calls.live.breadcrumbLive")}</span>
      </div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">{t("calls.live.pageTitle")}</h1>
      <p className="text-[var(--text-tertiary)] text-sm mb-6">{t("calls.live.pageSubtitle")}</p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Phone className="w-4 h-4" />
                {t("calls.live.inProgress")}
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{data?.in_progress ?? 0}</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs mb-1">
                <Clock className="w-4 h-4" />
                {t("calls.live.waiting")}
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{data?.waiting ?? 0}</p>
            </div>
          </div>

          {!data?.active?.length ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 text-center">
              <Phone className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-tertiary)]">{t("calls.live.noActiveCalls")}</p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">{t("calls.live.noActiveCallsHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.active.map((call) => (
                <div
                  key={call.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {call.caller_name || call.caller_number || t("calls.live.unknownCaller")}
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
                    <p className="text-xs text-[var(--text-secondary)] mb-1">{t("calls.live.liveTranscript")}</p>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                      {call.transcript_text?.trim() || call.summary?.trim() || t("calls.live.noTranscript")}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">{t("calls.live.sentiment")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 px-4 py-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)]">
            Real-time call controls are coming soon
          </div>
        </>
      )}
    </div>
  );
}
