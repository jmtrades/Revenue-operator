"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, Plus, Trash2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CRM_FIELDS_BY_PROVIDER,
  REVENUE_OPERATOR_FIELDS,
  getDefaultMappings,
  testMapping,
  SAMPLE_LEAD,
  type CrmProviderId,
  type FieldMappingConfig,
  type MapEntry,
  type TransformationType,
} from "@/lib/integrations/field-mapper";

function getTransformationLabels(t: (k: string) => string): Record<TransformationType, string> {
  return {
    none: t("integrations.transformations.none"),
    format_phone: t("integrations.transformations.format_phone"),
    map_status: t("integrations.transformations.map_status"),
    concatenate: t("integrations.transformations.concatenate"),
  };
}

function isCrmProviderId(s: string): s is CrmProviderId {
  return Object.keys(CRM_FIELDS_BY_PROVIDER).includes(s);
}

function MappingSuggestion({ provider, rtField, currentCrmField, crmFields, onApply }: {
  provider: CrmProviderId;
  rtField: string;
  currentCrmField: string;
  crmFields: Array<{ key: string; label: string }>;
  onApply: (crmField: string) => void;
}) {
  const defaults = getDefaultMappings(provider);
  const suggested = defaults.find((d) => d.rtField === rtField);
  if (!suggested || suggested.crmField === currentCrmField) return null;
  const suggestedLabel = crmFields.find((f) => f.key === suggested.crmField)?.label ?? suggested.crmField;
  return (
    <button
      type="button"
      onClick={() => onApply(suggested.crmField)}
      className="mt-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
    >
      Suggested: {suggestedLabel}
    </button>
  );
}

