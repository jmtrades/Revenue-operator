"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Phone,
  PhoneCall,
  Users,
  Upload,
  Settings2,
  ArrowRight,
  Sparkles,
  Zap,
  Megaphone,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { Persona } from "@/lib/workspace/personalization";

/**
 * Client-rendered welcome/wayfinding screen.
 *
 * Shows a success banner, a live-status chip that polls the agent health
 * endpoint, a persona-aware checklist of next actions, and one primary CTA
 * per persona. The checklist state is read from `/api/dashboard/summary`
 * so it reflects what the user has actually done.
 */

type LiveStatus = "checking" | "live" | "not_live" | "unknown";

interface SetupFlags {
  agentConfigured: boolean;
  phoneConfigured: boolean;
  hasRunTestCall: boolean;
  hasLeads: boolean;
  hasTeammate: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  cta: string;
  done: boolean;
}

function personaHeadline(persona: Persona | null): { title: string; subtitle: string } {
  switch (persona) {
    case "owner":
      return {
        title: "Your AI operator is live.",
        subtitle: "Here's what we recommend doing first to start recovering revenue.",
      };
    case "sales_manager":
      return {
        title: "Your sales line is live.",
        subtitle: "Let's get a campaign running and invite your reps.",
      };
    case "sdr":
      return {
        title: "You're ready to dial.",
        subtitle: "Import your list, review the script, and launch your first campaign.",
      };
    case "office_manager":
      return {
        title: "Your front desk is covered 24/7.",
        subtitle: "Make a test call, then set your after-hours rules.",
      };
    case "agency_operator":
      return {
        title: "Your first client workspace is live.",
        subtitle: "Brand it, invite teammates, and wire the webhook to your stack.",
      };
    case "solo_operator":
      return {
        title: "Your AI is on the line.",
        subtitle: "Make a quick test call — you'll see it appear in your inbox in seconds.",
      };
    default:
      return {
        title: "You're live.",
        subtitle: "Here's what we recommend doing next.",
      };
  }
}

function buildChecklist(persona: Persona | null, flags: SetupFlags): ChecklistItem[] {
  const base: ChecklistItem[] = [
    {
      id: "test_call",
      label: "Make a test call",
      description: "Call your number and hear your agent in action.",
      icon: PhoneCall,
      href: "/app/settings/phone",
      cta: "See my number",
      done: flags.hasRunTestCall,
    },
    {
      id: "phone_setup",
      label: "Connect or forward your number",
      description: "Port your existing line or forward calls from your current phone.",
      icon: Phone,
      href: "/app/settings/phone",
      cta: "Open phone settings",
      done: flags.phoneConfigured,
    },
    {
      id: "agent_review",
      label: "Review your agent",
      description: "Tune the greeting, voice, and hours. It takes under a minute.",
      icon: Settings2,
      href: "/app/settings/agent",
      cta: "Review agent",
      done: flags.agentConfigured,
    },
  ];

  // Persona-specific additions ordered to surface the "first valuable action".
  if (persona === "sdr" || persona === "sales_manager") {
    base.unshift({
      id: "import_leads",
      label: "Import your lead list",
      description: "Upload a CSV or paste a list — your agent starts dialing in minutes.",
      icon: Upload,
      href: "/app/leads?import=1",
      cta: "Import leads",
      done: flags.hasLeads,
    });
    base.push({
      id: "launch_campaign",
      label: "Launch your first campaign",
      description: "Pick a template, set your hours, and go.",
      icon: Megaphone,
      href: "/app/campaigns/create",
      cta: "Create campaign",
      done: false,
    });
  }

  if (persona === "agency_operator" || persona === "sales_manager") {
    base.push({
      id: "invite_team",
      label: "Invite a teammate",
      description: "Add reps, managers, or clients with role-based access.",
      icon: Users,
      href: "/app/settings/team",
      cta: "Invite teammate",
      done: flags.hasTeammate,
    });
  }

  if (persona === "office_manager") {
    base.splice(1, 0, {
      id: "hours_rules",
      label: "Set after-hours rules",
      description: "Decide what happens when the office is closed — message, route, or book.",
      icon: Settings2,
      href: "/app/settings/call-rules",
      cta: "Open call rules",
      done: false,
    });
  }

  return base;
}

