"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutList,
  Users,
  Bot,
  Megaphone,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/activity", label: "Activity", icon: LayoutList },
  { href: "/app/contacts", label: "Contacts", icon: Users },
  { href: "/app/agents", label: "Agents", icon: Bot },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const MOBILE_TABS = [
  { href: "/app/activity", label: "Activity" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/agents", label: "Agents" },
  { href: "/app/settings", label: "More" },
] as const;

function getBusinessName(): string {
  if (typeof window === "undefined") return "My Business";
  try {
    const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
    if (raw) {
      const d = JSON.parse(raw) as { businessName?: string };
      return d?.businessName?.trim() || "My Business";
    }
  } catch {
    // ignore
  }
  return "My Business";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [businessName, setBusinessName] = useState("My Business");

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => setBusinessName(getBusinessName()), 0);
    return () => clearTimeout(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || pathname === "/app/onboarding") return;
    try {
      if (!localStorage.getItem("rt_onboarded")) {
        router.replace("/app/onboarding");
      }
    } catch {
      // ignore
    }
  }, [mounted, pathname, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/app/activity" && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-black flex flex-col pb-20 md:pb-0">
      <div
        className="shrink-0 py-2 px-4 text-center text-xs font-medium bg-zinc-800/80 text-zinc-300 border-b border-zinc-800"
        role="status"
        aria-label="Demo mode"
      >
        Demo Mode — Connect your phone to go live
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex md:w-60 flex-col shrink-0 bg-zinc-950 border-r border-zinc-800">
          <div className="p-5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">RT</span>
              </div>
              <span className="text-white font-semibold truncate">{businessName}</span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors ${
                  isActive(href) ? "bg-zinc-800/50 text-white font-medium" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-zinc-800">
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400">
              Starter — 14 days left
            </span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto min-w-0 bg-black">{children}</main>
      </div>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 bg-zinc-950 border-t border-zinc-800 safe-area-pb"
        aria-label="Mobile navigation"
      >
        {MOBILE_TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 flex-1 text-center text-[10px] uppercase tracking-wider ${
              isActive(href) ? "text-white font-medium" : "text-zinc-500"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
