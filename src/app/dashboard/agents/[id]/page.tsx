"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms.state");
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { workspaceId } = useWorkspace();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCalling, setTestCalling] = useState(false);
  const [testPhone, setTestPhone] = useState("");
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
      const r = await fetch(`/api/agents/${id}/test-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone_number: testPhone.trim() || undefined }),
      });
      const data = await r.json();
      if (r.ok && data?.ok) alert(data.message ?? t("agentDetail.testCallRequested"));
      else if (!r.ok) alert(data?.error ?? t("agentDetail.testCallFailed"));
    } finally {
      setTestCalling(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.agent.title")} subtitle={t("pages.agent.subtitle")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} />
      </div>
    );
  }

  if (loading || !agent) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.agent.title")} subtitle={t("pages.agent.subtitle")} />
        <LoadingState message={loading ? t("loadingMessage") : t("agentDetail.agentNotFound")} className="min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <PageHeader title={agent.name} subtitle={`${agent.purpose} · ${isActive ? t("agentDetail.activeLabel") : t("agentDetail.paused")}`} />
        <Link href="/dashboard/agents" className="text-sm" style={{ color: "var(--text-muted)" }}>{t("agentDetail.backToAgents")}</Link>
      </div>
      <div className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{t("agentDetail.greetingLabel")}</label>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{t("agentDetail.voiceIdLabel")}</label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder={t("agentDetail.voicePlaceholder")}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{t("agentDetail.personalityLabel")}</label>
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
          <label htmlFor="active" className="text-sm" style={{ color: "var(--text-primary)" }}>{t("agentDetail.activeLabel")}</label>
        </div>
        {agent.stats && typeof (agent.stats as { totalCalls?: number }).totalCalls === "number" && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{t("agentDetail.statsLabel")}</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{(agent.stats as { totalCalls: number }).totalCalls} {t("agentDetail.callsSuffix")}</p>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{t("agentDetail.testCallOptionalLabel")}</label>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder={t("agentDetail.testPhonePlaceholder")}
            className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {saving ? tForms("saving") : tCommon("save")}
          </button>
          <button type="button" onClick={testCall} disabled={testCalling} className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }} aria-label={t("agentDetail.testCall")}>{testCalling ? t("agentDetail.calling") : t("agentDetail.testCall")}</button>
          <Link
            href="/dashboard/agents"
            className="inline-block px-4 py-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {tCommon("cancel")}
          </Link>
        </div>
      </div>
    </div>
  );
}
