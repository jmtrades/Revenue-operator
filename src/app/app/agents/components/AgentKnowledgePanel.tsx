"use client";

import { useTranslations } from "next-intl";
import type { Agent } from "../AgentsPageClient";

type AgentKnowledgePanelProps = {
  agent: Agent;
  updateAgent: (patch: Partial<Agent>) => void;
};

export function AgentKnowledgePanel({ agent, updateAgent }: AgentKnowledgePanelProps) {
  const t = useTranslations("agents.knowledgePanel");

  const handleFaqChange = (index: number, field: "question" | "answer", value: string) => {
    const next = [...agent.faq];
    next[index] = { ...next[index], [field]: value };
    updateAgent({ faq: next });
  };

  const addFaq = () => {
    updateAgent({
      faq: [
        ...agent.faq,
        { id: `faq-${Date.now()}`, question: "", answer: "" },
      ],
    });
  };

  const removeFaq = (index: number) => {
    const next = [...agent.faq];
    next.splice(index, 1);
    updateAgent({ faq: next });
  };

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          {t("title")}
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {agent.faq.map((item, index) => (
          <div
            key={item.id ?? index}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3 space-y-2"
          >
            <input
              type="text"
              value={item.question}
              onChange={(e) => handleFaqChange(index, "question", e.target.value)}
              placeholder={t("questionPlaceholder")}
              className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
            />
            <textarea
              value={item.answer}
              onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
              placeholder={t("answerPlaceholder")}
              rows={3}
              className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)] resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeFaq(index)}
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {t("remove")}
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addFaq}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          {t("add")}
        </button>
      </div>
    </section>
  );
}

