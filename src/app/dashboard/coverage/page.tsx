"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Operational Coverage — responsibility, not features.
 * No numbers, no performance claims, no technical explanation.
 */
export default function CoveragePage() {
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
          Coverage
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          What the system assumes responsibility for.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Continuity coverage
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Inbound opportunities are not left unattended. Each enquiry enters handling and is within authority until responsibility is concluded or handed off.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Commitment coverage
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Scheduled commitments are not silently lost. The system ensures that booked appointments and follow-through are within authority until confirmed or explicitly concluded.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Decision coverage
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          When human judgment is required, it appears. You are contacted only when a decision cannot be completed within the system’s responsibility. Nothing else is demanded of you in normal conditions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Integrity coverage
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          The system verifies correctness. Internal checks ensure that responsibility states are consistent within authority, that nothing is left unresolved beyond the agreed scope, and that any failure to meet these conditions is escalated rather than hidden.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Scope boundary
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Some situations exist outside scope. When this occurs, an entry appears for record.
        </p>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Outside scope does not proceed within authority.
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          Outside scope produces exposure.
        </p>
      </section>
    </div>
  );
}
