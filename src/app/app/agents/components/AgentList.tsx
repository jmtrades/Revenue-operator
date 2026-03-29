"use client";

import { useTranslations } from "next-intl";
import { PhoneCall, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Agent, StepId } from "../AgentsPageClient";

interface WorkspacePhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  number_type: string;
  status: string;
  monthly_cost_cents: number;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
  assigned_agent_id: string | null;
}

interface AgentListProps {
  agents: Agent[];
  selectedId: string | null;
  defaultAgentId: string | null;
  workspaceNumbers: WorkspacePhoneNumber[];
  setSelectedId: (id: string) => void;
  setActiveStep: (step: StepId) => void;
  setAgents: (updater: (current: Agent[]) => Agent[]) => void;
  persistAgent: (agentToSave: Agent, options?: { showToast?: boolean; successToast?: string }) => Promise<{ patchOk: boolean }>;
  setDeleteConfirmAgent: (agent: Agent | null) => void;
  getFirstIncompleteStep: (agent: Agent) => StepId;
}

export function AgentList({
  agents,
  selectedId,
  defaultAgentId,
  workspaceNumbers,
  setSelectedId,
  setActiveStep,
  setAgents,
  persistAgent,
  setDeleteConfirmAgent,
  getFirstIncompleteStep,
}: AgentListProps) {
  const t = useTranslations("agents");
  return (
    <div className="w-full lg:w-[320px] xl:w-[360px] lg:shrink-0 lg:border-r lg:border-[var(--border-default)] lg:overflow-y-auto lg:pr-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 content-start">
        {agents.map((agent) => {
          const templateKey = agent.template && ["appointment_setter", "lead_qualifier", "follow_up", "support", "after_hours", "emergency", "review_request", "scratch", "receptionist"].includes(agent.template)
            ? agent.template
            : "receptionist";
          const templateLabel = t(`template.${templateKey}`);
          const lastActiveLabel =
            (agent.stats?.totalCalls ?? 0) > 0
              ? t("callsCount", { count: agent.stats.totalCalls })
              : t("noCallsYet");

          const isSelected = selectedId === agent.id;

          const assigned = workspaceNumbers.find(
            (n) => n.assigned_agent_id === agent.id,
          );

          return (
            <Card
              key={agent.id}
              variant="interactive"
              className={`text-left p-4 ${
                isSelected
                  ? "ring-1 ring-[var(--accent-primary)]/50 border-[var(--border-medium)]"
                  : ""
              }`}
              onClick={() => {
                setSelectedId(agent.id);
                setActiveStep(getFirstIncompleteStep(agent));
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm text-[var(--text-primary)] truncate flex-1 min-w-0">
                  {agent.name}
                </p>
                <Badge variant={agent.active ? "success" : "neutral"} dot>
                  {agent.active ? t("status.active") : t("status.inactive")}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="neutral">{templateLabel}</Badge>
                {agent.id === defaultAgentId && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {t("defaultBadge")}
                  </span>
                )}
              </div>
              {assigned && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent-primary)] mb-2">
                  <PhoneCall className="w-3 h-3 shrink-0" />
                  <span className="font-mono truncate">
                    {assigned.phone_number}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mb-1">
                <span>{agent.stats?.totalCalls ?? 0} {t("callsSuffix")}</span>
                {(agent.stats?.appointmentsBooked ?? 0) > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[var(--accent-primary)]">{agent.stats?.appointmentsBooked} {t("bookedSuffix", { defaultValue: "booked" })}</span>
                  </>
                )}
                <span>·</span>
                <span>{lastActiveLabel}</span>
              </div>
              {(agent.stats?.totalCalls ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mb-3">
                  {typeof agent.stats?.avgRating === "number" && agent.stats.avgRating > 0 && (
                    <span className={agent.stats.avgRating >= 4 ? "text-[var(--accent-primary)]" : agent.stats.avgRating >= 3 ? "text-[var(--accent-warning)]" : "text-[var(--accent-danger)]"}>
                      {t("qualitySuffix", { defaultValue: "Quality" })}: {agent.stats.avgRating.toFixed(1)}/5
                    </span>
                  )}
                  {(agent.stats?.totalCalls ?? 0) > 0 && (agent.stats?.appointmentsBooked ?? 0) > 0 && (
                    <>
                      <span>·</span>
                      <span>{t("conversionSuffix", { defaultValue: "Conv" })}: {Math.round(((agent.stats?.appointmentsBooked ?? 0) / (agent.stats?.totalCalls ?? 1)) * 100)}%</span>
                    </>
                  )}
                </div>
              )}
              <div
                className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label={agent.active ? t("actions.deactivate") : t("actions.activate")}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
                  onClick={async () => {
                    const next = { ...agent, active: !agent.active };
                    setAgents((current) =>
                      current.map((a) => (a.id === agent.id ? next : a)),
                    );
                    await persistAgent(next, {
                      showToast: true,
                      successToast: agent.active ? t("toast.paused") : t("toast.active"),
                    });
                  }}
                >
                  <span className="text-[10px] font-medium">
                    {agent.active ? t("actions.pause") : t("actions.on")}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("actions.editAgent")}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
                  onClick={() => {
                    setSelectedId(agent.id);
                    setActiveStep(getFirstIncompleteStep(agent));
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("actions.deleteAgent")}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10"
                  onClick={() => setDeleteConfirmAgent(agent)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

