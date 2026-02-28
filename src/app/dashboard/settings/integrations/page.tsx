"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Integrations" subtitle="API keys, webhooks, and third-party connections." />
      <div className="mt-6 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Integration settings are in main settings.</p>
      </div>
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/settings${q}`} style={{ color: "var(--text-muted)" }}>Back to settings</Link>
      </p>
    </div>
  );
}
