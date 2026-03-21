"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Agent } from "../AgentsPageClient";
import { AgentKnowledgePanel } from "./AgentKnowledgePanel";

type KnowledgeStepContentProps = {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function KnowledgeStepContent({
  agent,
  onChange,
  onBack,
  onNext,
}: KnowledgeStepContentProps) {
  const t = useTranslations("agents");
  const [seeding, setSeeding] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const seedFive = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/agent/seed-knowledge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          knowledge_base?: { faq?: Array<{ q?: string; a?: string }> };
        };
        const faq = data.knowledge_base?.faq ?? [];
        onChange({
          faq: faq.map((item, i) => ({
            id: `seed-${Date.now()}-${i}`,
            question: item.q ?? "",
            answer: item.a ?? "",
          })),
        });
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleImportFromWebsite = async () => {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch("/api/agent/extract-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        faq?: Array<{ question?: string; answer?: string }>;
        businessName?: string;
        services?: string[];
      };
      if (!res.ok || data.error) {
        setImportError(data.error ?? t("knowledge.importError"));
        return;
      }
      const newFaq = (data.faq ?? []).map((item, i) => ({
        id: `import-${Date.now()}-${i}`,
        question: item.question ?? "",
        answer: item.answer ?? "",
      }));
      if (newFaq.length > 0) {
        onChange({ faq: [...(agent.faq ?? []), ...newFaq] });
        setImportUrl("");
      }
      if (data.businessName && !agent.businessContext?.trim()) {
        onChange({ businessContext: data.businessName });
      }
    } catch {
      setImportError(t("knowledge.importErrorGeneric"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 id="knowledge-heading" className="text-sm font-semibold text-[var(--text-primary)]">
        {t("knowledge.title")}
      </h3>
      <section
        aria-label="Import and suggest"
        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => {
              setImportUrl(e.target.value);
              setImportError(null);
            }}
            placeholder={t("knowledgePanel.importUrlPlaceholder")}
            className="flex-1 min-w-[200px] rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          />
          <button
            type="button"
            onClick={handleImportFromWebsite}
            disabled={!importUrl.trim() || importing}
            className="rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-white/[0.06] disabled:opacity-50"
          >
            {importing ? t("knowledge.importing") : t("knowledge.importFromWebsite")}
          </button>
        </div>
        {importError && <p className="text-xs text-red-400">{importError}</p>}
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {t("knowledge.quickStartHint")}
        </p>
        <button
          type="button"
          onClick={seedFive}
          disabled={seeding}
          aria-busy={seeding}
          className="rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-white/[0.06] disabled:opacity-50"
        >
          {seeding ? t("knowledge.adding") : t("knowledge.suggestQAs")}
        </button>
      </section>
      <AgentKnowledgePanel agent={agent} updateAgent={onChange} />
      {(agent.faq?.length ?? 0) === 0 && (
        <p className="text-[11px] text-amber-500/90">
          {t("knowledge.minQAHint")}
        </p>
      )}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Voice"
          className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {t("knowledge.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={t("knowledge.continueToBehavior")}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {t("knowledge.continue")}
        </button>
      </div>
    </div>
  );
}

