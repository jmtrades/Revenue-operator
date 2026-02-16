"use client";

import { useWorkspace } from "@/components/WorkspaceContext";

/**
 * Ledger — entries define operational state.
 * Institutional only. No metrics, no claims.
 */
export default function LedgerPage() {
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
          Ledger
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Entries define operational state.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Entry states
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Normal conditions.</li>
          <li>Outside authority.</li>
          <li>Beyond scope.</li>
          <li>Exposure exists.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Entry meaning
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Normal conditions indicates no unresolved entry.</li>
          <li>Outside authority indicates an unresolved entry.</li>
          <li>Beyond scope indicates authority is absent for the domain.</li>
          <li>Exposure exists indicates entry has not been made.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase" style={{ color: "var(--text-secondary)" }}>
          Resolution
        </h2>
        <ul className="text-sm space-y-2 list-disc pl-5" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
          <li>Entry concludes exposure.</li>
          <li>Entry restores reliance.</li>
        </ul>
      </section>
      <p className="text-sm mt-8" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
        Entry is the operational boundary.
      </p>
    </div>
  );
}
