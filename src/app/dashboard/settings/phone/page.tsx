"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsPhonePage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Phone" subtitle="Phone numbers, forwarding, caller ID." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Manage your Recall Touch number and call forwarding.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings to manage phone
      </Link>
    </div>
  );
}
