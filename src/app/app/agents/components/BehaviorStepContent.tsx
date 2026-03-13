"use client";

import type { Agent } from "../AgentsPageClient";
import { RulesTab } from "../AgentsPageClient";

type BehaviorStepContentProps = {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function BehaviorStepContent({
  agent,
  onChange,
  onBack,
  onNext,
}: BehaviorStepContentProps) {
  const NEVER_DO_PRESETS = [
    "Never discuss pricing or give quotes",
    "Never schedule outside business hours",
    "Never make promises about delivery dates",
    "Never discuss competitors",
    "Never share internal information",
  ];

  const neverDo = Array.isArray(agent.neverSay) ? agent.neverSay : [];

  const addNeverDo = (rule: string) => {
    if (!rule.trim() || neverDo.includes(rule)) return;
    onChange({ neverSay: [...neverDo, rule] });
  };

  const removeNeverDo = (rule: string) => {
    onChange({ neverSay: neverDo.filter((r) => r !== rule) });
  };

  const qualificationQuestions = Array.isArray(agent.qualificationQuestions)
    ? agent.qualificationQuestions
    : [];

  const updateQuestion = (index: number, value: string) => {
    const next = [...qualificationQuestions];
    next[index] = value;
    onChange({
      qualificationQuestions: next
        .map((q) => q.trim())
        .filter((q, i) => q || i === index),
    });
  };

  const removeQuestion = (index: number) => {
    const next = qualificationQuestions.filter((_, i) => i !== index);
    onChange({ qualificationQuestions: next });
  };

  const addQuestion = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange({ qualificationQuestions: [...qualificationQuestions, trimmed] });
  };

  const objections = agent.objectionHandling ?? {};

  const setObjection = (
    id: "price" | "timing" | "competitor" | "notInterested",
    value: string,
  ) => {
    onChange({
      objectionHandling: {
        ...objections,
        [id]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 id="behavior-heading" className="text-sm font-semibold text-white">How should your agent behave?</h3>
      <section
        aria-label="Guardrails"
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3"
      >
        <div>
          <p className="text-xs font-semibold text-white/80">
            What should your AI never do?
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Set clear boundaries so calls stay on-brand and in-bounds.
          </p>
        </div>
        <div className="space-y-1.5">
          {NEVER_DO_PRESETS.map((rule) => (
            <label
              key={rule}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                checked={neverDo.includes(rule)}
                onChange={(e) =>
                  e.target.checked ? addNeverDo(rule) : removeNeverDo(rule)
                }
              />
              <span>{rule}</span>
            </label>
          ))}
        </div>
        <div className="pt-2">
          <label
            htmlFor="custom-never-do"
            className="block text-[11px] text-[var(--text-tertiary)] mb-1"
          >
            Add custom rule
          </label>
          <input
            id="custom-never-do"
            type="text"
            placeholder="Add custom rule… (press Enter)"
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.trim();
                if (value) {
                  addNeverDo(value);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </section>
      <RulesTab agent={agent} onChange={onChange} />
      <section className="mt-4">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Qualification questions
        </h3>
        <p className="text-xs text-white/40 mb-2">
          Questions your AI asks to qualify leads. Drag to reorder priority.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-white/40">Preset:</span>
          {(["bant", "meddic", "custom"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (preset === "custom") {
                  onChange({});
                  return;
                }
                const next =
                  preset === "bant"
                    ? [
                        "Do you have a budget set aside for this?",
                        "When are you hoping to get this done?",
                        "Are you the one making the final decision?",
                        "What problem are you trying to solve?",
                      ]
                    : [
                        "What metrics will you use to measure success?",
                        "Who else is involved in the decision?",
                        "What is the impact if you do nothing?",
                        "Do you have a formal decision process or timeline?",
                      ];
                onChange({ qualificationQuestions: next });
              }}
              className={`px-2.5 py-1 rounded-full border text-[11px] ${
                preset === "custom"
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white/70 hover:border-white/40"
              }`}
            >
              {preset === "bant"
                ? "BANT"
                : preset === "meddic"
                  ? "MEDDIC"
                  : "Custom"}
            </button>
          ))}
        </div>

        {(qualificationQuestions || []).map((q, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/20 w-5">{i + 1}.</span>
            <input
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              className="flex-1 bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              className="text-xs text-white/20 hover:text-red-400 p-1"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addQuestion("")}
          className="mt-2 text-xs text-white/40 hover:text-white/60"
        >
          + Add question
        </button>

        {qualificationQuestions.length === 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {[
              "What are you looking for?",
              "What is your budget range?",
              "When do you need this done?",
              "How did you hear about us?",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addQuestion(preset)}
                className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg text-white/40 hover:bg-white/[0.04]"
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Objection handling
        </h3>
        <p className="text-xs text-white/40 mb-3">
          How your AI responds to common pushback.
        </p>

        <div className="space-y-3">
          {[
            {
              id: "price" as const,
              label: "Price objection",
              placeholder:
                "I understand budget is important. Our clients typically see ROI within the first month...",
            },
            {
              id: "timing" as const,
              label: "\"Not the right time\"",
              placeholder:
                "I completely understand. Would it help if I followed up in a week or two?",
            },
            {
              id: "competitor" as const,
              label: "Comparing competitors",
              placeholder:
                "That's a smart approach. What specifically are you comparing? I can highlight where we differ.",
            },
            {
              id: "notInterested" as const,
              label: "\"Not interested\"",
              placeholder:
                "No problem at all. Can I ask what would need to change for this to be useful?",
            },
          ].map((obj) => (
            <div key={obj.id}>
              <label className="text-xs text-white/50 mb-1 block">
                {obj.label}
              </label>
              <textarea
                value={(objections as Record<string, string | undefined>)[obj.id] ?? ""}
                onChange={(e) => setObjection(obj.id, e.target.value)}
                rows={2}
                placeholder={obj.placeholder}
                className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-medium text-white/70 mb-1">
          Escalation &amp; transfer
        </h3>
        <p className="text-xs text-white/40 mb-3">
          When should your AI hand off to a human?
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Transfer to this number when escalating
            </label>
            <input
              value={agent.transferPhone || ""}
              onChange={(e) => onChange({ transferPhone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Transfer when the caller...
            </label>
            <div className="space-y-1.5">
              {[
                "Asks to speak to a manager",
                "Gets angry or frustrated",
                "Has a complex legal or medical question",
                "Explicitly requests a human",
                "Mentions an emergency",
              ].map((trigger) => (
                <label
                  key={trigger}
                  className="flex items-center gap-2 text-sm text-white/50 cursor-pointer hover:text-white/70"
                >
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-transparent"
                    checked={(agent.escalationTriggers || []).includes(trigger)}
                    onChange={(e) => {
                      const current = agent.escalationTriggers || [];
                      const updated = e.target.checked
                        ? [...current, trigger]
                        : current.filter((t) => t !== trigger);
                      onChange({ escalationTriggers: updated });
                    }}
                  />
                  {trigger}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Knowledge" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button type="button" onClick={onNext} aria-label="Continue to Test" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Continue</button>
      </div>
    </div>
  );
}

