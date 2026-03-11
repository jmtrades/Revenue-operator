"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft } from "lucide-react";

const PROVIDER_NAMES: Record<string, string> = {
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  zoho_crm: "Zoho CRM",
  pipedrive: "Pipedrive",
  gohighlevel: "GoHighLevel",
  google_contacts: "Google Contacts",
  microsoft_365: "Microsoft 365",
};

export default function IntegrationsMappingPage() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") ?? "";
  const name = (PROVIDER_NAMES[provider] ?? provider) || "CRM";

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/app/settings" },
          { label: "Integrations", href: "/app/settings/integrations" },
          { label: `${name} mapping` },
        ]}
      />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mt-2 mb-1">
        Field mapping — {name}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Map Recall Touch fields to {name} fields. Sync configuration will be available here.
      </p>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-center">
        <p className="text-sm text-zinc-400 mb-4">
          Field mapping and sync configuration are coming in a future update.
        </p>
        <Link
          href="/app/settings/integrations"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to Integrations
        </Link>
      </div>
    </div>
  );
}
