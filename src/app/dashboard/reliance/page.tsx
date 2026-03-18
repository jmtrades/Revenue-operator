"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Integrations — defined by entry state.
 * Institutional only. No metrics, no claims.
 */
export default function ReliancePage() {
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
          Integrations
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Integrations are defined by entry state.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Integrations active
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Normal conditions.</li>
          <li>No unresolved entry exists.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Integrations paused
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Outside authority.</li>
          <li>Usage exists until entry.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Restoration
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Entry restores integrations.</li>
          <li>Entry concludes usage.</li>
        </ul>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Entry restores integrations.
      </p>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Non-entry sustains usage.
      </p>
    </div>
  );
}
