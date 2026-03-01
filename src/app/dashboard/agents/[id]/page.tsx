"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState, LoadingState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Agent {
  id: string;
  name: string;
  voice_id: string | null;
  personality: string;
  purpose: string;
  greeting: string;
  is_active: boolean;
  stats?: { totalCalls?: number; appointmentsBooked?: number };
}

const PERSONALITIES = ["friendly", "professional", "casual", "empathetic"];

export default function AgentDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { workspaceId } = useWorkspace();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCalling, setTestCalling] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [personality, setPersonality] = useState("professional");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!id || !workspaceId) {
      setAgent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithFallback<Agent>(`/api/agents/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((res) => {
      if (res.data) {
        setAgent(res.data);
        setGreeting(res.data.greeting ?? "");
        setVoiceId(res.data.voice_id ?? "");
        setPersonality(res.data.personality ?? "professional");
        setIsActive(res.data.is_active ?? true);
      } else setAgent(null);
      setLoading(false);
    });
  }, [id, workspaceId]);

  const save = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ greeting: greeting.trim(), voice_id: voiceId.trim() || null, personality, is_active: isActive }),
      });
      const data = await r.json();
      if (r.ok && data) setAgent(data);
    } finally {
      setSaving(false);
    }
  };

  const testCall = async () => {
    if (!id || testCalling) return;
    setTestCalling(true);
    try {
      const r = await fetch(`/api/agents/${id}/test-call`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok && data?.ok) alert(data.message ?? "Test call requested.");
    } finally {
      setTestCalling(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Agent" subtitle="Edit agent." />
        <EmptyState icon="watch" title="Select a context." />
      </div>
    );
  }

  if (loading || !agent) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Agent" subtitle="Edit agent." />
        <LoadingState message={loading ? "Loading." : "Agent not found."} className="min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <PageHeader title={agent.name} subtitle={`${agent.purpose} · ${isActive ? "Active" : "Paused"}`} />
        <Link href="/dashboard/agents" className="text-sm" style={{ color: "var(--text-muted)" }}>Back to agents</Link>
      </div>
      <div className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Greeting</label>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Voice ID</label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="Default"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Personality</label>
          <select
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          >
            {PERSONALITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <label htmlFor="active" className="text-sm" style={{ color: "var(--text-primary)" }}>Active</label>
        </div>
        {agent.stats && typeof (agent.stats as { totalCalls?: number }).totalCalls === "number" && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Stats</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{(agent.stats as { totalCalls: number }).totalCalls} calls</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--text-inverse)" }}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={testCall} disabled={testCalling} className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} aria-label="Request test call">{testCalling ? "Requesting…" : "Test call"}</button>
          <Link href="/dashboard/agents" className="inline-block px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</Link>
        </div>
      </div>
    </div>
  );
}
