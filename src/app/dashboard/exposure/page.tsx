"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Exposure — operational exposure when authority is absent.
 * Institutional documentation only. No persuasion, no metrics.
 */
export default function ExposurePage() {
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
          Exposure
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Exposure exists where authority is absent.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Inbound exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Inbound may remain unattended.</li>
          <li>Ambiguous intent may not produce a record.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Commitment exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Scheduled commitments may dissolve without record.</li>
          <li>Attendance outcome may remain unknown.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Delivery exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Delivery attempts may not reach a final state.</li>
          <li>Unconfirmed delivery may remain unresolved.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Decision exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Outcome-critical ambiguity may proceed without entry.</li>
          <li>Responsibility may remain indefinite.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Financial exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Payment state may diverge from records.</li>
          <li>Dispute conditions may not produce an entry.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          State exposure
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Invalid states may persist.</li>
          <li>Continuity may not be demonstrable.</li>
        </ul>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Exposure exists until entry.
      </p>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Entry restores reliance.
      </p>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Delegation does not exist outside authority.
      </p>
    </div>
  );
}
