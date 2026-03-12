"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Phone, Clock, Headphones, MessageCircle, PhoneOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
  const { data, loading } = useActiveCalls(workspaceId ?? null);

  if (!workspaceId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <p className="text-zinc-400">Select a workspace to view live calls.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-12">
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
        <Link href="/app/calls" className="hover:text-white">Calls</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Live</span>
      </div>
      <h1 className="text-xl font-semibold text-white mb-1">Live call monitoring</h1>
      <p className="text-zinc-400 text-sm mb-6">Active calls across your workspace. Updates every 5 seconds.</p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Phone className="w-4 h-4" />
                In progress
              </div>
              <p className="text-2xl font-semibold text-white">{data?.in_progress ?? 0}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Clock className="w-4 h-4" />
                Waiting
              </div>
              <p className="text-2xl font-semibold text-white">{data?.waiting ?? 0}</p>
            </div>
          </div>

          {!data?.active?.length ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
              <Phone className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No active calls right now.</p>
              <p className="text-zinc-500 text-sm mt-1">New calls will appear here when they start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.active.map((call) => (
                <div
                  key={call.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {call.caller_name || call.caller_number || "Unknown caller"}
                        </p>
                        <p className="text-xs text-zinc-500">{call.agent_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <DurationTimer startedAt={call.call_started_at} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          title="Listen in (silent)"
                          onClick={() => toast.info("Listen in — coming soon")}
                        >
                          <Headphones className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          title="Whisper (to agent only)"
                          onClick={() => toast.info("Whisper — coming soon")}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          title="Barge in"
                          onClick={() => toast.info("Barge in — coming soon")}
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-zinc-500 mb-1">Live transcript</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {call.transcript_text?.trim() || call.summary?.trim() || "— No transcript yet —"}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">Sentiment: —</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="flex items-center gap-2 border border-red-500/50 text-red-400 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-500/10"
              onClick={() => toast.info("Emergency takeover — contact support for urgent escalation")}
            >
              <AlertTriangle className="w-4 h-4" />
              Emergency takeover
            </button>
          </div>
        </>
      )}
    </div>
  );
}
