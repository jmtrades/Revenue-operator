"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import {
  ArrowLeft,
  PhoneCall,
  CalendarClock,
  Clock3,
} from "lucide-react";
import Link from "next/link";

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
  matched_lead?: {
    id: string;
    name?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
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

export default function AppCallDetailPage() {
  const params = useParams();
  const { workspaceId } = useWorkspace();
  const id = typeof params.id === "string" ? params.id : "";
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !workspaceId) {
      if (!workspaceId) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/calls/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) =>
        setCall((data as { call?: CallDetail }).call ?? null),
      )
      .catch(() => setError("Could not load this call."))
      .finally(() => setLoading(false));
  }, [id, workspaceId]);

  const name =
    call?.matched_lead?.name ||
    call?.matched_lead?.email ||
    call?.matched_lead?.company ||
    "Caller";

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-400">Back to calls</span>
        </div>
        <div className="h-32 rounded-lg animate-pulse bg-zinc-900" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => history.back()}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <p className="text-sm text-zinc-400">
            {error ?? "This call could not be found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/app/calls"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to calls
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2 flex-wrap">
            <PhoneCall className="w-5 h-5 text-zinc-500" />
            {name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 flex items-center gap-3 flex-wrap">
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
        <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
          {call.outcome && (
            <span className="inline-flex items-center rounded-full border border-zinc-700 px-3 py-1">
              Outcome: {call.outcome}
            </span>
          )}
          {call.analysis_outcome && (
            <span className="inline-flex items-center rounded-full border border-zinc-700 px-3 py-1">
              AI: {call.analysis_outcome}
            </span>
          )}
        </div>
      </header>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-5">
        {call.summary && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Call summary
            </h2>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {call.summary}
            </p>
          </section>
        )}

        {call.matched_lead && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Contact
            </h2>
            <p className="text-sm text-zinc-100">
              {call.matched_lead.name || "—"}
            </p>
            {call.matched_lead.email && (
              <p className="text-xs text-zinc-400">{call.matched_lead.email}</p>
            )}
            {call.matched_lead.company && (
              <p className="text-xs text-zinc-400">
                {call.matched_lead.company}
              </p>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Transcript
          </h2>
          {call.transcript_text ? (
            <pre className="text-sm whitespace-pre-wrap font-sans p-4 rounded-xl bg-zinc-900 text-zinc-300 leading-relaxed">
              {call.transcript_text}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">
              No transcript available for this call.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

