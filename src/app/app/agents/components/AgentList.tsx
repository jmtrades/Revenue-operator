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
  defaultAgentId: _defaultAgentId,
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
          const _lastActiveLabel =
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
              className={`text-left p-3.5 transition-all ${
                isSelected
                  ? "ring-2 ring-[var(--accent-primary)] border-[var(--accent-primary)]"
                  : "hover:border-[var(--border-medium)]"
              }`}
              onClick={() => {
                setSelectedId(agent.id);
                setActiveStep(getFirstIncompleteStep(agent));
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {agent.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    {templateLabel}
                  </p>
                </div>
                <Badge variant={agent.active ? "success" : "neutral"} dot>
                  {agent.active ? t("status.active") : t("status.inactive")}
                </Badge>
              </div>

              {assigned && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-primary)] mb-2.5 px-2 py-1.5 bg-[var(--accent-primary)]/10 rounded-lg">
                  <PhoneCall className="w-3 h-3 shrink-0" />
                  <span className="font-mono truncate">
                    {assigned.phone_number}
                  </span>
                </div>
              )}

              {(agent.stats?.totalCalls ?? 0) > 0 && (
                <div className="space-y-2 mb-3 pt-2.5 border-t border-[var(--border-default)]">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-[var(--bg-inset)] p-2">
                      <p className="text-[var(--text-tertiary)] mb-0.5">Calls Handled</p>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {agent.stats?.totalCalls ?? 0}
                      </p>
                    </div>
                    {(agent.stats?.appointmentsBooked ?? 0) > 0 && (
                      <div className="rounded-lg bg-[var(--accent-primary)]/10 p-2">
                        <p className="text-[var(--text-tertiary)] mb-0.5">Booked</p>
                        <p className="font-semibold text-[var(--accent-primary)]">
                          {agent.stats?.appointmentsBooked}
                        </p>
                      </div>
                    )}
                    {typeof agent.stats?.avgRating === "number" && agent.stats.avgRating > 0 && (
                      <div className={`rounded-lg p-2 ${
                        agent.stats.avgRating >= 4
                          ? "bg-[var(--accent-primary)]/10"
                          : agent.stats.avgRating >= 3
                            ? "bg-[var(--accent-warning)]/10"
                            : "bg-[var(--accent-danger)]/10"
                      }`}>
                        <p className="text-[var(--text-tertiary)] mb-0.5">Quality</p>
                        <p className={`font-semibold ${
                          agent.stats.avgRating >= 4
                            ? "text-[var(--accent-primary)]"
                            : agent.stats.avgRating >= 3
                              ? "text-[var(--accent-warning)]"
                              : "text-[var(--accent-danger)]"
                        }`}>
                          {agent.stats.avgRating.toFixed(1)}/5
                        </p>
                      </div>
                    )}
                    {(agent.stats?.totalCalls ?? 0) > 0 && (agent.stats?.appointmentsBooked ?? 0) > 0 && (
                      <div className="rounded-lg bg-[var(--bg-inset)] p-2">
                        <p className="text-[var(--text-tertiary)] mb-0.5">Conversion</p>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {Math.round(((agent.stats?.appointmentsBooked ?? 0) / (agent.stats?.totalCalls ?? 1)) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(agent.stats?.totalCalls ?? 0) === 0 && (
                <div className="text-[11px] text-[var(--text-tertiary)] mb-3 pt-2.5 border-t border-[var(--border-default)]">
                  <p className="text-center py-1.5">Awaiting first call</p>
                </div>
              )}

              <div
                className="flex items-center gap-1.5 pt-2.5 border-t border-[var(--border-default)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label={agent.active ? t("actions.deactivate") : t("actions.activate")}
                  className="flex-1 p-1.5 rounded-lg text-[10px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
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
                  {agent.active ? t("actions.pause") : t("actions.on")}
                </button>
                <button
                  type="button"
                  aria-label={t("actions.editAgent")}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
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
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors"
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

