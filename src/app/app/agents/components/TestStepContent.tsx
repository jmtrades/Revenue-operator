"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Agent, AgentReadiness } from "../AgentsPageClient";
import { AgentTestPanel } from "@/app/app/agents/AgentTestPanel";

function getTestScenarios(t: (k: string) => string) {
  return [
    { id: "general" as const, label: t("testStep.scenarios.general"), prompt: t("testStep.scenarios.generalPrompt") },
    { id: "booking" as const, label: t("testStep.scenarios.booking"), prompt: t("testStep.scenarios.bookingPrompt") },
    { id: "pricing" as const, label: t("testStep.scenarios.pricing"), prompt: t("testStep.scenarios.pricingPrompt") },
    { id: "complaint" as const, label: t("testStep.scenarios.complaint"), prompt: t("testStep.scenarios.complaintPrompt") },
  ];
}

type TestStepContentProps = {
  agent: Agent;
  workspaceName?: string;
  onBack: () => void;
  onNext: () => void;
  getAgentReadiness?: (a: Agent) => AgentReadiness;
};

export function TestStepContent({
  agent,
  workspaceName,
  onBack,
  onNext,
  getAgentReadiness,
}: TestStepContentProps) {
  const t = useTranslations("agents");
  const testScenarios = getTestScenarios(t);
  const [showGoLiveCta, setShowGoLiveCta] = useState(false);
  const [scenarioId, setScenarioId] = useState<string>("general");
  const scenarioPrompt =
    testScenarios.find((s) => s.id === scenarioId)?.prompt ?? testScenarios[0].prompt;
  const scorecardItems = [
    { label: t("testStep.scorecard.greeting"), stars: 4 },
    { label: t("testStep.scorecard.knowledge"), stars: 4 },
    { label: t("testStep.scorecard.booking"), stars: 4 },
    { label: t("testStep.scorecard.tone"), stars: 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t("testStep.title")}</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {t("testStep.description")}
        </p>
      </div>

      <div className="rounded-2xl border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            Test Your Agent
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            We'll call you and your agent will answer. Test its greeting, knowledge, and call handling in real time.
          </p>
        </div>

        <div>
          <label
            htmlFor="test-scenario"
            className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-2"
          >
            Choose a test scenario:
          </label>
          <select
            id="test-scenario"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          >
            {testScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <AgentTestPanel
              agent={{ id: agent.id, name: agent.name, greeting: agent.greeting }}
              workspace={{ name: workspaceName ?? undefined }}
              onTested={() => setShowGoLiveCta(true)}
              defaultScenarioPrompt={scenarioPrompt}
            />
          </div>
          <div className="shrink-0 self-start">
            <button
              type="button"
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/test/${agent.id}`;
                  await navigator.clipboard.writeText(url);
                  window.dispatchEvent(
                    new CustomEvent("agents:test-link-copied", { detail: { url } }),
                  );
                } catch {
                  // ignore clipboard failures
                }
              }}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 transition-colors"
            >
              {t("testStep.copyLink")}
            </button>
          </div>
        </div>
      </div>
      {showGoLiveCta && (
        <>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("testStep.scorecardTitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              {scorecardItems.map(({ label, stars }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-input)]/50 px-3 py-2"
                >
                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0 mr-1.5">{label}</span>
                  <span className="flex gap-0.5" aria-label={t("testStep.starsAria", { count: stars })}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={i <= stars ? "text-[var(--accent-warning)]" : "text-[var(--text-tertiary)]"}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            {getAgentReadiness &&
              (() => {
                const r = getAgentReadiness(agent);
                const tips = r.recommendations.slice(0, 2);
                if (tips.length === 0) return null;
                return (
                  <p className="text-xs text-[var(--text-secondary)]">
                    To improve readiness: {tips.join(". ")}
                  </p>
                );
              })()}
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-primary)]">{t("testStep.readyTitle")}</p>
            <button
              type="button"
              onClick={() => {
                onNext();
                setShowGoLiveCta(false);
              }}
              className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
            >
              {t("testStep.continue")}
            </button>
          </div>
        </>
      )}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("testStep.backToBehavior")}
          className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {t("testStep.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={t("testStep.continueToGoLive")}
          className="rounded-xl bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {t("testStep.continue")}
        </button>
      </div>
    </div>
  );
}

