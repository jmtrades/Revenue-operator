"use client";

import { useState } from "react";
import { Agent, AgentReadiness } from "../AgentsPageClient";
import { AgentTestPanel } from "@/app/app/agents/AgentTestPanel";

const TEST_SCENARIOS = [
  { id: "general", label: "General inquiry", prompt: "Hi, I need some information about your services." },
  { id: "booking", label: "Booking", prompt: "I want to book an appointment for next Thursday." },
  { id: "pricing", label: "Pricing", prompt: "How much do your services cost?" },
  { id: "complaint", label: "Complaint", prompt: "I've been waiting for a callback and nobody has contacted me." },
] as const;

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
  const [showGoLiveCta, setShowGoLiveCta] = useState(false);
  const [scenarioId, setScenarioId] = useState<string>("general");
  const scenarioPrompt =
    TEST_SCENARIOS.find((s) => s.id === scenarioId)?.prompt ?? TEST_SCENARIOS[0].prompt;
  const scorecardItems = [
    { label: "Greeting", stars: 4 },
    { label: "Knowledge", stars: 4 },
    { label: "Booking", stars: 4 },
    { label: "Tone", stars: 5 },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-white">Talk to your AI</h3>
      <p className="text-xs text-[var(--text-secondary)]">
        Chat with your agent to see how it responds. It uses your actual greeting, knowledge, and
        behavior rules.
      </p>
      <div>
        <label
          htmlFor="test-scenario"
          className="block text-[11px] text-[var(--text-tertiary)] mb-1.5"
        >
          Scenario
        </label>
        <select
          id="test-scenario"
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          {TEST_SCENARIOS.map((s) => (
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
            className="text-xs text-white/40 hover:text-white/60 border border-white/[0.08] rounded-lg px-3 py-1.5"
          >
            Copy test link
          </button>
        </div>
      </div>
      {showGoLiveCta && (
        <>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Scorecard</p>
            <div className="grid grid-cols-2 gap-2">
              {scorecardItems.map(({ label, stars }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-input)]/50 px-3 py-2"
                >
                  <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                  <span className="flex gap-0.5" aria-label={`${stars} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={i <= stars ? "text-amber-400" : "text-zinc-600"}
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
            <p className="text-sm text-[var(--text-primary)]">Ready to go live?</p>
            <button
              type="button"
              onClick={() => {
                onNext();
                setShowGoLiveCta(false);
              }}
              className="text-sm font-medium text-white hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
            >
              Continue
            </button>
          </div>
        </>
      )}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Behavior"
          className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Continue to Go live"
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

