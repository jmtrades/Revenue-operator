"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function SettingsBillingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Billing" subtitle="Current plan, usage, upgrade, payment method, invoices." />
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        View your plan, update payment method, and access invoices.
      </p>
      <Link href="/dashboard/billing" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        → Open billing
      </Link>
      <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>·</span>
      <Link href="/dashboard/settings" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
        Full settings
      </Link>
    </div>
  );
}
