"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { AccordionItem } from "@/components/ui/Accordion";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tNav = useTranslations("settings.nav");
  const tSettings = useTranslations("settings");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex gap-6">
      <aside className="w-full md:w-72 shrink-0">
        <div
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
          style={{ boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" }}
          aria-label={tSettings("title")}
        >
          <AccordionItem title="Your Business" defaultOpen>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/business" label={tNav("business")} pathname={pathname} />
              <NavLink href="/app/settings/call-rules" label={tNav("callRules")} pathname={pathname} />
              <NavLink href="/app/settings/industry-templates" label="Industry Templates" pathname={pathname} />
              <NavLink href="/app/settings/outbound" label="Outbound" pathname={pathname} />
              <NavLink href="/app/settings/lead-scoring" label="Lead Scoring" pathname={pathname} />
              <NavLink href="/app/settings/agent" label="Agent" pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title="Integrations" defaultOpen>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/phone" label={tNav("phone")} pathname={pathname} />
              <NavLink href="/app/settings/phone/marketplace" label="Marketplace" pathname={pathname} />
              <NavLink href="/app/settings/phone/port" label="Porting" pathname={pathname} />

              <NavLink href="/app/settings/integrations" label={tNav("integrations")} pathname={pathname} />
              <NavLink href="/app/settings/integrations/mapping" label="Mapping" pathname={pathname} />
              <NavLink href="/app/settings/integrations/sync-log" label="Sync Log" pathname={pathname} />

              <NavLink href="/app/settings/voices" label="Voice Settings" pathname={pathname} />
              <NavLink href="/app/settings/compliance" label={tNav("compliance")} pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title="Account" defaultOpen={false}>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/billing" label={tNav("billing")} pathname={pathname} />
              <NavLink href="/app/settings/billing/cancel" label="Cancellation" pathname={pathname} />
              <NavLink href="/app/settings/team" label={tNav("team")} pathname={pathname} />
              <NavLink href="/app/settings/notifications" label={tNav("notifications")} pathname={pathname} />
              <NavLink href="/app/settings/errors" label="Errors & Audit Log" pathname={pathname} />
              <NavLink href="/app/settings/activity" label="Activity" pathname={pathname} />
            </div>
          </AccordionItem>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "block px-3 py-2 rounded-xl text-sm font-medium transition-colors border",
        active
          ? "bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--accent-primary)]/20"
          : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

