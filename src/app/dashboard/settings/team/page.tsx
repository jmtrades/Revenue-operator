"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsTeamPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Team" subtitle="Add members, roles, availability, escalation." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Manage team members and who gets notified for handoffs.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings
      </Link>
      <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
      <Link href="/dashboard/settings/operators" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        Operators
      </Link>
    </div>
  );
}
