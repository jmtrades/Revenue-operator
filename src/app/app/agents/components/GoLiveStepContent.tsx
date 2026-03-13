"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AccordionItem } from "@/components/ui/Accordion";
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
  voices,
  workspaceNumbers,
  onAssignNumber,
  refetchNumbers,
  getReadiness,
  onBack,
  onActivate,
  activating,
}: GoLiveStepContentProps) {
  const r = getReadiness(agent);
  const canActivate =
    !!(agent.name?.trim() && agent.greeting?.trim()) &&
    !!agent.voice?.trim() &&
    (agent.faq?.length ?? 0) >= 3;
  const allowActivate = canActivate && r.percent >= 40;
  const assignedNumber = workspaceNumbers.find((n) => n.assigned_agent_id === agent.id);
  const unassignedNumbers = workspaceNumbers.filter(
    (n) => !n.assigned_agent_id || n.assigned_agent_id === agent.id,
  );

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
      <h3 className="text-sm font-semibold text-white">Go live</h3>
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4" aria-label="Phone number assignment">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Phone number</p>
        <p className="text-[11px] text-[var(--text-tertiary)] mb-3">Assign a workspace number to this agent. Calls to that number will be answered by this agent.</p>
        <select
          value={assignedNumber?.id ?? ""}
          onChange={(e) => void handleAssign(e.target.value)}
          disabled={unassignedNumbers.length === 0}
          className="w-full max-w-md px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
          aria-label="Assign phone number"
        >
          <option value="">{unassignedNumbers.length === 0 ? "No numbers available" : "None"}</option>
          {unassignedNumbers.map((n) => (
            <option key={n.id} value={n.id}>
              {n.phone_number} {n.assigned_agent_id === agent.id ? "(this agent)" : ""}
            </option>
          ))}
        </select>
        {assignedNumber && (
          <p className="text-[11px] text-emerald-400/90 mt-1.5">Assigned: {assignedNumber.phone_number}</p>
        )}
      </section>
      <div>
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">Readiness: {r.percent}%</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
          <div
            className="h-full rounded-full bg-white/20 transition-[width] duration-300"
            style={{ width: `${r.percent}%` }}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Readiness checklist</p>
        <ul className="space-y-2 text-xs text-[var(--text-secondary)]" role="list">
          {r.tasks.map((task) => (
            <li key={task.label} className="flex items-center gap-2">
              {task.complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-white/30 text-white/30" aria-hidden />
              )}
              <span className={task.complete ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                {task.label}
              </span>
              {task.label === "Voice assistant created" && !agent.vapiAgentId && allowActivate && (
                <button
                  type="button"
                  onClick={() => void onActivate()}
                  disabled={activating}
                  className="ml-auto rounded text-[11px] font-medium text-[var(--text-primary)] underline underline-offset-1 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50"
                >
                  {activating ? "Syncing…" : "Retry sync"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4" aria-label="Carrier forwarding instructions">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Forward your number to your AI</p>
        <div className="space-y-0">
          <AccordionItem title="AT&T" defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">Dial *72, then your Recall Touch number. Wait for confirmation. To turn off, dial *73.</p>
          </AccordionItem>
          <AccordionItem title="Verizon" defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">Dial *72 followed by your Recall Touch number. Listen for the confirmation tone. To cancel, dial *73.</p>
          </AccordionItem>
          <AccordionItem title="T-Mobile" defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">In the T-Mobile app: Phone → More → Call forwarding. Enter your Recall Touch number. Or dial *72 + number.</p>
          </AccordionItem>
          <AccordionItem title="Other carriers" defaultOpen={false}>
            <p className="text-xs text-[var(--text-secondary)] pt-1">Most carriers: dial *72 or 72 + your Recall Touch number to turn on call forwarding. Dial *73 or 73 to turn off. Check your carrier’s support site for exact codes.</p>
          </AccordionItem>
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--border-default)] bg-white/[0.02] p-5 space-y-4" aria-label="Preview how your AI will respond">
        <h3 className="text-sm font-medium text-white/70 mb-4">Preview — how your AI will respond</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 mb-1">
              Caller wants to book an appointment
            </p>
            <p className="text-sm text-white/70 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
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
                  return "Your agent will greet the caller, confirm what they need, and offer to book a time on your calendar.";
                }
                return "Your agent will greet the caller, gather details, and take a clear message for your team to schedule.";
              })()}
            </p>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-1">Caller asks about pricing</p>
            <p className="text-sm text-white/70 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
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
                  return "Your agent will not give exact pricing (per your rules). It will explain that a human will follow up with a quote and capture contact details.";
                }
                if (agent.pricingEnabled && (agent.priceList ?? "").trim()) {
                  return "Your agent will share your saved pricing overview and then guide the caller toward booking or a follow-up.";
                }
                return "Your agent will explain that pricing depends on the situation, offer a rough range if appropriate, and collect details so your team can send a precise quote.";
              })()}
            </p>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-1">Caller reaches you after hours</p>
            <p className="text-sm text-white/70 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
              {(() => {
                switch (agent.afterHoursMode) {
                  case "forward":
                    return "Your agent will explain that the office is closed and forward urgent calls to your transfer number, or take a message when forwarding isn’t appropriate.";
                  case "messages":
                    return "Your agent will let the caller know you’re closed, capture their name, number, and reason for calling, and confirm that someone will follow up.";
                  case "emergency":
                    return "Your agent will quickly check if it’s an emergency and, if so, transfer to your emergency contact. Otherwise it will take a detailed message.";
                  case "closed":
                    return "Your agent will state that the office is closed right now, share basic hours if known, and invite the caller to leave a message.";
                  default:
                    return "Your agent will check basic details, let the caller know your team is currently unavailable, and take a message for follow-up.";
                }
              })()}
            </p>
          </div>

          {(() => {
            const priceObj = agent.objectionHandling?.price?.trim();
            if (!priceObj) return null;
            return (
              <div>
                <p className="text-xs text-white/40 mb-1">
                  Caller says the price feels too high
                </p>
                <p className="text-sm text-white/70 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
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
                <p className="text-xs text-white/40 mb-1">
                  Caller asks to speak to someone else
                </p>
                <p className="text-sm text-white/70 bg-zinc-900/70 border border-zinc-700 rounded-lg p-3">
                  {hasTransferNumber
                    ? "Your agent will stay calm, confirm why they’d like a human, and then transfer to your saved number when your escalation rules match."
                    : "Your agent will stay calm, explain what it can help with, and if needed, take a message with the caller’s details for a human to follow up."}
                </p>
              </div>
            );
          })()}
        </div>
      </section>
      <p className="text-xs text-white/40">Connect your phone number or activate for test calls and outbound only.</p>
      <div className="grid gap-3 sm:grid-cols-2" role="list">
        <Link
          href="/app/settings/phone"
          aria-label="Forward your existing number. Set up call forwarding to your AI."
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">Forward your existing number</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">Keep your current number. Forward calls to your AI.</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Set up forwarding</span>
        </Link>
        <Link
          href="/app/settings/phone"
          aria-label="Get a new phone number. We'll assign you a local number instantly."
          className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">Get a new number</span>
          <span className="mt-1 text-xs text-[var(--text-secondary)]">We&apos;ll assign you a local number instantly.</span>
          <span className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Get number</span>
        </Link>
      </div>
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label="Back to Test" className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">Back</button>
        <button
          type="button"
          onClick={() => void onActivate()}
          disabled={!allowActivate || activating}
          aria-label="Activate agent"
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-zinc-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {activating ? "Activating…" : "Activate agent"}
        </button>
      </div>
    </div>
  );
}

