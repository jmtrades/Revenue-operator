"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ProofDrawer } from "@/components/ProofDrawer";

interface Conversation {
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  opt_out: boolean;
}

export default function ConversationsPage() {
  const { workspaceId } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofLeadId, setProofLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setConversations([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/conversations?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setConversations(d.conversations ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Select a workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-50">Conversations</h1>
        <p className="text-stone-400 mt-1">Leads with conversation history</p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <p className="text-stone-500">No conversations</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.lead_id}
                className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-stone-200">{c.lead_name ?? c.lead_email ?? "—"}</p>
                  <p className="text-sm text-stone-500">{c.company ?? c.lead_email ?? ""}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-stone-800 text-stone-400">
                    {c.state}
                  </span>
                  {c.opt_out && (
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-300">Opted out</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {new Date(c.last_activity_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setProofLeadId(c.lead_id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-sm font-medium"
                  >
                    Proof
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ProofDrawer
        leadId={proofLeadId ?? ""}
        isOpen={!!proofLeadId}
        onClose={() => setProofLeadId(null)}
      />
    </div>
  );
}
