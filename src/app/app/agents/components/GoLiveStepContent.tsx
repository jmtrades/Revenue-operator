"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, PhoneOutgoing, Users, Megaphone } from "lucide-react";
import { AccordionItem } from "@/components/ui/Accordion";
import { VoicePreviewPlayer } from "@/components/agents/VoicePreviewPlayer";
import { CURATED_VOICES } from "@/lib/constants/curated-voices";
import { RECALL_VOICES } from "@/lib/constants/recall-voices";
import type { Agent, AgentReadiness, WorkspacePhoneNumber } from "../AgentsPageClient";
import type { CuratedVoice } from "@/lib/constants/curated-voices";

type GoLiveStepContentProps = {
  agent: Agent;
  voices: CuratedVoice[];
  workspaceNumbers: WorkspacePhoneNumber[];
  onAssignNumber: (numberId: string, agentId: string | null) => void | Promise<void>;
  refetchNumbers: () => void;
  getReadiness: (a: Agent) => AgentReadiness;
  onBack: () => void;
  onActivate: () => void | Promise<void>;
  activating: boolean;
};

export function GoLiveStepContent({
  agent,
  voices: _voices,
  workspaceNumbers,
  onAssignNumber,
  refetchNumbers,
  getReadiness,
  onBack,
  onActivate,
  activating,
}: GoLiveStepContentProps) {
  const t = useTranslations("agents");
  const r = getReadiness(agent);
  const testCallCompleted = agent.test_call_completed === true;
  // Core requirements: name, greeting, voice selected, AND at least 1 FAQ (reduced from 3 — AI auto-seeds the rest)
  const hasMinConfig =
    !!(agent.name?.trim() && agent.greeting?.trim()) &&
    !!agent.voice?.trim() &&
    (agent.faq?.length ?? 0) >= 1;
  // Test call is recommended but not a hard blocker — operator can skip with reduced readiness
  const canActivate = hasMinConfig && (testCallCompleted || r.percent >= 60);
  const assignedNumber = workspaceNumbers.find((n) => n.assigned_agent_id === agent.id);
  const hasPhoneOrEnvFallback = !!assignedNumber || workspaceNumbers.length > 0;
  const allowActivate = canActivate && r.percent >= 40 && hasPhoneOrEnvFallback;
  const unassignedNumbers = workspaceNumbers.filter(
    (n) => !n.assigned_agent_id || n.assigned_agent_id === agent.id,
  );

  // Auto-assign: if exactly one number and none assigned, auto-assign it on first render only
  const autoAssignedRef = useRef(false);
  useEffect(() => {
    const shouldAutoAssign = !assignedNumber && unassignedNumbers.length === 1;
    if (shouldAutoAssign && unassignedNumbers[0] && !autoAssignedRef.current) {
      autoAssignedRef.current = true;
      void onAssignNumber(unassignedNumbers[0].id, agent.id);
    }
  }, [assignedNumber, unassignedNumbers, onAssignNumber, agent.id]);

  const handleAssign = async (numberId: string | "") => {
    if (numberId === "") {
      if (!assignedNumber) return;
      await onAssignNumber(assignedNumber.id, null);
      refetchNumbers();
      return;
    }
    await onAssignNumber(numberId, agent.id);
    refetchNumbers();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("goLive.heading")}</h3>
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4" aria-label={t("goLive.phoneSectionAria")}>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t("goLive.phoneLabel")}</p>
        <p className="text-[11px] text-[var(--text-tertiary)] mb-3">{t("goLive.phoneDescription")}</p>
        <select
          value={assignedNumber?.id ?? ""}
          onChange={(e) => void handleAssign(e.target.value)}
          disabled={unassignedNumbers.length === 0}
          className="w-full max-w-md px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-primary)] focus:outline-none"
          aria-label={t("goLive.assignAria")}
        >
          <option value="">{unassignedNumbers.length === 0 ? t("goLive.noNumbers") : t("goLive.none")}</option>
          {unassignedNumbers.map((n) => (
            <option key={n.id} value={n.id}>
              {n.phone_number} {n.assigned_agent_id === agent.id ? t("goLive.thisAgent") : ""}
            </option>
          ))}
        </select>
        {assignedNumber && (
          <p className="text-[11px] text-[var(--accent-primary)]/90 mt-1.5">{t("goLive.assigned")}: {assignedNumber.phone_number}</p>
        )}
      </section>
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">{t("goLive.readiness")}: {r.percent}%</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
          <div
            className="h-full rounded-full bg-white/20 transition-[width] duration-300"
            style={{ width: `${r.percent}%` }}
          />
        </div>
      </div>
      <div className={`rounded-2xl border-2 p-4 ${
        allowActivate
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
          : "border-[var(--accent-danger)]/50 bg-[var(--accent-danger)]/5"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("goLive.readinessChecklist")}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              {allowActivate
                ? "Your agent is ready to go live!"
                : `Complete ${r.tasks.filter((t) => !t.complete).length} more item${r.tasks.filter((t) => !t.complete).length !== 1 ? "s" : ""} to launch`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{r.percent}%</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Complete</p>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-[var(--text-secondary)]" role="list">
          {(() => {
          const readinessLabelKeys: Record<string, string> = {
            business: "businessInfoAdded",
            use_cases: "useCasesSelected",
            agent: "agentCreated",
            voice: "voiceSelected",
            greeting: "openingGreetingSet",
            knowledge: "knowledgeEntries",
            behavior: "behaviorConfigured",
            phone: "phoneConnected",
            tested: "agentTested",
            launched: "voiceAssistantCreated",
          };
          return r.tasks.map((task) => (
            <li key={task.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              task.complete
                ? "bg-[var(--accent-primary)]/10"
                : "bg-[var(--accent-danger)]/10"
            }`}>
              {task.complete ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[var(--accent-danger)] flex items-center justify-center" aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-danger)]" />
                </div>
              )}
              <span className={task.complete ? "text-[var(--text-primary)] font-medium" : "text-[var(--accent-danger)] font-medium"}>
                {t(`goLive.${readinessLabelKeys[task.key] ?? task.key}`)}
              </span>
              {task.key === "launched" && allowActivate && (
                <button
                  type="button"
                  onClick={() => void onActivate()}
                  disabled={activating}
                  className="ml-auto rounded text-[11px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 transition-colors"
                >
                  {activating ? t("goLive.syncing") : t("goLive.retrySync")}
                </button>
              )}
            </li>
          ));
        })()}
        </ul>
      </div>
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4" aria-label={t("goLive.carrierAria")}>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">{t("goLive.forwardNumber")}</p>
        <div className="space-y-0">
          <AccordionItem title={t("goLive.carrierAtt")} defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">{t("goLive.carrierAttBody")}</p>
          </AccordionItem>
          <AccordionItem title={t("goLive.carrierVerizon")} defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">{t("goLive.carrierVerizonBody")}</p>
          </AccordionItem>
          <AccordionItem title={t("goLive.carrierTMobile")} defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">{t("goLive.carrierTMobileBody")}</p>
          </AccordionItem>
          <AccordionItem title={t("goLive.carrierOther")} defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">{t("goLive.carrierOtherBody")}</p>
          </AccordionItem>
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4" aria-label={t("goLive.previewAria")}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t("goLive.previewHeading")}</h3>

        {/* Voice Preview Player */}
        {agent.voice && agent.greeting && (() => {
          const voiceName =
            CURATED_VOICES.find((v) => v.id === agent.voice)?.name ||
            RECALL_VOICES.find((v) => v.id === agent.voice)?.name ||
            agent.voice;
          return (
            <VoicePreviewPlayer
              voiceId={agent.voice}
              greeting={agent.greeting}
              agentName={agent.name || "Your Agent"}
              voiceName={voiceName}
              className="mb-4"
            />
          );
        })()}

        <div className="space-y-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              {t("goLive.callerBookAppt")}
            </p>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3">
              {(() => {
                const greeting = agent.greeting?.trim();
                if (greeting) {
                  const sliceLen = agent.primaryGoal === "book_appointments" ? 140 : 110;
                  return (
                    greeting.slice(0, sliceLen) +
                    (greeting.length > sliceLen ? "…" : "")
                  );
                }
                if (agent.bookingEnabled !== false) {
                  return t("goLive.defaultGreetingBook");
                }
                return t("goLive.defaultGreetingMessage");
              })()}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("goLive.callerPricing")}</p>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3">
              {(() => {
                const faq = agent.faq ?? [];
                const pricingFromFaq = faq.find((e) => {
                  const q = (e.question ?? "").toLowerCase();
                  const a = (e.answer ?? "").toLowerCase();
                  return q.includes("price") || q.includes("pricing") || a.includes("price");
                });
                if (pricingFromFaq?.answer?.trim()) {
                  const ans = pricingFromFaq.answer.trim();
                  return ans.slice(0, 110) + (ans.length > 110 ? "…" : "");
                }
                const never = (agent.neverSay ?? []).some((r) =>
                  r.toLowerCase().includes("pricing") || r.toLowerCase().includes("quote"),
                );
                if (never) {
                  return t("goLive.pricingNeverSay");
                }
                if (agent.pricingEnabled && (agent.priceList ?? "").trim()) {
                  return t("goLive.pricingEnabled");
                }
                return t("goLive.pricingDefault");
              })()}
            </p>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("goLive.callerAfterHours")}</p>
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3">
              {(() => {
                switch (agent.afterHoursMode) {
                  case "forward":
                    return t("goLive.afterHoursForward");
                  case "messages":
                    return t("goLive.afterHoursMessages");
                  case "emergency":
                    return t("goLive.afterHoursEmergency");
                  case "closed":
                    return t("goLive.afterHoursClosed");
                  default:
                    return t("goLive.afterHoursDefault");
                }
              })()}
            </p>
          </div>

          {(() => {
            const priceObj = agent.objectionHandling?.price?.trim();
            if (!priceObj) return null;
            return (
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {t("goLive.callerPriceHigh")}
                </p>
                <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3">
                  {priceObj.slice(0, 160) + (priceObj.length > 160 ? "…" : "")}
                </p>
              </div>
            );
          })()}

          {(() => {
            const hasEscalationTriggers =
              Array.isArray(agent.escalationTriggers) &&
              agent.escalationTriggers.length > 0;
            const hasTransferNumber = (agent.transferPhone ?? "").trim().length > 0;
            if (!hasEscalationTriggers && !hasTransferNumber) return null;
            return (
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {t("goLive.callerSpeakToSomeone")}
                </p>
                <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-3">
                  {hasTransferNumber
                    ? t("goLive.escalationWithTransfer")
                    : t("goLive.escalationNoTransfer")}
                </p>
              </div>
            );
          })()}
        </div>
      </section>
      {/* Post-activation: What's Next guidance */}
      {agent.active && (
        <section className="rounded-2xl border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Your agent is live!</p>
              <p className="text-xs text-[var(--text-secondary)]">Choose how you want to start reaching your leads:</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/app/campaigns/create?template=speed_to_lead"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-input)]"
            >
              <Megaphone className="w-6 h-6 text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Launch a Campaign</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Auto-call a list of leads with one click</span>
            </Link>
            <Link
              href="/app/leads"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-input)]"
            >
              <Users className="w-6 h-6 text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Call a Lead</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Open any lead and have AI call them instantly</span>
            </Link>
            <Link
              href="/app/settings/phone"
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-input)]"
            >
              <PhoneOutgoing className="w-6 h-6 text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Forward Your Phone</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Route inbound calls to your AI agent</span>
            </Link>
          </div>
        </section>
      )}

      {!agent.active && (
        <>
      <p className="text-xs text-[var(--text-tertiary)]">{t("goLive.connectPhoneHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2" role="list">
        <Link
          href="/app/settings/phone"
          aria-label={t("goLive.forwardExistingAria")}
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">{t("goLive.forwardExistingTitle")}</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">{t("goLive.forwardExistingDesc")}</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">{t("goLive.forwardExistingCta")}</span>
        </Link>
        <Link
          href="/app/settings/phone"
          aria-label={t("goLive.getNewNumberAria")}
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">{t("goLive.getNewNumberTitle")}</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">{t("goLive.getNewNumberDesc")}</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">{t("goLive.getNewNumberCta")}</span>
        </Link>
      </div>
        </>
      )}
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label={t("goLive.backToTestAria")} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black">{t("goLive.backButton")}</button>
        {!agent.active && (
        <button
          type="button"
          onClick={() => void onActivate()}
          disabled={!allowActivate || activating}
          aria-label={t("goLive.activateAgentAria")}
          title={!testCallCompleted ? "Complete your test call to enable Go Live." : !hasPhoneOrEnvFallback ? "Add a phone number to enable Go Live." : undefined}
          className="rounded-xl bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {activating ? t("goLive.activating") : t("goLive.activateAgent")}
        </button>
        )}
      </div>
    </div>
  );
}

