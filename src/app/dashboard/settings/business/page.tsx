"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsBusinessPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Business" subtitle="Name, address, hours, services, website." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Update your business profile so your AI agent has the right context for every call.
      </p>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        ← Open full settings to edit business profile
      </Link>
    </div>
  );
}
