"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import {
  ArrowLeft,
  PhoneCall,
  CalendarClock,
  Clock3,
  Play,
  Pause,
  Download,
  Bot,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;

function formatPlaybackTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CallRecordingPlayer({ src }: { src: string }) {
  const t = useTranslations("calls.detail");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onDurationChange = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    const value = Number(e.target.value);
    if (el && Number.isFinite(value)) {
      el.currentTime = value;
      setCurrentTime(value);
    }
  };

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={seek}
            className="w-full h-2 rounded-full appearance-none bg-[var(--border-default)] accent-[var(--accent-primary)] cursor-pointer"
            aria-label={t("seekAria")}
          />
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{formatPlaybackTime(currentTime)}</span>
            <span>{formatPlaybackTime(duration)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-[var(--text-secondary)]">{t("playbackSpeed")}</span>
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`text-xs px-2 py-1 rounded ${speed === s ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--border-default)]"}`}
          >
            {s}x
          </button>
        ))}
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Download className="h-3.5 w-3.5" />
          {t("download")}
        </a>
      </div>
    </div>
  );
}

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
  analysis?: {
    outcome?: string;
    sentiment?: string;
    summary?: string;
    next_best_action?: string;
    followup_plan?: string;
  } | null;
  analysis_source?: string | null;
  confidence?: number | null;
  matched_lead?: {
    id: string;
    name?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
  utterances?: Array<{
    id: string;
    speaker: "caller" | "agent" | string;
    text: string;
    start_time?: number | null;
  }> | null;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

const CALL_DETAIL_SNAPSHOT_PREFIX = "rt_call_detail_snapshot:";

function readCallDetailSnapshot(workspaceId: string, callId: string): CallDetail | null {
  if (typeof window === "undefined" || !workspaceId || !callId) return null;
  const key = `${CALL_DETAIL_SNAPSHOT_PREFIX}${workspaceId}:${callId}`;
  try {
    const raw = safeGetItem(key);
    return raw ? (JSON.parse(raw) as CallDetail) : null;
  } catch {
    safeRemoveItem(key);
    return null;
  }
}

function persistCallDetailSnapshot(
  workspaceId: string,
  callId: string,
  detail: CallDetail,
) {
  if (typeof window === "undefined" || !workspaceId || !callId) return;
  safeSetItem(`${CALL_DETAIL_SNAPSHOT_PREFIX}${workspaceId}:${callId}`, JSON.stringify(detail));
}

export default function AppCallDetailPage() {
  const t = useTranslations("calls.detail");
  const params = useParams();
  const { workspaceId } = useWorkspace();
  const id = typeof params.id === "string" ? params.id : "";
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialCall = readCallDetailSnapshot(snapshotWorkspaceId, id);
  const [call, setCall] = useState<CallDetail | null>(initialCall);
  const [loading, setLoading] = useState(initialCall == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !workspaceId) return;
    let cancelled = false;
    fetch(`/api/calls/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const nextCall = (data as { call?: CallDetail }).call ?? null;
        setError(null);
        setCall(nextCall);
        if (nextCall) {
          persistCallDetailSnapshot(workspaceId, id, nextCall);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("calls.detail.notFound"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, workspaceId, t]);

  useEffect(() => {
    if (call) document.title = t("calls.detail.pageTitle");
    return () => { document.title = ""; };
  }, [call, t]);

  const name =
    call?.matched_lead?.name ||
    call?.matched_lead?.email ||
    call?.matched_lead?.company ||
    t("calls.defaultCaller");
  const summaryText = call?.summary || call?.analysis?.summary || null;
  const followupPlan = call?.analysis?.followup_plan || call?.analysis?.next_best_action || null;
  const sentiment = call?.analysis?.sentiment || null;
  const utterances = call?.utterances ?? null;

  const formatSpeaker = (speaker: string): string => {
    if (speaker === "agent") return t("calls.detail.speakerAgent");
    if (speaker === "caller") return t("calls.defaultCaller");
    return speaker;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-[var(--bg-inset)] rounded" />
        <div className="h-8 w-64 bg-[var(--bg-inset)] rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[var(--bg-inset)] rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-[var(--bg-inset)] rounded-xl" />
        <div className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm text-[var(--text-tertiary)]">{t("calls.detail.backToCalls")}</span>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => history.back()}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <p className="text-sm text-[var(--text-tertiary)]">
            {error ?? t("calls.detail.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: t("nav.calls"), href: "/app/calls" },
          { label: t("calls.detail.breadcrumbDetail") },
        ]}
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
            <PhoneCall className="w-5 h-5 text-[var(--text-secondary)]" />
            {name}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)] flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              {formatTime(call.call_started_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="w-4 h-4" />
              {formatDuration(call.call_started_at, call.call_ended_at)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
          {call.outcome && (
            <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-3 py-1">
              {t("outcome", { defaultValue: "Outcome:" })} {call.outcome}
            </span>
          )}
          {call.analysis_outcome && (
            <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-3 py-1">
              {t("ai", { defaultValue: "AI:" })} {call.analysis_outcome}
            </span>
          )}
          {sentiment && (
            <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-3 py-1">
              {t("sentiment", { defaultValue: "Sentiment:" })} {sentiment}
            </span>
          )}
        </div>
      </header>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-5">
        {call.recording_url && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
              {t("recording", { defaultValue: "Recording" })}
            </h2>
            <CallRecordingPlayer src={call.recording_url} />
          </section>
        )}

        {summaryText && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
              {t("callSummary", { defaultValue: "Call summary" })}
            </h2>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {summaryText}
            </p>
          </section>
        )}

        {followupPlan && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
              {t("recommendedFollowUp", { defaultValue: "Recommended follow-up" })}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{followupPlan}</p>
            {(call.lead_id ?? call.matched_lead?.id) && (
              <Link
                href="/app/inbox"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Follow up in inbox →
              </Link>
            )}
          </section>
        )}

        {call.matched_lead && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
              {t("contact", { defaultValue: "Contact" })}
            </h2>
            <p className="text-sm text-[var(--text-primary)]">
              {call.matched_lead.name || "—"}
            </p>
            {call.matched_lead.email && (
              <p className="text-xs text-[var(--text-tertiary)]">{call.matched_lead.email}</p>
            )}
            {call.matched_lead.company && (
              <p className="text-xs text-[var(--text-tertiary)]">
                {call.matched_lead.company}
              </p>
            )}
            {(call.lead_id ?? call.matched_lead?.id) && (
              <Link
                href="/app/leads"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                View lead →
              </Link>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
            {t("transcript", { defaultValue: "Transcript" })}
          </h2>
          {utterances && utterances.length > 0 ? (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {utterances.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-xl mb-1",
                    u.speaker === "agent" ? "bg-[var(--bg-inset)]" : "bg-[var(--bg-inset)]",
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {u.speaker === "agent" ? (
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-inset)] flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-inset)] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          u.speaker === "agent" ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]",
                        )}
                      >
                        {formatSpeaker(u.speaker)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                      {u.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : call.transcript_text ? (
            <pre className="text-sm whitespace-pre-wrap font-sans p-4 rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)] leading-relaxed">
              {call.transcript_text}
            </pre>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No transcript available for this call.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

