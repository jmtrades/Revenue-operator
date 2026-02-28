"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function MessagesPage() {
  const { workspaceId } = useWorkspace();
  const [tab, setTab] = useState<"outbox" | "inbox">("outbox");
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Messages" subtitle="Outbox and inbox." />
        <EmptyState icon="watch" title="Select a context." subtitle="Messages appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Messages" subtitle="Outbox and inbox for governed messages." />
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <button type="button" onClick={() => setTab("outbox")} className="px-4 py-2 text-sm font-medium border-b-2 -mb-px" style={{ borderColor: tab === "outbox" ? "var(--accent)" : "transparent", color: tab === "outbox" ? "var(--text-primary)" : "var(--text-muted)" }}>Outbox</button>
        <button type="button" onClick={() => setTab("inbox")} className="px-4 py-2 text-sm font-medium border-b-2 -mb-px" style={{ borderColor: tab === "inbox" ? "var(--accent)" : "transparent", color: tab === "inbox" ? "var(--text-primary)" : "var(--text-muted)" }}>Inbox</button>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div className="py-12 px-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>{tab === "outbox" ? "No sent messages yet." : "No replies yet."}</div>
      </div>
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/messages/compose${q}`} style={{ color: "var(--meaning-blue)" }}>Compose</Link>
        {" · "}
        <Link href={`/dashboard/templates${q}`} style={{ color: "var(--text-muted)" }}>Templates</Link>
      </p>
    </div>
  );
}
