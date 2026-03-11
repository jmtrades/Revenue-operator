"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS: { label: string; href: string }[] = [
  { label: "General", href: "/app/settings/business" },
  { label: "Phone", href: "/app/settings/phone" },
  { label: "Integrations", href: "/app/settings/integrations" },
  { label: "Notifications", href: "/app/settings/notifications" },
  { label: "Billing", href: "/app/settings/billing" },
  { label: "Team", href: "/app/settings/team" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="border-b border-white/[0.06] mb-6">
        <nav className="flex gap-1 px-1 -mb-px overflow-x-auto" aria-label="Settings">
          {TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-[#4F8CFF] text-[#EDEDEF]"
                    : "border-transparent text-[#8B8B8D] hover:text-[#EDEDEF] hover:border-white/[0.12]",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

