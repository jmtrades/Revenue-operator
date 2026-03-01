"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsCompliancePage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Compliance" subtitle="Recording disclosure, jurisdiction, data retention, export." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Configure recording disclosure, jurisdiction tagging, and how long records are kept.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings to edit compliance
      </Link>
    </div>
  );
}