export default function IntegrationsMappingPage() {
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  const searchParams = useSearchParams();
  const providerParam = searchParams.get("provider") ?? "";
  const provider = isCrmProviderId(providerParam) ? providerParam : ("hubspot" as CrmProviderId);
  const name = tSettings(`integrations.providers.${provider}`) || tSettings("integrations.crmFallback");
  const transformationLabels = getTransformationLabels(tSettings);

  const [config, setConfig] = useState<FieldMappingConfig>({ mappings: [], customRtFields: [], customCrmFields: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ output: Record<string, unknown>; errors: string[] } | null>(null);
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);

  const crmFields = CRM_FIELDS_BY_PROVIDER[provider] ?? [];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/integrations/crm/${provider}/mapping`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FieldMappingConfig | null) => {
        if (!cancelled && data && Array.isArray(data.mappings)) {
          setConfig({
            mappings: data.mappings,
            customRtFields: data.customRtFields ?? [],
            customCrmFields: data.customCrmFields ?? [],
          });
        } else if (!cancelled) {
          setConfig({ mappings: getDefaultMappings(provider), customRtFields: [], customCrmFields: [] });
        }
      })
      .catch(() => {
        if (!cancelled) setConfig({ mappings: getDefaultMappings(provider), customRtFields: [], customCrmFields: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const updateMapping = (index: number, patch: Partial<MapEntry>) => {
    setConfig((prev) => ({
      ...prev,
      mappings: prev.mappings.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
    setTestResult(null);
  };

  const addMapping = () => {
    setConfig((prev) => {
      // Auto-suggest the next unmapped field pair from defaults
      const defaults = getDefaultMappings(provider);
      const usedRtFields = new Set(prev.mappings.map((m) => m.rtField));
      const nextDefault = defaults.find((d) => !usedRtFields.has(d.rtField));
      const newRow: MapEntry = nextDefault
        ? { rtField: nextDefault.rtField, crmField: nextDefault.crmField, transformation: nextDefault.transformation ?? "none" }
        : { rtField: REVENUE_OPERATOR_FIELDS[0].key, crmField: crmFields[0]?.key ?? "", transformation: "none" };
      return { ...prev, mappings: [...prev.mappings, newRow] };
    });
    setTestResult(null);
  };

  const removeMapping = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      mappings: prev.mappings.filter((_, i) => i !== index),
    }));
    setTestResult(null);
    setConfirmRemoveIndex(null);
  };

  const loadDefaults = () => {
    setConfig({ mappings: getDefaultMappings(provider), customRtFields: [], customCrmFields: [] });
    setTestResult(null);
    toast.info(tSettings("integrations.defaultsLoaded"));
  };

  const handleTest = () => {
    const result = testMapping(SAMPLE_LEAD, config);
    setTestResult(result);
    if (result.errors.length > 0) {
      toast.error(result.errors[0] ?? tToast("error.generic"));
    } else {
      toast.success(tSettings("integrations.testSuccess"));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/crm/${provider}/mapping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? tSettings("integrations.saveFailed"));
        return;
      }
      toast.success(tSettings("integrations.saved"));
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: tSettings("integrations.breadcrumbSettings"), href: "/app/settings" },
          { label: tSettings("integrations.breadcrumbIntegrations"), href: "/app/settings/integrations" },
          { label: tSettings("integrations.mappingBreadcrumb", { name }) },
        ]}
      />
      <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mt-2 mb-1">
        {tSettings("integrations.mappingTitle", { name })}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {tSettings("integrations.mappingDescription", { name })}
      </p>

      {loading ? (
        <div className="h-48 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] skeleton-shimmer" />
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-4 border-b border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              <div className="col-span-4">Revenue Operator</div>
              <div className="col-span-1" aria-hidden />
              <div className="col-span-4">CRM field ({name})</div>
              <div className="col-span-2">Transform</div>
              <div className="col-span-1" />
            </div>
            {config.mappings.map((m, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 p-4 border-b border-[var(--border-default)] last:border-0 items-center"
              >
                <div className="col-span-4">
                  <select
                    value={m.rtField}
                    title={REVENUE_OPERATOR_FIELDS.find((f) => f.key === m.rtField)?.label}
                    onChange={(e) => updateMapping(index, { rtField: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                  >
                    {REVENUE_OPERATOR_FIELDS.map((f) => (
                      <option key={f.key} value={f.key} title={f.label}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center text-[var(--text-secondary)]" aria-hidden>→</div>
                <div className="col-span-4">
                  <select
                    value={m.crmField}
                    title={crmFields.find((f) => f.key === m.crmField)?.label ?? m.crmField}
                    onChange={(e) => updateMapping(index, { crmField: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                  >
                    {crmFields.map((f) => (
                      <option key={f.key} value={f.key} title={`${f.label} (${f.key})`}>{f.label}</option>
                    ))}
                  </select>
                  <MappingSuggestion provider={provider} rtField={m.rtField} currentCrmField={m.crmField} crmFields={crmFields} onApply={(crmField) => updateMapping(index, { crmField })} />
                </div>
                <div className="col-span-2">
                  <select
                    value={m.transformation ?? "none"}
                    onChange={(e) => updateMapping(index, { transformation: e.target.value as TransformationType })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                  >
                    {(Object.entries(transformationLabels) as Array<[TransformationType, string]>).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveIndex(index)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-danger)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    aria-label="Remove mapping"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="p-4 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={addMapping}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
              >
                <Plus className="w-4 h-4" /> {tSettings("integrations.addMapping")}
              </button>
              <button
                type="button"
                onClick={loadDefaults}
                className="inline-flex items-center gap-2 ml-2 px-3 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> {tSettings("integrations.loadDefaults")}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
            >
              <Play className="w-4 h-4" /> {tSettings("integrations.testWithSampleData")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {saving ? tSettings("integrations.saving") : tSettings("integrations.saveMapping")}
            </button>
          </div>

          {testResult && (
            <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">{tSettings("integrations.testOutput", { name: SAMPLE_LEAD.name ?? "Sample" })}</h3>
              {testResult.errors.length > 0 && (
                <ul className="text-sm text-[var(--accent-warning)] mb-2">
                  {testResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              <pre className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-inset)] rounded-xl p-3 overflow-x-auto">
                {JSON.stringify(testResult.output, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      <p className="mt-6">
        <Link
          href="/app/settings/integrations"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {tSettings("integrations.backToIntegrations")}
        </Link>
      </p>

      {confirmRemoveIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-mapping-title"
          onClick={() => setConfirmRemoveIndex(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="remove-mapping-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {tSettings("integrations.removeMappingTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{tSettings("integrations.removeMappingBody")}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveIndex(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                {tSettings("integrations.cancelRemove", { defaultValue: "Cancel" })}
              </button>
              <button
                type="button"
                onClick={() => confirmRemoveIndex !== null && removeMapping(confirmRemoveIndex)}
                className="px-4 py-2 rounded-xl bg-[var(--accent-danger,#ef4444)] text-white text-sm font-medium hover:opacity-90"
              >
                {tSettings("integrations.removeMappingConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
