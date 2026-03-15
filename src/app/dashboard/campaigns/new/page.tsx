"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

const CAMPAIGN_TYPE_VALUES = ["lead_followup", "appointment_reminder", "reactivation", "custom"] as const;
const AUDIENCE_OPTIONS = [
  { value: "all" as const, target_filter: {} },
  { value: "new" as const, target_filter: { state: "NEW" } },
  { value: "engaged" as const, target_filter: { min_activity_days: 7 } },
];
const STEP_KEYS = ["stepName", "stepType", "stepAudience", "stepReview"] as const;

export default function NewCampaignPage() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("dashboard.newCampaign");
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof CAMPAIGN_TYPE_VALUES[number]>("lead_followup");
  const [audience, setAudience] = useState<"all" | "new" | "engaged">("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepLabels = useMemo(() => STEP_KEYS.map((k) => tn(k)), [tn]);
  const targetFilter = AUDIENCE_OPTIONS.find((a) => a.value === audience)?.target_filter ?? {};
  const canNext = step === 1 ? name.trim().length > 0 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => Math.min(4, s + 1));
      setError(null);
      return;
    }
    if (!workspaceId || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), type, target_filter: Object.keys(targetFilter).length > 0 ? targetFilter : undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "CREATE_FAILED");
      router.push("/dashboard/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CREATE_FAILED");
    } finally {
      setSubmitting(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.newCampaign.title")} subtitle={t("pages.newCampaign.subtitleShort")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} subtitle={t("empty.chooseWorkspaceFirst")} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title={t("pages.newCampaign.title")} subtitle={t("pages.newCampaign.subtitle")} />
      <div className="flex gap-2 mb-6">
        {stepLabels.map((label, i) => (
          <span
            key={STEP_KEYS[i]}
            className="text-xs font-medium px-2 py-1 rounded"
            style={{
              color: i + 1 === step ? "var(--accent-primary)" : "var(--text-tertiary)",
              background: i + 1 === step ? "var(--accent-primary-subtle)" : "transparent",
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{tn("campaignNameLabel")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newCampaignPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
              required
            />
          </div>
        )}
        {step === 2 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{tn("typeLabel")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
            >
              {CAMPAIGN_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>{tn(`types.${v}`)}</option>
              ))}
            </select>
          </div>
        )}
        {step === 3 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{tn("audienceLabel")}</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{tn(`audience.${a.value}`)}</option>
              ))}
            </select>
          </div>
        )}
        {step === 4 && (
          <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{tn("stepName")}:</strong> {name}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{tn("typeLabel")}:</strong> {tn(`types.${type}`)}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{tn("audienceLabel")}:</strong> {tn(`audience.${audience}`)}</p>
          </div>
        )}
        {error && <p className="text-sm" style={{ color: "var(--accent-danger)" }}>{error === "CREATE_FAILED" ? tn("createError") : error}</p>}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {tn("back")}
            </button>
          )}
          <button
            type="submit"
            disabled={!canNext || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {step < 4 ? tn("next") : submitting ? tn("creating") : tn("createCampaign")}
          </button>
          <Link href="/dashboard/campaigns" className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>{tn("cancel")}</Link>
        </div>
      </form>
    </div>
  );
}
