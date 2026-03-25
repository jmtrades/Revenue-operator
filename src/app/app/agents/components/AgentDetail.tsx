"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { Agent, StepId } from "../AgentsPageClient";
import type { CuratedVoice } from "@/lib/constants/curated-voices";
import { useTranslations } from "next-intl";

interface AgentDetailProps {
  agent: Agent;
  activeStep: StepId;
  saving: boolean;
  elevenLabsVoices: CuratedVoice[];
  workspaceName: string;
  workspaceNumbers: Array<{
    id: string;
    phone_number: string;
    assigned_agent_id: string | null;
  }>;
  getAgentReadiness: (agent: Agent) => { percent: number };
  handleStepChange: (step: StepId) => Promise<void> | void;
  handleSave: () => Promise<void> | void;
  handleDelete: () => void;
  playAudioPreview: (input: {
    key: string;
    voiceId: string;
    text: string;
    settings: Agent["voiceSettings"];
    agentId?: string | null;
  }) => Promise<void> | void;
  playingVoiceId: string | null;
  fetchWorkspaceNumbers: () => void;
  setAgents: (
    updater: (current: Agent[]) => Agent[],
  ) => void;
  setToast: (value: string | null) => void;
  setShowConfetti: (value: boolean) => void;
  children?: ReactNode;
}

type StepDef = {
  id: StepId;
  label: string;
  description: string;
};

// Minimal local copy of setup steps for labels; actual completion logic still lives in parent.
const SETUP_STEPS: StepDef[] = [
  {
    id: "identity",
    label: "steps.identity",
    description: "steps.identityDescription",
  },
  {
    id: "voice",
    label: "steps.voice",
    description: "steps.voiceDescription",
  },
  {
    id: "knowledge",
    label: "steps.knowledge",
    description: "steps.knowledgeDescription",
  },
  {
    id: "behavior",
    label: "steps.behavior",
    description: "steps.behaviorDescription",
  },
  {
    id: "test",
    label: "steps.test",
    description: "steps.testDescription",
  },
  {
    id: "golive",
    label: "steps.golive",
    description: "steps.goliveDescription",
  },
];

