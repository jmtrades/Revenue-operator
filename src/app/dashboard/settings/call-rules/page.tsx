"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsCallRulesPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Call rules" subtitle="During/after hours, emergency detection, transfer rules." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Configure how calls are handled, when to escalate, and max hold time.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings to edit call rules
      </Link>
    </div>
  );
}
