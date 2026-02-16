"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Assurance — verification, not metrics.
 * No logs, counts, or timelines. Only demonstrable correctness language.
 */
export default function AssurancePage() {
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
          Assurance
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Verification occurs within authority.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Events are ordered
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Every signal and action is sequenced. The system does not process outcomes out of order; causality is preserved so that what happened can be reconstructed and verified.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Outcomes are verified
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Completion is confirmed, not assumed. Delivery and reconciliation confirm that actions reached their destination and that external reality matches what the system holds. Discrepancies are detected and escalated.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Responsibility concludes
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Every responsibility has an end state. The system does not leave obligations open indefinitely. Closure is enforced so that a clear handoff or conclusion is available.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Invalid states cannot persist
        </h2>
        <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          Integrity checks run so that inconsistent or impossible states are detected. When something is wrong, the system escalates rather than proceeding within authority.           Trust is replaced by demonstrable correctness.
        </p>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Reliance is defined by entry state.
      </p>
    </div>
  );
}
