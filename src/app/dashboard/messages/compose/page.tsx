"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function ComposePage() {
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Compose" subtitle="Send a governed message using a template." />
      {!workspaceId ? (
        <EmptyState icon="watch" title="Select a context." subtitle="Compose appears here." />
      ) : (
        <div className="space-y-6 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Select a template, recipient, and channel. Custom messages require compliance approval.
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Pick a template below or write your message. Recipient and channel are selected on the messages page.</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/templates${q}`} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: "var(--btn-primary-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} aria-label="Choose template">Choose template</Link>
            <Link href={`/dashboard/messages${q}`} className="text-sm" style={{ color: "var(--text-muted)" }}>Back to messages</Link>
          </div>
        </div>
      )}
    </div>
  );
}
