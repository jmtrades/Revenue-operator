"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const TAB_KEYS = [
  { key: "general" as const, href: "/app/settings/business" },
  { key: "phone", href: "/app/settings/phone" },
  { key: "integrations", href: "/app/settings/integrations" },
  { key: "notifications", href: "/app/settings/notifications" },
  { key: "billing", href: "/app/settings/billing" },
  { key: "team", href: "/app/settings/team" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tNav = useTranslations("settings.nav");
  const tSettings = useTranslations("settings");

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="border-b border-white/[0.06] mb-6">
        <nav className="flex gap-1 px-1 -mb-px overflow-x-auto" aria-label={tSettings("title")}>
          {TAB_KEYS.map((tab) => {
            const label = tNav(tab.key);
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-blue-500 text-zinc-100"
                    : "border-transparent text-zinc-400 hover:text-zinc-100 hover:border-white/[0.12]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