export function WelcomeScreen() {
  const searchParams = useSearchParams();
  const fromActivate = searchParams.get("from") === "activate";

  const [persona, setPersona] = useState<Persona | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("checking");
  const [flags, setFlags] = useState<SetupFlags>({
    agentConfigured: false,
    phoneConfigured: false,
    hasRunTestCall: false,
    hasLeads: false,
    hasTeammate: false,
  });

  // Pull persona from the saved activation state as a fast client hint.
  // The server-side persona on workspace_members is the source of truth but
  // we only need it for copy choice here.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rt_activate_progress");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state?: { persona?: Persona | null } } | null;
      const p = parsed?.state?.persona ?? null;
      if (p) setPersona(p);
    } catch {
      // localStorage may be full / disabled; persona stays null and we
      // fall back to generic copy.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard/summary", {
          credentials: "include",
        });
        if (!res.ok || cancelled) {
          setLiveStatus("unknown");
          return;
        }
        const data = (await res.json()) as {
          agent_configured?: boolean;
          phone_number_configured?: boolean;
          calls_answered?: number;
          stale_leads?: number;
          pending_follow_ups?: number;
        };
        if (cancelled) return;

        const agent = Boolean(data.agent_configured);
        const phone = Boolean(data.phone_number_configured);

        setFlags((prev) => ({
          ...prev,
          agentConfigured: agent,
          phoneConfigured: phone,
          hasRunTestCall: (data.calls_answered ?? 0) > 0,
          hasLeads: ((data.stale_leads ?? 0) + (data.pending_follow_ups ?? 0)) > 0,
        }));
        setLiveStatus(agent && phone ? "live" : "not_live");
      } catch {
        if (!cancelled) setLiveStatus("unknown");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const headline = useMemo(() => personaHeadline(persona), [persona]);
  const checklist = useMemo(() => buildChecklist(persona, flags), [persona, flags]);
  const completedCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {/* Success banner */}
        {fromActivate && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--accent-success)]/30 bg-[var(--accent-success-subtle)] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-success)]/15">
              <Sparkles className="h-5 w-5 text-[var(--accent-success)]" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--accent-success)]">
                Setup complete
              </p>
              <p className="text-xs text-[var(--accent-success)]/80">
                Your workspace is ready — let's get you in the flow.
              </p>
            </div>
          </div>
        )}

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <StatusPill status={liveStatus} />
            <span className="text-xs text-[var(--text-tertiary)]">
              {completedCount} of {checklist.length} next steps done ({percent}%)
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {headline.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
            {headline.subtitle}
          </p>
        </header>

        {/* Progress bar */}
        <div
          className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Checklist */}
        <ul className="space-y-3">
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className={`group rounded-2xl border px-4 py-4 transition-colors sm:px-5 ${
                  item.done
                    ? "border-[var(--accent-success)]/30 bg-[var(--accent-success-subtle)]/40"
                    : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.done ? (
                      <CheckCircle2
                        className="h-5 w-5 text-[var(--accent-success)]"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="h-5 w-5 text-[var(--text-tertiary)]"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <Icon
                            className="h-4 w-4 text-[var(--text-secondary)]"
                            aria-hidden
                          />
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">
                          {item.description}
                        </p>
                      </div>
                      {!item.done && (
                        <Link
                          href={item.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        >
                          {item.cta}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Primary CTA */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={ROUTES.APP_HOME}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] transition-opacity hover:opacity-90"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Go to my dashboard
          </Link>
          <Link
            href="/app/help"
            className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:underline"
          >
            Need a hand? Visit Help
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: LiveStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-success)]/40 bg-[var(--accent-success-subtle)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-success)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-success)] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]" />
        </span>
        Live
      </span>
    );
  }
  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
        Checking…
      </span>
    );
  }
  if (status === "not_live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-warning)]/40 bg-[var(--accent-warning-subtle)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-warning)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warning)]" />
        Setup pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
      Status unknown
    </span>
  );
}
