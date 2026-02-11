"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ConversationProgressIndicator } from "@/components/ConversationProgressIndicator";
import { leadStateToProgress } from "@/lib/progress/conversation-progress";

interface Lead {
  id: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  state: string;
  last_activity_at: string;
  deal_id?: string;
  value_cents?: number;
}

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  BOOKED: "Booked",
  SHOWED: "Showed",
  WON: "Won",
  LOST: "Lost",
  REACTIVATE: "Reactivate",
  RETAIN: "Retain",
  CLOSED: "Closed",
};

export default function LeadsPage() {
  const { workspaceId } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setLeads([]);
      return;
    }
    setLoading(true);
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select an account.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Leads</h1>
        <p className="text-stone-400 mt-1">
          Prospects and next actions
        </p>
      </header>

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="p-8 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
          <p className="text-stone-400">No leads yet.</p>
          <p className="text-stone-500 text-sm mt-1">Connect a lead source in Settings to start.</p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-block px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
          >
            Connect lead source
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/leads/${l.id}`}
              className="block p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-stone-700 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium text-stone-200">{l.name || l.email || l.company || "Unknown"}</p>
                    <ConversationProgressIndicator stage={leadStateToProgress(l.state)} compact />
                  </div>
                  <p className="text-sm text-stone-500">{l.company ?? l.email ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    l.state === "WON" ? "bg-emerald-900/50 text-emerald-400" :
                    l.state === "LOST" ? "bg-red-900/50 text-red-400" :
                    l.state === "BOOKED" || l.state === "SHOWED" ? "bg-amber-900/50 text-amber-400" :
                    "bg-stone-700 text-stone-400"
                  }`}>
                    {STAGE_LABELS[l.state] ?? l.state}
                  </span>
                  <span className="text-xs text-stone-500">
                    {l.last_activity_at ? new Date(l.last_activity_at).toLocaleDateString() : "—"}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-medium">
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
