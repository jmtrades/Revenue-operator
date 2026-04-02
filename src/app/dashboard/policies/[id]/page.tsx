"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";

interface Policy {
  id: string;
  domain_type: string;
  jurisdiction: string;
  channel: string;
  intent_type: string;
  template_id: string | null;
  required_disclaimers: string[];
  forbidden_phrases: string[];
  required_phrases: string[];
  approval_mode: string;
}

export default function PolicyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("dashboard");
  const tPolicy = useTranslations("dashboard.policyEdit");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms.state");
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    template_id: "",
    approval_mode: "autopilot",
    required_disclaimers: "",
    forbidden_phrases: "",
    required_phrases: "",
  });
  const { workspaceId } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    params.then((p) => setPolicyId(p.id));
  }, [params]);

  useEffect(() => {
    if (!workspaceId || !policyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/enterprise/policies/${policyId}?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.policy) {
          const p = d.policy as Policy;
          setPolicy(p);
          setForm({
            template_id: p.template_id ?? "",
            approval_mode: p.approval_mode ?? "autopilot",
            required_disclaimers: Array.isArray(p.required_disclaimers) ? p.required_disclaimers.join("\n") : "",
            forbidden_phrases: Array.isArray(p.forbidden_phrases) ? p.forbidden_phrases.join("\n") : "",
            required_phrases: Array.isArray(p.required_phrases) ? p.required_phrases.join("\n") : "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, policyId]);

  const handleSave = async () => {
    if (!workspaceId || !policyId || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/enterprise/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          template_id: form.template_id || null,
          approval_mode: form.approval_mode,
          required_disclaimers: form.required_disclaimers.split("\n").map((s) => s.trim()).filter(Boolean),
          forbidden_phrases: form.forbidden_phrases.split("\n").map((s) => s.trim()).filter(Boolean),
          required_phrases: form.required_phrases.split("\n").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = await r.json();
      if (json.ok) {
        const q = searchParams.toString();
        router.replace(`/dashboard/policies${q ? `?${q}` : ""}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{tPolicy("selectWorkspace")}</p>
      </Shell>
    );
  }

  if (loading || !policy) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("loadingMessage")}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-lg font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)" }}>
          {tPolicy("policyTitle", {
            domain: policy.domain_type,
            jurisdiction: policy.jurisdiction,
            channel: policy.channel,
            intent: policy.intent_type,
          })}
        </h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{tPolicy("templateIdLabel")}</label>
            <input
              type="text"
              value={form.template_id}
              onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{tPolicy("approvalModeLabel")}</label>
            <select
              value={form.approval_mode}
              onChange={(e) => setForm((f) => ({ ...f, approval_mode: e.target.value }))}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-primary)" }}
            >
              <option value="autopilot">autopilot</option>
              <option value="preview_required">preview_required</option>
              <option value="approval_required">approval_required</option>
              <option value="locked_script">locked_script</option>
              <option value="jurisdiction_locked">jurisdiction_locked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Required disclaimers (one per line)</label>
            <textarea
              value={form.required_disclaimers}
              onChange={(e) => setForm((f) => ({ ...f, required_disclaimers: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{tPolicy("forbiddenPhrasesLabel")}</label>
            <textarea
              value={form.forbidden_phrases}
              onChange={(e) => setForm((f) => ({ ...f, forbidden_phrases: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{tPolicy("requiredPhrasesLabel")}</label>
            <textarea
              value={form.required_phrases}
              onChange={(e) => setForm((f) => ({ ...f, required_phrases: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ background: "var(--meaning-blue)", color: "#fff" }}
          >
            {saving ? tForms("saving") : tCommon("save")}
          </button>
        </div>
      </div>
    </Shell>
  );
}
