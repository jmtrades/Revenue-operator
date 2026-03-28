"use client";

import { useTranslations } from "next-intl";
import type { Agent } from "../AgentsPageClient";

type AgentKnowledgePanelProps = {
  agent: Agent;
  updateAgent: (patch: Partial<Agent>) => void;
};

const DEFAULT_QA_SUGGESTIONS = [
  {
    question: "What are your business hours?",
    answer: "We're open Monday through Friday, 9 AM to 5 PM.",
  },
  {
    question: "How do I schedule an appointment?",
    answer: "I'd be happy to help you schedule an appointment. What day works best for you?",
  },
  {
    question: "What services do you offer?",
    answer: "We offer a full range of services. Can I help you with something specific?",
  },
  {
    question: "What's your pricing?",
    answer: "Pricing varies depending on the service. I can take your details and have someone follow up with exact pricing.",
  },
  {
    question: "How do I contact support?",
    answer: "You can reach our support team through this chat, or I can have someone call you back.",
  },
];

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

  const acceptSuggestion = (suggestion: { question: string; answer: string }) => {
    updateAgent({
      faq: [
        ...agent.faq,
        { id: `faq-${Date.now()}`, question: suggestion.question, answer: suggestion.answer },
      ],
    });
  };

  const isEmpty = agent.faq.length === 0;

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

      {isEmpty && (
        <div className="rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] p-3 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Quick start suggestions:
          </p>
          <div className="space-y-2">
            {DEFAULT_QA_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => acceptSuggestion(suggestion)}
                className="w-full text-left p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">
                  Q: {suggestion.question}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  A: {suggestion.answer}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

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

