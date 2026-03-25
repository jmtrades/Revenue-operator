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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-64 shrink-0">
        <div
          className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sticky top-20"
          aria-label={tSettings("title")}
        >
          <AccordionItem title="Business" defaultOpen>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/business" label={tNav("business")} pathname={pathname} />
              <NavLink href="/app/settings/call-rules" label={tNav("callRules")} pathname={pathname} />
              <NavLink href="/app/settings/agent" label={tNav("agent")} pathname={pathname} />
              <NavLink href="/app/settings/industry-templates" label={tNav("industryTemplates")} pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title="Phone" defaultOpen>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/phone" label={tNav("phone")} pathname={pathname} />
              <NavLink href="/app/settings/phone/port" label={tNav("porting")} pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title="Voice" defaultOpen>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/voices" label={tNav("voiceSettings")} pathname={pathname} />
              <NavLink href="/app/settings/compliance" label={tNav("compliance")} pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title={tNav("sectionIntegrations")} defaultOpen={false}>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/integrations" label={tNav("integrations")} pathname={pathname} />
              <NavLink href="/app/settings/integrations/mapping" label={tNav("mapping")} pathname={pathname} />
            </div>
          </AccordionItem>

          <AccordionItem title={tNav("sectionAccount")} defaultOpen={false}>
            <div className="space-y-1.5">
              <NavLink href="/app/settings/billing" label={tNav("billing")} pathname={pathname} />
              <NavLink href="/app/settings/team" label={tNav("team")} pathname={pathname} />
              <NavLink href="/app/settings/notifications" label={tNav("notifications")} pathname={pathname} />
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
        "block px-3 py-[7px] rounded-[var(--radius-btn)] text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-[var(--accent-primary)]/[0.08] text-[var(--accent-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