export function AgentDetail(props: AgentDetailProps) {
  const {
    agent,
    activeStep,
    saving,
    elevenLabsVoices: _elevenLabsVoices,
    workspaceName: _workspaceName,
    workspaceNumbers: _workspaceNumbers,
    getAgentReadiness,
    handleStepChange,
    handleSave,
    handleDelete,
    playAudioPreview: _playAudioPreview,
    playingVoiceId: _playingVoiceId,
    fetchWorkspaceNumbers: _fetchWorkspaceNumbers,
    setAgents: _setAgents,
    setToast: _setToast,
    setShowConfetti: _setShowConfetti,
    children,
  } = props;
  const t = useTranslations("agents");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms.state");

  const readiness = getAgentReadiness(agent);
  const testCallCompleted = agent.test_call_completed === true;

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 min-w-0">
      <div className="w-full lg:w-[240px] flex-shrink-0 border-r border-[var(--border-default)] p-4 space-y-4 overflow-y-auto">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">
              {agent.name}
            </p>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                agent.active
                  ? "bg-green-500/15 text-green-400"
                  : "bg-[var(--bg-inset)] text-[var(--text-tertiary)]"
              }`}
            >
              {agent.active ? tCommon("status.active") : tCommon("status.inactive")}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
            <span
              className={
                readiness.percent >= 80
                  ? "text-green-500/80"
                  : readiness.percent >= 40
                    ? "text-amber-500/80"
                    : "text-[var(--text-secondary)]"
              }
            >
              {readiness.percent}% {t("status.ready")}
            </span>
            <span>·</span>
            <Link
              href={`/app/agents/${agent.id}/analytics`}
              className="text-[var(--accent-primary)] hover:underline"
            >
              {t("links.analytics")}
            </Link>
            <span>·</span>
            <Link
              href={`/app/agents/${agent.id}/flow-builder`}
              className="text-[var(--accent-primary)] hover:underline"
            >
              {t("links.flow")}
            </Link>
            <span>·</span>
            <span>{agent.stats.totalCalls} {t("status.calls")}</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-secondary)] rounded-full transition-[width] duration-500"
                style={{ width: `${readiness.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {readiness.percent}% {t("status.ready")}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2">
            {t("setup.title")}
          </p>
          <div className="lg:hidden mb-2">
            <p className="text-[11px] text-[var(--text-secondary)] mb-1.5">
              {t("setup.stepOf", {
                current: SETUP_STEPS.findIndex((s) => s.id === activeStep) + 1,
                total: SETUP_STEPS.length,
              })}
            </p>
            <label htmlFor="agent-step-select" className="sr-only">
              {t("setup.jumpAria")}
            </label>
            <select
              id="agent-step-select"
              value={activeStep}
              onChange={(e) =>
                void handleStepChange(e.target.value as StepId)
              }
              aria-label={t("setup.jumpAria")}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              {SETUP_STEPS.map((step, i) => (
                <option key={step.id} value={step.id}>
                  {i + 1}. {t(step.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden lg:block space-y-1">
            {SETUP_STEPS.map((step, i) => {
              const complete =
                readiness.percent >= (i + 1) * 10;
              const active = activeStep === step.id;
              const disableGoLiveNavigation = step.id === "golive" && !testCallCompleted;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => void handleStepChange(step.id)}
                  disabled={disableGoLiveNavigation}
                  aria-label={`${t(step.label)}: ${t(step.description)}${
                    complete ? `, ${t("setup.completed")}` : ""
                  }${active ? `, ${t("setup.current")}` : ""}`}
                  aria-current={active ? "step" : undefined}
                  title={
                    disableGoLiveNavigation
                      ? "Complete your test call to enable Go Live."
                      : undefined
                  }
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-[background-color,border-color,color,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    active
                      ? "bg-[var(--bg-hover)] border border-[var(--border-medium)]"
                      : "hover:bg-[var(--bg-card)] border border-transparent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      complete
                        ? "bg-emerald-500/20"
                        : active
                          ? "bg-[var(--bg-hover)]"
                          : "bg-[var(--bg-input)]"
                    }`}
                  >
                    {complete ? (
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-emerald-400"
                        aria-hidden
                      />
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        active
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {t(step.label)}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {t(step.description)}
                    </p>
                  </div>
                  {active && (
                    <ChevronRight
                      className="w-4 h-4 text-white/20 flex-shrink-0"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-2 pt-2">
          {t("quickActions.label")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleStepChange("identity")}
            aria-label={t("quickActions.editAria")}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {t("quickActions.edit")}
          </button>
          <button
            type="button"
            onClick={() => void handleStepChange("test")}
            aria-label={t("quickActions.testAria")}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {t("quickActions.test")}
          </button>
          <button
            type="button"
            onClick={() => void handleStepChange("golive")}
            aria-label={t("quickActions.goLiveAria")}
            disabled={!testCallCompleted}
            title={!testCallCompleted ? "Complete your test call to enable Go Live." : undefined}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("quickActions.goLive")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            aria-label={t("actions.deleteAria")}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {tCommon("delete")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-label={
              saving
                ? t("actions.savingAria")
                : t("actions.saveAndSyncAria")
            }
            className="px-4 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {saving ? tForms("saving") : tCommon("save")}
          </button>
        </div>
      </div>

      {/* Right-side: step content */}
      <div
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 relative break-words"
        style={{ overflowWrap: "anywhere" }}
        aria-labelledby="agent-step-heading"
      >
        {saving && (
          <div className="absolute top-3 right-3 text-xs text-[var(--text-tertiary)]">
            {tForms("saving")}
          </div>
        )}
        <h2
          id="agent-step-heading"
          className="text-xs text-[var(--text-secondary)] mb-4 font-normal"
        >
          {t("setup.currentlyOn", {
            label: t(
              SETUP_STEPS.find((s) => s.id === activeStep)?.label ??
              activeStep
            ),
          })}
        </h2>
        {children}
      </div>
    </div>
  );
}

