"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsNotificationsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Notifications" subtitle="Push, SMS, email — what triggers them, quiet hours." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Choose how and when you get notified for new leads, emergencies, and handoffs.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings to edit notifications
      </Link>
    </div>
  );
}
