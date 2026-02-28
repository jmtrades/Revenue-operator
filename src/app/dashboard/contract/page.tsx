"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Contract — operational boundaries.
 * What the system is responsible for; what remains yours; when judgment is required; what completion means.
 * No legal liability, SLA, or uptime.
 */
export default function ContractPage() {
  const { workspaceId } = useWorkspace();

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-2xl">
        <p style={{ color: "var(--text-muted)" }}>Authority is present.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-16">
      <header>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Contract
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Operational boundaries of responsibility.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          What the system assumes responsibility for
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Follow-through so that inbound opportunities are not left unattended. Commitment to scheduled outcomes so that bookings and confirmations are within authority. Escalation when a decision requires human judgment. Verification that actions were delivered and that responsibility states are consistent within authority. Proof that responsibility was concluded or handed off.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          What is the business responsibility
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Final judgment on escalated decisions. Authority to pause or change scope. Relationship with the customer once the system has handed off. Any outcome that depends on human action after handoff.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          When human judgment is required
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          When the system cannot determine the correct next step within its rules. When a customer response or external event falls outside predefined handling. When closure cannot be achieved within authority. When notification has been chosen. In those cases only, contact occurs; otherwise operation is within authority.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          What constitutes completion of responsibility
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Responsibility is complete when the lead has reached a concluded state (e.g. booked and confirmed, or explicitly opted out, or lost with closure recorded). Responsibility is also complete when it has been handed off and acknowledged. The system does not consider responsibility complete until one of these conditions is met and verified.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Economic boundary
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Authority covers continuity, commitments, and delivery finality. Beyond scope produces an entry outside authority.
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Outside authority creates exposure.
        </p>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Reliance derives from entry state.
      </p>
    </div>
  );
}
