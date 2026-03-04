"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutList,
  PhoneCall,
  Users,
  Megaphone,
  MessageSquare,
  Calendar,
  BarChart3,
  BookOpen,
  Code,
  Shield,
  Settings,
  CreditCard,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { MOCK_INBOX_THREADS } from "@/lib/mock/inbox";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { OnboardingStepProvider, useOnboardingStep, ONBOARDING_STEP_LABELS } from "./OnboardingStepContext";

const NAV_MAIN: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/activity", label: "Dashboard", icon: LayoutList },
  { href: "/app/calls", label: "Calls", icon: PhoneCall },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/calendar", label: "Appointments", icon: Calendar },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/compliance", label: "Compliance", icon: Shield },
];

const NAV_UTILITY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/developer", label: "Developer", icon: Code },
];

const MOBILE_TABS = [
  { href: "/app/activity", label: "Dashboard", icon: LayoutList },
  { href: "/app/calls", label: "Calls", icon: PhoneCall },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
] as const;

const MOBILE_MORE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/calendar", label: "Appointments", icon: Calendar },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/compliance", label: "Compliance", icon: Shield },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/developer", label: "Developer", icon: Code },
];

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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const inboxUnread = MOCK_INBOX_THREADS.filter((t) => t.unread).length;

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

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMoreOpen]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/app/activity" && pathname.startsWith(href));

  const isMoreActive = MOBILE_MORE_LINKS.some(({ href }) => isActive(href));

  const isOnboarding = pathname === "/app/onboarding";

  return (
    <OnboardingStepProvider>
      <div className="min-h-screen bg-black flex flex-col pb-20 md:pb-0">
        <div
          className="shrink-0 py-2 px-4 flex items-center justify-center gap-2 flex-wrap text-center text-xs font-medium bg-zinc-800/80 text-zinc-300 border-b border-zinc-800"
          role="status"
          aria-label="Demo mode"
        >
          <span>🎯 Demo Mode — Your AI is using sample data. Forward your phone number to go live.</span>
          <Link href="/app/settings/phone" className="text-white font-semibold underline underline-offset-2 hover:no-underline">
            Set up →
          </Link>
        </div>
        <div className="flex flex-1 min-h-0">
          {isOnboarding ? (
            <OnboardingSidebar />
          ) : (
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
              {NAV_MAIN.map(({ href, label, icon: Icon }) => {
                const effectiveLabel =
                  href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors ${
                      isActive(href) ? "bg-zinc-800/50 text-white font-medium" : "text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    {effectiveLabel}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-zinc-800" aria-hidden />
              {NAV_UTILITY.map(({ href, label, icon: Icon }) => (
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
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <div className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <span className="block text-xs font-medium text-zinc-300">Starter · Trial</span>
                <span className="block text-[10px] text-zinc-500">12 days left</span>
              </div>
              <OnboardingChecklist />
            </div>
          </aside>
        )}
        <main id="main" className="flex-1 overflow-auto min-w-0 bg-black" tabIndex={-1}>{children}</main>
      </div>
      {!isOnboarding && (
        <>
          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-zinc-950 border-t border-zinc-800 safe-area-pb"
            aria-label="Mobile navigation"
          >
            {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation ${
                  isActive(href) ? "text-white" : "text-zinc-500"
                }`}
                aria-current={isActive(href) ? "page" : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setMobileMoreOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[64px] flex-1 text-center touch-manipulation ${
                isMoreActive ? "text-white" : "text-zinc-500"
              }`}
              aria-label="More menu"
              aria-expanded={mobileMoreOpen}
            >
              <Menu className="w-5 h-5 shrink-0 mx-auto" strokeWidth={1.5} aria-hidden />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </nav>
          {mobileMoreOpen && (
            <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="More menu">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileMoreOpen(false)}
                onKeyDown={(e) => e.key === "Escape" && setMobileMoreOpen(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
                  <span className="text-sm font-medium text-white">More</span>
                  <button
                    type="button"
                    onClick={() => setMobileMoreOpen(false)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <nav className="p-2" aria-label="More pages">
                  {MOBILE_MORE_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMoreOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                        isActive(href) ? "bg-zinc-800/50 text-white" : "text-zinc-300"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                      {href === "/app/inbox" && inboxUnread > 0 ? `Inbox (${inboxUnread})` : label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </OnboardingStepProvider>
  );
}

function OnboardingSidebar() {
  const ctx = useOnboardingStep();
  const step = ctx?.step ?? 1;
  const businessName = typeof window !== "undefined" ? (() => {
    try {
      const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
      if (raw) {
        const d = JSON.parse(raw) as { businessName?: string };
        return d?.businessName?.trim() || "Recall Touch";
      }
    } catch { /* ignore */ }
    return "Recall Touch";
  })() : "Recall Touch";

  return (
    <aside className="hidden md:flex md:w-52 flex-col shrink-0 bg-zinc-950 border-r border-zinc-800 py-5 px-4">
      <Link href="/" className="flex flex-col items-center gap-1 mb-6">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <span className="text-black font-bold text-sm">RT</span>
        </div>
        <span className="text-[10px] text-zinc-500 text-center">{businessName}</span>
      </Link>
      <nav className="flex-1" aria-label="Onboarding steps">
        <div className="flex flex-col gap-0">
          {ONBOARDING_STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isComplete = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={stepNum} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-white text-black"
                          : "bg-zinc-800 text-zinc-600"
                    } ${isCurrent ? "ring-2 ring-white/50" : ""}`}
                  >
                    {isComplete ? "✓" : stepNum}
                  </div>
                  {i < ONBOARDING_STEP_LABELS.length - 1 && (
                    <div className={`w-0.5 min-h-[14px] ${step > stepNum ? "bg-green-500/50" : "bg-zinc-800"}`} />
                  )}
                </div>
                <span
                  className={`text-sm py-1 ${
                    isComplete ? "text-white" : isCurrent ? "text-white font-medium" : "text-zinc-600"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </nav>
      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <span className="block text-xs font-medium text-zinc-300">Starter · Trial</span>
          <span className="block text-[10px] text-zinc-500">14 days left</span>
        </div>
        <OnboardingChecklist />
      </div>
    </aside>
  );
}
