"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pause, Play } from "lucide-react";

type Sequence = { id: string; name: string; trigger_type?: string; is_active?: boolean };

export default function AppFollowUpsPage() {
  const { workspaceId } = useWorkspace();
  const [tab, setTab] = useState<"templates" | "active">("templates");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (active) setLoading(true);
    });
    fetch(`/api/sequences?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { sequences: [] }))
      .then((d: { sequences?: Sequence[] }) => {
        if (active) setSequences(d.sequences ?? []);
      })
      .catch(() => {
        if (active) setSequences([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspaceId]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Follow-ups</h1>
        <Link href="/app/campaigns">
          <Button variant="primary" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            New sequence
          </Button>
        </Link>
      </div>
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg ${tab === "templates" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg ${tab === "active" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
        >
          Active enrollments
        </button>
      </div>
      {loading ? (
        <div className="animate-pulse h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
      ) : tab === "templates" ? (
        sequences.length === 0 ? (
          <EmptyState
            title="No follow-up templates yet"
            description="Create a sequence to automate SMS, email, and call steps after missed calls or bookings."
          />
        ) : (
          <ul className="space-y-3">
            {sequences.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.trigger_type ?? "manual"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" aria-label="Pause">
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Resume">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EmptyState
          title="No active enrollments"
          description="When contacts enter a sequence, they appear here. Trigger from a call outcome or contact record."
        />
      )}
    </div>
  );
}
